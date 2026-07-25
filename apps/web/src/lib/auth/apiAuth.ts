import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { UserRole } from '@saha/shared';
import { NextResponse, type NextRequest } from 'next/server';

export interface CallerProfile {
  id: string;
  role: UserRole;
  is_active: boolean;
  dealership_id: string | null;
}

export function createCookieSupabase(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  return { supabase, response };
}

export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null;
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/** yetis_admin veya dealer_admin; pasif hesap reddedilir. */
export async function requireWebManager(
  request: NextRequest
): Promise<
  | { ok: true; profile: CallerProfile; supabase: ReturnType<typeof createCookieSupabase>['supabase'] }
  | { ok: false; response: NextResponse }
> {
  const { supabase } = createCookieSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, is_active, dealership_id')
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    (profile.role !== 'yetis_admin' && profile.role !== 'dealer_admin')
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok.' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    profile: profile as CallerProfile,
    supabase,
  };
}

/** Hedef kullanıcının dealership_id'si çağıranın kapsamındaysa true. */
export function canManageTargetDealership(
  caller: CallerProfile,
  targetDealershipId: string | null
): boolean {
  if (caller.role === 'yetis_admin') return true;
  if (caller.role !== 'dealer_admin') return false;
  if (!caller.dealership_id || !targetDealershipId) return false;
  return caller.dealership_id === targetDealershipId;
}

/** dealer_admin yalnızca field_rep oluşturabilir; dealership kendi bayisine sabitlenir. */
export function resolveCreateUserScope(
  caller: CallerProfile,
  requestedRole: UserRole,
  requestedDealershipId: string | null | undefined
):
  | { ok: true; role: UserRole; dealership_id: string | null }
  | { ok: false; error: string } {
  if (caller.role === 'yetis_admin') {
    if (requestedRole === 'yetis_admin') {
      return { ok: true, role: 'yetis_admin', dealership_id: null };
    }
    if (!requestedDealershipId) {
      return {
        ok: false,
        error: 'Bayi yöneticisi ve saha temsilcisi için bayi zorunludur',
      };
    }
    return {
      ok: true,
      role: requestedRole,
      dealership_id: requestedDealershipId,
    };
  }

  // dealer_admin
  if (requestedRole !== 'field_rep') {
    return {
      ok: false,
      error: 'Bayi yöneticisi yalnızca saha temsilcisi oluşturabilir.',
    };
  }
  if (!caller.dealership_id) {
    return {
      ok: false,
      error: 'Bayi bilginiz eksik. Lütfen Yetiş yöneticinizle görüşün.',
    };
  }
  return {
    ok: true,
    role: 'field_rep',
    dealership_id: caller.dealership_id,
  };
}
