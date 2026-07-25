import type { SupabaseClient } from '@supabase/supabase-js';
import { VISIT_PHOTOS_BUCKET } from './constants';
import { generateUUID, getTodayStartIso, toEwkt } from './geo';
import type {
  CompleteVisitInput,
  CreateVisitInput,
  NearbyCustomer,
  UploadVisitPhotoInput,
  Visit,
  VisitPhoto,
  VisitWithCustomer,
} from './types';
import { checkInSchema, visitCompletionSchema } from './validation';

const VISIT_SELECT_COLUMNS =
  'id, idempotency_key, field_rep_id, customer_id, dealership_id, customer_snapshot, check_in_at, check_out_at, cancelled_at, duration_minutes, outcome, notes, is_mock_location, synced_at, created_at';
// SHARED İHTİYACI (E19): cancelled_at select'e eklendi — iptal durumu rozeti için.

export async function getTodayVisits(
  supabase: SupabaseClient,
  fieldRepId: string
): Promise<VisitWithCustomer[]> {
  const todayStart = getTodayStartIso();
  const { data, error } = await supabase
    .from('visits')
    .select(
      `${VISIT_SELECT_COLUMNS}, customer:customers(id, business_name, address, category_id)`
    )
    .eq('field_rep_id', fieldRepId)
    .gte('check_in_at', todayStart)
    .order('check_in_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as VisitWithCustomer[];
}

export async function getActiveVisit(
  supabase: SupabaseClient,
  fieldRepId: string
): Promise<Visit | null> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('field_rep_id', fieldRepId)
    .is('check_out_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Visit | null;
}

export async function getCustomersNearby(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  radiusM = 1000
): Promise<NearbyCustomer[]> {
  const { data, error } = await supabase.rpc('get_customers_nearby', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as NearbyCustomer[];
}

export interface VisitHistoryOptions {
  limit?: number;
  offset?: number;
}

/** Temsilcinin kendi geçmişi; snapshot alanlarını da seçer (E19). */
export async function getVisitHistory(
  supabase: SupabaseClient,
  fieldRepId: string,
  options: VisitHistoryOptions = {}
): Promise<Visit[]> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_SELECT_COLUMNS)
    .eq('field_rep_id', fieldRepId)
    .order('check_in_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return (data ?? []) as Visit[];
}

export async function createVisit(
  supabase: SupabaseClient,
  input: CreateVisitInput
): Promise<Visit> {
  if (!input.field_rep_id) {
    throw new Error('field_rep_id zorunludur');
  }

  const validated = checkInSchema.parse({
    customer_id: input.customer_id,
    location: input.location,
    is_mock_location: input.is_mock_location,
    notes: input.notes,
  });

  const idempotency_key = input.idempotency_key ?? generateUUID();
  const ewktLocation = toEwkt(validated.location);

  const { data, error } = await supabase
    .from('visits')
    .insert({
      field_rep_id: input.field_rep_id,
      customer_id: validated.customer_id,
      check_in_location: ewktLocation,
      is_mock_location: validated.is_mock_location,
      notes: validated.notes,
      idempotency_key,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: fetchErr } = await supabase
        .from('visits')
        .select('*')
        .eq('idempotency_key', idempotency_key)
        .single();

      if (fetchErr || !existing) {
        throw error;
      }
      return existing as Visit;
    }
    throw error;
  }

  return data as Visit;
}

export async function completeVisit(
  supabase: SupabaseClient,
  input: CompleteVisitInput
): Promise<Visit> {
  const validated = visitCompletionSchema.parse({
    visit_id: input.visit_id,
    outcome: input.outcome,
    location: input.location,
    notes: input.notes,
    is_mock_location: input.is_mock_location,
  });

  const ewktLocation = toEwkt(validated.location);

  const { data, error } = await supabase
    .from('visits')
    .update({
      outcome: validated.outcome,
      notes: validated.notes,
      check_out_location: ewktLocation,
      is_mock_location: validated.is_mock_location,
    })
    .eq('id', validated.visit_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Visit;
}

export async function uploadVisitPhoto(
  supabase: SupabaseClient,
  input: UploadVisitPhotoInput
): Promise<VisitPhoto> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error(authError?.message ?? 'Kullanıcı oturumu bulunamadı');
  }

  const userId = authData.user.id;
  const photoUuid = generateUUID();
  const fileExt = input.file_ext ? input.file_ext.replace(/^\./, '') : 'jpg';
  const storagePath = `${userId}/${input.visit_id}/${photoUuid}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(VISIT_PHOTOS_BUCKET)
    .upload(storagePath, input.data, {
      contentType: input.content_type ?? 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: dbData, error: dbError } = await supabase
    .from('visit_photos')
    .insert({
      visit_id: input.visit_id,
      storage_path: storagePath,
      captured_at: input.captured_at ?? new Date().toISOString(),
      capture_location: input.location ? toEwkt(input.location) : null,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from(VISIT_PHOTOS_BUCKET).remove([storagePath]);
    throw dbError;
  }

  return dbData as VisitPhoto;
}

export async function getVisitPhotoUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSec = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(VISIT_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, expiresInSec);

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Fotoğraf bağlantısı oluşturulamadı');
  }

  return data.signedUrl;
}
