import type { GeoPoint } from './types';

export function toEwkt(p: GeoPoint): string {
  return `SRID=4326;POINT(${p.longitude} ${p.latitude})`;
}

export function generateUUID(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getTodayStartIso(now?: Date): string {
  const d = now ?? new Date();
  const trTime = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const year = trTime.getUTCFullYear();
  const month = trTime.getUTCMonth();
  const date = trTime.getUTCDate();
  const startOfDayTrUtc = new Date(
    Date.UTC(year, month, date, 0, 0, 0, 0) - 3 * 60 * 60 * 1000
  );
  return startOfDayTrUtc.toISOString();
}
