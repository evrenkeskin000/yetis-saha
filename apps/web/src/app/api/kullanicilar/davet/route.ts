import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, full_name, role } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi girin.' },
        { status: 400 }
      );
    }

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Ad Soyad en az 2 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    if (!['admin', 'manager', 'field_rep'].includes(role)) {
      return NextResponse.json(
        { error: 'Geçerli bir kullanıcı rolü seçin.' },
        { status: 400 }
      );
    }

    // 1. Session verification with @supabase/ssr server client
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

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }

    // Check if current user is admin in public.users
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', currentUser.id)
      .single();

    if (!profile || profile.role !== 'admin' || !profile.is_active) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok.' },
        { status: 403 }
      );
    }

    // 2. Service Role Client for Auth Admin API
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Sunucu konfigürasyonu eksik (SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Invite user by email
    const { data: inviteData, error: inviteErr } =
      await adminSupabase.auth.admin.inviteUserByEmail(email.trim(), {
        data: {
          full_name: full_name.trim(),
          role: role,
        },
      });

    if (inviteErr) {
      return NextResponse.json(
        { error: `Davet gönderilemedi: ${inviteErr.message}` },
        { status: 400 }
      );
    }

    if (!inviteData?.user) {
      return NextResponse.json(
        { error: 'Kullanıcı davet edilemedi.' },
        { status: 500 }
      );
    }

    // 4. Upsert into public.users table
    const { error: dbErr } = await adminSupabase.from('users').upsert(
      [
        {
          id: inviteData.user.id,
          email: email.trim(),
          full_name: full_name.trim(),
          role: role,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'id' }
    );

    if (dbErr) {
      console.error('users tablosuna yazma hatası:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `${full_name} (${email}) için kullanıcı daveti başarıyla gönderildi.`,
    });
  } catch (err: any) {
    console.error('Kullanıcı davet route hatası:', err);
    return NextResponse.json(
      { error: 'Beklenmeyen bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
