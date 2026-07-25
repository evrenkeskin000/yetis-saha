/** Merkezi AsyncStorage anahtar şeması — kullanıcı/bayi izolasyonu. */

export const LEGACY_LOCATION_BUFFER_KEY = '@saha_location_buffer_v1';
export const LEGACY_ACTIVE_VISIT_KEY = '@active_visit';
export const LEGACY_ACTIVE_CUSTOMER_KEY = '@active_customer';
export const LEGACY_ACTIVE_PHOTO_KEY = '@active_photo';

export function locationBufferKey(userId: string): string {
  return `@saha_location_buffer_v1:${userId}`;
}

export function activeVisitKey(userId: string): string {
  return `@active_visit:${userId}`;
}

export function activeCustomerKey(userId: string): string {
  return `@active_customer:${userId}`;
}

export function activePhotoKey(userId: string): string {
  return `@active_photo:${userId}`;
}

export const USER_SCOPED_LEGACY_KEYS = [
  LEGACY_LOCATION_BUFFER_KEY,
  LEGACY_ACTIVE_VISIT_KEY,
  LEGACY_ACTIVE_CUSTOMER_KEY,
  LEGACY_ACTIVE_PHOTO_KEY,
] as const;
