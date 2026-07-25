'use client';

import React, { useEffect, useState } from 'react';
import type { Dealership } from '@saha/shared';
import { dealershipFormSchema } from '@saha/shared';
import { createClient } from '../../lib/supabase/client';

interface DealershipFormProps {
  initial?: Dealership | null;
  onSuccess: (dealership: Dealership) => void;
  onCancel: () => void;
}

/** Boş kod için addan büyük harf + tire türetir. */
export function deriveDealershipCode(name: string): string {
  const raw = name
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/İ/g, 'I')
    .replace(/I/g, 'I')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return raw || 'BAYI';
}

export function DealershipForm({
  initial,
  onSuccess,
  onCancel,
}: DealershipFormProps) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? '');
    setCode(initial?.code ?? '');
    setIsActive(initial?.is_active ?? true);
    setFieldErrors({});
    setFormError(null);
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const parsed = dealershipFormSchema.safeParse({
      name,
      code,
      is_active: isActive,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    const resolvedCode =
      parsed.data.code && parsed.data.code.length > 0
        ? parsed.data.code
        : deriveDealershipCode(parsed.data.name);

    try {
      setSubmitting(true);
      const supabase = createClient();
      const payload = {
        name: parsed.data.name,
        code: resolvedCode,
        is_active: parsed.data.is_active,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && initial) {
        const { data, error } = await supabase
          .from('dealerships')
          .update(payload)
          .eq('id', initial.id)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            setFieldErrors({
              code: 'Bu bayi kodu zaten kullanılıyor.',
            });
          } else if (error.code === '42501') {
            setFormError('Bu işlem için yetkiniz yok.');
          } else {
            setFormError(`Bayi güncellenemedi: ${error.message}`);
          }
          return;
        }

        onSuccess(data as Dealership);
      } else {
        const { data, error } = await supabase
          .from('dealerships')
          .insert([payload])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            setFieldErrors({
              code: 'Bu bayi kodu zaten kullanılıyor.',
            });
          } else if (error.code === '42501') {
            setFormError('Bu işlem için yetkiniz yok.');
          } else {
            setFormError(`Bayi oluşturulamadı: ${error.message}`);
          }
          return;
        }

        onSuccess(data as Dealership);
      }
    } catch (err) {
      console.error('Bayi form hatası:', err);
      setFormError('Beklenmeyen bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {formError}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Bayi Adı <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Örn. Ankara Bayi"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-teal-500"
        />
        {fieldErrors.name && (
          <p className="text-xs text-red-600">{fieldErrors.name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Kod
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Boş bırakılırsa addan türetilir"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-hidden focus:border-teal-500"
        />
        {fieldErrors.code && (
          <p className="text-xs text-red-600">{fieldErrors.code}</p>
        )}
        <p className="text-[11px] text-slate-400">
          Büyük harf, rakam ve tire. Örn. ANKARA-BAYI
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        Aktif
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {submitting
            ? 'Kaydediliyor...'
            : isEdit
              ? 'Güncelle'
              : 'Bayi Oluştur'}
        </button>
      </div>
    </form>
  );
}
