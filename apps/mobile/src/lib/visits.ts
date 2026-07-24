import type { SupabaseClient } from '@supabase/supabase-js';
import type { GeoPoint, Visit, VisitOutcome } from '@saha/shared';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { haversineMeters } from './geo';
import type { CustomerWithCategory } from './customers';

export interface CheckInOptions {
  forceOutOfRange?: boolean;
}

export interface CheckInResult {
  visit: Visit | null;
  isGeofenceValid: boolean;
  distanceMeters: number;
  isMockLocation: boolean;
  userLocation: GeoPoint;
  error?: string;
}

export async function performCheckIn(
  supabase: SupabaseClient,
  customer: CustomerWithCategory,
  options?: CheckInOptions
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

  // Client Haversine distance
  const distanceMeters = haversineMeters(userLocation, customer.location);

  // Server PostGIS ST_DWithin RPC check
  let serverValid = false;
  try {
    const { data: rpcValid } = await supabase.rpc('validate_check_in_location', {
      p_customer_id: customer.id,
      p_location: `SRID=4326;POINT(${userLocation.longitude} ${userLocation.latitude})`,
    });
    serverValid = Boolean(rpcValid);
  } catch {
    serverValid = distanceMeters <= 100;
  }

  const isGeofenceValid = distanceMeters <= 100 && serverValid;

  // If geofence is invalid and user hasn't confirmed force check-in
  if (!isGeofenceValid && !options?.forceOutOfRange) {
    return {
      visit: null,
      isGeofenceValid: false,
      distanceMeters,
      isMockLocation,
      userLocation,
    };
  }

  // Perform insert with idempotency key
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
    // Handle idempotency duplicate insert cleanly
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('visits')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single();
      if (existing) {
        return {
          visit: existing as Visit,
          isGeofenceValid,
          distanceMeters,
          isMockLocation,
          userLocation,
        };
      }
    }
    throw error;
  }

  return {
    visit: data as Visit,
    isGeofenceValid,
    distanceMeters,
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
  let isMockLocation = false;

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
    // Location check-out fallback
  }

  const ewktLocation = userLocation
    ? `SRID=4326;POINT(${userLocation.longitude} ${userLocation.latitude})`
    : null;

  const { data, error } = await supabase
    .from('visits')
    .update({
      outcome,
      notes: notes || null,
      check_out_location: ewktLocation,
      is_mock_location: isMockLocation,
    })
    .eq('id', visitId)
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('Ziyaret sonlandırılamadı');
  }

  return data as Visit;
}
