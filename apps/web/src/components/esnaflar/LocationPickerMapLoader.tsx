'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { GeoPoint } from '@saha/shared';

interface LocationPickerMapLoaderProps {
  value?: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
}

export const LocationPickerMapLoader = dynamic<LocationPickerMapLoaderProps>(
  () => import('./LocationPickerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] w-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm font-medium border border-slate-200">
        Harita yükleniyor...
      </div>
    ),
  }
);
