'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import type { Dealership } from '@saha/shared';
import { createUserSchema } from '@saha/shared';

interface CreateDealerAdminFormProps {
  dealerships: Dealership[];
  preselectedDealershipId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

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

export function CreateDealerAdminForm({
  dealerships,
  preselectedDealershipId,
  onSuccess,
  onCancel,
}: CreateDealerAdminFormProps) {
  const activeDealerships = dealerships.filter((d) => d.is_active);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [dealershipId, setDealershipId] = useState(
    preselectedDealershipId ?? ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (preselectedDealershipId) {
      setDealershipId(preselectedDealershipId);
    }
  }, [preselectedDealershipId]);

  const handleGeneratePassword = () => {
    setPassword(generateTempPassword());
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (!createdPassword) return;
    try {
      await navigator.clipboard.writeText(createdPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ type: 'error', text: 'Şifre panoya kopyalanamadı.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setCreatedPassword(null);
    setCopied(false);

    const parsed = createUserSchema.safeParse({
      email: email.trim(),
      full_name: fullName.trim(),
      role: 'dealer_admin',
      password,
      dealership_id: dealershipId || null,
    });

    if (!parsed.success) {
      setMessage({
        type: 'error',
        text: parsed.error.issues[0]?.message ?? 'Geçersiz form verisi.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/kullanicilar/olustur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage({
          type: 'error',
          text: data.error || 'Bayi yöneticisi oluşturulamadı.',
        });
      } else {
        setCreatedPassword(password);
        setMessage({
          type: 'success',
          text:
            data.message ||
            'Bayi yöneticisi oluşturuldu. Geçici şifreyi kullanıcıya iletin.',
        });
        setEmail('');
        setFullName('');
        setPassword('');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Bayi yöneticisi oluşturma hatası:', err);
      setMessage({
        type: 'error',
        text: 'İstek gönderilirken bir hata oluştu.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-teal-600" />
        <h2 className="text-base font-bold text-slate-900">
          Bayi Yöneticisi Ekle
        </h2>
      </div>
      <p className="text-xs text-slate-500">
        Seçilen bayi için yönetici hesabı oluşturur. İlk girişte şifre değişimi
        zorunludur.
      </p>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-2 min-w-0 flex-1">
            <span>{message.text}</span>
            {createdPassword && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <code className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 font-mono text-xs text-slate-800">
                  {createdPassword}
                </code>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 bg-white text-xs font-semibold text-teal-700 hover:bg-teal-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Bayi <span className="text-red-500">*</span>
          </label>
          <select
            value={dealershipId}
            onChange={(e) => setDealershipId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500 bg-white"
          >
            <option value="">Bayi seçin</option>
            {activeDealerships.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

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
              placeholder="yonetici@bayi.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Geçici Şifre <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter, harf + rakam"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-teal-700 hover:bg-teal-50 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Rastgele
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Kapat
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {submitting ? 'Oluşturuluyor...' : 'Yönetici Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
