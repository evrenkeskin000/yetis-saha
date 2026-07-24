'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { GeoPoint } from '@saha/shared';

const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapEventsProps {
  onLocationSelect: (point: GeoPoint) => void;
}

function MapClickHandler({ onLocationSelect }: MapEventsProps) {
  useMapEvents({
    click(e) {
      onLocationSelect({
        latitude: Number(e.latlng.lat.toFixed(6)),
        longitude: Number(e.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

interface LocationPickerMapProps {
  value?: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
}

export default function LocationPickerMap({
  value,
  onChange,
}: LocationPickerMapProps) {
  const defaultCenter: [number, number] = value
    ? [value.latitude, value.longitude]
    : [39.0, 35.0]; // Turkey center

  const [position, setPosition] = useState<[number, number] | null>(
    value ? [value.latitude, value.longitude] : null
  );

  useEffect(() => {
    if (value) {
      setPosition([value.latitude, value.longitude]);
    }
  }, [value?.latitude, value?.longitude]);

  const handleSelect = (point: GeoPoint) => {
    setPosition([point.latitude, point.longitude]);
    onChange(point);
  };

  return (
    <div className="space-y-2">
      <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-slate-300 shadow-xs z-0">
        <MapContainer
          center={defaultCenter}
          zoom={value ? 14 : 6}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapClickHandler onLocationSelect={handleSelect} />
          {position && <Marker position={position} icon={customIcon} />}
        </MapContainer>
      </div>
      <div className="text-xs text-slate-500 flex justify-between items-center px-1">
        <span>* Harita üzerine tıklayarak konumu belirleyin</span>
        {position ? (
          <span className="font-mono font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </span>
        ) : (
          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Henüz konum seçilmedi
          </span>
        )}
      </div>
    </div>
  );
}
