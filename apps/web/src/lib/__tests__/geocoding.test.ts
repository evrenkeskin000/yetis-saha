import { describe, expect, it } from 'vitest';
import { formatAddress, splitDisplayName } from '../geocoding';

describe('formatAddress', () => {
  it('builds a Turkish-style address', () => {
    expect(
      formatAddress({
        road: 'Bağdat Caddesi',
        house_number: '125',
        neighbourhood: 'Kalamış',
        county: 'Kadıköy',
        province: 'İstanbul',
      })
    ).toBe('Bağdat Caddesi No:125, Kalamış, Kadıköy / İstanbul');
  });

  it('returns empty for undefined', () => {
    expect(formatAddress(undefined)).toBe('');
  });
});

describe('splitDisplayName', () => {
  it('splits first segment as name', () => {
    expect(splitDisplayName('Üsküdar Kasabı, Üsküdar, İstanbul')).toEqual({
      name: 'Üsküdar Kasabı',
      address: 'Üsküdar, İstanbul',
    });
  });
});
