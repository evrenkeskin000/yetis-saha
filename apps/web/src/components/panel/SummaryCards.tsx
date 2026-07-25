'use client';

import React from 'react';
import { CalendarCheck, CheckCircle2, Clock, Users } from 'lucide-react';
import type { WebVisit } from '../../lib/hooks/useTodayVisits';

interface SummaryCardsProps {
  visits: WebVisit[];
  /** Açık vardiyası veya açık ziyareti olan temsilci sayısı */
  activeOnFieldCount: number;
}

export function SummaryCards({ visits, activeOnFieldCount }: SummaryCardsProps) {
  const totalVisits = visits.length;

  const completedVisits = visits.filter((v) => v.check_out_at !== null).length;
  const inProgressVisits = visits.filter((v) => v.check_out_at === null).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Card 1 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Bugünkü Ziyaretler
          </div>
          <div className="text-3xl font-black text-slate-900">{totalVisits}</div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <CalendarCheck className="w-6 h-6" />
        </div>
      </div>

      {/* Card 2 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Sahadaki Temsilciler
          </div>
          <div className="text-3xl font-black text-slate-900">
            {activeOnFieldCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Açık vardiya / açık ziyaret
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Ziyaret Durumları
          </div>
          <div className="flex items-center gap-3 text-lg font-bold text-slate-900 mt-1">
            <span className="text-amber-600 flex items-center gap-1">
              <Clock className="w-4 h-4" /> {inProgressVisits} Aktif
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {completedVisits} Tamamlandı
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
