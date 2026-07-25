import type { Session, SupabaseClient } from '@supabase/supabase-js';

/**
 * Süresi dolmuş JWT ile istek atmamak için oturumu tazeler.
 * Başarılıysa güncel session, yenilenemezse null döner.
 */
export async function ensureFreshSession(
  client: SupabaseClient
): Promise<Session | null> {
  const { data: current, error: sessionError } =
    await client.auth.getSession();

  if (sessionError) {
    console.warn('[Auth] getSession hatası:', sessionError.message);
  }

  const session = current.session;
  if (!session) return null;

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  const stillValidForMs = expiresAtMs - Date.now();

  // 60 sn'den fazla ömrü varsa yenilemeye gerek yok
  if (stillValidForMs > 60_000) {
    return session;
  }

  const { data, error } = await client.auth.refreshSession();
  if (error) {
    console.warn('[Auth] refreshSession hatası:', error.message);
    return null;
  }
  return data.session;
}

/** PostgREST / GoTrue "JWT expired" benzeri hataları yakalar. */
export function isJwtExpiredError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; status?: number };
  const msg = (e.message ?? '').toLowerCase();
  return (
    e.code === 'PGRST303' ||
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt') ||
    e.status === 401
  );
}
