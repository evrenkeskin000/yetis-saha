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
import { flushLocationBuffer } from './locationBuffer';

export interface PermissionResult {
  granted: boolean;
  reason?: string;
}

export async function requestShiftPermissions(): Promise<PermissionResult> {
  try {
    // 1. Foreground location permission
    const fgStatus = await Location.getForegroundPermissionsAsync();
    let fgGranted = fgStatus.granted;
    if (!fgGranted) {
      const fgReq = await Location.requestForegroundPermissionsAsync();
      fgGranted = fgReq.granted;
    }

    if (!fgGranted) {
      return {
        granted: false,
        reason:
          'Saha uygulamasının rota takibi yapabilmesi için ön plan konum iznine ihtiyacı vardır. Lütfen ayarlardan izin verin.',
      };
    }

    // 2. Background location permission
    const bgStatus = await Location.getBackgroundPermissionsAsync();
    let bgGranted = bgStatus.granted;
    if (!bgGranted) {
      const bgReq = await Location.requestBackgroundPermissionsAsync();
      bgGranted = bgReq.granted;
    }

    if (!bgGranted) {
      return {
        granted: false,
        reason:
          'Vardiya süresince arka planda rota kaydı için "Her zaman izin ver" seçeneği gereklidir. Lütfen uygulama ayarlarından konum iznini "Her zaman" olarak güncelleyin.',
      };
    }

    // 3. Notification permission (Android 13+)
    try {
      const notifStatus = await Notifications.getPermissionsAsync();
      if (!notifStatus.granted) {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // ignore notification permission errors on older versions
    }

    return { granted: true };
  } catch (err: any) {
    console.error('İzin isteme hatası:', err);
    return {
      granted: false,
      reason: `İzinler alınırken bir sorun oluştu: ${err?.message || err}`,
    };
  }
}

export async function startShift(): Promise<string> {
  const perm = await requestShiftPermissions();
  if (!perm.granted) {
    throw new Error(perm.reason || 'Gerekli konum izinleri verilmedi.');
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
      }
      return { isShiftActive: false, startTime: null };
    }

    return {
      isShiftActive: true,
      startTime: storedTime || new Date().toISOString(),
    };
  } catch (err) {
    console.error('[Shift] Durum senkronizasyonu hatası:', err);
    return { isShiftActive: false, startTime: null };
  }
}
