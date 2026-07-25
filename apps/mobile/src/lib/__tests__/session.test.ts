import { describe, expect, it } from 'vitest';
import { isJwtExpiredError } from '../session';

describe('isJwtExpiredError', () => {
  it('detects PostgREST PGRST303', () => {
    expect(
      isJwtExpiredError({ code: 'PGRST303', message: 'JWT expired' })
    ).toBe(true);
  });

  it('detects message variants', () => {
    expect(isJwtExpiredError({ message: 'JWT expired' })).toBe(true);
    expect(isJwtExpiredError({ message: 'Invalid JWT' })).toBe(true);
    expect(isJwtExpiredError({ status: 401, message: 'Unauthorized' })).toBe(
      true
    );
  });

  it('ignores unrelated errors', () => {
    expect(isJwtExpiredError({ code: '42501', message: 'permission denied' })).toBe(
      false
    );
    expect(isJwtExpiredError(null)).toBe(false);
    expect(isJwtExpiredError('boom')).toBe(false);
  });
});
