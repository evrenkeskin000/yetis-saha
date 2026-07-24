import type { GeoPoint } from '@saha/shared';
export { toEwkt } from '@saha/shared';

/**
 * Parses PostGIS geometry string or GeoJSON object into GeoPoint ({ latitude, longitude }).
 * PostGIS SELECT returns GeoJSON object `{ type: 'Point', coordinates: [lng, lat] }`
 * or string `POINT(lng lat)` / `SRID=4326;POINT(lng lat)`.
 */
export function parseGeoPoint(location: unknown): GeoPoint | null {
  if (!location) return null;

  if (typeof location === 'object' && location !== null) {
    const loc = location as Record<string, unknown>;
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      const lng = Number(loc.coordinates[0]);
      const lat = Number(loc.coordinates[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    if ('latitude' in loc && 'longitude' in loc) {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  if (typeof location === 'string') {
    const match = location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  return null;
}
