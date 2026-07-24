'use client';

import React from 'react';
import {
  Bar as RechartsBar,
  BarChart as RechartsBarChart,
  CartesianGrid as RechartsCartesianGrid,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { RangeType, TrendBarData } from '../../lib/report';

const BarChart = RechartsBarChart as unknown as React.ComponentType<any>;
const Bar = RechartsBar as unknown as React.ComponentType<any>;
const CartesianGrid = RechartsCartesianGrid as unknown as React.ComponentType<any>;
const ResponsiveContainer = RechartsResponsiveContainer as unknown as React.ComponentType<any>;
const Tooltip = RechartsTooltip as unknown as React.ComponentType<any>;
const XAxis = RechartsXAxis as unknown as React.ComponentType<any>;
const YAxis = RechartsYAxis as unknown as React.ComponentType<any>;

interface VisitTrendChartProps {
  data: TrendBarData[];
  range: RangeType;
}

export function VisitTrendChart({ data, range }: VisitTrendChartProps) {
  const isToday = range === 'today';

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span>Ziyaret Trendi</span>
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">
          {isToday ? 'Temsilci Bazlı Dağılım' : 'Günlük Ziyaret Grafiği'}
        </span>
      </div>

      <div className="w-full h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
            Seçilen aralıkta grafik verisi bulunamadı.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
                angle={isToday ? -15 : 0}
                textAnchor={isToday ? 'end' : 'middle'}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
                itemStyle={{ color: '#38bdf8' }}
                formatter={(value: any) => [`${value} Ziyaret`, 'Ziyaret']}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              />
              <Bar dataKey="ziyaret" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
