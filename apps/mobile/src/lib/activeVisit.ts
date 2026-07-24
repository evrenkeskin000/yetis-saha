import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Visit } from '@saha/shared';
import { fetchCustomers, parsePostGisLocation, type CustomerWithCategory } from './customers';

const KEY_ACTIVE_VISIT = '@active_visit';
const KEY_ACTIVE_CUSTOMER = '@active_customer';
const KEY_ACTIVE_PHOTO = '@active_photo';

export interface ActivePhotoState {
  uri: string;
  width: number;
  height: number;
  timestamp: string;
}

export async function saveActiveVisitState(
  visit: Visit | null,
  customer: CustomerWithCategory | null,
  photo?: ActivePhotoState | null
): Promise<void> {
  try {
    if (visit) {
      await AsyncStorage.setItem(KEY_ACTIVE_VISIT, JSON.stringify(visit));
    } else {
      await AsyncStorage.removeItem(KEY_ACTIVE_VISIT);
    }

    if (customer) {
      await AsyncStorage.setItem(KEY_ACTIVE_CUSTOMER, JSON.stringify(customer));
    } else {
      await AsyncStorage.removeItem(KEY_ACTIVE_CUSTOMER);
    }

    if (photo) {
      await AsyncStorage.setItem(KEY_ACTIVE_PHOTO, JSON.stringify(photo));
    } else if (photo === null) {
      await AsyncStorage.removeItem(KEY_ACTIVE_PHOTO);
    }
  } catch (err) {
    console.error('Active visit save error:', err);
  }
}

export async function loadActiveVisitState(): Promise<{
  visit: Visit | null;
  customer: CustomerWithCategory | null;
  photo: ActivePhotoState | null;
}> {
  try {
    const [visitStr, customerStr, photoStr] = await Promise.all([
      AsyncStorage.getItem(KEY_ACTIVE_VISIT),
      AsyncStorage.getItem(KEY_ACTIVE_CUSTOMER),
      AsyncStorage.getItem(KEY_ACTIVE_PHOTO),
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

export async function clearActiveVisitState(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEY_ACTIVE_VISIT),
      AsyncStorage.removeItem(KEY_ACTIVE_CUSTOMER),
      AsyncStorage.removeItem(KEY_ACTIVE_PHOTO),
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

    // Query active visit (check_out_at is null)
    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .select('*')
      .eq('field_rep_id', authData.user.id)
      .is('check_out_at', null)
      .order('check_in_at', { ascending: false })
      .maybeSingle();

    if (visitError || !visitData) {
      await clearActiveVisitState();
      return { visit: null, customer: null };
    }

    const visit = visitData as Visit;

    // Fetch customer details for active visit
    const { data: customerData } = await supabase
      .from('customers')
      .select('*, category:categories(*)')
      .eq('id', visit.customer_id)
      .single();

    let customer: CustomerWithCategory | null = null;
    if (customerData) {
      customer = {
        ...(customerData as unknown as CustomerWithCategory),
        location: parsePostGisLocation(customerData.location),
      };
    }

    await saveActiveVisitState(visit, customer);
    return { visit, customer };
  } catch (err) {
    console.error('Active visit recovery error:', err);
    return { visit: null, customer: null };
  }
}
