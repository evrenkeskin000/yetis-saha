import { createUserSchema } from '@saha/shared';
import { NextResponse, type NextRequest } from 'next/server';
import {
  createServiceClient,
  requireWebManager,
  resolveCreateUserScope,
} from '../../../../lib/auth/apiAuth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? 'Geçersiz istek verisi.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const auth = await requireWebManager(request);
    if (!auth.ok) return auth.response;

    const scope = resolveCreateUserScope(
      auth.profile,
      parsed.data.role,
      parsed.data.dealership_id
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

    const { email, full_name, password } = parsed.data;

    const { data: created, error: createErr } =
      await adminSupabase.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          must_change_password: true,
        },
      });

    if (createErr) {
      return NextResponse.json(
        { error: `Kullanıcı oluşturulamadı: ${createErr.message}` },
        { status: 400 }
      );
    }

    if (!created?.user) {
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı.' },
        { status: 500 }
      );
    }

    const { error: dbErr } = await adminSupabase.from('users').upsert(
      [
        {
          id: created.user.id,
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
      await adminSupabase.auth.admin.deleteUser(created.user.id);
      return NextResponse.json(
        {
          error: `Kullanıcı kaydı oluşturulamadı: ${dbErr.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${full_name} (${email}) başarıyla oluşturuldu. Geçici şifreyi kullanıcıya iletin.`,
      user_id: created.user.id,
    });
  } catch (err: unknown) {
    console.error('Kullanıcı oluşturma route hatası:', err);
    return NextResponse.json(
      { error: 'Beklenmeyen bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
