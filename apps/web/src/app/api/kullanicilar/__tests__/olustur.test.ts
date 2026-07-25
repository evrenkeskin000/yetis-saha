import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const requireWebManager = vi.fn();
const createServiceClient = vi.fn();
const resolveCreateUserScope = vi.fn();

vi.mock('../../../../lib/auth/apiAuth', () => ({
  requireWebManager: (...args: unknown[]) => requireWebManager(...args),
  createServiceClient: (...args: unknown[]) => createServiceClient(...args),
  resolveCreateUserScope: (...args: unknown[]) =>
    resolveCreateUserScope(...args),
}));

import { POST as olusturPost } from '../olustur/route';
import { NextResponse } from 'next/server';

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/kullanicilar/olustur', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const validBody = {
  email: 'rep@example.com',
  full_name: 'Temsilci',
  password: 'Sifre123!',
  role: 'field_rep',
  dealership_id: 'b0000000-0000-0000-0000-000000000001',
};

describe('POST /api/kullanicilar/olustur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when requireWebManager rejects session', async () => {
    requireWebManager.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Oturum yok' }, { status: 401 }),
    });

    const res = await olusturPost(jsonRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 403 when dealer_admin cannot create the requested role', async () => {
    requireWebManager.mockResolvedValue({
      ok: true,
      profile: {
        id: 'da',
        role: 'dealer_admin',
        is_active: true,
        dealership_id: 'bayi-a',
      },
      supabase: {},
    });
    resolveCreateUserScope.mockReturnValue({
      ok: false,
      error: 'Bayi yöneticisi yalnızca saha temsilcisi oluşturabilir.',
    });

    const res = await olusturPost(jsonRequest(validBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/saha temsilcisi/i);
  });

  it('returns 400 for invalid payload', async () => {
    const res = await olusturPost(jsonRequest({ email: 'x' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful create', async () => {
    requireWebManager.mockResolvedValue({
      ok: true,
      profile: {
        id: 'ya',
        role: 'yetis_admin',
        is_active: true,
        dealership_id: null,
      },
      supabase: {},
    });
    resolveCreateUserScope.mockReturnValue({
      ok: true,
      role: 'field_rep',
      dealership_id: validBody.dealership_id,
    });
    createServiceClient.mockReturnValue({
      auth: {
        admin: {
          createUser: vi.fn(async () => ({
            data: { user: { id: 'new-user' } },
            error: null,
          })),
          deleteUser: vi.fn(),
        },
      },
      from: vi.fn(() => ({
        upsert: vi.fn(async () => ({ error: null })),
      })),
    });

    const res = await olusturPost(jsonRequest(validBody));
    expect(res.status).toBe(200);
  });
});
