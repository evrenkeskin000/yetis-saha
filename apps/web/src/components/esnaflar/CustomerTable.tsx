'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import type { Category, Customer } from '@saha/shared';
import { createClient } from '../../lib/supabase/client';
import { formatDateTimeTR } from '../../lib/format';

interface CustomerRow extends Customer {
  category_name?: string;
  category_icon?: string | null;
  last_visit_at?: string | null;
}

export function CustomerTable() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all');

  // Deactivate confirm modal state
  const [confirmModalCustomer, setConfirmModalCustomer] = useState<CustomerRow | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      // Query 1: customers
      const { data: customerData, error: custErr } = await supabase
        .from('customers')
        .select('id, business_name, owner_name, phone, address, category_id, location, geofence_radius_m, is_active, created_at')
        .order('created_at', { ascending: false });

      if (custErr) throw custErr;

      // Query 2: categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (catErr) throw catErr;

      // Query 3: visits for latest visit per customer
      const { data: visitData, error: visitErr } = await supabase
        .from('visits')
        .select('customer_id, check_in_at')
        .order('check_in_at', { ascending: false });

      if (visitErr) throw visitErr;

      // Client-side joins
      const catMap = new Map<string, Category>();
      (catData as Category[] || []).forEach((c) => catMap.set(c.id, c));

      const latestVisitMap = new Map<string, string>();
      (visitData || []).forEach((v: { customer_id: string; check_in_at: string }) => {
        if (v.customer_id && !latestVisitMap.has(v.customer_id)) {
          latestVisitMap.set(v.customer_id, v.check_in_at);
        }
      });

      const joined: CustomerRow[] = (customerData || []).map((c: any) => {
        const cat = c.category_id ? catMap.get(c.category_id) : undefined;
        return {
          ...c,
          location: c.location,
          category_name: cat?.name || 'Kategorisiz',
          category_icon: cat?.icon || null,
          last_visit_at: latestVisitMap.get(c.id) || null,
        };
      });

      setCategories(catData as Category[] || []);
      setCustomers(joined);
    } catch (err: any) {
      console.error('Esnaflar yüklenirken hata:', err);
      if (err?.code === '42501') {
        setError('Bu işlem için yetkiniz yok.');
      } else {
        setError('Esnaf verileri yüklenirken bir sorun oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      // Update local state
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, is_active: nextState } : c))
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
      // Search query filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = c.business_name?.toLowerCase().includes(q);
        const matchOwner = c.owner_name?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        if (!matchName && !matchOwner && !matchPhone) return false;
      }

      // Category filter
      if (selectedCategory && c.category_id !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'passive' && c.is_active) return false;

      return true;
    });
  }, [customers, searchQuery, selectedCategory, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header & New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Esnaf Yönetimi</h1>
          <p className="text-xs text-slate-500">
            Sistemdeki tüm müşterileri ve sahadaki esnaf noktalarını inceleyin ve yönetin
          </p>
        </div>

        <Link
          href="/esnaflar/yeni"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-colors"
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İşletme adı, yetkili veya telefon ara..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-500 bg-white transition-colors"
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

        {/* Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-500 bg-white transition-colors"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Yalnız Aktifler</option>
            <option value="passive">Yalnız Pasifler</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
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
                    {/* İşletme Adı */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className={!c.is_active ? 'line-through text-slate-500' : ''}>
                          {c.business_name}
                        </span>
                      </div>
                    </td>

                    {/* Yetkili */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {c.owner_name || '-'}
                    </td>

                    {/* Telefon */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {c.phone || '-'}
                    </td>

                    {/* Kategori */}
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                        {c.category_icon && <span>{c.category_icon}</span>}
                        <span>{c.category_name}</span>
                      </span>
                    </td>

                    {/* Son Ziyaret */}
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                      {formatDateTimeTR(c.last_visit_at)}
                    </td>

                    {/* Durum */}
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

                    {/* İşlemler */}
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        href={`/esnaflar/${c.id}`}
                        title="Detay Göster"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/esnaflar/${c.id}/duzenle`}
                        title="Düzenle"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>

                      {c.is_active ? (
                        <button
                          type="button"
                          onClick={() => setConfirmModalCustomer(c)}
                          title="Pasife Al"
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 transition-colors"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          title="Aktifleştir"
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-emerald-600 transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pasife Al Confirmation Modal */}
      {confirmModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Esnafı Pasife Al
            </h3>
            <p className="text-sm text-slate-600">
              <strong>{confirmModalCustomer.business_name}</strong> isimli esnafı pasife almak istediğinizden emin misiniz? Esnaf silinmez, pasif duruma getirilir.
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
