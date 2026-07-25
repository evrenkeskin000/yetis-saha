import type { SupabaseClient } from '@supabase/supabase-js';
import type { GeoPoint, Visit, VisitOutcome } from '@saha/shared';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import type { CustomerWithCategory } from './customers';

export interface CheckInResult {
  visit: Visit | null;
  isMockLocation: boolean;
  userLocation: GeoPoint;
  error?: string;
}

function extractPgMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string };
    return e.message || e.details || 'Ziyaret başlatılamadı';
  }
  return 'Ziyaret başlatılamadı';
}

export async function performCheckIn(
  supabase: SupabaseClient,
  customer: CustomerWithCategory
): Promise<CheckInResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Check-in yapabilmek için konum izni gereklidir.');
  }

  const locationResult = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const userLocation: GeoPoint = {
    latitude: locationResult.coords.latitude,
    longitude: locationResult.coords.longitude,
  };

  const isMockLocation = Boolean(locationResult.mocked);

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    throw new Error('Kullanıcı oturumu bulunamadı');
  }

  const idempotencyKey = Crypto.randomUUID();
  const ewktLocation = `SRID=4326;POINT(${userLocation.longitude} ${userLocation.latitude})`;

  const { data, error } = await supabase
    .from('visits')
    .insert({
      field_rep_id: authData.user.id,
      customer_id: customer.id,
      check_in_location: ewktLocation,
      is_mock_location: isMockLocation,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Tek açık ziyaret veya idempotency
      const msg = error.message || '';
      if (msg.includes('visits_one_open_per_rep') || msg.includes('field_rep_id')) {
        throw new Error(
          'Zaten açık bir ziyaretiniz var. Önce onu tamamlayın veya iptal edin.'
        );
      }
      const { data: existing } = await supabase
        .from('visits')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single();
      if (existing) {
        return {
          visit: existing as Visit,
          isMockLocation,
          userLocation,
        };
      }
    }
    throw new Error(extractPgMessage(error));
  }

  return {
    visit: data as Visit,
    isMockLocation,
    userLocation,
  };
}

export async function performCheckOut(
  supabase: SupabaseClient,
  visitId: string,
  outcome: VisitOutcome,
  notes?: string
): Promise<Visit> {
  let userLocation: GeoPoint | null = null;
  let isMockLocation: boolean | null = null;

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    userLocation = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
    isMockLocation = Boolean(loc.mocked);
  } catch {
    // GPS yoksa ziyaret yine kapanır (sunucu tetikleyicisi)
  }

  const ewktLocation = userLocation
    ? `SRID=4326;POINT(${userLocation.longitude} ${userLocation.latitude})`
    : null;

  const payload: Record<string, unknown> = {
    outcome,
    notes: notes || null,
    check_out_location: ewktLocation,
  };

  // O-01: yalnızca true ise gönder; GPS yoksa alanı ezme
  if (isMockLocation === true) {
    payload.is_mock_location = true;
  }

  const { data, error } = await supabase
    .from('visits')
    .update(payload)
    .eq('id', visitId)
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('Ziyaret sonlandırılamadı');
  }

  return data as Visit;
}

export async function performCancelVisit(
  supabase: SupabaseClient,
  visitId: string
): Promise<void> {
  const { error } = await supabase.rpc('cancel_visit', {
    p_visit_id: visitId,
  });
  if (error) {
    throw new Error(
      extractPgMessage(error) || 'Ziyaret iptal edilemedi, tekrar deneyin.'
    );
  }
}
