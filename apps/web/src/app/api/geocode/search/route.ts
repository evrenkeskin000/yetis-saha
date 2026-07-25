import { NextResponse, type NextRequest } from 'next/server';
import { createCookieSupabase } from '../../../../lib/auth/apiAuth';
import {
  formatAddress,
  splitDisplayName,
  type NominatimAddress,
} from '../../../../lib/geocoding';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'SahaTakip/1.0 (saha ziyaret takip; web panel)';

interface NominatimPlace {
  place_id?: number | string;
  osm_id?: number | string;
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

export async function GET(request: NextRequest) {
  const { supabase } = createCookieSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const limit = Math.min(Number(searchParams.get('limit') || 8), 10);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'tr',
    'accept-language': 'tr',
    limit: String(limit),
  });

  if (lat && lon) {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const delta = 0.75;
      params.set(
        'viewbox',
        [
          longitude - delta,
          latitude + delta,
          longitude + delta,
          latitude - delta,
        ].join(',')
      );
    }
  }

  try {
    const upstream = await fetch(
      `${NOMINATIM_BASE}/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
        next: { revalidate: 0 },
      }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Adres servisi yanıt vermedi' },
        { status: 502 }
      );
    }

    const data = (await upstream.json()) as NominatimPlace[];
    if (!Array.isArray(data)) {
      return NextResponse.json({ results: [] });
    }

    const results = data
      .map((place, index) => {
        const latitude = parseFloat(String(place.lat));
        const longitude = parseFloat(String(place.lon));
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }
        const fromDisplay = splitDisplayName(place.display_name);
        const detailed = formatAddress(place.address);
        return {
          id: String(
            place.place_id ?? place.osm_id ?? `${latitude},${longitude}-${index}`
          ),
          name: place.name || fromDisplay.name || 'Adsız konum',
          address: detailed || fromDisplay.address,
          latitude,
          longitude,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: 'Adres aranamadı' },
      { status: 502 }
    );
  }
}
