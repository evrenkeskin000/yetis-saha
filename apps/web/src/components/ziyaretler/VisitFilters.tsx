'use client';

import React from 'react';
import { OUTCOME_LABELS, OUTCOMES, type User } from '@saha/shared';
import type {
  VisitArchiveFilters,
  VisitStatusFilter,
} from '../../lib/hooks/useVisitArchive';

interface VisitFiltersProps {
  filters: VisitArchiveFilters;
  reps: User[];
  onChange: (patch: Partial<VisitArchiveFilters>) => void;
}

const STATUS_OPTIONS: { value: VisitStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tüm Durumlar' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

export function VisitFilters({ filters, reps, onChange }: VisitFiltersProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Başlangıç
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Bitiş
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ dateTo: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Temsilci
        <select
          value={filters.fieldRepId}
          onChange={(e) => onChange({ fieldRepId: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
        >
          <option value="">Tüm Temsilciler</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Esnaf Ara
        <input
          type="search"
          value={filters.customerSearch}
          onChange={(e) => onChange({ customerSearch: e.target.value })}
          placeholder="Esnaf adı..."
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Sonuç
        <select
          value={filters.outcome}
          onChange={(e) => onChange({ outcome: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
        >
          <option value="">Tüm Sonuçlar</option>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {OUTCOME_LABELS[o]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Durum
        <select
          value={filters.status}
          onChange={(e) =>
            onChange({ status: e.target.value as VisitStatusFilter })
          }
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mt-6">
        <input
          type="checkbox"
          checked={filters.mockOnly}
          onChange={(e) => onChange({ mockOnly: e.target.checked })}
          className="rounded border-slate-300"
        />
        Yalnızca mock konumlu
      </label>
    </div>
  );
}
