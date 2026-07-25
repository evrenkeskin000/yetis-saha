import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireWebManager = vi.fn();
const createServiceClient = vi.fn();
const resolveCreateUserScope = vi.fn();
const canManageTargetDealership = vi.fn();

vi.mock('../../../../lib/auth/apiAuth', () => ({
  requireWebManager: (...a: unknown[]) => requireWebManager(...a),
  createServiceClient: (...a: unknown[]) => createServiceClient(...a),
  resolveCreateUserScope: (...a: unknown[]) => resolveCreateUserScope(...a),
  canManageTargetDealership: (...a: unknown[]) =>
    canManageTargetDealership(...a),
}));

import { POST as davetPost } from '../davet/route';
import { POST as durumPost } from '../durum/route';

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/kullanicilar/davet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without session', async () => {
    requireWebManager.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'yok' }, { status: 401 }),
    });
    const res = await davetPost(
      req('/api/kullanicilar/davet', {
        email: 'a@b.com',
        full_name: 'Ali Veli',
        role: 'field_rep',
        dealership_id: 'b0000000-0000-0000-0000-000000000001',
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid email', async () => {
    const res = await davetPost(
      req('/api/kullanicilar/davet', {
        email: 'bad',
        full_name: 'Ali Veli',
        role: 'field_rep',
      })
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/kullanicilar/durum', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when manager cannot manage target dealership', async () => {
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
    createServiceClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                id: 'other',
                dealership_id: 'bayi-b',
                role: 'field_rep',
              },
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      })),
    });
    canManageTargetDealership.mockReturnValue(false);

    const res = await durumPost(
      req('/api/kullanicilar/durum', {
        user_id: 'a0000000-0000-0000-0000-000000000099',
        is_active: false,
      })
    );
    expect(res.status).toBe(403);
  });
});
