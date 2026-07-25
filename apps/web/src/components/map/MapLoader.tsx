'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type {
  LiveRep,
  WebCustomer,
  WebVisit,
} from '../../lib/hooks/useTodayVisits';

interface MapLoaderProps {
  customers: WebCustomer[];
  visits: WebVisit[];
  liveReps: LiveRep[];
}

export const MapLoader = dynamic<MapLoaderProps>(
  () => import('./LiveMap').then((mod) => mod.default as React.ComponentType<MapLoaderProps>),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] w-full bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 text-sm font-medium border border-slate-800">
        Harita yükleniyor...
      </div>
    ),
  }
);
