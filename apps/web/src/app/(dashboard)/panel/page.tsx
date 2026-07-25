'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Route } from 'lucide-react';
import { MapLoader } from '../../../components/map/MapLoader';
import { RepFilter } from '../../../components/panel/RepFilter';
import { SummaryCards } from '../../../components/panel/SummaryCards';
import { UnvisitedCustomersCard } from '../../../components/panel/UnvisitedCustomersCard';
import { VisitTable } from '../../../components/panel/VisitTable';
import { RoleGuard } from '../../../components/RoleGuard';
import { useTodayVisits } from '../../../lib/hooks/useTodayVisits';

export default function PanelPage() {
  const {
    visits,
    customers,
    fieldReps,
    liveReps,
    activeOnFieldCount,
    loading,
    error,
    refetch,
  } = useTodayVisits();
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  // Filter visits by selected field rep
  const filteredVisits = useMemo(() => {
    if (!selectedRepId) return visits;
    return visits.filter((v) => v.field_rep_id === selectedRepId);
  }, [visits, selectedRepId]);

  const filteredLiveReps = useMemo(() => {
    if (!selectedRepId) return liveReps;
    return liveReps.filter((r) => r.userId === selectedRepId);
  }, [liveReps, selectedRepId]);

  const visitedCustomerIds = useMemo(
    () => new Set(visits.map((v) => v.customer_id)),
    [visits]
  );

  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Bugünkü Saha Ziyaretleri
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Saha temsilcilerinin anlık konum ve ziyaret aktiviteleri
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RepFilter
            fieldReps={fieldReps}
            selectedRepId={selectedRepId}
            onSelectRep={setSelectedRepId}
          />

          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards
        visits={filteredVisits}
        activeOnFieldCount={activeOnFieldCount}
      />

      {/* Live Map Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Canlı Harita</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/rota"
              className="text-xs font-semibold text-violet-700 hover:text-violet-900 inline-flex items-center gap-1"
            >
              <Route className="w-3.5 h-3.5" />
              Rota Geçmişi
            </Link>
            <span className="text-xs text-slate-500">
              Realtime Otomatik Güncelleme Aktif
            </span>
          </div>
        </div>
        <MapLoader
          customers={customers}
          visits={filteredVisits}
          liveReps={filteredLiveReps}
        />
      </div>

      {/* Unvisited + Visit Table */}
      <div className="pt-2 grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <UnvisitedCustomersCard
            customers={customers}
            visitedCustomerIds={visitedCustomerIds}
          />
        </div>
        <div className="xl:col-span-3">
          <VisitTable visits={filteredVisits} />
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
