'use client';

import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { formatTimeTR } from '../../lib/format';
import type {
  LiveRep,
  WebCustomer,
  WebVisit,
} from '../../lib/hooks/useTodayVisits';
import { getOutcomeColor, getOutcomeLabel } from '../../lib/outcome';

interface LiveMapProps {
  customers: WebCustomer[];
  visits: WebVisit[];
  liveReps: LiveRep[];
}

export default function LiveMap({ customers, visits, liveReps }: LiveMapProps) {
  // Map customer_id -> latest visit for today
  const latestVisitMap = new Map<string, WebVisit>();
  visits.forEach((v) => {
    if (!latestVisitMap.has(v.customer_id)) {
      latestVisitMap.set(v.customer_id, v);
    }
  });

  const defaultCenter: [number, number] = [39.0, 35.0]; // Turkey center

  return (
    <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {customers
          .filter(
            (cust): cust is WebCustomer & { lat: number; lng: number } =>
              cust.lat != null && cust.lng != null
          )
          .map((cust) => {
          const visit = latestVisitMap.get(cust.id);
          const color = visit ? getOutcomeColor(visit.outcome) : '#64748b';
          const isVisited = Boolean(visit);

          return (
            <CircleMarker
              key={cust.id}
              center={[cust.lat, cust.lng]}
              radius={isVisited ? 9 : 6}
              pathOptions={{
                color: isVisited ? '#ffffff' : '#475569',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="p-1 space-y-1.5 min-w-[180px]">
                  <div className="font-bold text-sm text-slate-900">
                    {cust.business_name}
                  </div>
                  {cust.address && (
                    <div className="text-xs text-slate-500">{cust.address}</div>
                  )}

                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    {visit ? (
                      <>
                        <div className="text-xs font-semibold text-slate-700">
                          Temsilci: {visit.fieldRep?.full_name || 'Bilinmiyor'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Saat: {formatTimeTR(visit.check_in_at)}
                        </div>
                        <div className="pt-1">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {getOutcomeLabel(visit.outcome)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs font-semibold text-slate-400 italic">
                        Bugün henüz ziyaret edilmedi
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {liveReps.map((rep) => (
          <CircleMarker
            key={`rep-${rep.userId}`}
            center={[rep.lastPoint.lat, rep.lastPoint.lng]}
            radius={rep.isLive ? 10 : 7}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: rep.isLive ? '#7c3aed' : '#a5b4fc',
              fillOpacity: rep.isLive ? 0.95 : 0.6,
            }}
          >
            <Popup>
              <div className="p-1 space-y-1 min-w-[180px]">
                <div className="font-bold text-sm text-slate-900">
                  {rep.fullName}
                </div>
                <div className="text-xs text-slate-500">
                  Son konum: {formatTimeTR(rep.lastPoint.recordedAt)}
                </div>
                <div className="text-xs font-semibold text-violet-700">
                  {rep.isLive ? 'Sahada (canlı)' : 'Son bilinen konum'}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-[400] bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700 text-xs shadow-lg space-y-1.5">
        <div className="font-bold text-slate-300 border-b border-slate-700 pb-1 mb-1">
          Harita Lejantı
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-500 border border-slate-300 inline-block" />
          <span>Ziyaret Edilmedi</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          <span>Devam Ediyor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
          <span>Anlaşıldı / Satış</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
          <span>Teklif Verildi</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-700">
          <span className="w-3 h-3 rounded-full bg-violet-600 border-2 border-white inline-block" />
          <span>Temsilci (canlı)</span>
        </div>
      </div>
    </div>
  );
}
