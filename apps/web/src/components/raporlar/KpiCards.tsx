'use client';

import React from 'react';
import { CalendarCheck, Clock, Target, TrendingUp } from 'lucide-react';
import type { KpiMetrics } from '../../lib/report';

interface KpiCardsProps {
  kpis: KpiMetrics;
  loading?: boolean;
}

export function KpiCards({ kpis, loading = false }: KpiCardsProps) {
  const cards = [
    {
      title: 'Temsilci Başı Günlük Ziyaret',
      value: kpis.avgDailyVisitsPerRepStr,
      subtitle: `Aralıkta Toplam ${kpis.totalVisits} Ziyaret`,
      icon: CalendarCheck,
      colorBg: 'bg-teal-50',
      colorText: 'text-teal-600',
    },
    {
      title: 'Müşteri Kapsama Oranı',
      value: kpis.coverageRatioStr,
      subtitle: `${kpis.distinctVisitedCustomers} Farklı Esnaf Ziyaret Edildi`,
      icon: Target,
      colorBg: 'bg-emerald-50',
      colorText: 'text-emerald-600',
    },
    {
      title: 'Müşteri Başı Ortalama Süre',
      value: kpis.avgDurationStr,
      subtitle: 'Tamamlanan Ziyaretler Ortalaması',
      icon: Clock,
      colorBg: 'bg-indigo-50',
      colorText: 'text-indigo-600',
    },
    {
      title: 'Ziyaret Dönüşüm Oranı',
      value: kpis.conversionRateStr,
      subtitle: `${kpis.agreedVisits} Anlaşma / Satış Yapıldı`,
      icon: TrendingUp,
      colorBg: 'bg-amber-50',
      colorText: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl ${card.colorBg} ${card.colorText}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {loading ? '—' : card.value}
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
