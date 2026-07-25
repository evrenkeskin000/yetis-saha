'use client';

import React from 'react';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import type { ExceptionRow } from '../../lib/report';
import { exportToCsv } from '../../lib/csv';
import { formatDateTimeTR } from '../../lib/format';
import { CsvButton } from './CsvButton';

interface ExceptionTableProps {
  data: ExceptionRow[];
  filenameSuffix?: string;
}

export function ExceptionTable({
  data,
  filenameSuffix,
}: {
  data: ExceptionRow[];
  filenameSuffix?: string;
}) {
  const handleCsvExport = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const suffix = filenameSuffix ? `_${filenameSuffix}` : '';
    const filename = `rapor_istisnalar${suffix}_${todayStr}.csv`;
    const headers = [
      'Temsilci Adı',
      'Esnaf Adı',
      'Ziyaret Tarihi',
      'Süre (dk)',
      'İstisna Nedenleri',
    ];

    const rows = data.map((r) => [
      r.repName,
      r.customerName,
      formatDateTimeTR(r.checkInAt),
      r.durationMinutes ?? '-',
      r.badges.join(', '),
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-600" />
          <span>İstisna Raporu ({data.length})</span>
        </h3>
        {data.length > 0 && (
          <CsvButton onExport={handleCsvExport} label="İstisnaları İndir" />
        )}
      </div>

      {data.length === 0 ? (
        <div className="p-8 text-center bg-emerald-50/50 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-emerald-900 font-bold text-sm">
            İstisnai durum bulunmuyor
          </p>
          <p className="text-emerald-700 text-xs">
            Seçilen tarih aralığında kısa ziyaret veya sahte konum tespit
            edilmedi.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Temsilci</th>
                <th className="py-3 px-4">Esnaf</th>
                <th className="py-3 px-4">Tarih / Saat</th>
                <th className="py-3 px-4 text-center">Süre</th>
                <th className="py-3 px-4">İstisnalar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {row.repName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {row.customerName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                    {formatDateTimeTR(row.checkInAt)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600">
                    {row.durationMinutes !== null ? `${row.durationMinutes} dk` : '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {row.badges.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
