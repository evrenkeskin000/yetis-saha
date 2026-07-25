/**
 * Nominatim adres yardımcıları + istemci API çağrıları.
 * Tarayıcıdan doğrudan Nominatim'e gitmek yerine /api/geocode proxy kullanılır
 * (User-Agent, CORS, rate limit).
 */

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface NominatimAddress {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  town?: string;
  village?: string;
  city_district?: string;
  county?: string;
  city?: string;
  province?: string;
  state?: string;
}

export function formatAddress(address: NominatimAddress | undefined): string {
  if (!address) return '';

  const street = [address.road, address.house_number]
    .filter(Boolean)
    .join(' No:');

  const mahalle = address.neighbourhood || address.quarter || address.suburb;

  const ilce =
    address.county || address.city_district || address.town || address.village;

  const il = address.province || address.state || address.city;

  const locality = [ilce, il].filter(Boolean).join(' / ');

  return [street, mahalle, locality].filter(Boolean).join(', ');
}

export function splitDisplayName(displayName: string | undefined): {
  name: string;
  address: string;
} {
  if (!displayName) return { name: '', address: '' };
  const parts = displayName.split(',').map((p) => p.trim());
  if (parts.length <= 1) return { name: displayName.trim(), address: '' };
  return { name: parts[0], address: parts.slice(1).join(', ') };
}

export async function searchPlaces(
  query: string,
  options: {
    signal?: AbortSignal;
    near?: { latitude: number; longitude: number } | null;
    limit?: number;
  } = {}
): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(options.limit ?? 8),
  });
  if (options.near) {
    params.set('lat', String(options.near.latitude));
    params.set('lon', String(options.near.longitude));
  }

  const res = await fetch(`/api/geocode/search?${params.toString()}`, {
    signal: options.signal,
  });
  if (!res.ok) {
    throw new Error('Adres aranamadı');
  }
  const data = (await res.json()) as { results?: PlaceResult[] };
  return Array.isArray(data.results) ? data.results : [];
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  options: { signal?: AbortSignal } = {}
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  const res = await fetch(`/api/geocode/reverse?${params.toString()}`, {
    signal: options.signal,
  });
  if (!res.ok) {
    throw new Error('Adres çözümlenemedi');
  }
  const data = (await res.json()) as { address?: string | null };
  return data.address ?? null;
}
