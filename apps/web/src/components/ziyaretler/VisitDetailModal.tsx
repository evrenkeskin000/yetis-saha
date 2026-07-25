'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  ExternalLink,
  MapPin,
  StickyNote,
  User,
  X,
} from 'lucide-react';
import type { GeoPoint } from '@saha/shared';
import {
  PhotoGallery,
  type PhotoItem,
} from '../esnaflar/PhotoGallery';
import { formatDateTimeTR } from '../../lib/format';
import { parseGeoPoint } from '../../lib/geo';
import { getOutcomeLabel } from '../../lib/outcome';
import { createClient } from '../../lib/supabase/client';
import { OutcomeBadge } from '../panel/OutcomeBadge';

export interface VisitDetailPreview {
  fieldRepName?: string;
  customerName?: string;
  customerId?: string;
  customerAccessible?: boolean;
  dealershipName?: string;
}

interface VisitDetailModalProps {
  visitId: string | null;
  preview?: VisitDetailPreview | null;
  onClose: () => void;
}

interface VisitDetailRow {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  duration_minutes: number | null;
  outcome: string | null;
  notes: string | null;
  is_mock_location: boolean;
  cancelled_at: string | null;
  check_in_location: unknown;
  check_out_location: unknown;
  customer_id: string;
}

function formatCoord(point: GeoPoint | null): string {
  if (!point) return '—';
  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

export function VisitDetailModal({
  visitId,
  preview,
  onClose,
}: VisitDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visit, setVisit] = useState<VisitDetailRow | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  useEffect(() => {
    if (!visitId) {
      setVisit(null);
      setPhotos([]);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const [visitRes, photoRes] = await Promise.all([
          supabase
            .from('visits')
            .select(
              'id, check_in_at, check_out_at, duration_minutes, outcome, notes, is_mock_location, cancelled_at, check_in_location, check_out_location, customer_id'
            )
            .eq('id', visitId)
            .maybeSingle(),
          supabase
            .from('visit_photos')
            .select('id, storage_path, captured_at')
            .eq('visit_id', visitId)
            .order('created_at', { ascending: true }),
        ]);

        if (cancelled) return;

        if (visitRes.error) throw visitRes.error;
        if (!visitRes.data) {
          setError('Ziyaret kaydı bulunamadı.');
          setVisit(null);
          setPhotos([]);
          return;
        }

        setVisit(visitRes.data as VisitDetailRow);
        if (photoRes.error) {
          console.warn('Ziyaret fotoğrafları yüklenemedi:', photoRes.error.message);
          setPhotos([]);
        } else {
          setPhotos((photoRes.data ?? []) as PhotoItem[]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Ziyaret detayı hatası:', err);
        setError('Ziyaret detayları yüklenirken bir hata oluştu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visitId]);

  useEffect(() => {
    if (!visitId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visitId, onClose]);

  if (!visitId) return null;

  const customerId = visit?.customer_id ?? preview?.customerId;
  const customerName =
    preview?.customerName || 'Esnaf';
  const fieldRepName = preview?.fieldRepName || 'Temsilci';
  const customerAccessible = preview?.customerAccessible !== false;
  const checkInPoint = visit
    ? parseGeoPoint(visit.check_in_location)
    : null;
  const checkOutPoint = visit
    ? parseGeoPoint(visit.check_out_location)
    : null;

  const mapsUrl = checkInPoint
    ? `https://www.openstreetmap.org/?mlat=${checkInPoint.latitude}&mlon=${checkInPoint.longitude}#map=17/${checkInPoint.latitude}/${checkInPoint.longitude}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-detail-title"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-white rounded-t-2xl">
          <div className="min-w-0">
            <h3
              id="visit-detail-title"
              className="text-base font-bold text-slate-900 truncate"
            >
              Ziyaret Detayı
            </h3>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {customerName}
              {preview?.dealershipName
                ? ` · ${preview.dealershipName}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {loading && (
            <p className="text-sm text-slate-500 text-center py-8">
              Ziyaret detayları yükleniyor...
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          {!loading && !error && visit && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    Temsilci
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {fieldRepName}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Esnaf
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {customerAccessible && customerId ? (
                      <Link
                        href={`/esnaflar/${customerId}`}
                        className="text-teal-700 hover:underline inline-flex items-center gap-1"
                      >
                        {customerName}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      customerName
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    Giriş / Çıkış
                  </div>
                  <div className="text-sm font-mono text-slate-800">
                    {formatDateTimeTR(visit.check_in_at)}
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    {visit.check_out_at
                      ? formatDateTimeTR(visit.check_out_at)
                      : visit.cancelled_at
                        ? `İptal: ${formatDateTimeTR(visit.cancelled_at)}`
                        : 'Devam ediyor'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Sonuç / Süre
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {visit.cancelled_at ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-700">
                        İptal Edildi
                      </span>
                    ) : (
                      <OutcomeBadge outcome={visit.outcome} />
                    )}
                    <span className="text-sm font-medium text-slate-700">
                      {visit.cancelled_at
                        ? '—'
                        : visit.duration_minutes != null
                          ? `${visit.duration_minutes} dk`
                          : 'Devam ediyor'}
                    </span>
                  </div>
                  {!visit.cancelled_at && visit.outcome && (
                    <div className="text-xs text-slate-500">
                      {getOutcomeLabel(visit.outcome)}
                    </div>
                  )}
                </div>
              </div>

              {(visit.is_mock_location || mapsUrl) && (
                <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    Konum
                  </div>
                  <div className="text-xs font-mono text-slate-700 space-y-1">
                    <div>Giriş: {formatCoord(checkInPoint)}</div>
                    {checkOutPoint && (
                      <div>Çıkış: {formatCoord(checkOutPoint)}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {visit.is_mock_location && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                        Mock GPS
                      </span>
                    )}
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                      >
                        Haritada aç
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <StickyNote className="w-3.5 h-3.5" />
                  Notlar
                </div>
                {visit.notes?.trim() ? (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {visit.notes}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">Not eklenmemiş.</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Fotoğraflar ({photos.length})
                </div>
                <PhotoGallery photos={photos} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
