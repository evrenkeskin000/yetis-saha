'use client';

import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import type { RangeType } from '../../lib/report';

interface RangeSelectorProps {
  range: RangeType;
  onRangeChange: (range: RangeType) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function RangeSelector({
  range,
  onRangeChange,
  onRefresh,
  loading = false,
}: RangeSelectorProps) {
  const options: { id: RangeType; label: string }[] = [
    { id: 'today', label: 'Bugün' },
    { id: 'week', label: 'Bu Hafta' },
    { id: 'month', label: 'Bu Ay' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      {/* Segmented Control */}
      <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
        {options.map((opt) => {
          const isActive = range === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onRangeChange(opt.id)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-teal-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Refresh Action */}
      <div className="flex items-center gap-3 justify-end">
        <div className="text-xs text-slate-500 hidden md:flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Statik Rapor Verileri</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
          <span>{loading ? 'Yükleniyor...' : 'Yenile'}</span>
        </button>
      </div>
    </div>
  );
}
