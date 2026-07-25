'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Store } from 'lucide-react';
import { customerFormSchema, type Category, type GeoPoint } from '@saha/shared';
import { ALL_DEALERSHIPS } from '@saha/shared';
import { createClient } from '../../lib/supabase/client';
import { parseGeoPoint, toEwkt } from '../../lib/geo';
import { useDealershipScope } from '../../lib/DealershipScopeContext';
import { useProfile } from '../../lib/hooks/useProfile';
import { LocationPickerMapLoader } from './LocationPickerMapLoader';

export interface CustomerFormInitialValues {
  id?: string;
  business_name: string;
  owner_name?: string | null;
  phone?: string | null;
  address?: string | null;
  category_id?: string | null;
  location?: unknown;
  notes?: string | null;
  dealership_id?: string | null;
}

interface CustomerFormProps {
  initialCustomer?: CustomerFormInitialValues;
  isEditing?: boolean;
}

export function CustomerForm({
  initialCustomer,
  isEditing = false,
}: CustomerFormProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const { scope, dealership, dealerships } = useDealershipScope();
  const needDealershipPicker =
    !isEditing &&
    profile?.role === 'yetis_admin' &&
    scope === ALL_DEALERSHIPS;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedDealershipId, setSelectedDealershipId] = useState(
    initialCustomer?.dealership_id ||
      (scope !== ALL_DEALERSHIPS ? scope : '') ||
      ''
  );

  const initialGeoPoint = parseGeoPoint(initialCustomer?.location);

  const [formState, setFormState] = useState({
    business_name: initialCustomer?.business_name || '',
    owner_name: initialCustomer?.owner_name || '',
    phone: initialCustomer?.phone || '',
    address: initialCustomer?.address || '',
    category_id: initialCustomer?.category_id || '',
    notes: initialCustomer?.notes || '',
    location: initialGeoPoint as GeoPoint | null,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data) {
          // Keep active categories or the category currently assigned to this customer
          const filtered = (data as Category[]).filter(
            (c) => c.is_active || c.id === initialCustomer?.category_id
          );
          setCategories(filtered);
        }
      } catch (err) {
        console.error('Kategoriler yüklenirken hata:', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, [initialCustomer?.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    if (!formState.location) {
      setFieldErrors({ location: 'Lütfen harita üzerinden esnaf konumunu seçin' });
      return;
    }

    const payload = {
      business_name: formState.business_name,
      owner_name: formState.owner_name,
      phone: formState.phone,
      address: formState.address,
      category_id: formState.category_id,
      notes: formState.notes,
      location: formState.location,
    };

    const parseResult = customerFormSchema.safeParse(payload);

    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const pathStr = issue.path.join('.');
        if (!errors[pathStr]) {
          errors[pathStr] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createClient();
      const validData = parseResult.data;
      const ewktLocation = toEwkt(validData.location);

      const customerPayload = {
        business_name: validData.business_name,
        owner_name: validData.owner_name || null,
        phone: validData.phone || null,
        address: validData.address || null,
        category_id: validData.category_id,
        notes: validData.notes || null,
        location: ewktLocation,
      };

      if (isEditing && initialCustomer?.id) {
        const { error } = await supabase
          .from('customers')
          .update(customerPayload)
          .eq('id', initialCustomer.id);

        if (error) {
          if (error.code === '42501') {
            setServerError('Bu işlem için yetkiniz yok.');
          } else {
            setServerError(`Güncelleme başarısız: ${error.message}`);
          }
          return;
        }
      } else {
        let dealershipId: string | null = null;
        if (profile?.role === 'dealer_admin') {
          dealershipId = profile.dealership_id;
        } else if (scope !== ALL_DEALERSHIPS) {
          dealershipId = scope;
        } else {
          dealershipId = selectedDealershipId || null;
        }

        if (!dealershipId) {
          setFieldErrors({
            dealership_id: 'Lütfen bir bayi seçin',
          });
          setSubmitting(false);
          return;
        }

        if (!profile?.id) {
          setServerError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
          setSubmitting(false);
          return;
        }

        const { error } = await supabase.from('customers').insert([
          {
            ...customerPayload,
            is_active: true,
            dealership_id: dealershipId,
            created_by: profile.id,
          },
        ]);

        if (error) {
          if (error.code === '42501') {
            setServerError('Bu işlem için yetkiniz yok.');
          } else {
            setServerError(`Kayıt başarısız: ${error.message}`);
          }
          return;
        }
      }

      router.push('/esnaflar');
      router.refresh();
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      setServerError('Beklenmeyen bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditing ? 'Esnaf Bilgilerini Düzenle' : 'Yeni Esnaf Ekle'}
            </h1>
            <p className="text-xs text-slate-500">
              {isEditing
                ? 'Mevcut esnaf bilgilerini ve konumunu güncelleyin'
                : 'Sisteme yeni esnaf kaydı ekleyin ve haritada konumlandırın'}
            </p>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          {/* İşletme Adı */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">
              İşletme Adı <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formState.business_name}
                onChange={(e) =>
                  setFormState({ ...formState, business_name: e.target.value })
                }
                placeholder="Örn. Kahraman Market"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden transition-colors ${
                  fieldErrors.business_name
                    ? 'border-red-300 bg-red-50/50 focus:border-red-500'
                    : 'border-slate-300 focus:border-teal-500'
                }`}
              />
            </div>
            {fieldErrors.business_name && (
              <p className="text-xs text-red-600 font-medium">
                {fieldErrors.business_name}
              </p>
            )}
          </div>

          {needDealershipPicker && (
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Bayi <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDealershipId}
                onChange={(e) => setSelectedDealershipId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden bg-white ${
                  fieldErrors.dealership_id
                    ? 'border-red-300 bg-red-50/50'
                    : 'border-slate-300 focus:border-teal-500'
                }`}
              >
                <option value="">Bayi seçin</option>
                {dealerships
                  .filter((d) => d.is_active)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
              {fieldErrors.dealership_id && (
                <p className="text-xs text-red-600 font-medium">
                  {fieldErrors.dealership_id}
                </p>
              )}
            </div>
          )}

          {!needDealershipPicker && !isEditing && dealership && (
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Bayi
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700">
                {dealership.name}
              </div>
            </div>
          )}

          {isEditing && initialCustomer?.dealership_id && (
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Bayi
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700">
                {dealerships.find((d) => d.id === initialCustomer.dealership_id)
                  ?.name ?? '—'}
              </div>
            </div>
          )}

          {/* Yetkili Adı */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Yetkili Ad Soyad
            </label>
            <input
              type="text"
              value={formState.owner_name}
              onChange={(e) =>
                setFormState({ ...formState, owner_name: e.target.value })
              }
              placeholder="Örn. Ahmet Yılmaz"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500 transition-colors"
            />
            {fieldErrors.owner_name && (
              <p className="text-xs text-red-600 font-medium">
                {fieldErrors.owner_name}
              </p>
            )}
          </div>

          {/* Telefon */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Telefon (05XXXXXXXXX)
            </label>
            <input
              type="text"
              value={formState.phone}
              onChange={(e) =>
                setFormState({ ...formState, phone: e.target.value })
              }
              placeholder="05321234567"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden transition-colors ${
                fieldErrors.phone
                  ? 'border-red-300 bg-red-50/50 focus:border-red-500'
                  : 'border-slate-300 focus:border-teal-500'
              }`}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-600 font-medium">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          {/* Kategori */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              value={formState.category_id}
              onChange={(e) =>
                setFormState({ ...formState, category_id: e.target.value })
              }
              disabled={loadingCategories}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden transition-colors bg-white ${
                fieldErrors.category_id
                  ? 'border-red-300 bg-red-50/50 focus:border-red-500'
                  : 'border-slate-300 focus:border-teal-500'
              }`}
            >
              <option value="">Kategori Seçin</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}
                  {cat.name}
                  {!cat.is_active ? ' (Pasif)' : ''}
                </option>
              ))}
            </select>
            {fieldErrors.category_id && (
              <p className="text-xs text-red-600 font-medium">
                {fieldErrors.category_id}
              </p>
            )}
          </div>

          {/* Adres */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">
              Açık Adres
            </label>
            <textarea
              rows={2}
              value={formState.address}
              onChange={(e) =>
                setFormState({ ...formState, address: e.target.value })
              }
              placeholder="Mahalle, cadde, sokak, no..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Haritadan Konum Seçimi */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">
              Haritadan Konum Seçin <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 -mt-0.5 mb-1">
              Adres arayın veya haritayı kaydırıp pini esnafın üzerine getirin
            </p>
            <LocationPickerMapLoader
              value={formState.location}
              onChange={(loc) => {
                setFormState((prev) => ({ ...prev, location: loc }));
                if (fieldErrors['location'] || fieldErrors['location.latitude']) {
                  setFieldErrors((prev) => {
                    const newErr = { ...prev };
                    delete newErr['location'];
                    delete newErr['location.latitude'];
                    delete newErr['location.longitude'];
                    return newErr;
                  });
                }
              }}
              onAddressChange={(addr) => {
                // Kullanıcının yazdığı adresi ezme — yalnızca boşsa doldur
                setFormState((prev) =>
                  prev.address.trim().length === 0
                    ? { ...prev, address: addr }
                    : prev
                );
              }}
            />
            {(fieldErrors.location ||
              fieldErrors['location.latitude'] ||
              fieldErrors['location.longitude']) && (
              <p className="text-xs text-red-600 font-medium">
                {fieldErrors.location ||
                  fieldErrors['location.latitude'] ||
                  fieldErrors['location.longitude']}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
