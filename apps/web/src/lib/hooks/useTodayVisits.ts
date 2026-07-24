'use client';

import { useCallback, useEffect, useState } from 'react';
import { startOfTodayISO } from '../format';
import { createClient } from '../supabase/client';

export interface WebCustomer {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  address: string | null;
  category_id: string | null;
  lat: number;
  lng: number;
}

export interface WebFieldRep {
  id: string;
  full_name: string;
  email: string;
}

export interface WebVisit {
  id: string;
  field_rep_id: string;
  customer_id: string;
  check_in_at: string;
  check_out_at: string | null;
  duration_minutes: number | null;
  outcome: string | null;
  notes: string | null;
  is_geofence_valid: boolean | null;
  is_mock_location: boolean;
  // Joined fields
  customer?: WebCustomer | null;
  fieldRep?: WebFieldRep | null;
}

function parseLocation(loc: unknown): { lat: number; lng: number } {
  if (!loc) return { lat: 39.0, lng: 35.0 };
  if (
    typeof loc === 'object' &&
    loc !== null &&
    'coordinates' in loc &&
    Array.isArray((loc as { coordinates: unknown }).coordinates)
  ) {
    const coords = (loc as { coordinates: number[] }).coordinates;
    return { lat: Number(coords[1]), lng: Number(coords[0]) };
  }
  if (typeof loc === 'string') {
    const m = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (m) {
      return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
    }
  }
  return { lat: 39.0, lng: 35.0 };
}

export function useTodayVisits() {
  const [visits, setVisits] = useState<WebVisit[]>([]);
  const [customers, setCustomers] = useState<WebCustomer[]>([]);
  const [fieldReps, setFieldReps] = useState<WebFieldRep[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    try {
      setLoading(true);

      const [customersRes, usersRes, visitsRes] = await Promise.all([
        supabase.from('customers').select('*').eq('is_active', true),
        supabase
          .from('users')
          .select('id, full_name, email')
          .eq('is_active', true),
        supabase
          .from('visits')
          .select('*')
          .gte('check_in_at', startOfTodayISO())
          .order('check_in_at', { ascending: false }),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (usersRes.error) throw usersRes.error;
      if (visitsRes.error) throw visitsRes.error;

      // Parse customers
      const parsedCustomers: WebCustomer[] = (customersRes.data ?? []).map(
        (c: Record<string, unknown>) => {
          const coords = parseLocation(c.location);
          return {
            id: String(c.id),
            business_name: String(c.business_name || ''),
            owner_name: (c.owner_name as string) || null,
            phone: (c.phone as string) || null,
            address: (c.address as string) || null,
            category_id: (c.category_id as string) || null,
            lat: coords.lat,
            lng: coords.lng,
          };
        }
      );

      const customerMap = new Map<string, WebCustomer>();
      parsedCustomers.forEach((c) => customerMap.set(c.id, c));

      // Map users
      const reps: WebFieldRep[] = (usersRes.data ?? []).map((u) => ({
        id: String(u.id),
        full_name: String(u.full_name || ''),
        email: String(u.email || ''),
      }));

      const repMap = new Map<string, WebFieldRep>();
      reps.forEach((r) => repMap.set(r.id, r));

      // Join visits
      const joinedVisits: WebVisit[] = (visitsRes.data ?? []).map((v) => ({
        id: String(v.id),
        field_rep_id: String(v.field_rep_id),
        customer_id: String(v.customer_id),
        check_in_at: String(v.check_in_at),
        check_out_at: v.check_out_at ? String(v.check_out_at) : null,
        duration_minutes:
          v.duration_minutes !== undefined && v.duration_minutes !== null
            ? Number(v.duration_minutes)
            : null,
        outcome: (v.outcome as string) || null,
        notes: (v.notes as string) || null,
        is_geofence_valid:
          v.is_geofence_valid !== undefined
            ? Boolean(v.is_geofence_valid)
            : null,
        is_mock_location: Boolean(v.is_mock_location),
        customer: customerMap.get(String(v.customer_id)) || null,
        fieldRep: repMap.get(String(v.field_rep_id)) || null,
      }));

      setCustomers(parsedCustomers);
      setFieldReps(reps);
      setVisits(joinedVisits);
    } catch (err) {
      console.error('Veri çekme hatası:', err);
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const supabase = createClient();
    // Realtime single channel subscription
    const channel = supabase
      .channel('panel-today')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visits' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'visits' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { visits, customers, fieldReps, loading, error, refetch: fetchData };
}
