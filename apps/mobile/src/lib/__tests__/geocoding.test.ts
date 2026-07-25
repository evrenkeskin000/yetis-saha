import { describe, expect, it } from 'vitest';
import { formatAddress, splitDisplayName } from '../geocoding';

describe('formatAddress', () => {
  it('builds a Turkish-style address from Nominatim fields', () => {
    expect(
      formatAddress({
        road: 'Barbaros Bulvarı',
        house_number: '88',
        neighbourhood: 'Yıldız Mahallesi',
        county: 'Beşiktaş',
        province: 'İstanbul',
      })
    ).toBe('Barbaros Bulvarı No:88, Yıldız Mahallesi, Beşiktaş / İstanbul');
  });

  it('omits missing parts without leaving stray separators', () => {
    expect(
      formatAddress({ road: 'Atatürk Caddesi', province: 'İzmir' })
    ).toBe('Atatürk Caddesi, İzmir');
  });

  it('falls back to city_district and state when county/province are absent', () => {
    expect(
      formatAddress({ city_district: 'Kadıköy', state: 'İstanbul' })
    ).toBe('Kadıköy / İstanbul');
  });

  it('returns empty string for undefined input', () => {
    expect(formatAddress(undefined)).toBe('');
  });
});

describe('splitDisplayName', () => {
  it('splits the first segment as the name', () => {
    expect(
      splitDisplayName('Üsküdar Kasabı, Selmanipak Caddesi, Üsküdar, İstanbul')
    ).toEqual({
      name: 'Üsküdar Kasabı',
      address: 'Selmanipak Caddesi, Üsküdar, İstanbul',
    });
  });

  it('handles a single-segment display name', () => {
    expect(splitDisplayName('İstanbul')).toEqual({
      name: 'İstanbul',
      address: '',
    });
  });

  it('handles undefined', () => {
    expect(splitDisplayName(undefined)).toEqual({ name: '', address: '' });
  });
});
