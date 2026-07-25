import { describe, expect, it } from 'vitest';
import {
  canManageTargetDealership,
  resolveCreateUserScope,
  type CallerProfile,
} from '../auth/apiAuth';

const yetis: CallerProfile = {
  id: 'ya',
  role: 'yetis_admin',
  is_active: true,
  dealership_id: null,
};

const dealer: CallerProfile = {
  id: 'da',
  role: 'dealer_admin',
  is_active: true,
  dealership_id: 'bayi-a',
};

describe('canManageTargetDealership', () => {
  it('allows yetis_admin for any bayi', () => {
    expect(canManageTargetDealership(yetis, 'bayi-b')).toBe(true);
  });

  it('blocks dealer_admin for another bayi', () => {
    expect(canManageTargetDealership(dealer, 'bayi-b')).toBe(false);
  });

  it('allows dealer_admin for own bayi', () => {
    expect(canManageTargetDealership(dealer, 'bayi-a')).toBe(true);
  });
});

describe('resolveCreateUserScope', () => {
  it('prevents dealer_admin from creating yetis_admin', () => {
    const scope = resolveCreateUserScope(dealer, 'yetis_admin', 'bayi-a');
    expect(scope.ok).toBe(false);
  });

  it('locks dealer_admin created field_rep to own bayi', () => {
    const scope = resolveCreateUserScope(dealer, 'field_rep', 'bayi-b');
    expect(scope.ok).toBe(true);
    if (scope.ok) {
      expect(scope.dealership_id).toBe('bayi-a');
      expect(scope.role).toBe('field_rep');
    }
  });
});
