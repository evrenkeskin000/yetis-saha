import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import {
  LAST_ACCEPTED_LOCATION_KEY,
  SAHA_BACKGROUND_LOCATION_TASK,
  FLUSH_BUFFER_SIZE_THRESHOLD,
} from '../constants/shift';
import { addLocationToBuffer, flushLocationBuffer } from './locationBuffer';
import {
  classifyActivity,
  shouldAcceptLocation,
  type StoredLastLocation,
} from './locationThrottle';

TaskManager.defineTask(
  SAHA_BACKGROUND_LOCATION_TASK,
  async ({ data, error }: { data?: any; error?: any }) => {
    if (error) {
      console.error('[VardiyaGorev] Arka plan konum hatası:', error);
      return;
    }

    if (!data || !data.locations || !Array.isArray(data.locations)) {
      return;
    }

    const locations = data.locations as LocationObject[];

    let lastLocJson: string | null = null;
    try {
      lastLocJson = await AsyncStorage.getItem(LAST_ACCEPTED_LOCATION_KEY);
    } catch {
      // ignore
    }
    let lastAcceptedLoc: StoredLastLocation | null = lastLocJson
      ? (JSON.parse(lastLocJson) as StoredLastLocation)
      : null;

    for (const loc of locations) {
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const accuracy = loc.coords.accuracy ?? null;
      const rawSpeed = loc.coords.speed;
      const speedKmh =
        rawSpeed !== null && rawSpeed !== undefined && rawSpeed >= 0
          ? rawSpeed * 3.6
          : null;
      const isMock = loc.mocked ?? false;
      const timestamp = loc.timestamp;

      const activityType = classifyActivity(speedKmh);

      const isAccepted = shouldAcceptLocation(
        lat,
        lng,
        timestamp,
        activityType,
        lastAcceptedLoc
      );

      if (isAccepted) {
        lastAcceptedLoc = { latitude: lat, longitude: lng, timestamp };
        try {
          await AsyncStorage.setItem(
            LAST_ACCEPTED_LOCATION_KEY,
            JSON.stringify(lastAcceptedLoc)
          );
        } catch {
          // ignore
        }

        const bufferCount = await addLocationToBuffer({
          latitude: lat,
          longitude: lng,
          accuracy_m: accuracy,
          speed_kmh: speedKmh,
          is_mock: isMock,
          activity_type: activityType,
          recorded_at: new Date(timestamp).toISOString(),
        });

        console.log(
          `[VardiyaGorev] Konum kabul edildi (${activityType}): ${lat.toFixed(5)}, ${lng.toFixed(5)} — Buffer: ${bufferCount}`
        );

        if (bufferCount >= FLUSH_BUFFER_SIZE_THRESHOLD) {
          console.log(
            '[VardiyaGorev] Buffer eşiği aşıldı, flush tetikleniyor...'
          );
          await flushLocationBuffer();
        }
      } else {
        console.log(
          `[VardiyaGorev] Konum seyreltme ile düşürüldü (${activityType})`
        );
      }
    }
  }
);
