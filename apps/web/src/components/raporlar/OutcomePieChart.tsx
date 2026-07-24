'use client';

import React from 'react';
import {
  Cell as RechartsCell,
  Legend as RechartsLegend,
  Pie as RechartsPie,
  PieChart as RechartsPieChart,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import type { PieChartData } from '../../lib/report';

const PieChart = RechartsPieChart as unknown as React.ComponentType<any>;
const Pie = RechartsPie as unknown as React.ComponentType<any>;
const Cell = RechartsCell as unknown as React.ComponentType<any>;
const Legend = RechartsLegend as unknown as React.ComponentType<any>;
const ResponsiveContainer = RechartsResponsiveContainer as unknown as React.ComponentType<any>;
const Tooltip = RechartsTooltip as unknown as React.ComponentType<any>;

interface OutcomePieChartProps {
  data: PieChartData[];
}

export function OutcomePieChart({ data }: OutcomePieChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-indigo-600" />
          <span>Ziyaret Sonuç Dağılımı</span>
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">
          Toplam {total} Ziyaret
        </span>
      </div>

      <div className="w-full h-72">
        {data.length === 0 || total === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
            Seçilen aralıkta tamamlanan ziyaret bulunamadı.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
                formatter={(value: any, name: any) => [
                  `${value} Ziyaret (%${Math.round((Number(value) / total) * 100)})`,
                  name,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={40}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
