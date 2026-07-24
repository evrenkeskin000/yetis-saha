'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Power, Shield, Users } from 'lucide-react';
import type { User, UserRole } from '@saha/shared';
import { createClient } from '../../lib/supabase/client';
import { InviteUserForm } from './InviteUserForm';

export function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error: userErr } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (userErr) {
        if (userErr.code === '42501') {
          setError('Bu işlem için yetkiniz yok.');
        } else {
          setError(`Kullanıcılar yüklenemedi: ${userErr.message}`);
        }
      } else {
        setUsers(data as User[]);
      }
    } catch (err) {
      console.error('Kullanıcı yükleme hatası:', err);
      setError('Kullanıcılar çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingId(userId);
      const supabase = createClient();

      const { error: updateErr } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateErr) {
        if (updateErr.code === '42501') {
          alert('Bu işlem için yetkiniz yok.');
        } else {
          alert(`Rol güncellenemedi: ${updateErr.message}`);
        }
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error('Rol değiştirme hatası:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      setUpdatingId(user.id);
      const supabase = createClient();
      const nextState = !user.is_active;

      const { error: updateErr } = await supabase
        .from('users')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateErr) {
        if (updateErr.code === '42501') {
          alert('Bu işlem için yetkiniz yok.');
        } else {
          alert(`Durum güncellenemedi: ${updateErr.message}`);
        }
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextState } : u))
      );
    } catch (err) {
      console.error('Aktiflik güncelleme hatası:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Bar Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/ayarlar"
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kullanıcı Yönetimi</h1>
          <p className="text-xs text-slate-500">
            Kullanıcıları davet edin, rollerini değiştirin ve hesap durumlarını yönetin
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* User Invite Component */}
      <InviteUserForm onSuccess={fetchUsers} />

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Kullanıcı Listesi ({users.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            Kullanıcı verileri yükleniyor...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Sistemde kayıtlı kullanıcı bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ad Soyad</th>
                  <th className="py-3.5 px-4">E-posta</th>
                  <th className="py-3.5 px-4">Rol</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !u.is_active ? 'bg-slate-50/40' : ''
                    }`}
                  >
                    {/* Ad Soyad */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <span className={!u.is_active ? 'line-through text-slate-500' : ''}>
                        {u.full_name || 'İsimsiz Kullanıcı'}
                      </span>
                    </td>

                    {/* E-posta */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {u.email}
                    </td>

                    {/* Rol */}
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as UserRole)
                        }
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-white"
                      >
                        <option value="admin">Yönetici (Admin)</option>
                        <option value="manager">Müdür</option>
                        <option value="field_rep">Saha Temsilcisi</option>
                      </select>
                    </td>

                    {/* Durum */}
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
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
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={updatingId === u.id}
                        onClick={() => handleToggleActive(u)}
                        title={u.is_active ? 'Pasife Al' : 'Aktifleştir'}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold transition-colors ${
                          u.is_active
                            ? 'hover:bg-red-50 text-red-600'
                            : 'hover:bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {u.is_active ? (
                          <>
                            <Power className="w-3.5 h-3.5" />
                            <span>Pasife Al</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Aktifleştir</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
