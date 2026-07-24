import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import type { ActivityType } from '@saha/shared';
import {
  LAST_ACCEPTED_LOCATION_KEY,
  SAHA_BACKGROUND_LOCATION_TASK,
  SPEED_KMH_DRIVING_MIN,
  SPEED_KMH_WALKING_MIN,
  THROTTLE_DRIVING_MIN_DIST_M,
  THROTTLE_DRIVING_MIN_TIME_SEC,
  THROTTLE_STILL_MIN_DIST_M,
  THROTTLE_STILL_MIN_TIME_SEC,
  THROTTLE_WALKING_MIN_DIST_M,
  FLUSH_BUFFER_SIZE_THRESHOLD,
} from '../constants/shift';
import { addLocationToBuffer, flushLocationBuffer } from './locationBuffer';

interface StoredLastLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

/**
 * Calculates distance between two coordinates in meters using the Haversine formula.
 */
function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function classifyActivity(speedKmh: number | null): ActivityType {
  if (speedKmh === null || speedKmh < 0) {
    return 'unknown';
  }
  if (speedKmh < SPEED_KMH_WALKING_MIN) {
    return 'still';
  }
  if (speedKmh <= SPEED_KMH_DRIVING_MIN) {
    return 'walking';
  }
  return 'driving';
}

function shouldAcceptLocation(
  currentLat: number,
  currentLng: number,
  currentTimestamp: number,
  activityType: ActivityType,
  lastLoc: StoredLastLocation | null
): boolean {
  if (!lastLoc) {
    return true; // Always accept first location
  }

  const distMeters = getDistanceMeters(
    lastLoc.latitude,
    lastLoc.longitude,
    currentLat,
    currentLng
  );
  const timeDiffSec = (currentTimestamp - lastLoc.timestamp) / 1000;

  switch (activityType) {
    case 'still':
      // Drop if dist < 20m OR time < 60s
      if (distMeters < THROTTLE_STILL_MIN_DIST_M || timeDiffSec < THROTTLE_STILL_MIN_TIME_SEC) {
        return false;
      }
      break;

    case 'walking':
    case 'unknown':
      // Drop if dist < 50m
      if (distMeters < THROTTLE_WALKING_MIN_DIST_M) {
        return false;
      }
      break;

    case 'driving':
      // Drop if dist < 200m AND time < 30s
      if (distMeters < THROTTLE_DRIVING_MIN_DIST_M && timeDiffSec < THROTTLE_DRIVING_MIN_TIME_SEC) {
        return false;
      }
      break;
  }

  return true;
}

// Define task in global scope
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

    let newlyAcceptedCount = 0;

    for (const loc of locations) {
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const accuracy = loc.coords.accuracy ?? null;
      const rawSpeed = loc.coords.speed;
      const speedKmh = rawSpeed !== null && rawSpeed !== undefined && rawSpeed >= 0
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

        newlyAcceptedCount++;
        console.log(
          `[VardiyaGorev] Konum kabul edildi (${activityType}): ${lat.toFixed(5)}, ${lng.toFixed(5)} — Buffer: ${bufferCount}`
        );

        if (bufferCount >= FLUSH_BUFFER_SIZE_THRESHOLD) {
          console.log('[VardiyaGorev] Buffer eşiği aşıldı, flush tetikleniyor...');
          await flushLocationBuffer();
        }
      } else {
        console.log(`[VardiyaGorev] Konum seyreltme ile düşürüldü (${activityType})`);
      }
    }
  }
);
