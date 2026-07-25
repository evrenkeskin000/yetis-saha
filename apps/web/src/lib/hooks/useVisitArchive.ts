'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User, Visit, VisitOutcome } from '@saha/shared';
import { createClient } from '../supabase/client';
import { useDealershipScope } from '../DealershipScopeContext';
import { applyDealershipScope } from '../scopedQuery';

export type VisitStatusFilter = 'all' | 'completed' | 'in_progress' | 'cancelled';

export interface VisitArchiveFilters {
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;
  fieldRepId: string; // '' = all
  customerSearch: string;
  outcome: string; // '' = all
  status: VisitStatusFilter;
  mockOnly: boolean;
}

export interface ArchiveVisitRow extends Visit {
  fieldRepName: string;
  customerName: string;
  customerAccessible: boolean;
  dealershipName: string;
  status: 'completed' | 'in_progress' | 'cancelled';
}

const PAGE_SIZE = 50;

function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayStartISO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function dayEndISO(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

export function visitStatusOf(
  visit: Pick<Visit, 'cancelled_at' | 'check_out_at'>
): 'completed' | 'in_progress' | 'cancelled' {
  if (visit.cancelled_at) return 'cancelled';
  if (!visit.check_out_at) return 'in_progress';
  return 'completed';
}

export function useVisitArchive() {
  const { scope, dealerships, loading: scopeLoading } = useDealershipScope();

  const [filters, setFilters] = useState<VisitArchiveFilters>({
    dateFrom: defaultDateFrom(),
    dateTo: defaultDateTo(),
    fieldRepId: '',
    customerSearch: '',
    outcome: '',
    status: 'all',
    mockOnly: false,
  });
  const [page, setPage] = useState(0);
  const [visits, setVisits] = useState<ArchiveVisitRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [reps, setReps] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dealershipNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of dealerships) m.set(d.id, d.name);
    return m;
  }, [dealerships]);

  const updateFilters = useCallback(
    (patch: Partial<VisitArchiveFilters>) => {
      setPage(0);
      setFilters((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const fetchArchive = useCallback(async () => {
    if (scopeLoading) return;
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const startISO = dayStartISO(filters.dateFrom);
      const endISO = dayEndISO(filters.dateTo);

      const repsQuery = applyDealershipScope(
        supabase
          .from('users')
          .select('*')
          .eq('role', 'field_rep')
          .order('full_name'),
        scope
      );
      const { data: repsData, error: repsErr } = await repsQuery;
      if (repsErr) throw repsErr;
      const repList = (repsData as User[]) || [];
      setReps(repList);
      const repMap = new Map(repList.map((r) => [r.id, r.full_name]));

      let query = applyDealershipScope(
        supabase
          .from('visits')
          .select('*', { count: 'exact' })
          .gte('check_in_at', startISO)
          .lte('check_in_at', endISO)
          .order('check_in_at', { ascending: false }),
        scope
      );

      if (filters.fieldRepId) {
        query = query.eq('field_rep_id', filters.fieldRepId);
      }
      if (filters.outcome) {
        query = query.eq('outcome', filters.outcome as VisitOutcome);
      }
      if (filters.mockOnly) {
        query = query.eq('is_mock_location', true);
      }
      if (filters.status === 'cancelled') {
        query = query.not('cancelled_at', 'is', null);
      } else if (filters.status === 'in_progress') {
        query = query.is('check_out_at', null).is('cancelled_at', null);
      } else if (filters.status === 'completed') {
        query = query.not('check_out_at', 'is', null).is('cancelled_at', null);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error: vErr, count } = await query.range(from, to);
      if (vErr) throw vErr;

      const rawVisits = (data as Visit[]) || [];

      // Erşilebilir esnaf kimlikleri (başka bayi / silinmiş sessiz düşer)
      const customerIds = [...new Set(rawVisits.map((v) => v.customer_id))];
      const accessible = new Map<string, string>();
      if (customerIds.length > 0) {
        const { data: custData } = await supabase
          .from('customers')
          .select('id, business_name')
          .in('id', customerIds);
        for (const c of custData || []) {
          accessible.set(c.id, c.business_name);
        }
      }

      let rows: ArchiveVisitRow[] = rawVisits.map((v) => {
        const snapshotName = v.customer_snapshot?.business_name;
        const liveName = accessible.get(v.customer_id);
        const customerAccessible = accessible.has(v.customer_id);
        return {
          ...v,
          fieldRepName: repMap.get(v.field_rep_id) || 'Bilinmiyor',
          customerName:
            snapshotName || liveName || 'Kayıt bilgisi yok',
          customerAccessible,
          dealershipName:
            dealershipNameMap.get(v.dealership_id) || '—',
          status: visitStatusOf(v),
        };
      });

      // Esnaf araması istemci tarafında (snapshot JSON filtresi PostgREST'te sınırlı)
      const search = filters.customerSearch.trim().toLocaleLowerCase('tr');
      if (search) {
        rows = rows.filter((r) =>
          r.customerName.toLocaleLowerCase('tr').includes(search)
        );
      }

      setVisits(rows);
      setTotalCount(count ?? rows.length);

      // Tamamlanan sayısı (iptaller hariç) — filtre kapsamındaki özet
      let completedQuery = applyDealershipScope(
        supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .gte('check_in_at', startISO)
          .lte('check_in_at', endISO)
          .not('check_out_at', 'is', null)
          .is('cancelled_at', null),
        scope
      );
      if (filters.fieldRepId) {
        completedQuery = completedQuery.eq('field_rep_id', filters.fieldRepId);
      }
      if (filters.outcome) {
        completedQuery = completedQuery.eq(
          'outcome',
          filters.outcome as VisitOutcome
        );
      }
      if (filters.mockOnly) {
        completedQuery = completedQuery.eq('is_mock_location', true);
      }
      const { count: cCount } = await completedQuery;
      setCompletedCount(cCount ?? 0);
    } catch (err: unknown) {
      console.error('Ziyaret arşivi yüklenemedi:', err);
      setError('Ziyaret arşivi yüklenirken bir sorun oluştu.');
      setVisits([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, scope, scopeLoading, dealershipNameMap]);

  useEffect(() => {
    void fetchArchive();
  }, [fetchArchive]);

  const fetchAllForCsv = useCallback(async (): Promise<ArchiveVisitRow[]> => {
    const supabase = createClient();
    const startISO = dayStartISO(filters.dateFrom);
    const endISO = dayEndISO(filters.dateTo);
    const repMap = new Map(reps.map((r) => [r.id, r.full_name]));
    const all: Visit[] = [];
    let pageIndex = 0;
    let hasMore = true;

    while (hasMore) {
      let query = applyDealershipScope(
        supabase
          .from('visits')
          .select('*')
          .gte('check_in_at', startISO)
          .lte('check_in_at', endISO)
          .order('check_in_at', { ascending: false })
          .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1),
        scope
      );
      if (filters.fieldRepId) query = query.eq('field_rep_id', filters.fieldRepId);
      if (filters.outcome) {
        query = query.eq('outcome', filters.outcome as VisitOutcome);
      }
      if (filters.mockOnly) query = query.eq('is_mock_location', true);
      if (filters.status === 'cancelled') {
        query = query.not('cancelled_at', 'is', null);
      } else if (filters.status === 'in_progress') {
        query = query.is('check_out_at', null).is('cancelled_at', null);
      } else if (filters.status === 'completed') {
        query = query.not('check_out_at', 'is', null).is('cancelled_at', null);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      const batch = (data as Visit[]) || [];
      all.push(...batch);
      hasMore = batch.length === PAGE_SIZE;
      pageIndex++;
    }

    const customerIds = [...new Set(all.map((v) => v.customer_id))];
    const accessible = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: custData } = await supabase
        .from('customers')
        .select('id, business_name')
        .in('id', customerIds);
      for (const c of custData || []) {
        accessible.set(c.id, c.business_name);
      }
    }

    const search = filters.customerSearch.trim().toLocaleLowerCase('tr');
    let rows: ArchiveVisitRow[] = all.map((v) => {
      const snapshotName = v.customer_snapshot?.business_name;
      const liveName = accessible.get(v.customer_id);
      return {
        ...v,
        fieldRepName: repMap.get(v.field_rep_id) || 'Bilinmiyor',
        customerName: snapshotName || liveName || 'Kayıt bilgisi yok',
        customerAccessible: accessible.has(v.customer_id),
        dealershipName: dealershipNameMap.get(v.dealership_id) || '—',
        status: visitStatusOf(v),
      };
    });
    if (search) {
      rows = rows.filter((r) =>
        r.customerName.toLocaleLowerCase('tr').includes(search)
      );
    }
    return rows;
  }, [filters, reps, scope, dealershipNameMap]);

  return {
    filters,
    updateFilters,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    visits,
    totalCount,
    completedCount,
    reps,
    loading: loading || scopeLoading,
    error,
    refresh: fetchArchive,
    fetchAllForCsv,
  };
}
