import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/',
    '/giris',
    '/panel/:path*',
    '/esnaflar/:path*',
    '/ziyaretler/:path*',
    '/rota/:path*',
    '/raporlar/:path*',
    '/ayarlar/:path*',
    '/sifre-degistir/:path*',
  ],
};
