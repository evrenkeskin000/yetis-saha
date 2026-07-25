'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Flame } from 'lucide-react';
import {
  ALL_DEALERSHIPS,
  type Customer,
  type User,
  type Visit,
} from '@saha/shared';
import { RoleGuard } from '../../../components/RoleGuard';
import { createClient } from '../../../lib/supabase/client';
import { parseGeoPoint } from '../../../lib/geo';
import { exportToCsv } from '../../../lib/csv';
import { useDealershipScope } from '../../../lib/DealershipScopeContext';
import { applyDealershipScope } from '../../../lib/scopedQuery';
import {
  calculateExceptions,
  calculateKpis,
  calculateLeaderboard,
  calculateOutcomePieData,
  calculateRepPerformance,
  calculateTrendData,
  getRangeDates,
  type RangeType,
} from '../../../lib/report';
import { RangeSelector } from '../../../components/raporlar/RangeSelector';
import { KpiCards } from '../../../components/raporlar/KpiCards';
import { VisitTrendChart } from '../../../components/raporlar/VisitTrendChart';
import { OutcomePieChart } from '../../../components/raporlar/OutcomePieChart';
import { RepPerformanceTable } from '../../../components/raporlar/RepPerformanceTable';
import { ExceptionTable } from '../../../components/raporlar/ExceptionTable';
import { Leaderboard } from '../../../components/raporlar/Leaderboard';
import { HeatMapLoader } from '../../../components/map/HeatMapLoader';
import { CsvButton } from '../../../components/raporlar/CsvButton';
import { formatDateTimeTR } from '../../../lib/format';

function RaporlarContent() {
  const { scope, dealership, dealerships, loading: scopeLoading } =
    useDealershipScope();
  const showDealershipBreakdown = scope === ALL_DEALERSHIPS;

  const [range, setRange] = useState<RangeType>('week');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [reps, setReps] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (scopeLoading) return;

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const rangeDates = getRangeDates(range);

      let allVisits: Visit[] = [];
      let pageIndex = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const visitsQuery = applyDealershipScope(
          supabase
            .from('visits')
            .select('*')
            .gte('check_in_at', rangeDates.startISO)
            .lte('check_in_at', rangeDates.endISO)
            .order('check_in_at', { ascending: false })
            .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1),
          scope
        );

        const { data: vData, error: vErr } = await visitsQuery;

        if (vErr) throw vErr;

        if (vData && vData.length > 0) {
          allVisits = [...allVisits, ...(vData as Visit[])];
          if (vData.length < pageSize) {
            hasMore = false;
          } else {
            pageIndex++;
          }
        } else {
          hasMore = false;
        }
      }

      const repsQuery = applyDealershipScope(
        supabase
          .from('users')
          .select('*')
          .eq('role', 'field_rep')
          .eq('is_active', true),
        scope
      );
      const { data: rData, error: rErr } = await repsQuery;
      if (rErr) throw rErr;

      const customersQuery = applyDealershipScope(
        supabase.from('customers').select('*').eq('is_active', true),
        scope
      );
      const { data: cData, error: cErr } = await customersQuery;
      if (cErr) throw cErr;

      setVisits(allVisits);
      setReps((rData as User[]) || []);
      setCustomers((cData as Customer[]) || []);
    } catch (err: unknown) {
      console.error('Rapor verileri yüklenirken hata:', err);
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === '42501') {
        setError('Bu işlem için yetkiniz yok.');
      } else {
        setError('Rapor verileri yüklenirken bir sorun oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }, [range, scope, scopeLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const repsMap = useMemo(() => {
    const map = new Map<string, { full_name: string }>();
    reps.forEach((r) =>
      map.set(r.id, { full_name: r.full_name || 'Bilinmiyor' })
    );
    return map;
  }, [reps]);

  const customersMap = useMemo(() => {
    const map = new Map<string, { business_name: string }>();
    customers.forEach((c) =>
      map.set(c.id, { business_name: c.business_name })
    );
    return map;
  }, [customers]);

  const kpis = useMemo(() => {
    return calculateKpis(visits, reps, customers, range);
  }, [visits, reps, customers, range]);

  const repPerformance = useMemo(() => {
    return calculateRepPerformance(visits, reps);
  }, [visits, reps]);

  const exceptions = useMemo(() => {
    return calculateExceptions(visits, repsMap, customersMap);
  }, [visits, repsMap, customersMap]);

  const leaderboard = useMemo(() => {
    return calculateLeaderboard(repPerformance);
  }, [repPerformance]);

  const trendData = useMemo(() => {
    return calculateTrendData(visits, repsMap, range);
  }, [visits, repsMap, range]);

  const outcomePieData = useMemo(() => {
    return calculateOutcomePieData(visits);
  }, [visits]);

  const heatMapPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    visits.forEach((v) => {
      const geo = parseGeoPoint(v.check_in_location);
      if (geo && !isNaN(geo.latitude) && !isNaN(geo.longitude)) {
        pts.push([geo.latitude, geo.longitude, 1]);
      }
    });
    return pts;
  }, [visits]);

  const dealershipBreakdown = useMemo(() => {
    if (!showDealershipBreakdown) return [];
    const counts = new Map<string, number>();
    visits.forEach((v) => {
      const id = v.dealership_id;
      if (!id) return;
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return dealerships
      .map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        visitCount: counts.get(d.id) || 0,
      }))
      .filter((d) => d.visitCount > 0)
      .sort((a, b) => b.visitCount - a.visitCount);
  }, [visits, dealerships, showDealershipBreakdown]);

  const scopeSuffix =
    scope === ALL_DEALERSHIPS
      ? 'tum-bayiler'
      : dealership?.code || dealership?.name || scope.slice(0, 8);

  const handleVisitsCsv = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `rapor_ziyaretler_${scopeSuffix}_${todayStr}.csv`;
    const headers = [
      ...(showDealershipBreakdown ? ['Bayi'] : []),
      'Temsilci',
      'Esnaf',
      'Giriş',
      'Çıkış',
      'Süre (dk)',
      'Sonuç',
      'Sahte Konum',
    ];

    const dealershipMap = new Map(dealerships.map((d) => [d.id, d.name]));

    const rows = visits.map((v) => [
      ...(showDealershipBreakdown
        ? [dealershipMap.get(v.dealership_id) || '—']
        : []),
      repsMap.get(v.field_rep_id)?.full_name || '—',
      customersMap.get(v.customer_id)?.business_name || '—',
      formatDateTimeTR(v.check_in_at),
      v.check_out_at ? formatDateTimeTR(v.check_out_at) : '',
      v.duration_minutes ?? '',
      v.outcome || '',
      v.is_mock_location ? 'Evet' : 'Hayır',
    ]);

    exportToCsv(filename, headers, rows);
  };

  const isLoading = loading || scopeLoading;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Saha İstatistik & Raporlar
          </h1>
          <p className="text-xs text-slate-500">
            Saha temsilcilerinin ziyaret performansını, verimliliği ve istisnaları
            analiz edin
          </p>
        </div>
        <CsvButton
          onExport={handleVisitsCsv}
          label={`CSV İndir (${visits.length})`}
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <RangeSelector
        range={range}
        onRangeChange={setRange}
        onRefresh={fetchData}
        loading={isLoading}
      />

      <KpiCards kpis={kpis} loading={isLoading} />

      {showDealershipBreakdown && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Bayi Kırılımı</span>
            </h3>
          </div>
          {dealershipBreakdown.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Seçilen aralıkta ziyaret kaydı bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Bayi</th>
                    <th className="py-3 px-4">Kod</th>
                    <th className="py-3 px-4 text-right">Ziyaret</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dealershipBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {row.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {row.code || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {row.visitCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisitTrendChart data={trendData} range={range} />
        <OutcomePieChart data={outcomePieData} />
      </div>

      <RepPerformanceTable data={repPerformance} />

      <ExceptionTable data={exceptions} filenameSuffix={scopeSuffix} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Leaderboard data={leaderboard} />

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Ziyaret Yoğunluk Haritası (Isı Haritası)</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {heatMapPoints.length} Lokasyon
            </span>
          </div>

          <HeatMapLoader points={heatMapPoints} />
        </div>
      </div>
    </div>
  );
}

export default function RaporlarPage() {
  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
      <RaporlarContent />
    </RoleGuard>
  );
}
