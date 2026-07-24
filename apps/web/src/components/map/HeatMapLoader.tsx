'use client';

import dynamic from 'next/dynamic';
import React from 'react';

interface HeatMapLoaderProps {
  points: [number, number, number][];
}

export const HeatMapLoader = dynamic<HeatMapLoaderProps>(
  () => import('./HeatMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] w-full bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 text-sm font-medium border border-slate-800">
        Ziyaret ısı haritası yükleniyor...
      </div>
    ),
  }
);
