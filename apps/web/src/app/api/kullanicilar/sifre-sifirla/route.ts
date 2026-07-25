import { resetPasswordSchema } from '@saha/shared';
import { NextResponse, type NextRequest } from 'next/server';
import {
  canManageTargetDealership,
  createServiceClient,
  requireWebManager,
} from '../../../../lib/auth/apiAuth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? 'Geçersiz istek verisi.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { user_id, password } = parsed.data;

    const auth = await requireWebManager(request);
    if (!auth.ok) return auth.response;

    const adminSupabase = createServiceClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Sunucu konfigürasyonu eksik (SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }

    const { data: target, error: targetErr } = await adminSupabase
      .from('users')
      .select('id, role, dealership_id')
      .eq('id', user_id)
      .single();

    if (targetErr || !target) {
      return NextResponse.json(
        { error: 'Hedef kullanıcı bulunamadı.' },
        { status: 404 }
      );
    }

    if (!canManageTargetDealership(auth.profile, target.dealership_id)) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok.' },
        { status: 403 }
      );
    }

    if (
      auth.profile.role === 'dealer_admin' &&
      target.role !== 'field_rep'
    ) {
      return NextResponse.json(
        { error: 'Bayi yöneticisi yalnızca saha temsilcisinin şifresini sıfırlayabilir.' },
        { status: 403 }
      );
    }

    const { error: updateErr } =
      await adminSupabase.auth.admin.updateUserById(user_id, { password });

    if (updateErr) {
      return NextResponse.json(
        { error: `Şifre sıfırlanamadı: ${updateErr.message}` },
        { status: 400 }
      );
    }

    const { error: dbErr } = await adminSupabase
      .from('users')
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (dbErr) {
      console.error('must_change_password güncelleme hatası:', dbErr);
      return NextResponse.json(
        {
          error: `Şifre güncellendi ancak zorunlu değişim bayrağı ayarlanamadı: ${dbErr.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Şifre başarıyla sıfırlandı. Kullanıcı bir sonraki girişte şifresini değiştirmek zorunda kalacak.',
    });
  } catch (err: unknown) {
    console.error('Şifre sıfırlama route hatası:', err);
    return NextResponse.json(
      { error: 'Beklenmeyen bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
