'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Check,
  Edit2,
  Plus,
  Power,
  UserPlus,
  X,
} from 'lucide-react';
import type { Dealership } from '@saha/shared';
import { createClient } from '../../lib/supabase/client';
import { useDealershipScope } from '../../lib/DealershipScopeContext';
import { CreateDealerAdminForm } from './CreateDealerAdminForm';
import { DealershipForm } from './DealershipForm';

interface DealershipCounts {
  users: number;
  customers: number;
}

export function DealershipManager() {
  const { refetchDealerships } = useDealershipScope();
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [counts, setCounts] = useState<Record<string, DealershipCounts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dealership | null>(null);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminDealershipId, setAdminDealershipId] = useState<string | null>(
    null
  );

  const [confirmTarget, setConfirmTarget] = useState<Dealership | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const [dealershipsRes, usersRes, customersRes] = await Promise.all([
        supabase.from('dealerships').select('*').order('name', { ascending: true }),
        supabase.from('users').select('dealership_id'),
        supabase.from('customers').select('dealership_id'),
      ]);

      if (dealershipsRes.error) {
        if (dealershipsRes.error.code === '42501') {
          setError('Bu işlem için yetkiniz yok.');
        } else {
          setError(`Bayiler yüklenemedi: ${dealershipsRes.error.message}`);
        }
        setDealerships([]);
        return;
      }

      if (usersRes.error || customersRes.error) {
        const msg =
          usersRes.error?.message || customersRes.error?.message || 'bilinmeyen';
        setError(`Sayımlar yüklenemedi: ${msg}`);
      }

      const list = (dealershipsRes.data as Dealership[]) ?? [];
      setDealerships(list);

      const nextCounts: Record<string, DealershipCounts> = {};
      for (const d of list) {
        nextCounts[d.id] = { users: 0, customers: 0 };
      }

      for (const row of usersRes.data ?? []) {
        const id = row.dealership_id as string | null;
        if (id && nextCounts[id]) {
          nextCounts[id].users += 1;
        }
      }

      for (const row of customersRes.data ?? []) {
        const id = row.dealership_id as string | null;
        if (id && nextCounts[id]) {
          nextCounts[id].customers += 1;
        }
      }

      setCounts(nextCounts);
    } catch (err) {
      console.error('Bayi listesi hatası:', err);
      setError('Bayiler çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const sorted = useMemo(
    () =>
      [...dealerships].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.name.localeCompare(b.name, 'tr');
      }),
    [dealerships]
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (d: Dealership) => {
    setEditing(d);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleFormSuccess = async (d: Dealership) => {
    closeForm();
    await fetchAll();
    await refetchDealerships();
    // listede yeni/güncel kaydı vurgulamak için state zaten yenileniyor
    void d;
  };

  const requestToggle = (d: Dealership) => {
    if (d.is_active) {
      setConfirmTarget(d);
    } else {
      void applyToggle(d, true);
    }
  };

  const applyToggle = async (d: Dealership, nextActive: boolean) => {
    try {
      setTogglingId(d.id);
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from('dealerships')
        .update({
          is_active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', d.id);

      if (updateErr) {
        if (updateErr.code === '42501') {
          alert('Bu işlem için yetkiniz yok.');
        } else {
          alert(`Durum güncellenemedi: ${updateErr.message}`);
        }
        return;
      }

      setConfirmTarget(null);
      await fetchAll();
      await refetchDealerships();
    } catch (err) {
      console.error('Bayi durum hatası:', err);
      alert('Durum güncellenirken bir hata oluştu.');
    } finally {
      setTogglingId(null);
    }
  };

  const openAdminForm = (d: Dealership) => {
    setAdminDealershipId(d.id);
    setAdminOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ayarlar"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bayi Yönetimi</h1>
            <p className="text-xs text-slate-500">
              Bayileri oluşturun, düzenleyin ve bayi yöneticisi atayın
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Yeni Bayi
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>Bayi Listesi ({dealerships.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            Bayiler yükleniyor...
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium space-y-2">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Henüz bayi eklenmemiş.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Bayi Adı</th>
                  <th className="py-3.5 px-4">Kod</th>
                  <th className="py-3.5 px-4">Kullanıcı</th>
                  <th className="py-3.5 px-4">Esnaf</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sorted.map((d) => {
                  const c = counts[d.id] ?? { users: 0, customers: 0 };
                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !d.is_active ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <span
                          className={
                            !d.is_active ? 'line-through text-slate-500' : ''
                          }
                        >
                          {d.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {d.code || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{c.users}</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {c.customers}
                      </td>
                      <td className="py-3.5 px-4">
                        {d.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(d)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => openAdminForm(d)}
                            disabled={!d.is_active}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-40"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Bayi Yöneticisi Ekle
                          </button>
                          <button
                            type="button"
                            disabled={togglingId === d.id}
                            onClick={() => requestToggle(d)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold ${
                              d.is_active
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {d.is_active ? (
                              <>
                                <Power className="w-3.5 h-3.5" />
                                Pasife Al
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Aktifleştir
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">
                {editing ? 'Bayiyi Düzenle' : 'Yeni Bayi'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DealershipForm
              initial={editing}
              onSuccess={handleFormSuccess}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}

      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="sr-only">Bayi yöneticisi formu</span>
              <button
                type="button"
                onClick={() => setAdminOpen(false)}
                className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CreateDealerAdminForm
              dealerships={dealerships}
              preselectedDealershipId={adminDealershipId}
              onSuccess={() => {
                void fetchAll();
              }}
              onCancel={() => setAdminOpen(false)}
            />
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Bayiyi pasife al
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>{confirmTarget.name}</strong> pasife alınacak. Bu bayinin
              kullanıcıları giriş yapamayacak. Geçmiş veriler silinmez.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={togglingId === confirmTarget.id}
                onClick={() => applyToggle(confirmTarget, false)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Pasife Al
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
