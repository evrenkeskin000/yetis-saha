import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Customer,
  Category,
  Visit,
  VisitPhoto,
  GeoPoint,
  NearbyCustomer,
} from '@saha/shared';
import {
  customerFormSchema,
  type CustomerFormValues,
  toEwkt,
} from '@saha/shared';
import { haversineMeters } from './geo';

export interface CustomerWithCategory extends Omit<Customer, 'location'> {
  location: GeoPoint | null;
  locationMissing?: boolean;
  category?: Category | null;
}

export interface CustomerDetailData {
  customer: CustomerWithCategory;
  visits: Visit[];
  photos: (VisitPhoto & { signed_url?: string })[];
}

export class CustomerAccessError extends Error {
  constructor(message = 'Bu esnafa erişiminiz yok.') {
    super(message);
    this.name = 'CustomerAccessError';
  }
}

/**
 * Parses PostGIS geometry into GeoPoint.
 * Hatalı/eksik geometride null döner (Türkiye merkezine düşmez).
 */
export function parsePostGisLocation(raw: unknown): GeoPoint | null {
  if (!raw) {
    return null;
  }

  if (
    typeof raw === 'object' &&
    raw !== null &&
    'latitude' in raw &&
    'longitude' in raw
  ) {
    const p = raw as { latitude: number; longitude: number };
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { latitude: lat, longitude: lng };
  }

  if (
    typeof raw === 'object' &&
    raw !== null &&
    'coordinates' in raw &&
    Array.isArray((raw as { coordinates: unknown }).coordinates)
  ) {
    const coords = (raw as { coordinates: number[] }).coordinates;
    if (coords.length >= 2) {
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { latitude: lat, longitude: lng };
    }
  }

  if (typeof raw === 'string') {
    const pointMatch = raw.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (pointMatch) {
      return {
        longitude: parseFloat(pointMatch[1]),
        latitude: parseFloat(pointMatch[2]),
      };
    }

    if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 42) {
      const parsed = parseEwkbHex(raw);
      if (parsed) return parsed;
    }
  }

  return null;
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

function mapCustomerRow(item: Record<string, unknown>): CustomerWithCategory {
  const location = parsePostGisLocation(item.location);
  return {
    ...(item as unknown as CustomerWithCategory),
    location,
    locationMissing: !location,
  };
}

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
  supabase: SupabaseClient,
  dealershipId: string
): Promise<CustomerWithCategory[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .eq('dealership_id', dealershipId);

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map(mapCustomerRow);
}

export async function fetchNearbyCustomers(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  radiusM = 2000
): Promise<CustomerWithCategory[]> {
  const { data, error } = await supabase.rpc('get_customers_nearby', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  });

  if (error) throw error;

  const nearby = (data ?? []) as NearbyCustomer[];
  return nearby.map((n) => ({
    id: n.id,
    business_name: n.business_name,
    owner_name: n.owner_name,
    phone: n.phone,
    address: n.address,
    category_id: n.category_id,
    location:
      n.lat != null && n.lng != null
        ? { latitude: n.lat, longitude: n.lng }
        : null,
    locationMissing: n.lat == null || n.lng == null,
    notes: n.notes,
    is_active: true,
    dealership_id: n.dealership_id ?? '',
    created_by: '',
    created_at: '',
    category: null,
  }));
}

export async function fetchLastVisitsMap(
  supabase: SupabaseClient,
  dealershipId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('visits')
    .select('customer_id, check_in_at')
    .eq('dealership_id', dealershipId)
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

export async function fetchCustomerById(
  supabase: SupabaseClient,
  customerId: string,
  dealershipId: string
): Promise<CustomerWithCategory | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*, category:categories(*)')
    .eq('id', customerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  if (data.dealership_id !== dealershipId) {
    return null;
  }

  return mapCustomerRow(data as Record<string, unknown>);
}

export async function fetchCustomerDetail(
  supabase: SupabaseClient,
  customerId: string,
  dealershipId: string
): Promise<CustomerDetailData> {
  const customer = await fetchCustomerById(supabase, customerId, dealershipId);
  if (!customer) {
    throw new CustomerAccessError();
  }

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
  values: CustomerFormValues,
  opts: { dealershipId: string; createdBy: string }
): Promise<CustomerWithCategory> {
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
      notes: validated.notes || null,
      dealership_id: opts.dealershipId,
      created_by: opts.createdBy,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42501') {
      throw new Error('Bu işlem için yetkiniz yok.');
    }
    throw error;
  }

  return mapCustomerRow(data as Record<string, unknown>);
}

export async function updateCustomer(
  supabase: SupabaseClient,
  customerId: string,
  values: CustomerFormValues,
  opts: { userId: string }
): Promise<CustomerWithCategory> {
  const validated = customerFormSchema.parse(values);
  const ewktLocation = toEwkt(validated.location);

  const { data, error } = await supabase
    .from('customers')
    .update({
      business_name: validated.business_name,
      owner_name: validated.owner_name || null,
      phone: validated.phone || null,
      address: validated.address || null,
      category_id: validated.category_id,
      location: ewktLocation,
      notes: validated.notes || null,
    })
    .eq('id', customerId)
    .eq('created_by', opts.userId)
    .select()
    .single();

  if (error) {
    if (error.code === '42501') {
      throw new Error('Bu işlem için yetkiniz yok.');
    }
    if (error.code === 'PGRST116') {
      throw new Error('Bu esnafı düzenleme yetkiniz yok.');
    }
    throw error;
  }

  return mapCustomerRow(data as Record<string, unknown>);
}

export function filterCustomersBySearch(
  customers: CustomerWithCategory[],
  searchText: string
): CustomerWithCategory[] {
  if (!searchText.trim()) return customers;
  const normSearch = normalizeTr(searchText.trim());

  return customers.filter((c) => {
    const nameMatch =
      c.business_name && normalizeTr(c.business_name).includes(normSearch);
    const ownerMatch =
      c.owner_name && normalizeTr(c.owner_name).includes(normSearch);
    const addressMatch =
      c.address && normalizeTr(c.address).includes(normSearch);
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

    if (!visitA && !visitB) {
      return a.business_name.localeCompare(b.business_name, 'tr');
    }
    if (!visitA) return -1;
    if (!visitB) return 1;

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
    if (!a.location && !b.location) return 0;
    if (!a.location) return 1;
    if (!b.location) return -1;
    const distA = haversineMeters(userLocation, a.location);
    const distB = haversineMeters(userLocation, b.location);
    return distA - distB;
  });
}
