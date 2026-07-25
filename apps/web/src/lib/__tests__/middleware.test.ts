import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUser, signOut, maybeSingle, from, nextMock, redirectMock } =
  vi.hoisted(() => {
    const maybeSingle = vi.fn();
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    return {
      getUser: vi.fn(),
      signOut: vi.fn(),
      maybeSingle,
      from: vi.fn(() => ({ select })),
      nextMock: vi.fn(() => ({
        cookies: { getAll: () => [], set: vi.fn() },
        status: 200,
        headers: new Headers(),
      })),
      redirectMock: vi.fn((url: URL) => ({
        cookies: { getAll: () => [], set: vi.fn() },
        status: 307,
        headers: new Headers({ location: url.toString() }),
      })),
    };
  });

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser, signOut },
    from,
  })),
}));

vi.mock('next/server', async () => {
  const actual =
    await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      next: nextMock,
      redirect: redirectMock,
    },
  };
});

import { updateSession } from '../supabase/middleware';
import { config as middlewareConfig } from '../../middleware';
import { NextRequest } from 'next/server';

function req(path: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: new Headers({ cookie: '' }),
  });
}

describe('updateSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: null } });
    signOut.mockResolvedValue({ error: null });
    nextMock.mockImplementation(() => ({
      cookies: { getAll: () => [], set: vi.fn() },
      status: 200,
      headers: new Headers(),
    }));
    redirectMock.mockImplementation((url: URL) => ({
      cookies: { getAll: () => [], set: vi.fn() },
      status: 307,
      headers: new Headers({ location: url.toString() }),
    }));
  });

  it('redirects unauthenticated users from protected paths to /giris', async () => {
    const res = await updateSession(req('/panel'));
    expect(redirectMock).toHaveBeenCalled();
    const url = redirectMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe('/giris');
    expect(res.status).toBe(307);
  });

  it('blocks field_rep from panel with mobil_kullanici error', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    maybeSingle.mockResolvedValue({
      data: {
        role: 'field_rep',
        is_active: true,
        must_change_password: false,
        dealership_id: 'd1',
        dealerships: { is_active: true },
      },
      error: null,
    });

    await updateSession(req('/panel'));
    expect(signOut).toHaveBeenCalled();
    const url = redirectMock.mock.calls[0][0] as URL;
    expect(url.searchParams.get('hata')).toBe('mobil_kullanici');
  });

  it('signs out inactive users to hesap_pasif', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    maybeSingle.mockResolvedValue({
      data: {
        role: 'dealer_admin',
        is_active: false,
        must_change_password: false,
        dealership_id: 'd1',
        dealerships: { is_active: true },
      },
      error: null,
    });

    await updateSession(req('/panel'));
    expect(signOut).toHaveBeenCalled();
    const url = redirectMock.mock.calls[0][0] as URL;
    expect(url.searchParams.get('hata')).toBe('hesap_pasif');
  });

  it('redirects must_change_password users to /sifre-degistir', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    maybeSingle.mockResolvedValue({
      data: {
        role: 'dealer_admin',
        is_active: true,
        must_change_password: true,
        dealership_id: 'd1',
        dealerships: { is_active: true },
      },
      error: null,
    });

    await updateSession(req('/panel'));
    const url = redirectMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe('/sifre-degistir');
  });

  it('includes /sifre-degistir in middleware matcher', () => {
    expect(middlewareConfig.matcher).toContain('/sifre-degistir/:path*');
  });
});
