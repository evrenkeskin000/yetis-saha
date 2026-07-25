'use client';

import React, { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { formatTimeTR } from '../../lib/format';
import type { RoutePoint } from '../../lib/hooks/useRouteTrail';

interface RouteMapProps {
  points: RoutePoint[];
}

function FitBounds({ points }: RouteMapProps) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = points.map((p) => [p.lat, p.lng]) as [number, number][];
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);

  return null;
}

export default function RouteMap({ points }: RouteMapProps) {
  const defaultCenter: [number, number] = [39.0, 35.0]; // Türkiye merkezi
  const start = points[0];
  const end = points.length > 1 ? points[points.length - 1] : null;

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
      <MapContainer
        center={start ? [start.lat, start.lng] : defaultCenter}
        zoom={start ? 14 : 6}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <FitBounds points={points} />

        {points.length > 1 && (
          <Polyline
            positions={points.map((p) => [p.lat, p.lng]) as [number, number][]}
            pathOptions={{ color: '#7c3aed', weight: 4, opacity: 0.85 }}
          />
        )}

        {points.map((p, i) => (
          <CircleMarker
            key={`${p.recordedAt}-${i}`}
            center={[p.lat, p.lng]}
            radius={3}
            pathOptions={{
              color: '#7c3aed',
              weight: 1,
              fillColor: '#ede9fe',
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="text-xs text-slate-700">
                {formatTimeTR(p.recordedAt)}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {start && (
          <CircleMarker
            center={[start.lat, start.lng]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#059669',
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="text-xs font-semibold text-slate-800">
                Başlangıç · {formatTimeTR(start.recordedAt)}
              </div>
            </Popup>
          </CircleMarker>
        )}

        {end && (
          <CircleMarker
            center={[end.lat, end.lng]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#dc2626',
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="text-xs font-semibold text-slate-800">
                Bitiş · {formatTimeTR(end.recordedAt)}
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {points.length === 0 && (
        <div className="absolute inset-0 z-[400] bg-white/80 flex items-center justify-center text-sm font-semibold text-slate-500">
          Seçilen gün için konum kaydı bulunamadı.
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-[400] bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700 text-xs shadow-lg space-y-1.5">
        <div className="font-bold text-slate-300 border-b border-slate-700 pb-1 mb-1">
          Rota Lejantı
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600 border-2 border-white inline-block" />
          <span>Başlangıç</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600 border-2 border-white inline-block" />
          <span>Bitiş</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 rounded bg-violet-600 inline-block" />
          <span>Gün içi rota</span>
        </div>
      </div>
    </div>
  );
}
