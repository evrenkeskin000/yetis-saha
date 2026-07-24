import type { SupabaseClient } from '@supabase/supabase-js';
import type { Customer, Category, Visit, VisitPhoto, GeoPoint } from '@saha/shared';
import { customerFormSchema, type CustomerFormValues, toEwkt } from '@saha/shared';
import { haversineMeters } from './geo';

export interface CustomerWithCategory extends Customer {
  category?: Category | null;
}

export interface CustomerDetailData {
  customer: CustomerWithCategory;
  visits: Visit[];
  photos: (VisitPhoto & { signed_url?: string })[];
}

/**
 * Parses PostGIS geometry column into GeoPoint { latitude, longitude }.
 * Handles GeoJSON objects, EWKT/WKT strings, and EWKB hex strings.
 */
export function parsePostGisLocation(raw: unknown): GeoPoint {
  if (!raw) {
    return { latitude: 39.0, longitude: 35.0 };
  }

  // Case 1: GeoPoint already
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'latitude' in raw &&
    'longitude' in raw
  ) {
    const p = raw as { latitude: number; longitude: number };
    return { latitude: Number(p.latitude), longitude: Number(p.longitude) };
  }

  // Case 2: GeoJSON object { type: 'Point', coordinates: [lng, lat] }
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'coordinates' in raw &&
    Array.isArray((raw as { coordinates: unknown }).coordinates)
  ) {
    const coords = (raw as { coordinates: number[] }).coordinates;
    if (coords.length >= 2) {
      return { latitude: Number(coords[1]), longitude: Number(coords[0]) };
    }
  }

  // Case 3: EWKT / WKT string
  if (typeof raw === 'string') {
    const pointMatch = raw.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (pointMatch) {
      return {
        longitude: parseFloat(pointMatch[1]),
        latitude: parseFloat(pointMatch[2]),
      };
    }

    // Case 4: EWKB Hex string
    if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 42) {
      const parsed = parseEwkbHex(raw);
      if (parsed) return parsed;
    }
  }

  return { latitude: 39.0, longitude: 35.0 };
}

function parseEwkbHex(hex: string): GeoPoint | null {
  try {
    const match = hex.match(/.{1,2}/g);
    if (!match) return null;
    const bytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)));
    if (bytes.length < 21) return null;
    const isLittleEndian = bytes[0] === 1;
    const view = new DataView(bytes.buffer);
    const type = view.getUint32(1, isLittleEndian);
    const hasSrid = (type & 0x20000000) !== 0 || (type & 0x0fffffff) === 1;
    let offset = 5;
    if (hasSrid && bytes.length >= 25) {
      offset = 9;
    }
    const lng = view.getFloat64(offset, isLittleEndian);
    const lat = view.getFloat64(offset + 8, isLittleEndian);
    if (isNaN(lng) || isNaN(lat)) return null;
    return { latitude: lat, longitude: lng };
  } catch {
    return null;
  }
}

/**
 * Normalizes Turkish string for case-insensitive search.
 */
export function normalizeTr(str: string): string {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ı/g, 'i');
}

export async function fetchCategories(
  supabase: SupabaseClient
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchCustomers(
  supabase: SupabaseClient
): Promise<CustomerWithCategory[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*, category:categories(*)')
    .eq('is_active', true);

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((item) => ({
    ...(item as unknown as CustomerWithCategory),
    location: parsePostGisLocation(item.location),
  }));
}

/**
 * Returns a Map of customer_id -> latest check_in_at ISO string
 */
export async function fetchLastVisitsMap(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('visits')
    .select('customer_id, check_in_at')
    .order('check_in_at', { ascending: false });

  if (error) throw error;

  const visitsMap = new Map<string, string>();
  for (const visit of data ?? []) {
    if (!visitsMap.has(visit.customer_id)) {
      visitsMap.set(visit.customer_id, visit.check_in_at);
    }
  }
  return visitsMap;
}

export async function fetchCustomerDetail(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerDetailData> {
  const { data: customerData, error: customerErr } = await supabase
    .from('customers')
    .select('*, category:categories(*)')
    .eq('id', customerId)
    .single();

  if (customerErr || !customerData) {
    throw customerErr ?? new Error('Esnaf bulunamadı');
  }

  const customer: CustomerWithCategory = {
    ...(customerData as unknown as CustomerWithCategory),
    location: parsePostGisLocation(customerData.location),
  };

  const { data: visitsData, error: visitsErr } = await supabase
    .from('visits')
    .select('*')
    .eq('customer_id', customerId)
    .order('check_in_at', { ascending: false });

  if (visitsErr) throw visitsErr;
  const visits = (visitsData ?? []) as Visit[];

  const visitIds = visits.map((v) => v.id);
  let photos: (VisitPhoto & { signed_url?: string })[] = [];

  if (visitIds.length > 0) {
    const { data: photosData, error: photosErr } = await supabase
      .from('visit_photos')
      .select('*')
      .in('visit_id', visitIds)
      .order('captured_at', { ascending: false });

    if (!photosErr && photosData) {
      photos = await Promise.all(
        photosData.map(async (photo) => {
          try {
            const { data: signedData } = await supabase.storage
              .from('visit-photos')
              .createSignedUrl(photo.storage_path, 3600);
            return {
              ...(photo as VisitPhoto),
              signed_url: signedData?.signedUrl,
            };
          } catch {
            return photo as VisitPhoto;
          }
        })
      );
    }
  }

  return { customer, visits, photos };
}

export async function createCustomer(
  supabase: SupabaseClient,
  values: CustomerFormValues
): Promise<Customer> {
  const validated = customerFormSchema.parse(values);
  const ewktLocation = toEwkt(validated.location);

  const { data, error } = await supabase
    .from('customers')
    .insert({
      business_name: validated.business_name,
      owner_name: validated.owner_name || null,
      phone: validated.phone || null,
      address: validated.address || null,
      category_id: validated.category_id,
      location: ewktLocation,
      geofence_radius_m: validated.geofence_radius_m,
      notes: validated.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    ...(data as Customer),
    location: parsePostGisLocation(data.location),
  };
}

export function filterCustomersBySearch(
  customers: CustomerWithCategory[],
  searchText: string
): CustomerWithCategory[] {
  if (!searchText.trim()) return customers;
  const normSearch = normalizeTr(searchText.trim());

  return customers.filter((c) => {
    const nameMatch = c.business_name && normalizeTr(c.business_name).includes(normSearch);
    const ownerMatch = c.owner_name && normalizeTr(c.owner_name).includes(normSearch);
    const addressMatch = c.address && normalizeTr(c.address).includes(normSearch);
    const phoneMatch = c.phone && c.phone.includes(searchText.trim());
    return Boolean(nameMatch || ownerMatch || addressMatch || phoneMatch);
  });
}

export function sortCustomersByLastVisit(
  customers: CustomerWithCategory[],
  lastVisitsMap: Map<string, string>
): CustomerWithCategory[] {
  return [...customers].sort((a, b) => {
    const visitA = lastVisitsMap.get(a.id);
    const visitB = lastVisitsMap.get(b.id);

    // Unvisited first
    if (!visitA && !visitB) {
      return a.business_name.localeCompare(b.business_name, 'tr');
    }
    if (!visitA) return -1;
    if (!visitB) return 1;

    // Oldest visited first
    return new Date(visitA).getTime() - new Date(visitB).getTime();
  });
}

export function sortCustomersByName(
  customers: CustomerWithCategory[]
): CustomerWithCategory[] {
  return [...customers].sort((a, b) =>
    a.business_name.localeCompare(b.business_name, 'tr')
  );
}

export function sortCustomersByDistance(
  customers: CustomerWithCategory[],
  userLocation: GeoPoint
): CustomerWithCategory[] {
  return [...customers].sort((a, b) => {
    const distA = haversineMeters(userLocation, a.location);
    const distB = haversineMeters(userLocation, b.location);
    return distA - distB;
  });
}
