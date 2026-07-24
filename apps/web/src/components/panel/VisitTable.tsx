'use client';

import React from 'react';
import { formatTimeTR } from '../../lib/format';
import type { WebVisit } from '../../lib/hooks/useTodayVisits';
import { OutcomeBadge } from './OutcomeBadge';

interface VisitTableProps {
  visits: WebVisit[];
}

export function VisitTable({ visits }: VisitTableProps) {
  if (!visits || visits.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
        Bugün için gösterilecek ziyaret kaydı bulunmuyor.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">
          Ziyaret Kayıtları ({visits.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-6">Temsilci</th>
              <th className="py-3.5 px-6">Esnaf</th>
              <th className="py-3.5 px-6">Giriş / Çıkış</th>
              <th className="py-3.5 px-6">Sonuç</th>
              <th className="py-3.5 px-6">Süre</th>
              <th className="py-3.5 px-6">Geofence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {visits.map((v) => {
              const repName = v.fieldRep?.full_name || 'Bilinmiyor';
              const businessName = v.customer?.business_name || 'Bilinmiyor';
              const durationStr =
                v.duration_minutes !== null
                  ? `${v.duration_minutes} dk`
                  : 'Devam Ediyor';

              return (
                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {repName}
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-800">
                    {businessName}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600 font-mono">
                    {formatTimeTR(v.check_in_at)} - {formatTimeTR(v.check_out_at)}
                  </td>
                  <td className="py-4 px-6">
                    <OutcomeBadge outcome={v.outcome} />
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-600">
                    {durationStr}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {v.is_geofence_valid === true ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                          Menzil İçinde
                        </span>
                      ) : v.is_geofence_valid === false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700">
                          Menzil Dışında
                        </span>
                      ) : null}

                      {v.is_mock_location && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                          Mock GPS
                        </span>
                      )}
                    </div>
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
