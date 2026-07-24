'use client';

import React from 'react';
import { Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { Visit, VisitOutcome } from '@saha/shared';
import { formatDateTimeTR } from '../../lib/format';
import { getOutcomeColor, getOutcomeLabel } from '../../lib/outcome';

export interface VisitWithRep extends Visit {
  fieldRep?: {
    full_name: string;
    email: string;
  } | null;
}

interface VisitHistoryTableProps {
  visits: VisitWithRep[];
}

export function VisitHistoryTable({ visits }: VisitHistoryTableProps) {
  if (!visits || visits.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-slate-500 text-sm font-medium">
          Henüz bu esnafa ait bir ziyaret kaydı bulunmuyor.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Ziyaret Geçmişi ({visits.length})</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Tarih / Saat</th>
              <th className="py-3 px-4">Temsilci</th>
              <th className="py-3 px-4">Süre</th>
              <th className="py-3 px-4">Sonuç</th>
              <th className="py-3 px-4">Geofence</th>
              <th className="py-3 px-4">Notlar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {visits.map((v) => {
              const color = getOutcomeColor(v.outcome);
              const label = getOutcomeLabel(v.outcome);

              return (
                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Tarih / Saat */}
                  <td className="py-3 px-4 font-medium text-slate-900 text-xs">
                    {formatDateTimeTR(v.check_in_at)}
                  </td>

                  {/* Temsilci */}
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {v.fieldRep?.full_name || 'Bilinmeyen Temsilci'}
                  </td>

                  {/* Süre */}
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {v.duration_minutes !== null && v.duration_minutes !== undefined ? (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {v.duration_minutes} dk
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium text-[11px]">Devam Ediyor</span>
                    )}
                  </td>

                  {/* Sonuç */}
                  <td className="py-3 px-4">
                    <span
                      className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold text-white shadow-xs"
                      style={{ backgroundColor: color }}
                    >
                      {label}
                    </span>
                  </td>

                  {/* Geofence */}
                  <td className="py-3 px-4">
                    {v.is_geofence_valid === true && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Geçerli
                      </span>
                    )}
                    {v.is_geofence_valid === false && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        İhlal
                      </span>
                    )}
                    {v.is_geofence_valid === null && (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>

                  {/* Notlar */}
                  <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate">
                    {v.notes || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
