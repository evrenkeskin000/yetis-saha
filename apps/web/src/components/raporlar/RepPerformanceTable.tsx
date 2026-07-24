'use client';

import React from 'react';
import { Users } from 'lucide-react';
import type { RepPerformanceRow } from '../../lib/report';
import { exportToCsv } from '../../lib/csv';
import { CsvButton } from './CsvButton';

interface RepPerformanceTableProps {
  data: RepPerformanceRow[];
}

export function RepPerformanceTable({ data }: RepPerformanceTableProps) {
  const handleCsvExport = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `rapor_temsilci_performans_${todayStr}.csv`;
    const headers = [
      'Temsilci Adı',
      'E-posta',
      'Toplam Ziyaret',
      'Tamamlanan Ziyaret',
      'Ortalama Süre (dk)',
      'Anlaşma / Satış Sayısı',
      'Dönüşüm Oranı (%)',
    ];

    const rows = data.map((r) => [
      r.full_name,
      r.email,
      r.totalVisits,
      r.completedVisits,
      r.avgDurationMinutes ?? '-',
      r.agreedVisits,
      `%${Math.round(r.conversionRatePct)}`,
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-600" />
          <span>Temsilci Performans Raporu ({data.length})</span>
        </h3>
        <CsvButton onExport={handleCsvExport} label="Performansı İndir" />
      </div>

      {data.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm font-medium">
          Temsilci verisi bulunamadı.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Temsilci</th>
                <th className="py-3 px-4 text-center">Toplam Ziyaret</th>
                <th className="py-3 px-4 text-center">Tamamlanan</th>
                <th className="py-3 px-4 text-center">Ort. Süre</th>
                <th className="py-3 px-4 text-center">Anlaşma</th>
                <th className="py-3 px-4 text-right">Dönüşüm (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <div className="font-semibold text-slate-900">{row.full_name}</div>
                      <div className="text-xs font-mono text-slate-500">{row.email}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                    {row.totalVisits}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-700">
                    {row.completedVisits}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-700 font-mono text-xs">
                    {row.avgDurationMinutes !== null ? `${row.avgDurationMinutes} dk` : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                    {row.agreedVisits}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      %{Math.round(row.conversionRatePct)}
                    </span>
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
