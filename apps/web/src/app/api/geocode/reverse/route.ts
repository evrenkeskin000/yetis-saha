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
  display_name?: string;
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
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: 'Geçersiz koordinat' }, { status: 400 });
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
    'accept-language': 'tr',
  });

  try {
    const upstream = await fetch(
      `${NOMINATIM_BASE}/reverse?${params.toString()}`,
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

    const data = (await upstream.json()) as NominatimPlace;
    const formatted = formatAddress(data?.address);
    if (formatted) {
      return NextResponse.json({ address: formatted });
    }

    const fallback = splitDisplayName(data?.display_name);
    const joined = [fallback.name, fallback.address].filter(Boolean).join(', ');
    return NextResponse.json({ address: joined || null });
  } catch {
    return NextResponse.json(
      { error: 'Adres çözümlenemedi' },
      { status: 502 }
    );
  }
}
