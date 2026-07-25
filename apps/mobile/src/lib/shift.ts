import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  SAHA_BACKGROUND_LOCATION_TASK,
  SHIFT_ACTIVE_KEY,
  SHIFT_NOTIFICATION_BODY,
  SHIFT_NOTIFICATION_TITLE,
  SHIFT_START_TIME_KEY,
} from '../constants/shift';
import { addLocationToBuffer, flushLocationBuffer } from './locationBuffer';
import { classifyActivity } from './locationThrottle';
import { supabase } from './supabase';

/** Panelin canlı sayacı için sunucuya vardiya durumunu yazar (best-effort). */
async function syncShiftToServer(startedAt: string | null): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({ shift_started_at: startedAt })
      .eq('id', user.id);
    if (error) {
      console.warn('[Shift] Sunucu vardiya güncellemesi başarısız:', error.message);
    }
  } catch (err) {
    console.warn('[Shift] Sunucu vardiya güncellemesi atlandı:', err);
  }
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  /** Kalıcı red durumunda ayarlara yönlendirme öner. */
  openSettings?: boolean;
}

export async function requestShiftPermissions(): Promise<PermissionResult> {
  try {
    const fgStatus = await Location.getForegroundPermissionsAsync();
    let fgGranted = fgStatus.granted;
    if (!fgGranted) {
      const fgReq = await Location.requestForegroundPermissionsAsync();
      fgGranted = fgReq.granted;
      if (!fgGranted) {
        return {
          granted: false,
          openSettings: fgReq.canAskAgain === false,
          reason:
            'Yetiş+ Saha uygulamasının rota takibi yapabilmesi için ön plan konum iznine ihtiyacı vardır. Lütfen ayarlardan izin verin.',
        };
      }
    }

    const bgStatus = await Location.getBackgroundPermissionsAsync();
    let bgGranted = bgStatus.granted;
    if (!bgGranted) {
      const bgReq = await Location.requestBackgroundPermissionsAsync();
      bgGranted = bgReq.granted;
      if (!bgGranted) {
        return {
          granted: false,
          openSettings: true,
          reason:
            'Vardiya süresince arka planda rota kaydı için "Her zaman izin ver" seçeneği gereklidir. Lütfen uygulama ayarlarından konum iznini "Her zaman" olarak güncelleyin.',
        };
      }
    }

    try {
      const notifStatus = await Notifications.getPermissionsAsync();
      if (!notifStatus.granted) {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // ignore notification permission errors on older versions
    }

    return { granted: true };
  } catch (err: unknown) {
    console.error('İzin isteme hatası:', err);
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : String(err);
    return {
      granted: false,
      openSettings: true,
      reason: `İzinler alınırken bir sorun oluştu: ${message}`,
    };
  }
}

export class ShiftPermissionError extends Error {
  openSettings: boolean;
  constructor(message: string, openSettings = true) {
    super(message);
    this.name = 'ShiftPermissionError';
    this.openSettings = openSettings;
  }
}

export async function startShift(): Promise<string> {
  const perm = await requestShiftPermissions();
  if (!perm.granted) {
    throw new ShiftPermissionError(
      perm.reason || 'Gerekli konum izinleri verilmedi.',
      perm.openSettings !== false
    );
  }

  // Start background location updates with foreground service
  await Location.startLocationUpdatesAsync(SAHA_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 50,
    deferredUpdatesInterval: 60000,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: SHIFT_NOTIFICATION_TITLE,
      notificationBody: SHIFT_NOTIFICATION_BODY,
    },
  });

  const nowIso = new Date().toISOString();
  await AsyncStorage.setItem(SHIFT_ACTIVE_KEY, 'true');
  await AsyncStorage.setItem(SHIFT_START_TIME_KEY, nowIso);
  await syncShiftToServer(nowIso);

  // İlk konum anında yazılsın (arka plan görevi gelene kadar panel boş kalmasın)
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const rawSpeed = loc.coords.speed;
    const speedKmh =
      rawSpeed !== null && rawSpeed !== undefined && rawSpeed >= 0
        ? rawSpeed * 3.6
        : null;
    await addLocationToBuffer({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy_m: loc.coords.accuracy ?? null,
      speed_kmh: speedKmh,
      is_mock: Boolean(loc.mocked),
      activity_type: classifyActivity(speedKmh),
      recorded_at: new Date(loc.timestamp).toISOString(),
    });
    await flushLocationBuffer();
  } catch (err) {
    console.warn('[Shift] İlk konum kaydı atlandı:', err);
  }

  console.log('[Shift] Vardiya ve arka plan konum takibi başlatıldı.');
  return nowIso;
}

export async function stopShift(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(
      SAHA_BACKGROUND_LOCATION_TASK
    );
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(SAHA_BACKGROUND_LOCATION_TASK);
    }
  } catch (err) {
    console.warn('[Shift] stopLocationUpdatesAsync uyarısı:', err);
  }

  // Perform final flush of remaining buffer
  await flushLocationBuffer();

  await AsyncStorage.setItem(SHIFT_ACTIVE_KEY, 'false');
  await AsyncStorage.removeItem(SHIFT_START_TIME_KEY);
  await syncShiftToServer(null);

  console.log('[Shift] Vardiya ve arka plan konum takibi sonlandırıldı.');
}

export async function syncShiftStatus(): Promise<{
  isShiftActive: boolean;
  startTime: string | null;
}> {
  try {
    const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(
      SAHA_BACKGROUND_LOCATION_TASK
    );

    const storedActive = await AsyncStorage.getItem(SHIFT_ACTIVE_KEY);
    const storedTime = await AsyncStorage.getItem(SHIFT_START_TIME_KEY);

    // KVKK kill-switch logic:
    // If foreground service task died or wasn't running, shift MUST be set inactive.
    if (!isTaskRunning) {
      if (storedActive === 'true') {
        console.log('[Shift] Arka plan servisi çalışmıyor, vardiya pasif duruma çekiliyor (reboot/kill senaryosu).');
        await AsyncStorage.setItem(SHIFT_ACTIVE_KEY, 'false');
        await AsyncStorage.removeItem(SHIFT_START_TIME_KEY);
        await syncShiftToServer(null);
      }
      return { isShiftActive: false, startTime: null };
    }

    const startTime = storedTime || new Date().toISOString();
    // Uygulama yeniden açıldığında panelin geride kalmaması için sunucuya yaz
    await syncShiftToServer(startTime);
    return {
      isShiftActive: true,
      startTime,
    };
  } catch (err) {
    console.error('[Shift] Durum senkronizasyonu hatası:', err);
    return { isShiftActive: false, startTime: null };
  }
}
