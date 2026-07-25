import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import {
  canManageTargetDealership,
  createServiceClient,
  requireWebManager,
} from '../../../../lib/auth/apiAuth';

export const runtime = 'edge';

const durumSchema = z.object({
  user_id: z.string().uuid('Geçerli bir kullanıcı kimliği gerekli'),
  is_active: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = durumSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? 'Geçersiz istek verisi.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { user_id, is_active } = parsed.data;

    const auth = await requireWebManager(request);
    if (!auth.ok) return auth.response;

    if (user_id === auth.profile.id && !is_active) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı pasife alamazsınız.' },
        { status: 400 }
      );
    }

    const adminSupabase = createServiceClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Sunucu konfigürasyonu eksik (SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }

    const { data: target, error: targetErr } = await adminSupabase
      .from('users')
      .select('id, role, dealership_id, is_active')
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
        {
          error:
            'Bayi yöneticisi yalnızca saha temsilcisinin durumunu değiştirebilir.',
        },
        { status: 403 }
      );
    }

    const { error: dbErr } = await adminSupabase
      .from('users')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (dbErr) {
      return NextResponse.json(
        { error: `Durum güncellenemedi: ${dbErr.message}` },
        { status: 500 }
      );
    }

    if (!is_active) {
      try {
        await adminSupabase.auth.admin.signOut(user_id, 'global');
      } catch (signOutErr) {
        console.error('Oturum sonlandırma uyarısı:', signOutErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: is_active
        ? 'Kullanıcı aktifleştirildi.'
        : 'Kullanıcı pasife alındı ve oturumları sonlandırıldı.',
    });
  } catch (err: unknown) {
    console.error('Kullanıcı durum route hatası:', err);
    return NextResponse.json(
      { error: 'Beklenmeyen bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
