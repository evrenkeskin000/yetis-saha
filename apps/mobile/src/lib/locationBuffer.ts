import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import type { ActivityType } from '@saha/shared';
import {
  LOCATION_BUFFER_KEY,
  MAX_BUFFER_SIZE,
} from '../constants/shift';
import { supabase } from './supabase';

export interface BufferedLocationItem {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  speed_kmh: number | null;
  is_mock: boolean;
  activity_type: ActivityType;
  recorded_at: string;
}

export async function getBufferedLocations(): Promise<BufferedLocationItem[]> {
  try {
    const json = await AsyncStorage.getItem(LOCATION_BUFFER_KEY);
    if (!json) return [];
    return JSON.parse(json) as BufferedLocationItem[];
  } catch (err) {
    console.error('[Buffer] getBufferedLocations hatası:', err);
    return [];
  }
}

export async function addLocationToBuffer(
  item: Omit<BufferedLocationItem, 'id'>
): Promise<number> {
  try {
    const currentBuffer = await getBufferedLocations();
    const newItem: BufferedLocationItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    let updated = [...currentBuffer, newItem];

    // Trim oldest if exceeding MAX_BUFFER_SIZE
    if (updated.length > MAX_BUFFER_SIZE) {
      const overflow = updated.length - MAX_BUFFER_SIZE;
      updated = updated.slice(overflow);
      console.warn(`[Buffer] Maksimum sınır (${MAX_BUFFER_SIZE}) aşıldı, ${overflow} eski kayıt düşürüldü.`);
    }

    await AsyncStorage.setItem(LOCATION_BUFFER_KEY, JSON.stringify(updated));
    return updated.length;
  } catch (err) {
    console.error('[Buffer] addLocationToBuffer hatası:', err);
    return 0;
  }
}

export async function flushLocationBuffer(): Promise<number> {
  try {
    const buffer = await getBufferedLocations();
    if (!buffer || buffer.length === 0) {
      return 0;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('[Buffer] Oturum açık kullanıcı bulunamadı, flush ertelendi.');
      return 0;
    }

    // Get current battery level
    let batteryPct: number | null = null;
    try {
      const level = await Battery.getBatteryLevelAsync();
      if (level >= 0) {
        batteryPct = Math.round(level * 100);
      }
    } catch {
      // Battery info unavailable
    }

    const rowsToInsert = buffer.map((item) => ({
      user_id: user.id,
      location: `SRID=4326;POINT(${item.longitude} ${item.latitude})`,
      accuracy_m: item.accuracy_m !== null && item.accuracy_m !== undefined ? Math.round(item.accuracy_m * 10) / 10 : null,
      speed_kmh: item.speed_kmh !== null && item.speed_kmh !== undefined ? Math.round(item.speed_kmh * 10) / 10 : null,
      battery_level: batteryPct,
      is_mock: item.is_mock,
      activity_type: item.activity_type,
      recorded_at: item.recorded_at,
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('location_logs').insert(rowsToInsert);

    if (error) {
      console.error('[Buffer] Bulk insert hatası:', error);
      return 0;
    }

    // Successfully inserted -> remove these items from AsyncStorage
    const latestBuffer = await getBufferedLocations();
    const insertedIds = new Set(buffer.map((b) => b.id));
    const remainingBuffer = latestBuffer.filter((b) => !insertedIds.has(b.id));

    await AsyncStorage.setItem(
      LOCATION_BUFFER_KEY,
      JSON.stringify(remainingBuffer)
    );

    console.log(`[Buffer] ${rowsToInsert.length} kayıt başarıyla location_logs tablosuna gönderildi.`);
    return rowsToInsert.length;
  } catch (err) {
    console.error('[Buffer] flushLocationBuffer hatası:', err);
    return 0;
  }
}

export async function getPendingBufferCount(): Promise<number> {
  const buffer = await getBufferedLocations();
  return buffer.length;
}
