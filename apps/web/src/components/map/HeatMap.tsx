'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

// Side-effect import to attach heatLayer to L
if (typeof window !== 'undefined') {
  require('leaflet.heat');
}

interface HeatLayerProps {
  points: [number, number, number][];
}

function HeatLayer({ points }: HeatLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof window === 'undefined' || !points) return;

    // Check if heatLayer method exists on L
    if (typeof (L as any).heatLayer === 'function') {
      const heat = (L as any).heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.4,
      });

      heat.addTo(map);

      return () => {
        map.removeLayer(heat);
      };
    }
  }, [map, points]);

  return null;
}

interface HeatMapProps {
  points: [number, number, number][];
}

export default function HeatMap({ points }: HeatMapProps) {
  const defaultCenter: [number, number] = [39.0, 35.0]; // Turkey center

  let center = defaultCenter;
  let zoom = 6;

  if (points && points.length > 0) {
    const avgLat = points.reduce((acc, p) => acc + p[0], 0) / points.length;
    const avgLng = points.reduce((acc, p) => acc + p[1], 0) / points.length;
    center = [avgLat, avgLng];
    zoom = points.length > 5 ? 9 : 7;
  }

  return (
    <div className="space-y-2">
      <div className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs z-0">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {points && points.length > 0 && <HeatLayer points={points} />}
        </MapContainer>

        {/* Floating Legend */}
        <div className="absolute bottom-4 right-4 z-[400] bg-slate-900/90 backdrop-blur-xs text-white px-3 py-2 rounded-xl border border-slate-700 text-xs shadow-lg flex items-center gap-3">
          <span className="font-semibold text-slate-300">Yoğunluk:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-blue-300">Düşük</span>
            <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-lime-400 to-red-500" />
            <span className="text-[10px] text-red-400">Yüksek</span>
          </div>
        </div>
      </div>
    </div>
  );
}
