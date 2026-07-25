import { describe, expect, it, vi } from 'vitest';
import { ALL_DEALERSHIPS } from '@saha/shared';
import { applyDealershipScope, isAllDealershipsScope } from '../scopedQuery';

describe('applyDealershipScope', () => {
  it('does not filter when scope is all', () => {
    const eq = vi.fn();
    const query = { eq };
    const result = applyDealershipScope(query, ALL_DEALERSHIPS);
    expect(result).toBe(query);
    expect(eq).not.toHaveBeenCalled();
    expect(isAllDealershipsScope(ALL_DEALERSHIPS)).toBe(true);
  });

  it('adds dealership_id equality for a specific bayi', () => {
    const filtered = { id: 'filtered' };
    const eq = vi.fn(() => filtered);
    const query = { eq };
    const result = applyDealershipScope(query, 'bayi-uuid-1');
    expect(eq).toHaveBeenCalledWith('dealership_id', 'bayi-uuid-1');
    expect(result).toBe(filtered);
  });
});
