'use client';

import React, { useState } from 'react';
import { Mail, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import type { UserRole } from '@saha/shared';

interface InviteUserFormProps {
  onSuccess?: () => void;
}

export function InviteUserForm({ onSuccess }: InviteUserFormProps) {
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<UserRole>('field_rep');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Geçerli bir e-posta adresi girin.' });
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setMessage({ type: 'error', text: 'Ad Soyad en az 2 karakter olmalıdır.' });
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
          role: role,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage({ type: 'error', text: data.error || 'Davet gönderilemedi.' });
      } else {
        setMessage({
          type: 'success',
          text: data.message || 'Kullanıcı daveti başarıyla gönderildi.',
        });
        setEmail('');
        setFullName('');
        setRole('field_rep');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Davet servisi hatası:', err);
      setMessage({ type: 'error', text: 'İstek gönderilirken bir hata oluştu.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-bold text-slate-900">Yeni Kullanıcı Davet Et</h2>
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* E-posta */}
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

        {/* Ad Soyad */}
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

        {/* Rol */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Kullanıcı Rolü <span className="text-red-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-indigo-500 bg-white"
          >
            <option value="field_rep">Saha Temsilcisi</option>
            <option value="manager">Müdür</option>
            <option value="admin">Yönetici (Admin)</option>
          </select>
        </div>

        {/* Submit */}
        <div className="md:col-span-3 flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? 'Davet Gönderiliyor...' : 'Davet Gönder'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
