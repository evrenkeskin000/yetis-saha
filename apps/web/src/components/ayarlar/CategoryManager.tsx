'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Edit2, Plus, Power, Save, Tag, X } from 'lucide-react';
import type { Category } from '@saha/shared';
import { createClient } from '../../lib/supabase/client';
import { useProfile } from '../../lib/hooks/useProfile';

export function CategoryManager() {
  const { profile } = useProfile();
  const canWrite = profile?.role === 'yetis_admin';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New category form state
  const [newName, setNewName] = useState<string>('');
  const [newIcon, setNewIcon] = useState<string>('');
  const [newIsActive, setNewIsActive] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit category row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editIcon, setEditIcon] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (catErr) {
        if (catErr.code === '42501') {
          setError('Bu işlem için yetkiniz yok.');
        } else {
          setError(`Kategoriler yüklenemedi: ${catErr.message}`);
        }
      } else {
        setCategories(data as Category[]);
      }
    } catch (err) {
      console.error('Kategori yükleme hatası:', err);
      setError('Kategoriler çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nameTrimmed = newName.trim();
    if (!nameTrimmed) {
      setFormError('Kategori adı zorunludur');
      return;
    }

    try {
      setAdding(true);
      const supabase = createClient();

      const { data, error: insertErr } = await supabase
        .from('categories')
        .insert([
          {
            name: nameTrimmed,
            icon: newIcon.trim() || null,
            is_active: newIsActive,
          },
        ])
        .select()
        .single();

      if (insertErr) {
        if (insertErr.code === '23505') {
          setFormError('Bu kategori adı zaten mevcut.');
        } else if (insertErr.code === '42501') {
          setFormError('Bu işlem için yetkiniz yok.');
        } else {
          setFormError(`Kategori eklenemedi: ${insertErr.message}`);
        }
        return;
      }

      if (data) {
        setCategories((prev) => [...prev, data as Category]);
        setNewName('');
        setNewIcon('');
        setNewIsActive(true);
      }
    } catch (err) {
      console.error('Kategori ekleme hatası:', err);
      setFormError('Beklenmeyen bir hata oluştu.');
    } finally {
      setAdding(false);
    }
  };

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || '');
    setEditIsActive(cat.is_active);
    setFormError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditIcon('');
  };

  const handleSaveEdit = async (id: string) => {
    const nameTrimmed = editName.trim();
    if (!nameTrimmed) {
      setFormError('Kategori adı zorunludur');
      return;
    }

    try {
      setSavingId(id);
      setFormError(null);
      const supabase = createClient();

      const { error: updateErr } = await supabase
        .from('categories')
        .update({
          name: nameTrimmed,
          icon: editIcon.trim() || null,
          is_active: editIsActive,
        })
        .eq('id', id);

      if (updateErr) {
        if (updateErr.code === '23505') {
          setFormError('Bu kategori adı zaten mevcut.');
        } else if (updateErr.code === '42501') {
          setFormError('Bu işlem için yetkiniz yok.');
        } else {
          setFormError(`Kategori güncellenemedi: ${updateErr.message}`);
        }
        return;
      }

      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                name: nameTrimmed,
                icon: editIcon.trim() || null,
                is_active: editIsActive,
              }
            : c
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error('Kategori düzenleme hatası:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      const supabase = createClient();
      const nextState = !cat.is_active;

      const { error: err } = await supabase
        .from('categories')
        .update({ is_active: nextState })
        .eq('id', cat.id);

      if (err) {
        if (err.code === '42501') {
          alert('Bu işlem için yetkiniz yok.');
        } else {
          alert(`İşlem başarısız: ${err.message}`);
        }
        return;
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextState } : c))
      );
    } catch (err) {
      console.error('Kategori aktiflik güncelleme hatası:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Bar Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/ayarlar"
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kategori Yönetimi</h1>
          <p className="text-xs text-slate-500">
            {canWrite
              ? 'Esnaf kategorilerini ekleyin, düzenleyin veya pasife alın'
              : 'Kategoriler tüm bayiler için Yetiş yönetimi tarafından tanımlanır.'}
          </p>
        </div>
      </div>

      {!canWrite && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm">
          Kategoriler tüm bayiler için Yetiş yönetimi tarafından tanımlanır.
          Bu sayfada yalnızca görüntüleme yapabilirsiniz.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between">
          <span>{formError}</span>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Inline Create Category Form */}
      {canWrite && (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-teal-600" />
          <span>Yeni Kategori Ekle</span>
        </h3>

        <form
          onSubmit={handleAddCategory}
          className="flex flex-col sm:flex-row items-end gap-3"
        >
          <div className="w-20 space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              İkon / Emoji
            </label>
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="🛒"
              className="w-full text-center px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex-1 space-y-1 w-full">
            <label className="block text-xs font-semibold text-slate-700">
              Kategori Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Örn. Market, Eczane, Restoran"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 pb-2.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsActive}
                onChange={(e) => setNewIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Aktif</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{adding ? 'Ekleniyor...' : 'Ekle'}</span>
          </button>
        </form>
      </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            Kategoriler yükleniyor...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium space-y-2">
            <Tag className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Henüz tanımlanmış bir kategori bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">İkon</th>
                  <th className="py-3.5 px-4">Kategori Adı</th>
                  <th className="py-3.5 px-4">Durum</th>
                  {canWrite && (
                    <th className="py-3.5 px-4 text-right">İşlemler</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {categories.map((cat) => {
                  const isEditingThis = editingId === cat.id;

                  return (
                    <tr
                      key={cat.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !cat.is_active ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Ikon */}
                      <td className="py-3.5 px-4 text-center font-medium text-base">
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value)}
                            className="w-12 text-center px-1 py-1 rounded border border-slate-300 text-sm"
                          />
                        ) : (
                          cat.icon || '🏷️'
                        )}
                      </td>

                      {/* Ad */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1 rounded border border-slate-300 text-sm"
                          />
                        ) : (
                          <span className={!cat.is_active ? 'line-through text-slate-500' : ''}>
                            {cat.name}
                          </span>
                        )}
                      </td>

                      {/* Durum */}
                      <td className="py-3.5 px-4">
                        {isEditingThis ? (
                          <label className="flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={editIsActive}
                              onChange={(e) => setEditIsActive(e.target.checked)}
                              className="rounded text-teal-600"
                            />
                            <span>Aktif</span>
                          </label>
                        ) : cat.is_active ? (
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
                      {canWrite && (
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {isEditingThis ? (
                          <>
                            <button
                              type="button"
                              disabled={savingId === cat.id}
                              onClick={() => handleSaveEdit(cat.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Kaydet</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>İptal</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(cat)}
                              title="Düzenle"
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-teal-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(cat)}
                              title={cat.is_active ? 'Pasife Al' : 'Aktifleştir'}
                              className={`inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white transition-colors ${
                                cat.is_active
                                  ? 'hover:bg-red-50 text-red-600'
                                  : 'hover:bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {cat.is_active ? (
                                <Power className="w-4 h-4" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
