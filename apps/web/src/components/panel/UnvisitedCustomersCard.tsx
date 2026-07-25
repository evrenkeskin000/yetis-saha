'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Store } from 'lucide-react';
import type { WebCustomer } from '../../lib/hooks/useTodayVisits';

interface UnvisitedCustomersCardProps {
  customers: WebCustomer[];
  visitedCustomerIds: Set<string>;
}

export function UnvisitedCustomersCard({
  customers,
  visitedCustomerIds,
}: UnvisitedCustomersCardProps) {
  const unvisited = customers
    .filter((c) => !visitedCustomerIds.has(c.id))
    .slice()
    .sort((a, b) =>
      a.business_name.localeCompare(b.business_name, 'tr')
    );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Bugün Ziyaret Edilmeyen Esnaflar
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Aktif esnaflar arasında bugün henüz ziyaret kaydı olmayanlar
          </p>
        </div>
        <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-bold border border-amber-100">
          {unvisited.length}
        </span>
      </div>

      {unvisited.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-slate-500">
          Tüm aktif esnaflar bugün ziyaret edilmiş.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {unvisited.map((c) => (
            <li key={c.id}>
              <Link
                href={`/esnaflar/${c.id}`}
                className="flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50/80 transition-colors"
              >
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {c.business_name}
                  </div>
                  {c.owner_name ? (
                    <div className="text-xs text-slate-500 truncate">
                      {c.owner_name}
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    {c.address ? (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[240px]">
                          {c.address}
                        </span>
                      </span>
                    ) : null}
                    {c.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        {c.phone}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
