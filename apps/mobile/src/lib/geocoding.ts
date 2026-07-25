/**
 * Nominatim (OpenStreetMap) tabanlı adres arama ve ters geocoding.
 *
 * Nominatim kullanım politikası gereği saniyede en fazla 1 istek atılır ve
 * uygulamayı tanıtan bir User-Agent gönderilir.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'SahaTakip/1.0 (saha ziyaret takip uygulamasi)';
const MIN_REQUEST_INTERVAL_MS = 1100;
const REQUEST_TIMEOUT_MS = 8000;

export interface PlaceResult {
  id: string;
  /** Kısa ad (ör. "Beşiktaş Manavı" veya "Barbaros Bulvarı") */
  name: string;
  /** Okunabilir tam adres */
  address: string;
  latitude: number;
  longitude: number;
}

interface NominatimAddress {
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

interface NominatimPlace {
  place_id?: number | string;
  osm_id?: number | string;
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

/**
 * Nominatim'in `address` nesnesinden Türkiye'ye uygun kısa adres üretir.
 * Örn: "Barbaros Bulvarı No:88, Beşiktaş / İstanbul"
 */
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

/** display_name'i "kısa ad" + "kalan adres" olarak ikiye böler. */
export function splitDisplayName(displayName: string | undefined): {
  name: string;
  address: string;
} {
  if (!displayName) return { name: '', address: '' };
  const parts = displayName.split(',').map((p) => p.trim());
  if (parts.length <= 1) return { name: displayName.trim(), address: '' };
  return { name: parts[0], address: parts.slice(1).join(', ') };
}

let lastRequestAt = 0;

/** Nominatim politikası için istekler arasında en az 1 sn bırakır. */
async function throttle(): Promise<void> {
  const waitMs = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestAt = Date.now();
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  await throttle();

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  // Çağıran taraf iptal ederse (yeni arama) kendi controller'ımızı da iptal et
  const onAbort = () => timeoutController.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      throw new Error(`Adres servisi yanıt vermedi (${response.status})`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

function toPlaceResult(place: NominatimPlace, index: number): PlaceResult | null {
  const latitude = parseFloat(String(place.lat));
  const longitude = parseFloat(String(place.lon));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const fromDisplay = splitDisplayName(place.display_name);
  const detailed = formatAddress(place.address);

  return {
    id: String(place.place_id ?? place.osm_id ?? `${latitude},${longitude}-${index}`),
    name: place.name || fromDisplay.name || 'Adsız konum',
    address: detailed || fromDisplay.address,
    latitude,
    longitude,
  };
}

/**
 * Adres/işletme adına göre arama yapar. Sonuçlar Türkiye ile sınırlıdır.
 * `viewbox` verilirse o bölgedeki sonuçlar öne çıkar (kullanıcının konumu).
 */
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
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'tr',
    'accept-language': 'tr',
    limit: String(options.limit ?? 8),
  });

  // Kullanıcının çevresini öncelikle göster (sonuçları bu alana kısıtlamaz)
  if (options.near) {
    const { latitude, longitude } = options.near;
    const delta = 0.75; // ~80 km
    params.set(
      'viewbox',
      [
        longitude - delta,
        latitude + delta,
        longitude + delta,
        latitude - delta,
      ].join(',')
    );
  }

  const data = await requestJson<NominatimPlace[]>(
    `${NOMINATIM_BASE}/search?${params.toString()}`,
    options.signal
  );

  if (!Array.isArray(data)) return [];

  return data
    .map((place, index) => toPlaceResult(place, index))
    .filter((place): place is PlaceResult => place !== null);
}

/** Koordinatı okunabilir adrese çevirir. Bulunamazsa null döner. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  options: { signal?: AbortSignal } = {}
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
    'accept-language': 'tr',
  });

  const data = await requestJson<NominatimPlace>(
    `${NOMINATIM_BASE}/reverse?${params.toString()}`,
    options.signal
  );

  const formatted = formatAddress(data?.address);
  if (formatted) return formatted;

  const fallback = splitDisplayName(data?.display_name);
  const joined = [fallback.name, fallback.address].filter(Boolean).join(', ');
  return joined || null;
}
