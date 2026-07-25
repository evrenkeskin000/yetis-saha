import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

const useProfile = vi.fn();
vi.mock('../../lib/hooks/useProfile', () => ({
  useProfile: () => useProfile(),
}));

import { RoleGuard } from '../RoleGuard';

describe('RoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render children for unauthorized roles', () => {
    useProfile.mockReturnValue({
      profile: {
        id: 'u1',
        role: 'field_rep',
        is_active: true,
        dealership_id: 'd1',
      },
      loading: false,
    });

    const html = renderToStaticMarkup(
      <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
        <div>Gizli İçerik</div>
      </RoleGuard>
    );

    expect(html).not.toContain('Gizli İçerik');
  });

  it('renders children for allowed roles', () => {
    useProfile.mockReturnValue({
      profile: {
        id: 'u1',
        role: 'dealer_admin',
        is_active: true,
        dealership_id: 'd1',
      },
      loading: false,
    });

    const html = renderToStaticMarkup(
      <RoleGuard allowedRoles={['yetis_admin', 'dealer_admin']}>
        <div>Gizli İçerik</div>
      </RoleGuard>
    );

    expect(html).toContain('Gizli İçerik');
  });
});
