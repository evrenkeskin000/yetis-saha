'use client';

import React from 'react';
import { ALL_DEALERSHIPS } from '@saha/shared';
import { RoleGuard } from '../../../components/RoleGuard';
import { VisitFilters } from '../../../components/ziyaretler/VisitFilters';
import { VisitArchiveTable } from '../../../components/ziyaretler/VisitArchiveTable';
import { CsvButton } from '../../../components/raporlar/CsvButton';
import { useDealershipScope } from '../../../lib/DealershipScopeContext';
import { useVisitArchive } from '../../../lib/hooks/useVisitArchive';
import { exportToCsv } from '../../../lib/csv';
import { formatDateTimeTR } from '../../../lib/format';
import { getOutcomeLabel } from '../../../lib/outcome';

const STATUS_LABEL = {
  completed: 'Tamamlandı',
  in_progress: 'Devam Ediyor',
  cancelled: 'İptal Edildi',
} as const;

function ZiyaretlerContent() {
  const { scope, dealership } = useDealershipScope();
  const {
    filters,
    updateFilters,
    page,
    setPage,
    pageSize,
    visits,
    totalCount,
    completedCount,
    reps,
    loading,
    error,
    fetchAllForCsv,
  } = useVisitArchive();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const scopeLabel =
    scope === ALL_DEALERSHIPS
      ? 'Tüm Bayiler'
      : dealership?.name || 'Seçili bayi';

  const handleCsv = async () => {
    try {
      const rows = await fetchAllForCsv();
      const showBayi = scope === ALL_DEALERSHIPS;
      const headers = [
        'Tarih',
        ...(showBayi ? ['Bayi'] : []),
        'Temsilci',
        'Esnaf',
        'Süre (dk)',
        'Sonuç',
        'Durum',
        'Mock',
      ];
      const data = rows.map((v) => [
        formatDateTimeTR(v.check_in_at),
        ...(showBayi ? [v.dealershipName] : []),
        v.fieldRepName,
        v.customerName,
        v.status === 'cancelled' ? '' : (v.duration_minutes ?? ''),
        v.status === 'cancelled' ? '' : getOutcomeLabel(v.outcome),
        STATUS_LABEL[v.status],
        v.is_mock_location ? 'Evet' : 'Hayır',
      ]);
      const code =
        scope === ALL_DEALERSHIPS
          ? 'tum-bayiler'
          : dealership?.code || 'bayi';
      exportToCsv(`ziyaret-arsivi-${code}.csv`, headers, data);
    } catch (err) {
      console.error('CSV dışa aktarma hatası:', err);
      alert('CSV dosyası oluşturulamadı.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ziyaretler</h1>
          <p className="text-xs text-slate-500 mt-1">
            Geçmiş arşivi · {scopeLabel} · Tamamlanan (iptal hariç):{' '}
            {completedCount}
          </p>
        </div>
        <CsvButton onExport={() => void handleCsv()} />
      </div>

      <VisitFilters filters={filters} reps={reps} onChange={updateFilters} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <VisitArchiveTable visits={visits} loading={loading} />
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Sayfa {page + 1} / {totalPages} · Sayfa başına {pageSize}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40 text-xs font-semibold"
          >
            Önceki
          </button>
          <button
            type="button"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white disabled:opacity-40 text-xs font-semibold"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ZiyaretlerPage() {
  return (
    <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
      <ZiyaretlerContent />
    </RoleGuard>
  );
}
