'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Edit,
  MapPin,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import type { Category, Customer } from '@saha/shared';
import { RoleGuard } from '../../../../components/RoleGuard';
import { createClient } from '../../../../lib/supabase/client';
import { parseGeoPoint } from '../../../../lib/geo';
import { formatDateTimeTR } from '../../../../lib/format';
import {
  VisitHistoryTable,
  type VisitWithRep,
} from '../../../../components/esnaflar/VisitHistoryTable';
import {
  PhotoGallery,
  type PhotoItem,
} from '../../../../components/esnaflar/PhotoGallery';

interface PageProps {
  params: Promise<{ id: string }>;
}

function EsnafDetayContent({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [visits, setVisits] = useState<VisitWithRep[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        // 1. Customer
        const { data: custData, error: custErr } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (custErr || !custData) {
          if (custErr?.code === '42501') {
            setError('Bu işlem için yetkiniz yok.');
          } else {
            setError('Esnaf bulunamadı.');
          }
          setLoading(false);
          return;
        }

        const parsedLocation = parseGeoPoint(custData.location);
        const custObj: Customer = {
          ...custData,
          location: parsedLocation || { latitude: 0, longitude: 0 },
        };
        setCustomer(custObj);

        // 2. Category
        if (custObj.category_id) {
          const { data: catData } = await supabase
            .from('categories')
            .select('*')
            .eq('id', custObj.category_id)
            .single();
          if (catData) {
            setCategory(catData as Category);
          }
        }

        // 3. Visits
        const { data: visitData, error: visitErr } = await supabase
          .from('visits')
          .select('*')
          .eq('customer_id', customerId)
          .order('check_in_at', { ascending: false });

        if (!visitErr && visitData) {
          // Fetch Field Rep users
          const repIds = Array.from(
            new Set((visitData || []).map((v) => v.field_rep_id).filter(Boolean))
          );

          let repMap = new Map<string, { full_name: string; email: string }>();
          if (repIds.length > 0) {
            const { data: repData } = await supabase
              .from('users')
              .select('id, full_name, email')
              .in('id', repIds);

            (repData || []).forEach((r) => repMap.set(r.id, r));
          }

          const joinedVisits: VisitWithRep[] = visitData.map((v) => ({
            ...v,
            check_in_location: parseGeoPoint(v.check_in_location) || {
              latitude: 0,
              longitude: 0,
            },
            check_out_location: parseGeoPoint(v.check_out_location),
            fieldRep: repMap.get(v.field_rep_id) || null,
          }));

          setVisits(joinedVisits);

          // 4. Visit Photos
          const visitIds = visitData.map((v) => v.id);
          if (visitIds.length > 0) {
            const { data: photoData } = await supabase
              .from('visit_photos')
              .select('id, storage_path, captured_at')
              .in('visit_id', visitIds)
              .order('created_at', { ascending: false });

            if (photoData) {
              setPhotos(photoData as PhotoItem[]);
            }
          }
        }
      } catch (err) {
        console.error('Esnaf detay yükleme hatası:', err);
        setError('Detay verileri yüklenirken bir sorun oluştu.');
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm font-medium">
        Esnaf detayları yükleniyor...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium">
          {error || 'Esnaf bilgisi bulunamadı.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/esnaflar')}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>{customer.business_name}</span>
              {customer.is_active ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Aktif
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Pasif
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500">Esnaf Detayı & Ziyaret Geçmişi</p>
          </div>
        </div>

        <Link
          href={`/esnaflar/${customer.id}/duzenle`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-teal-600 text-sm font-semibold shadow-xs transition-colors"
        >
          <Edit className="w-4 h-4" />
          <span>Düzenle</span>
        </Link>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Temel Bilgiler
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">
                {customer.business_name}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{customer.owner_name || 'Yetkili belirtilmemiş'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono">{customer.phone || 'Telefon yok'}</span>
            </div>
          </div>
        </div>

        {/* Location & Category */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Konum & Kategori
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Kategori:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-xs font-semibold text-slate-800">
                {category?.icon && <span>{category.icon}</span>}
                <span>{category?.name || 'Kategorisiz'}</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Geofence: <strong>{customer.geofence_radius_m}m</strong></span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs">{customer.address || 'Açık adres girilmemiş'}</p>
                {customer.location && (
                  <p className="font-mono text-[11px] text-teal-600 font-medium mt-1">
                    {customer.location.latitude.toFixed(5)},{' '}
                    {customer.location.longitude.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes & System */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Notlar & Kayıt Tarihi
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <div>
              <span className="text-slate-400 text-xs block">Kayıt Notu:</span>
              <p className="text-xs italic text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                {customer.notes || 'Not eklenmemiş.'}
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-500 pt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Kayıt: {formatDateTimeTR(customer.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visit History Table */}
      <VisitHistoryTable visits={visits} />

      {/* Photo Gallery */}
      <PhotoGallery photos={photos} />
    </div>
  );
}

export default function EsnafDetayPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <EsnafDetayContent customerId={resolvedParams.id} />
    </RoleGuard>
  );
}
