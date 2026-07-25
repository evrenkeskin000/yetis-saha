import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@saha/shared';
import {
  createServiceClient,
  requireWebManager,
  resolveCreateUserScope,
} from '../../../../lib/auth/apiAuth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, full_name, role, dealership_id } = body || {};

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

    if (!['yetis_admin', 'dealer_admin', 'field_rep'].includes(role)) {
      return NextResponse.json(
        { error: 'Geçerli bir kullanıcı rolü seçin.' },
        { status: 400 }
      );
    }

    const auth = await requireWebManager(request);
    if (!auth.ok) return auth.response;

    const scope = resolveCreateUserScope(
      auth.profile,
      role as UserRole,
      dealership_id ?? null
    );
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: 403 });
    }

    const adminSupabase = createServiceClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Sunucu konfigürasyonu eksik (SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }

    const { data: inviteData, error: inviteErr } =
      await adminSupabase.auth.admin.inviteUserByEmail(email.trim(), {
        data: {
          full_name: full_name.trim(),
          must_change_password: true,
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

    const { error: dbErr } = await adminSupabase.from('users').upsert(
      [
        {
          id: inviteData.user.id,
          email: email.trim(),
          full_name: full_name.trim(),
          role: scope.role,
          dealership_id: scope.dealership_id,
          is_active: true,
          must_change_password: true,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'id' }
    );

    if (dbErr) {
      console.error('users tablosuna yazma hatası:', dbErr);
      await adminSupabase.auth.admin.deleteUser(inviteData.user.id);
      return NextResponse.json(
        {
          error: `Kullanıcı kaydı oluşturulamadı: ${dbErr.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${full_name} (${email}) için kullanıcı daveti başarıyla gönderildi.`,
    });
  } catch (err: unknown) {
    console.error('Kullanıcı davet route hatası:', err);
    return NextResponse.json(
      { error: 'Beklenmeyen bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
