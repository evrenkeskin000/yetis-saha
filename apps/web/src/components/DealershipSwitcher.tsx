'use client';

import React from 'react';
import { ALL_DEALERSHIPS } from '@saha/shared';
import { Building2 } from 'lucide-react';
import { useDealershipScope } from '../lib/DealershipScopeContext';
import { useProfile } from '../lib/hooks/useProfile';

export function DealershipSwitcher() {
  const { profile } = useProfile();
  const { scope, dealerships, loading, setScope } = useDealershipScope();

  if (profile?.role !== 'yetis_admin') {
    return null;
  }

  const active = dealerships.filter((d) => d.is_active);
  const inactive = dealerships.filter((d) => !d.is_active);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
      <label htmlFor="dealership-scope" className="sr-only">
        Bayi kapsamı
      </label>
      <select
        id="dealership-scope"
        value={scope}
        disabled={loading}
        onChange={(e) => setScope(e.target.value)}
        className="max-w-[220px] truncate px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
      >
        <option value={ALL_DEALERSHIPS}>Tüm Bayiler</option>
        {active.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
        {inactive.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} (Pasif)
          </option>
        ))}
      </select>
    </div>
  );
}
