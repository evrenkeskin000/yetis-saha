import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Visit } from '@saha/shared';
import {
  activeCustomerKey,
  activePhotoKey,
  activeVisitKey,
} from '../constants/storageKeys';
import {
  fetchCustomerById,
  parsePostGisLocation,
  type CustomerWithCategory,
} from './customers';
import { supabase as defaultSupabase } from './supabase';

export interface ActivePhotoState {
  uri: string;
  width: number;
  height: number;
  timestamp: string;
  /** Filigranda kullanılan gerçek çekim GPS'i */
  captureLocation?: { latitude: number; longitude: number } | null;
  /** Check-out öncesi yükleme başarılıysa tekrar yüklemeyi engeller */
  uploadedPhotoId?: string | null;
}

async function resolveUserId(
  supabase: SupabaseClient = defaultSupabase
): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function saveActiveVisitState(
  visit: Visit | null,
  customer: CustomerWithCategory | null,
  photo?: ActivePhotoState | null,
  userId?: string | null
): Promise<void> {
  try {
    const uid = userId ?? (await resolveUserId());
    if (!uid) return;

    if (visit) {
      await AsyncStorage.setItem(activeVisitKey(uid), JSON.stringify(visit));
    } else {
      await AsyncStorage.removeItem(activeVisitKey(uid));
    }

    if (customer) {
      await AsyncStorage.setItem(
        activeCustomerKey(uid),
        JSON.stringify(customer)
      );
    } else {
      await AsyncStorage.removeItem(activeCustomerKey(uid));
    }

    if (photo) {
      await AsyncStorage.setItem(activePhotoKey(uid), JSON.stringify(photo));
    } else if (photo === null) {
      await AsyncStorage.removeItem(activePhotoKey(uid));
    }
  } catch (err) {
    console.error('Active visit save error:', err);
  }
}

export async function loadActiveVisitState(
  userId?: string | null
): Promise<{
  visit: Visit | null;
  customer: CustomerWithCategory | null;
  photo: ActivePhotoState | null;
}> {
  try {
    const uid = userId ?? (await resolveUserId());
    if (!uid) {
      return { visit: null, customer: null, photo: null };
    }

    const [visitStr, customerStr, photoStr] = await Promise.all([
      AsyncStorage.getItem(activeVisitKey(uid)),
      AsyncStorage.getItem(activeCustomerKey(uid)),
      AsyncStorage.getItem(activePhotoKey(uid)),
    ]);

    const visit = visitStr ? (JSON.parse(visitStr) as Visit) : null;
    const customer = customerStr
      ? (JSON.parse(customerStr) as CustomerWithCategory)
      : null;
    const photo = photoStr ? (JSON.parse(photoStr) as ActivePhotoState) : null;

    return { visit, customer, photo };
  } catch (err) {
    console.error('Active visit load error:', err);
    return { visit: null, customer: null, photo: null };
  }
}

export async function clearActiveVisitState(
  userId?: string | null
): Promise<void> {
  try {
    const uid = userId ?? (await resolveUserId());
    if (!uid) return;
    await Promise.all([
      AsyncStorage.removeItem(activeVisitKey(uid)),
      AsyncStorage.removeItem(activeCustomerKey(uid)),
      AsyncStorage.removeItem(activePhotoKey(uid)),
    ]);
  } catch (err) {
    console.error('Active visit clear error:', err);
  }
}

export async function recoverActiveVisitFromSupabase(
  supabase: SupabaseClient
): Promise<{
  visit: Visit | null;
  customer: CustomerWithCategory | null;
}> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return { visit: null, customer: null };

    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .select('*')
      .eq('field_rep_id', authData.user.id)
      .is('check_out_at', null)
      .order('check_in_at', { ascending: false })
      .maybeSingle();

    if (visitError || !visitData) {
      await clearActiveVisitState(authData.user.id);
      return { visit: null, customer: null };
    }

    const visit = visitData as Visit;

    const { data: profile } = await supabase
      .from('users')
      .select('dealership_id')
      .eq('id', authData.user.id)
      .maybeSingle();

    let customer: CustomerWithCategory | null = null;
    if (profile?.dealership_id) {
      customer = await fetchCustomerById(
        supabase,
        visit.customer_id,
        profile.dealership_id
      );
    } else {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*, category:categories(*)')
        .eq('id', visit.customer_id)
        .single();

      if (customerData) {
        const location = parsePostGisLocation(customerData.location);
        customer = {
          ...(customerData as unknown as CustomerWithCategory),
          location,
          locationMissing: !location,
        };
      }
    }

    await saveActiveVisitState(visit, customer, null, authData.user.id);
    return { visit, customer };
  } catch (err) {
    console.error('Active visit recovery error:', err);
    return { visit: null, customer: null };
  }
}
