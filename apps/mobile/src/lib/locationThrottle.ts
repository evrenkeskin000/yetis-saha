import type { ActivityType } from '@saha/shared';
import {
  SPEED_KMH_DRIVING_MIN,
  SPEED_KMH_WALKING_MIN,
  THROTTLE_DRIVING_MIN_DIST_M,
  THROTTLE_DRIVING_MIN_TIME_SEC,
  THROTTLE_STILL_MIN_DIST_M,
  THROTTLE_STILL_MIN_TIME_SEC,
  THROTTLE_WALKING_MIN_DIST_M,
} from '../constants/shift';

export interface StoredLastLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

/** Haversine mesafe (metre). */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
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

export function classifyActivity(speedKmh: number | null): ActivityType {
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

export function shouldAcceptLocation(
  currentLat: number,
  currentLng: number,
  currentTimestamp: number,
  activityType: ActivityType,
  lastLoc: StoredLastLocation | null
): boolean {
  if (!lastLoc) {
    return true;
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
      // Yerinde duran temsilci de süre dolunca kayıt üretsin; aksi halde
      // panelde "sahada" görünmez.
      if (
        distMeters < THROTTLE_STILL_MIN_DIST_M &&
        timeDiffSec < THROTTLE_STILL_MIN_TIME_SEC
      ) {
        return false;
      }
      break;
    case 'walking':
    case 'unknown':
      if (distMeters < THROTTLE_WALKING_MIN_DIST_M) {
        return false;
      }
      break;
    case 'driving':
      if (
        distMeters < THROTTLE_DRIVING_MIN_DIST_M &&
        timeDiffSec < THROTTLE_DRIVING_MIN_TIME_SEC
      ) {
        return false;
      }
      break;
  }

  return true;
}
