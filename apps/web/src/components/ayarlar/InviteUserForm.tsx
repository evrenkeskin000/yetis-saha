'use client';

import React, { useState } from 'react';
import { Mail, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import type { UserRole } from '@saha/shared';
import { useDealerships } from '../../lib/hooks/useDealerships';
import { useProfile } from '../../lib/hooks/useProfile';

interface InviteUserFormProps {
  callerRole: UserRole;
  onSuccess?: () => void;
}

export function InviteUserForm({ callerRole, onSuccess }: InviteUserFormProps) {
  const isDealerAdmin = callerRole === 'dealer_admin';
  const isYetisAdmin = callerRole === 'yetis_admin';
  const { profile } = useProfile();
  const { dealerships } = useDealerships();
  const activeDealerships = dealerships.filter((d) => d.is_active);

  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<UserRole>('field_rep');
  const [dealershipId, setDealershipId] = useState('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Geçerli bir e-posta adresi girin.' });
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setMessage({
        type: 'error',
        text: 'Ad Soyad en az 2 karakter olmalıdır.',
      });
      return;
    }

    const effectiveRole = isDealerAdmin ? 'field_rep' : role;

    if (
      isYetisAdmin &&
      effectiveRole !== 'yetis_admin' &&
      !dealershipId
    ) {
      setMessage({ type: 'error', text: 'Lütfen bir bayi seçin.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/kullanicilar/davet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          role: effectiveRole,
          dealership_id:
            effectiveRole === 'yetis_admin'
              ? null
              : isDealerAdmin
                ? profile?.dealership_id ?? null
                : dealershipId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage({
          type: 'error',
          text: data.error || 'Davet gönderilemedi.',
        });
      } else {
        setMessage({
          type: 'success',
          text: data.message || 'Kullanıcı daveti başarıyla gönderildi.',
        });
        setEmail('');
        setFullName('');
        setRole('field_rep');
        setDealershipId('');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Davet servisi hatası:', err);
      setMessage({
        type: 'error',
        text: 'İstek gönderilirken bir hata oluştu.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const showDealershipSelect =
    isYetisAdmin && role !== 'yetis_admin';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-bold text-slate-900">
          Yeni Kullanıcı Davet Et
        </h2>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            E-posta Adresi <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@saha.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Ad Soyad <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ahmet Yılmaz"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Kullanıcı Rolü <span className="text-red-500">*</span>
          </label>
          {isDealerAdmin ? (
            <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700">
              Saha Temsilcisi
            </div>
          ) : (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="field_rep">Saha Temsilcisi</option>
              <option value="dealer_admin">Bayi Yöneticisi</option>
              <option value="yetis_admin">Yetiş Yöneticisi</option>
            </select>
          )}
        </div>

        {showDealershipSelect && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Bayi <span className="text-red-500">*</span>
            </label>
            <select
              value={dealershipId}
              onChange={(e) => setDealershipId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-indigo-500 bg-white"
            >
              <option value="">Bayi seçin</option>
              {activeDealerships.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="md:col-span-2 lg:col-span-4 flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {submitting ? 'Davet Gönderiliyor...' : 'Davet Gönder'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
