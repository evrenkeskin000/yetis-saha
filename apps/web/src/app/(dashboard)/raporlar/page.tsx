'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import type { Customer, User, Visit } from '@saha/shared';
import { RoleGuard } from '../../../components/RoleGuard';
import { createClient } from '../../../lib/supabase/client';
import { parseGeoPoint } from '../../../lib/geo';
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

function RaporlarContent() {
  const [range, setRange] = useState<RangeType>('week');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [reps, setReps] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const rangeDates = getRangeDates(range);

      // 1. Fetch Visits with pagination loop
      let allVisits: Visit[] = [];
      let pageIndex = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: vData, error: vErr } = await supabase
          .from('visits')
          .select('*')
          .gte('check_in_at', rangeDates.startISO)
          .lte('check_in_at', rangeDates.endISO)
          .order('check_in_at', { ascending: false })
          .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

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

      // 2. Fetch Active Field Reps
      const { data: rData, error: rErr } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'field_rep')
        .eq('is_active', true);

      if (rErr) throw rErr;

      // 3. Fetch Active Customers
      const { data: cData, error: cErr } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true);

      if (cErr) throw cErr;

      setVisits(allVisits);
      setReps((rData as User[]) || []);
      setCustomers((cData as Customer[]) || []);
    } catch (err: any) {
      console.error('Rapor verileri yüklenirken hata:', err);
      if (err?.code === '42501') {
        setError('Bu işlem için yetkiniz yok.');
      } else {
        setError('Rapor verileri yüklenirken bir sorun oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  // Derived maps
  const repsMap = useMemo(() => {
    const map = new Map<string, { full_name: string }>();
    reps.forEach((r) => map.set(r.id, { full_name: r.full_name || 'Bilinmiyor' }));
    return map;
  }, [reps]);

  const customersMap = useMemo(() => {
    const map = new Map<string, { business_name: string }>();
    customers.forEach((c) => map.set(c.id, { business_name: c.business_name }));
    return map;
  }, [customers]);

  // Derived metrics calculations
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Saha İstatistik & Raporlar</h1>
        <p className="text-xs text-slate-500">
          Saha temsilcilerinin ziyaret performansını, verimliliği ve istisnaları analiz edin
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Timeframe Selector */}
      <RangeSelector
        range={range}
        onRangeChange={setRange}
        onRefresh={fetchData}
        loading={loading}
      />

      {/* 4 KPI Cards */}
      <KpiCards kpis={kpis} loading={loading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisitTrendChart data={trendData} range={range} />
        <OutcomePieChart data={outcomePieData} />
      </div>

      {/* Rep Performance Table */}
      <RepPerformanceTable data={repPerformance} />

      {/* Exception Table */}
      <ExceptionTable data={exceptions} />

      {/* Bottom Grid: Leaderboard & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Leaderboard data={leaderboard} />

        {/* Heat Map Card */}
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
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <RaporlarContent />
    </RoleGuard>
  );
}
