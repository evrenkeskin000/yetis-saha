'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ALL_DEALERSHIPS } from '@saha/shared';
import { formatDateTimeTR } from '../../lib/format';
import { getOutcomeLabel } from '../../lib/outcome';
import { useDealershipScope } from '../../lib/DealershipScopeContext';
import type { ArchiveVisitRow } from '../../lib/hooks/useVisitArchive';
import {
  VisitDetailModal,
  type VisitDetailPreview,
} from './VisitDetailModal';

interface VisitArchiveTableProps {
  visits: ArchiveVisitRow[];
  loading: boolean;
}

const STATUS_BADGE: Record<
  ArchiveVisitRow['status'],
  { label: string; className: string }
> = {
  completed: {
    label: 'Tamamlandı',
    className: 'bg-emerald-100 text-emerald-700',
  },
  in_progress: {
    label: 'Devam Ediyor',
    className: 'bg-amber-100 text-amber-700',
  },
  cancelled: {
    label: 'İptal Edildi',
    className: 'bg-slate-200 text-slate-700',
  },
};

export function VisitArchiveTable({ visits, loading }: VisitArchiveTableProps) {
  const { scope } = useDealershipScope();
  const showDealership = scope === ALL_DEALERSHIPS;
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [preview, setPreview] = useState<VisitDetailPreview | null>(null);

  const openVisit = (v: ArchiveVisitRow) => {
    setSelectedVisitId(v.id);
    setPreview({
      fieldRepName: v.fieldRepName,
      customerName: v.customerName,
      customerId: v.customer_id,
      customerAccessible: v.customerAccessible,
      dealershipName: showDealership ? v.dealershipName : undefined,
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
        Ziyaretler yükleniyor...
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
        Seçilen filtrelere uygun ziyaret bulunamadı.
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-end">
          <span className="text-xs text-slate-400">Satıra tıklayarak detay</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Tarih / Saat</th>
                {showDealership && <th className="py-3.5 px-4">Bayi</th>}
                <th className="py-3.5 px-4">Temsilci</th>
                <th className="py-3.5 px-4">Esnaf</th>
                <th className="py-3.5 px-4">Süre</th>
                <th className="py-3.5 px-4">Sonuç</th>
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4">Uyarı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {visits.map((v) => {
                const status = STATUS_BADGE[v.status];
                const duration =
                  v.status === 'cancelled'
                    ? '—'
                    : v.duration_minutes != null
                      ? `${v.duration_minutes} dk`
                      : '—';
                const nameCell = v.customerAccessible ? (
                  <Link
                    href={`/esnaflar/${v.customer_id}`}
                    className="font-medium text-teal-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {v.customerName}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-700">
                    {v.customerName}
                  </span>
                );

                return (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => openVisit(v)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openVisit(v);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${v.customerName} ziyaret detayı`}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-600">
                      {formatDateTimeTR(v.check_in_at)}
                    </td>
                    {showDealership && (
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {v.dealershipName}
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {v.fieldRepName}
                    </td>
                    <td className="py-3.5 px-4">{nameCell}</td>
                    <td className="py-3.5 px-4 text-slate-600">{duration}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {v.status === 'cancelled'
                        ? '—'
                        : getOutcomeLabel(v.outcome)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {v.is_mock_location ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                          Mock GPS
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <VisitDetailModal
        visitId={selectedVisitId}
        preview={preview}
        onClose={() => {
          setSelectedVisitId(null);
          setPreview(null);
        }}
      />
    </>
  );
}
