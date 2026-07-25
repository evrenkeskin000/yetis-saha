'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { RoleGuard } from '../../../components/RoleGuard';
import { RouteMapLoader } from '../../../components/map/RouteMapLoader';
import { useRouteTrail } from '../../../lib/hooks/useRouteTrail';
import { formatTimeTR } from '../../../lib/format';

function RotaContent() {
  const {
    filters,
    updateFilters,
    reps,
    points,
    summary,
    truncated,
    loading,
    error,
    refresh,
  } = useRouteTrail();

  const repSelected = Boolean(filters.fieldRepId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Rota Geçmişi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bir temsilcinin seçilen gündeki konum izi
          </p>
        </div>

        <button
          onClick={() => refresh()}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs self-start"
          title="Yenile"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Temsilci
          <select
            value={filters.fieldRepId}
            onChange={(e) => updateFilters({ fieldRepId: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
          >
            <option value="">Temsilci seçin</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Tarih
          <input
            type="date"
            value={filters.date}
            onChange={(e) => updateFilters({ date: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
          />
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {!repSelected ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm font-medium text-slate-500">
          Rotayı görmek için bir temsilci seçin.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile label="Konum Kaydı" value={String(summary.pointCount)} />
            <SummaryTile
              label="İlk Kayıt"
              value={summary.firstAt ? formatTimeTR(summary.firstAt) : '-'}
            />
            <SummaryTile
              label="Son Kayıt"
              value={summary.lastAt ? formatTimeTR(summary.lastAt) : '-'}
            />
            <SummaryTile
              label="Kat Edilen Mesafe"
              value={`${summary.distanceKm.toFixed(1)} km`}
            />
          </div>

          {truncated && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl">
              Bu gün için kayıt sayısı üst sınıra ulaştı; rotanın tamamı
              gösterilmiyor olabilir.
            </div>
          )}

          <RouteMapLoader points={points} />
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-lg font-black text-slate-900 mt-1">{value}</div>
    </div>
  );
}

export default function RotaPage() {
  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
      <RotaContent />
    </RoleGuard>
  );
}
