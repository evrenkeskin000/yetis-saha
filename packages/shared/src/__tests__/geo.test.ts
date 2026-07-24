import { describe, expect, it } from 'vitest';
import { generateUUID, getTodayStartIso, toEwkt } from '../geo';

describe('geo helpers', () => {
  describe('toEwkt', () => {
    it('should format GeoPoint to PostGIS EWKT format with longitude first', () => {
      const point = { latitude: 40.9903, longitude: 29.027 };
      expect(toEwkt(point)).toBe('SRID=4326;POINT(29.027 40.9903)');
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID strings', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('getTodayStartIso', () => {
    it('should compute UTC+3 (TR) start of day in UTC ISO string', () => {
      // 2026-07-24T10:00:00.000Z UTC corresponds to 13:00 TR time.
      // TR start of day for 2026-07-24 is 2026-07-24T00:00:00+03:00 -> 2026-07-23T21:00:00.000Z UTC.
      const date = new Date('2026-07-24T10:00:00.000Z');
      expect(getTodayStartIso(date)).toBe('2026-07-23T21:00:00.000Z');
    });

    it('should handle early UTC hours that fall into current TR date', () => {
      // 2026-07-23T22:30:00.000Z UTC is 2026-07-24T01:30:00 TR time.
      // TR date is 2026-07-24, so TR start of day is 2026-07-23T21:00:00.000Z.
      const date = new Date('2026-07-23T22:30:00.000Z');
      expect(getTodayStartIso(date)).toBe('2026-07-23T21:00:00.000Z');
    });
  });
});
