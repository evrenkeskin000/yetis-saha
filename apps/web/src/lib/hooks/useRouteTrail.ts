'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseGeoPoint } from '../geo';
import { useDealershipScope } from '../DealershipScopeContext';
import { applyDealershipScope } from '../scopedQuery';
import { createClient } from '../supabase/client';

const MAX_POINTS = 3000;

export interface RoutePoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface RouteRep {
  id: string;
  full_name: string;
}

export interface RouteSummary {
  pointCount: number;
  firstAt: string | null;
  lastAt: string | null;
  distanceKm: number;
}

export interface RouteTrailFilters {
  /** yyyy-mm-dd */
  date: string;
  /** '' = temsilci seçilmedi */
  fieldRepId: string;
}

function todayStr(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function dayStartISO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function dayEndISO(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

function distanceKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function summarize(points: RoutePoint[]): RouteSummary {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceKm(points[i - 1], points[i]);
  }
  return {
    pointCount: points.length,
    firstAt: points.length > 0 ? points[0].recordedAt : null,
    lastAt: points.length > 0 ? points[points.length - 1].recordedAt : null,
    distanceKm: total,
  };
}

/** Tek temsilcinin tek güne ait konum izi (rota ekranı). */
export function useRouteTrail() {
  const { scope, loading: scopeLoading } = useDealershipScope();

  const [filters, setFilters] = useState<RouteTrailFilters>({
    date: todayStr(),
    fieldRepId: '',
  });
  const [reps, setReps] = useState<RouteRep[]>([]);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [summary, setSummary] = useState<RouteSummary>({
    pointCount: 0,
    firstAt: null,
    lastAt: null,
    distanceKm: 0,
  });
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFilters = useCallback((patch: Partial<RouteTrailFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (scopeLoading) return;
    let cancelled = false;

    const loadReps = async () => {
      const supabase = createClient();
      const { data, error: repErr } = await applyDealershipScope(
        supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'field_rep')
          .eq('is_active', true)
          .order('full_name'),
        scope
      );
      if (cancelled) return;
      if (repErr) {
        console.error('Temsilciler yüklenemedi:', repErr);
        setReps([]);
        return;
      }
      setReps((data as RouteRep[]) || []);
    };

    void loadReps();
    return () => {
      cancelled = true;
    };
  }, [scope, scopeLoading]);

  const fetchTrail = useCallback(async () => {
    if (scopeLoading) return;
    if (!filters.fieldRepId) {
      setPoints([]);
      setSummary(summarize([]));
      setTruncated(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error: logErr } = await applyDealershipScope(
        supabase
          .from('location_logs')
          .select('location, recorded_at')
          .eq('user_id', filters.fieldRepId)
          .gte('recorded_at', dayStartISO(filters.date))
          .lte('recorded_at', dayEndISO(filters.date))
          .order('recorded_at', { ascending: true })
          .limit(MAX_POINTS),
        scope
      );
      if (logErr) throw logErr;

      const rows = (data as { location: unknown; recorded_at: string }[]) || [];
      const parsed: RoutePoint[] = [];
      for (const row of rows) {
        const coords = parseGeoPoint(row.location);
        if (!coords) continue;
        parsed.push({
          lat: coords.latitude,
          lng: coords.longitude,
          recordedAt: String(row.recorded_at),
        });
      }

      setPoints(parsed);
      setSummary(summarize(parsed));
      setTruncated(rows.length >= MAX_POINTS);
    } catch (err) {
      console.error('Rota izi yüklenemedi:', err);
      setError('Rota izi yüklenirken bir sorun oluştu.');
      setPoints([]);
      setSummary(summarize([]));
      setTruncated(false);
    } finally {
      setLoading(false);
    }
  }, [filters.date, filters.fieldRepId, scope, scopeLoading]);

  useEffect(() => {
    void fetchTrail();
  }, [fetchTrail]);

  return {
    filters,
    updateFilters,
    reps,
    points,
    summary,
    truncated,
    loading: loading || scopeLoading,
    error,
    refresh: fetchTrail,
  };
}
