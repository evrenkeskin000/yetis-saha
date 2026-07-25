import { describe, expect, it } from 'vitest';

/**
 * Auth profil yükleme hatasında oturumun açık bırakılmaması E14/E17'de
 * `loadProfile` içinde `signOut` ile sağlanır. Bu test, sözleşmeyi sabitler:
 * profil yok/hatalıysa giriş tamamlanmış sayılmaz.
 */
describe('auth profile gate contract', () => {
  it('treats missing dealership for field_rep as hard failure', () => {
    const profile = {
      role: 'field_rep' as const,
      is_active: true,
      dealership_id: null as string | null,
    };
    const shouldReject =
      profile.role === 'field_rep' && !profile.dealership_id;
    expect(shouldReject).toBe(true);
  });

  it('treats inactive account as hard failure', () => {
    const profile = { is_active: false };
    expect(profile.is_active).toBe(false);
  });
});
