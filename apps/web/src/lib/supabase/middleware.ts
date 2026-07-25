import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type ProfileGate = {
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  dealership_id: string | null;
  dealerships: { is_active: boolean } | { is_active: boolean }[] | null;
};

function dealershipIsActive(profile: ProfileGate): boolean {
  if (profile.dealership_id == null) return true; // yetis_admin
  const d = profile.dealerships;
  if (!d) return false;
  const row = Array.isArray(d) ? d[0] : d;
  return row?.is_active === true;
}

function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isProtectedPath =
    pathname.startsWith('/panel') ||
    pathname.startsWith('/esnaflar') ||
    pathname.startsWith('/ziyaretler') ||
    pathname.startsWith('/rota') ||
    pathname.startsWith('/raporlar') ||
    pathname.startsWith('/ayarlar') ||
    pathname.startsWith('/sifre-degistir');

  const isAuthPath = pathname.startsWith('/giris');
  const isChangePasswordPath = pathname.startsWith('/sifre-degistir');

  if (!user && isProtectedPath) {
    url.pathname = '/giris';
    url.search = '';
    return redirectWithCookies(url, supabaseResponse);
  }

  if (user && isProtectedPath) {
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select(
        'role, is_active, must_change_password, dealership_id, dealerships(is_active)'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      await supabase.auth.signOut();
      url.pathname = '/giris';
      url.searchParams.set('hata', 'profil_yok');
      return redirectWithCookies(url, supabaseResponse);
    }

    const gate = profile as ProfileGate;

    if (!gate.is_active || !dealershipIsActive(gate)) {
      await supabase.auth.signOut();
      url.pathname = '/giris';
      url.searchParams.set('hata', 'hesap_pasif');
      return redirectWithCookies(url, supabaseResponse);
    }

    if (gate.role === 'field_rep') {
      await supabase.auth.signOut();
      url.pathname = '/giris';
      url.searchParams.set('hata', 'mobil_kullanici');
      return redirectWithCookies(url, supabaseResponse);
    }

    if (gate.must_change_password && !isChangePasswordPath) {
      url.pathname = '/sifre-degistir';
      url.search = '';
      return redirectWithCookies(url, supabaseResponse);
    }

    if (!gate.must_change_password && isChangePasswordPath) {
      url.pathname = '/panel';
      url.search = '';
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  // Authenticated manager on /giris or / -> panel (field_rep already blocked above if protected)
  if (user && (isAuthPath || pathname === '/')) {
    // Still verify they can access panel
    const { data: profile } = await supabase
      .from('users')
      .select(
        'role, is_active, must_change_password, dealership_id, dealerships(is_active)'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();
      url.pathname = '/giris';
      url.searchParams.set('hata', 'profil_yok');
      return redirectWithCookies(url, supabaseResponse);
    }

    const gate = profile as ProfileGate;

    if (!gate.is_active || !dealershipIsActive(gate)) {
      await supabase.auth.signOut();
      url.pathname = '/giris';
      url.searchParams.set('hata', 'hesap_pasif');
      return redirectWithCookies(url, supabaseResponse);
    }

    if (gate.role === 'field_rep') {
      await supabase.auth.signOut();
      url.pathname = '/giris';
      url.searchParams.set('hata', 'mobil_kullanici');
      return redirectWithCookies(url, supabaseResponse);
    }

    if (gate.must_change_password) {
      url.pathname = '/sifre-degistir';
      url.search = '';
      return redirectWithCookies(url, supabaseResponse);
    }

    url.pathname = '/panel';
    url.search = '';
    return redirectWithCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}
