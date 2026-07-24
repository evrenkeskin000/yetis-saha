'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import type { LeaderboardRow } from '../../lib/report';
import { exportToCsv } from '../../lib/csv';
import { CsvButton } from './CsvButton';

interface LeaderboardProps {
  data: LeaderboardRow[];
}

export function Leaderboard({ data }: LeaderboardProps) {
  const handleCsvExport = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `rapor_leaderboard_${todayStr}.csv`;
    const headers = [
      'Sıra',
      'Temsilci Adı',
      'E-posta',
      'Toplam Ziyaret',
      'Dönüşüm Oranı (%)',
    ];

    const rows = data.map((r) => [
      r.rank,
      r.full_name,
      r.email,
      r.totalVisits,
      `%${Math.round(r.conversionRatePct)}`,
    ]);

    exportToCsv(filename, headers, rows);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Ekip Leaderboard (Sıralama)</span>
        </h3>
        <CsvButton onExport={handleCsvExport} label="Sıralamayı İndir" />
      </div>

      {data.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm font-medium">
          Temsilci bulunamadı.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Sıra</th>
                <th className="py-3 px-4">Temsilci</th>
                <th className="py-3 px-4 text-center">Toplam Ziyaret</th>
                <th className="py-3 px-4 text-right">Dönüşüm (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    row.rank === 1 ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* Sıra / Madalya */}
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900 text-base">
                    {row.medal ? <span>{row.medal}</span> : <span className="text-sm text-slate-500">#{row.rank}</span>}
                  </td>

                  {/* Temsilci */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{row.full_name}</div>
                    <div className="text-xs font-mono text-slate-500">{row.email}</div>
                  </td>

                  {/* Ziyaret */}
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                    {row.totalVisits}
                  </td>

                  {/* Dönüşüm */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
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
