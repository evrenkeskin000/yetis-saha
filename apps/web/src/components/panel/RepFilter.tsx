'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import type { WebFieldRep } from '../../lib/hooks/useTodayVisits';

interface RepFilterProps {
  fieldReps: WebFieldRep[];
  selectedRepId: string | null;
  onSelectRep: (repId: string | null) => void;
}

export function RepFilter({
  fieldReps,
  selectedRepId,
  onSelectRep,
}: RepFilterProps) {
  return (
    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
      <Filter className="w-4 h-4 text-slate-400" />
      <select
        value={selectedRepId || ''}
        onChange={(e) => onSelectRep(e.target.value ? e.target.value : null)}
        className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer pr-2"
      >
        <option value="">Tüm Temsilciler ({fieldReps.length})</option>
        {fieldReps.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
