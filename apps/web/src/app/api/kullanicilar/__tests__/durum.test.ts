import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireWebManager = vi.fn();
const createServiceClient = vi.fn();
const canManageTargetDealership = vi.fn();

vi.mock('../../../../lib/auth/apiAuth', () => ({
  requireWebManager: (...a: unknown[]) => requireWebManager(...a),
  createServiceClient: (...a: unknown[]) => createServiceClient(...a),
  canManageTargetDealership: (...a: unknown[]) =>
    canManageTargetDealership(...a),
}));

import { POST as durumPost } from '../durum/route';

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

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
