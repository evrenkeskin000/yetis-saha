'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { changePasswordSchema } from '@saha/shared';
import { useProfile } from '../../../lib/hooks/useProfile';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { profile, loading, refresh } = useProfile();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && profile && !profile.must_change_password) {
      router.replace('/panel');
    }
  }, [loading, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Şifreler eşleşmiyor.' });
      return;
    }

    const parsed = changePasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setMessage({
        type: 'error',
        text: parsed.error.issues[0]?.message ?? 'Geçersiz şifre.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/kullanicilar/sifre-degistir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage({
          type: 'error',
          text: data.error || 'Şifre değiştirilemedi.',
        });
        return;
      }

      setMessage({
        type: 'success',
        text: data.message || 'Şifreniz başarıyla güncellendi.',
      });
      await refresh();
      router.replace('/panel');
      router.refresh();
    } catch (err) {
      console.error('Şifre değiştirme hatası:', err);
      setMessage({
        type: 'error',
        text: 'İstek gönderilirken bir hata oluştu.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (profile && !profile.must_change_password)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-500 text-sm">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600 mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Şifrenizi Değiştirin</h1>
          <p className="text-sm text-slate-500">
            Güvenliğiniz için geçici şifrenizi değiştirmeniz zorunludur. Yeni
            şifreniz en az 8 karakter olmalı; en az bir harf ve bir rakam
            içermelidir.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Yeni Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
                autoComplete="new-password"
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
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Yeni Şifre (Tekrar)
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
          </button>
        </form>
      </div>
    </div>
  );
}
