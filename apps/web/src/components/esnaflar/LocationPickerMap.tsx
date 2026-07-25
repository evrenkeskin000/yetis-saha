'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import type { GeoPoint } from '@saha/shared';
import {
  reverseGeocode,
  searchPlaces,
  type PlaceResult,
} from '../../lib/geocoding';

const PICK_ZOOM = 17;
const SEARCH_DEBOUNCE_MS = 450;
const TURKEY_CENTER: [number, number] = [39.0, 35.0];

interface LocationPickerMapProps {
  value?: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
  /** Haritadan çözülen adres — formdaki adres alanı boşsa doldurulabilir */
  onAddressChange?: (address: string) => void;
}

function MapCenterTracker({
  onSettled,
  onUserDrag,
}: {
  onSettled: (point: GeoPoint) => void;
  onUserDrag: () => void;
}) {
  const map = useMapEvents({
    dragstart() {
      onUserDrag();
    },
    moveend() {
      const c = map.getCenter();
      onSettled({
        latitude: Number(c.lat.toFixed(6)),
        longitude: Number(c.lng.toFixed(6)),
      });
    },
  });
  return null;
}

function MapFlyTo({
  target,
}: {
  target: { point: GeoPoint; zoom: number; token: number } | null;
}) {
  const map = useMap();
  const lastToken = useRef<number | null>(null);

  useEffect(() => {
    if (!target || target.token === lastToken.current) return;
    lastToken.current = target.token;
    map.flyTo(
      [target.point.latitude, target.point.longitude],
      target.zoom,
      { duration: 0.6 }
    );
  }, [target, map]);

  return null;
}

export default function LocationPickerMap({
  value,
  onChange,
  onAddressChange,
}: LocationPickerMapProps) {
  const initialCenter: [number, number] = value
    ? [value.latitude, value.longitude]
    : TURKEY_CENTER;
  const initialZoom = value ? PICK_ZOOM : 6;

  const [centerLabel, setCenterLabel] = useState<GeoPoint | null>(
    value ?? null
  );
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [flyTarget, setFlyTarget] = useState<{
    point: GeoPoint;
    zoom: number;
    token: number;
  } | null>(
    value
      ? { point: value, zoom: PICK_ZOOM, token: 1 }
      : null
  );
  const flyTokenRef = useRef(1);
  const reverseAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const userNearRef = useRef<{ latitude: number; longitude: number } | null>(
    null
  );
  const didAutoLocate = useRef(false);
  /** İlk yüklemede Türkiye merkezi formu doldurmasın; pan/arama/GPS sonrası açılsın */
  const acceptSettlesRef = useRef(Boolean(value));

  const flyTo = useCallback((point: GeoPoint, zoom = PICK_ZOOM) => {
    acceptSettlesRef.current = true;
    flyTokenRef.current += 1;
    setFlyTarget({ point, zoom, token: flyTokenRef.current });
  }, []);

  const applyPoint = useCallback(
    (point: GeoPoint, opts?: { resolveAddress?: boolean }) => {
      setCenterLabel(point);
      onChange(point);

      if (opts?.resolveAddress === false) return;

      reverseAbortRef.current?.abort();
      const controller = new AbortController();
      reverseAbortRef.current = controller;
      setAddressLoading(true);

      reverseGeocode(point.latitude, point.longitude, {
        signal: controller.signal,
      })
        .then((found) => {
          if (controller.signal.aborted) return;
          setAddress(found);
          if (found) onAddressChange?.(found);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setAddress(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setAddressLoading(false);
        });
    },
    [onChange, onAddressChange]
  );

  const goToUserLocation = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!navigator.geolocation) {
        if (!opts?.silent) {
          setSearchError(
            'Tarayıcı konum desteklemiyor. Haritayı kaydırarak seçebilirsiniz.'
          );
        }
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const point: GeoPoint = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
          };
          userNearRef.current = point;
          flyTo(point);
          applyPoint(point);
          setLocating(false);
        },
        () => {
          setLocating(false);
          if (!opts?.silent) {
            setSearchError(
              'Konum alınamadı. Haritayı kaydırarak veya arama ile seçebilirsiniz.'
            );
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    },
    [applyPoint, flyTo]
  );

  // Kayıtlı konum yoksa tarayıcı konumuna odaklan
  useEffect(() => {
    if (value || didAutoLocate.current) return;
    didAutoLocate.current = true;
    goToUserLocation({ silent: true });
  }, [value, goToUserLocation]);

  // Dışarıdan gelen value değişince (ör. form reset) haritayı güncelle
  useEffect(() => {
    if (!value) return;
    setCenterLabel(value);
  }, [value?.latitude, value?.longitude]);

  // Adres arama (debounce)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setSearching(true);
      setSearchError(null);

      searchPlaces(trimmed, {
        signal: controller.signal,
        near: userNearRef.current ?? centerLabel,
      })
        .then((found) => {
          if (controller.signal.aborted) return;
          setResults(found);
          setShowResults(true);
          if (found.length === 0) {
            setSearchError('Sonuç bulunamadı. Haritadan da seçebilirsiniz.');
          }
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setSearchError('Adres aranamadı. Haritadan seçebilirsiniz.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, centerLabel]);

  useEffect(() => {
    return () => {
      reverseAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, []);

  const handleSelectResult = (place: PlaceResult) => {
    const point: GeoPoint = {
      latitude: place.latitude,
      longitude: place.longitude,
    };
    const addr = place.address || place.name;
    setAddress(addr);
    onAddressChange?.(addr);
    setShowResults(false);
    setQuery('');
    setResults([]);
    flyTo(point);
    applyPoint(point, { resolveAddress: false });
  };

  return (
    <div className="space-y-2">
      {/* Arama */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 focus-within:border-teal-500">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchError(null);
            }}
            onFocus={() => setShowResults(results.length > 0)}
            placeholder="Adres veya işletme ara..."
            className="flex-1 text-sm outline-hidden bg-transparent placeholder:text-slate-400"
          />
          {searching ? (
            <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
          ) : query.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowResults(false);
              }}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Aramayı temizle"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {showResults && results.length > 0 ? (
          <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                >
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {item.name}
                  </div>
                  {item.address ? (
                    <div className="text-xs text-slate-500 truncate">
                      {item.address}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {searchError ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          {searchError}
        </p>
      ) : null}

      {/* Harita */}
      <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-300 shadow-xs z-0">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapCenterTracker
            onUserDrag={() => {
              acceptSettlesRef.current = true;
            }}
            onSettled={(point) => {
              if (!acceptSettlesRef.current) return;
              applyPoint(point);
            }}
          />
          <MapFlyTo target={flyTarget} />
        </MapContainer>

        {/* Sabit merkez pin */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
          aria-hidden
        >
          <MapPin
            className="w-10 h-10 text-red-500 drop-shadow-md"
            style={{ transform: 'translateY(-50%)' }}
            strokeWidth={2.25}
            fill="currentColor"
            fillOpacity={0.15}
          />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-white border border-red-500" />
        </div>

        <button
          type="button"
          onClick={() => goToUserLocation()}
          disabled={locating}
          title="Bulunduğum konum"
          className="absolute right-3 bottom-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          ) : (
            <LocateFixed className="w-5 h-5" />
          )}
        </button>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-3 z-10 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] text-slate-100">
          Haritayı kaydırıp pini esnafın üzerine getirin
        </div>
      </div>

      {/* Durum */}
      <div className="flex flex-wrap items-start justify-between gap-2 px-1 text-xs">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          {addressLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mt-0.5 text-slate-400 animate-spin shrink-0" />
              <span className="text-slate-500">Adres bulunuyor...</span>
            </>
          ) : (
            <>
              <MapPin
                className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  centerLabel ? 'text-teal-600' : 'text-slate-400'
                }`}
              />
              <div className="min-w-0">
                <div className="font-medium text-slate-700 truncate">
                  {address ??
                    (centerLabel
                      ? 'Adres bilgisi yok'
                      : 'Henüz konum seçilmedi')}
                </div>
                {centerLabel ? (
                  <div className="font-mono text-slate-400">
                    {centerLabel.latitude.toFixed(5)},{' '}
                    {centerLabel.longitude.toFixed(5)}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
