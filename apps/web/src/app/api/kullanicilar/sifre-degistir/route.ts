import { changePasswordSchema } from '@saha/shared';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? 'Geçersiz istek verisi.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { password } = parsed.data;

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

    const { data: profile } = await supabase
      .from('users')
      .select('is_active, must_change_password')
      .eq('id', currentUser.id)
      .single();

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok.' },
        { status: 403 }
      );
    }

    if (!profile.must_change_password) {
      return NextResponse.json(
        {
          error:
            'Zorunlu şifre değişimi bulunmuyor. Şifrenizi değiştirmek için yöneticiyle görüşün.',
        },
        { status: 403 }
      );
    }

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

    const { error: updateErr } =
      await adminSupabase.auth.admin.updateUserById(currentUser.id, {
        password,
      });

    if (updateErr) {
      return NextResponse.json(
        { error: `Şifre değiştirilemedi: ${updateErr.message}` },
        { status: 400 }
      );
    }

    // service_role ile bayrağı temizle (prevent_must_change_bypass service_role'e izin verir)
    const { error: dbErr } = await adminSupabase
      .from('users')
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id);

    if (dbErr) {
      console.error('must_change_password temizleme hatası:', dbErr);
      return NextResponse.json(
        {
          error: `Şifre güncellendi ancak zorunluluk kaldırılamadı: ${dbErr.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi.',
    });
  } catch (err: unknown) {
    console.error('Şifre değiştirme route hatası:', err);
    return NextResponse.json(
      { error: 'Beklenmeyen bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
