'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { RoutePoint } from '../../lib/hooks/useRouteTrail';

interface RouteMapLoaderProps {
  points: RoutePoint[];
}

export const RouteMapLoader = dynamic<RouteMapLoaderProps>(
  () =>
    import('./RouteMap').then(
      (mod) => mod.default as React.ComponentType<RouteMapLoaderProps>
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 text-sm font-medium border border-slate-800">
        Harita yükleniyor...
      </div>
    ),
  }
);
