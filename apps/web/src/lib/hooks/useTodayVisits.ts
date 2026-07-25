'use client';

import { useCallback, useEffect, useState } from 'react';
import { startOfTodayISO } from '../format';
import { useDealershipScope } from '../DealershipScopeContext';
import { applyDealershipScope } from '../scopedQuery';
import { createClient } from '../supabase/client';

export interface WebCustomer {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  address: string | null;
  category_id: string | null;
  dealership_id: string;
  /** null = konum kaydı yok / parse edilemedi */
  lat: number | null;
  lng: number | null;
}

export interface WebFieldRep {
  id: string;
  full_name: string;
  email: string;
  dealership_id: string | null;
  /** null = vardiya kapalı */
  shift_started_at: string | null;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  recordedAt: string;
  /** Sunucunun kaydı aldığı an (cihaz saatinden bağımsız) */
  syncedAt: string;
}

/** Temsilcinin bugünkü son bilinen konumu (canlı harita). Rota izi /rota ekranında. */
export interface LiveRep {
  userId: string;
  fullName: string;
  email: string;
  lastPoint: LocationPoint;
  /** Vardiya açıksa canlı sayılır (bitince anında düşer) */
  isLive: boolean;
}

export interface WebVisit {
  id: string;
  field_rep_id: string;
  customer_id: string;
  dealership_id: string;
  check_in_at: string;
  check_out_at: string | null;
  duration_minutes: number | null;
  outcome: string | null;
  notes: string | null;
  is_mock_location: boolean;
  customer?: WebCustomer | null;
  fieldRep?: WebFieldRep | null;
}

function parseLocation(loc: unknown): { lat: number; lng: number } | null {
  if (!loc) return null;
  if (
    typeof loc === 'object' &&
    loc !== null &&
    'coordinates' in loc &&
    Array.isArray((loc as { coordinates: unknown }).coordinates)
  ) {
    const coords = (loc as { coordinates: number[] }).coordinates;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  if (typeof loc === 'string') {
    const m = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (m) {
      const lng = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
  }
  return null;
}

export function useTodayVisits() {
  const { scope, loading: scopeLoading } = useDealershipScope();
  const [visits, setVisits] = useState<WebVisit[]>([]);
  const [customers, setCustomers] = useState<WebCustomer[]>([]);
  const [fieldReps, setFieldReps] = useState<WebFieldRep[]>([]);
  const [liveReps, setLiveReps] = useState<LiveRep[]>([]);
  const [activeOnFieldCount, setActiveOnFieldCount] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (scopeLoading) return;

    const supabase = createClient();
    try {
      setLoading(true);
      setError(null);

      const customersQuery = applyDealershipScope(
        supabase.from('customers').select('*').eq('is_active', true),
        scope
      );
      const usersQuery = applyDealershipScope(
        supabase
          .from('users')
          .select('id, full_name, email, dealership_id, shift_started_at')
          .eq('is_active', true)
          .eq('role', 'field_rep'),
        scope
      );
      const visitsQuery = applyDealershipScope(
        supabase
          .from('visits')
          .select('*')
          .gte('check_in_at', startOfTodayISO())
          .order('check_in_at', { ascending: false }),
        scope
      );

      // Temsilcilerin bugünkü son konumları (rota izi /rota ekranında)
      const locationQuery = applyDealershipScope(
        supabase
          .from('location_logs')
          .select('user_id, location, recorded_at, synced_at')
          .gte('synced_at', startOfTodayISO())
          .order('synced_at', { ascending: false })
          .order('recorded_at', { ascending: false })
          .limit(2000),
        scope
      );

      const [customersRes, usersRes, visitsRes, locationRes] = await Promise.all([
        customersQuery,
        usersQuery,
        visitsQuery,
        locationQuery,
      ]);

      if (customersRes.error) {
        if (customersRes.error.code === '42501') {
          setError('Bu işlem için yetkiniz yok.');
        } else {
          throw customersRes.error;
        }
        return;
      }
      if (usersRes.error) throw usersRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (locationRes.error) {
        console.warn('location_logs yüklenemedi:', locationRes.error.message);
      }

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
            dealership_id: String(c.dealership_id || ''),
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
          };
        }
      );

      const customerMap = new Map<string, WebCustomer>();
      parsedCustomers.forEach((c) => customerMap.set(c.id, c));

      const reps: WebFieldRep[] = (usersRes.data ?? []).map(
        (u: Record<string, unknown>) => ({
          id: String(u.id),
          full_name: String(u.full_name || ''),
          email: String(u.email || ''),
          dealership_id: (u.dealership_id as string) || null,
          shift_started_at: u.shift_started_at
            ? String(u.shift_started_at)
            : null,
        })
      );

      const repMap = new Map<string, WebFieldRep>();
      reps.forEach((r) => repMap.set(r.id, r));

      const joinedVisits: WebVisit[] = (visitsRes.data ?? []).map(
        (v: Record<string, unknown>) => ({
          id: String(v.id),
          field_rep_id: String(v.field_rep_id),
          customer_id: String(v.customer_id),
          dealership_id: String(v.dealership_id || ''),
          check_in_at: String(v.check_in_at),
          check_out_at: v.check_out_at ? String(v.check_out_at) : null,
          duration_minutes:
            v.duration_minutes !== undefined && v.duration_minutes !== null
              ? Number(v.duration_minutes)
              : null,
          outcome: (v.outcome as string) || null,
          notes: (v.notes as string) || null,
          is_mock_location: Boolean(v.is_mock_location),
          customer: customerMap.get(String(v.customer_id)) || null,
          fieldRep: repMap.get(String(v.field_rep_id)) || null,
        })
      );

      // Kayıtlar recorded_at azalan geldiği için ilk görülen nokta en günceldir
      const lastPointByUser = new Map<string, LocationPoint>();
      for (const row of locationRes.data ?? []) {
        const r = row as {
          user_id: string;
          location: unknown;
          recorded_at: string;
          synced_at: string;
        };
        if (!repMap.has(r.user_id)) continue;
        if (lastPointByUser.has(r.user_id)) continue;
        const coords = parseLocation(r.location);
        if (!coords) continue;
        lastPointByUser.set(r.user_id, {
          lat: coords.lat,
          lng: coords.lng,
          recordedAt: String(r.recorded_at),
          syncedAt: String(r.synced_at),
        });
      }

      const repPositions: LiveRep[] = [];
      for (const [userId, lastPoint] of lastPointByUser) {
        const rep = repMap.get(userId)!;
        const onShift = Boolean(rep.shift_started_at);
        repPositions.push({
          userId,
          fullName: rep.full_name,
          email: rep.email,
          lastPoint,
          isLive: onShift,
        });
      }

      // Sahadaki = açık vardiya VEYA açık ziyaret (vardiya bitince anında düşer)
      const onFieldIds = new Set<string>();
      for (const rep of reps) {
        if (rep.shift_started_at) onFieldIds.add(rep.id);
      }
      for (const v of joinedVisits) {
        if (!v.check_out_at && repMap.has(v.field_rep_id)) {
          onFieldIds.add(v.field_rep_id);
        }
      }

      setCustomers(parsedCustomers);
      setFieldReps(reps);
      setVisits(joinedVisits);
      setLiveReps(repPositions);
      setActiveOnFieldCount(onFieldIds.size);
    } catch (err) {
      console.error('Veri çekme hatası:', err);
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [scope, scopeLoading]);

  useEffect(() => {
    if (scopeLoading) return;

    fetchData();

    const supabase = createClient();
    const channelName = `panel-today-${scope}`;
    const channel = supabase
      .channel(channelName)
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'location_logs' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Vardiya süresi için periyodik yenileme (realtime gecikirse)
    const poll = setInterval(() => {
      fetchData();
    }, 60_000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [fetchData, scope, scopeLoading]);

  return {
    visits,
    customers,
    fieldReps,
    liveReps,
    activeOnFieldCount,
    loading: loading || scopeLoading,
    error,
    refetch: fetchData,
  };
}
