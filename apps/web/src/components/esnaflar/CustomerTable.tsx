'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Edit,
  Eye,
  Plus,
  Power,
  Search,
  Store,
  UserCheck,
} from 'lucide-react';
import { ALL_DEALERSHIPS, type Category, type Customer } from '@saha/shared';
import { createClient } from '../../lib/supabase/client';
import { formatDateTimeTR } from '../../lib/format';
import { useDealershipScope } from '../../lib/DealershipScopeContext';
import { applyDealershipScope } from '../../lib/scopedQuery';

interface CustomerRow extends Customer {
  category_name?: string;
  category_icon?: string | null;
  last_visit_at?: string | null;
  dealership_name?: string;
}

export function CustomerTable() {
  const { scope, dealerships, loading: scopeLoading } = useDealershipScope();
  const showDealership = scope === ALL_DEALERSHIPS;

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'passive'
  >('all');

  const [confirmModalCustomer, setConfirmModalCustomer] =
    useState<CustomerRow | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (scopeLoading) return;

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const customersQuery = applyDealershipScope(
        supabase
          .from('customers')
          .select(
            'id, business_name, owner_name, phone, address, category_id, location, is_active, dealership_id, created_by, created_at'
          )
          .order('created_at', { ascending: false }),
        scope
      );

      const { data: customerData, error: custErr } = await customersQuery;

      if (custErr) throw custErr;

      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (catErr) throw catErr;

      const customerIds = (customerData || []).map(
        (c: { id: string }) => c.id as string
      );
      let visitData: { customer_id: string; check_in_at: string }[] = [];

      if (customerIds.length > 0) {
        // Yalnızca listelenen esnaflar için son ziyaret; tarihe göre sınırlı
        const since = new Date();
        since.setMonth(since.getMonth() - 6);

        const { data: vData, error: visitErr } = await supabase
          .from('visits')
          .select('customer_id, check_in_at')
          .in('customer_id', customerIds)
          .gte('check_in_at', since.toISOString())
          .order('check_in_at', { ascending: false });

        if (visitErr) throw visitErr;
        visitData = (vData as typeof visitData) || [];
      }

      const catMap = new Map<string, Category>();
      ((catData as Category[]) || []).forEach((c) => catMap.set(c.id, c));

      const dealershipMap = new Map(
        dealerships.map((d) => [d.id, d.name] as const)
      );

      const latestVisitMap = new Map<string, string>();
      visitData.forEach((v) => {
        if (v.customer_id && !latestVisitMap.has(v.customer_id)) {
          latestVisitMap.set(v.customer_id, v.check_in_at);
        }
      });

      const joined: CustomerRow[] = (customerData || []).map(
        (c: Record<string, unknown>) => {
          const cat = c.category_id
            ? catMap.get(String(c.category_id))
            : undefined;
          const id = String(c.id);
          const dealershipId = String(c.dealership_id || '');
          return {
            ...(c as unknown as Customer),
            id,
            dealership_id: dealershipId,
            category_name: cat?.name || 'Kategorisiz',
            category_icon: cat?.icon || null,
            last_visit_at: latestVisitMap.get(id) || null,
            dealership_name: dealershipMap.get(dealershipId) || '—',
          };
        }
      );

      setCategories((catData as Category[]) || []);
      setCustomers(joined);
    } catch (err: unknown) {
      console.error('Esnaflar yüklenirken hata:', err);
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === '42501') {
        setError('Bu işlem için yetkiniz yok.');
      } else {
        setError('Esnaf verileri yüklenirken bir sorun oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }, [scope, scopeLoading, dealerships]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleActive = async (customer: CustomerRow) => {
    try {
      setActionLoading(true);
      const supabase = createClient();
      const nextState = !customer.is_active;

      const { error: updateErr } = await supabase
        .from('customers')
        .update({ is_active: nextState })
        .eq('id', customer.id);

      if (updateErr) {
        if (updateErr.code === '42501') {
          alert('Bu işlem için yetkiniz yok.');
        } else {
          alert(`İşlem başarısız: ${updateErr.message}`);
        }
        return;
      }

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customer.id ? { ...c, is_active: nextState } : c
        )
      );
      setConfirmModalCustomer(null);
    } catch (err) {
      console.error('Durum değiştirme hatası:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = c.business_name?.toLowerCase().includes(q);
        const matchOwner = c.owner_name?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        if (!matchName && !matchOwner && !matchPhone) return false;
      }

      if (selectedCategory && c.category_id !== selectedCategory) {
        return false;
      }

      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'passive' && c.is_active) return false;

      return true;
    });
  }, [customers, searchQuery, selectedCategory, statusFilter]);

  const isLoading = loading || scopeLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Esnaf Yönetimi</h1>
          <p className="text-xs text-slate-500">
            Sistemdeki müşterileri ve sahadaki esnaf noktalarını inceleyin ve
            yönetin
          </p>
        </div>

        <Link
          href="/esnaflar/yeni"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Esnaf</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İşletme adı, yetkili veya telefon ara..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-teal-500 bg-white transition-colors"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon ? `${cat.icon} ` : ''}
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'active' | 'passive')
            }
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-teal-500 bg-white transition-colors"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Yalnız Aktifler</option>
            <option value="passive">Yalnız Pasifler</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Esnaf verileri yükleniyor...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Store className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 text-sm font-medium">
              Arama kriterlerine uygun esnaf bulunamadı.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">İşletme Adı</th>
                  {showDealership && (
                    <th className="py-3.5 px-4">Bayi</th>
                  )}
                  <th className="py-3.5 px-4">Yetkili</th>
                  <th className="py-3.5 px-4">Telefon</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Son Ziyaret</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !c.is_active ? 'bg-slate-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span
                          className={
                            !c.is_active ? 'line-through text-slate-500' : ''
                          }
                        >
                          {c.business_name}
                        </span>
                      </div>
                    </td>

                    {showDealership && (
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {c.dealership_name}
                      </td>
                    )}

                    <td className="py-3.5 px-4 text-slate-600">
                      {c.owner_name || '-'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {c.phone || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                        {c.category_icon && <span>{c.category_icon}</span>}
                        <span>{c.category_name}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                      {formatDateTimeTR(c.last_visit_at)}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Pasif
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <Link
                          href={`/esnaflar/${c.id}`}
                          title="Detay Göster"
                          className="inline-flex shrink-0 items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/esnaflar/${c.id}/duzenle`}
                          title="Düzenle"
                          className="inline-flex shrink-0 items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-teal-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        {c.is_active ? (
                          <button
                            type="button"
                            onClick={() => setConfirmModalCustomer(c)}
                            title="Pasife Al"
                            className="inline-flex shrink-0 items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 transition-colors"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            title="Aktifleştir"
                            className="inline-flex shrink-0 items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-emerald-600 transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Esnafı Pasife Al</h3>
            <p className="text-sm text-slate-600">
              <strong>{confirmModalCustomer.business_name}</strong> isimli
              esnafı pasife almak istediğinizden emin misiniz? Esnaf silinmez,
              pasif duruma getirilir.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalCustomer(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleToggleActive(confirmModalCustomer)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'İşleniyor...' : 'Pasife Al'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
