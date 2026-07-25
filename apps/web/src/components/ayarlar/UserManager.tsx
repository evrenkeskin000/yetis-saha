'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Power,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import type { User, UserRole } from '@saha/shared';
import { ALL_DEALERSHIPS, ROLE_LABELS, passwordSchema } from '@saha/shared';
import { createClient } from '../../lib/supabase/client';
import { useDealershipScope } from '../../lib/DealershipScopeContext';
import { useProfile } from '../../lib/hooks/useProfile';
import { applyDealershipScope } from '../../lib/scopedQuery';
import { CreateUserForm } from './CreateUserForm';

function generateTempPassword(): string {
  const letters = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const chars: string[] = [];

  chars.push(letters[Math.floor(Math.random() * letters.length)]!);
  chars.push(digits[Math.floor(Math.random() * digits.length)]!);

  for (let i = 0; i < 8; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]!);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join('');
}

function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function UserManager() {
  const { profile } = useProfile();
  const { scope, dealerships, loading: scopeLoading } = useDealershipScope();
  const isYetisAdmin = profile?.role === 'yetis_admin';
  const isDealerAdmin = profile?.role === 'dealer_admin';
  const showDealership = scope === ALL_DEALERSHIPS && isYetisAdmin;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

  const fetchUsers = async () => {
    if (scopeLoading || !profile) return;

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      let query = applyDealershipScope(
        supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false }),
        scope
      );

      if (isDealerAdmin) {
        query = query.eq('role', 'field_rep');
      }

      const { data, error: userErr } = await query;

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
  }, [profile?.id, profile?.role, scope, scopeLoading]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isYetisAdmin) return;

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
      const nextState = !user.is_active;

      const res = await fetch('/api/kullanicilar/durum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          is_active: nextState,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || 'Durum güncellenemedi.');
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextState } : u))
      );
    } catch (err) {
      console.error('Aktiflik güncelleme hatası:', err);
      alert('Durum güncellenirken bir hata oluştu.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openResetModal = (user: User) => {
    setResetTarget(user);
    setResetPassword(generateTempPassword());
    setShowResetPassword(true);
    setResetError(null);
    setResetSuccess(null);
    setResetCopied(false);
  };

  const closeResetModal = () => {
    setResetTarget(null);
    setResetPassword('');
    setResetError(null);
    setResetSuccess(null);
    setResetCopied(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    setResetError(null);
    setResetSuccess(null);

    const parsed = passwordSchema.safeParse(resetPassword);
    if (!parsed.success) {
      setResetError(parsed.error.issues[0]?.message ?? 'Geçersiz şifre.');
      return;
    }

    try {
      setResetSubmitting(true);
      const res = await fetch('/api/kullanicilar/sifre-sifirla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: resetTarget.id,
          password: resetPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setResetError(data.error || 'Şifre sıfırlanamadı.');
        return;
      }

      setResetSuccess(
        data.message ||
          'Şifre sıfırlandı. Yeni geçici şifreyi kullanıcıya iletin.'
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === resetTarget.id
            ? { ...u, must_change_password: true }
            : u
        )
      );
    } catch (err) {
      console.error('Şifre sıfırlama hatası:', err);
      setResetError('İstek gönderilirken bir hata oluştu.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleCopyResetPassword = async () => {
    try {
      await navigator.clipboard.writeText(resetPassword);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2000);
    } catch {
      setResetError('Şifre panoya kopyalanamadı.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
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
            {isDealerAdmin
              ? 'Bayinizdeki saha temsilcilerini oluşturun, şifrelerini sıfırlayın ve hesap durumlarını yönetin'
              : 'Kullanıcı oluşturun, rollerini değiştirin ve hesap durumlarını yönetin'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <CreateUserForm
        callerRole={profile?.role ?? 'dealer_admin'}
        onSuccess={fetchUsers}
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
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
                  {showDealership && (
                    <th className="py-3.5 px-4">Bayi</th>
                  )}
                  <th className="py-3.5 px-4">Rol</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Şifre</th>
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
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <span
                        className={!u.is_active ? 'line-through text-slate-500' : ''}
                      >
                        {u.full_name || 'İsimsiz Kullanıcı'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {u.email}
                    </td>

                    {showDealership && (
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {u.dealership_id
                          ? dealerships.find((d) => d.id === u.dealership_id)
                              ?.name ?? '—'
                          : '—'}
                      </td>
                    )}

                    <td className="py-3.5 px-4">
                      {isYetisAdmin ? (
                        <select
                          value={u.role}
                          disabled={updatingId === u.id || u.role === 'yetis_admin'}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as UserRole)
                          }
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-teal-500 bg-white"
                        >
                          {u.role === 'yetis_admin' && (
                            <option value="yetis_admin">
                              {ROLE_LABELS.yetis_admin}
                            </option>
                          )}
                          <option value="dealer_admin">
                            {ROLE_LABELS.dealer_admin}
                          </option>
                          <option value="field_rep">
                            {ROLE_LABELS.field_rep}
                          </option>
                        </select>
                      ) : (
                        <span className="text-xs font-medium text-slate-700">
                          {roleLabel(u.role)}
                        </span>
                      )}
                    </td>

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

                    <td className="py-3.5 px-4">
                      {u.must_change_password ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Değiştirmeli
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Normal
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={updatingId === u.id}
                          onClick={() => openResetModal(u)}
                          title="Şifre Sıfırla"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Şifre Sıfırla</span>
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Şifre Sıfırla
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {resetTarget.full_name} ({resetTarget.email}) için yeni geçici
                  şifre belirleyin. Kullanıcı bir sonraki girişte şifresini
                  değiştirmek zorunda kalacak.
                </p>
              </div>
              <button
                type="button"
                onClick={closeResetModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm space-y-2">
                <p>{resetSuccess}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 font-mono text-xs">
                    {resetPassword}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyResetPassword}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 bg-white text-xs font-semibold text-teal-700 hover:bg-teal-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {resetCopied ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                </div>
              </div>
            )}

            {!resetSuccess && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Yeni Geçici Şifre
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showResetPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResetPassword(generateTempPassword());
                        setShowResetPassword(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-teal-700 hover:bg-teal-50 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Rastgele
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {resetSubmitting ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
                  </button>
                </div>
              </form>
            )}

            {resetSuccess && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
