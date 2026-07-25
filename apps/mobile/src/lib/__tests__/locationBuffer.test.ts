import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((k) => store.delete(k));
    }),
  },
}));

vi.mock('expo-battery', () => ({
  getBatteryLevelAsync: vi.fn(async () => 0.8),
}));

const getUser = vi.fn();
const insert = vi.fn();
const maybeSingle = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => maybeSingle(),
            }),
          }),
        };
      }
      return {
        insert: (...args: unknown[]) => insert(...args),
      };
    }),
  },
}));

import {
  addLocationToBuffer,
  flushLocationBuffer,
  getBufferedLocations,
} from '../locationBuffer';
import { locationBufferKey } from '../../constants/storageKeys';
import { MAX_BUFFER_SIZE } from '../../constants/shift';
import { clearUserLocalData } from '../localDataHygiene';
import {
  activeVisitKey,
  locationBufferKey as bufKey,
} from '../../constants/storageKeys';

describe('locationBuffer', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    maybeSingle.mockResolvedValue({
      data: { dealership_id: 'd1' },
      error: null,
    });
  });

  it('uses a user-scoped storage key', () => {
    expect(locationBufferKey('user-1')).toBe(
      '@saha_location_buffer_v1:user-1'
    );
  });

  it('trims buffer when exceeding MAX_BUFFER_SIZE', async () => {
    const key = locationBufferKey('user-1');
    const existing = Array.from({ length: MAX_BUFFER_SIZE }, (_, i) => ({
      id: `old-${i}`,
      latitude: 41,
      longitude: 29,
      accuracy_m: null,
      speed_kmh: null,
      is_mock: false,
      activity_type: 'still' as const,
      recorded_at: new Date().toISOString(),
    }));
    store.set(key, JSON.stringify(existing));

    await addLocationToBuffer({
      latitude: 41.1,
      longitude: 29.1,
      accuracy_m: 5,
      speed_kmh: 0,
      is_mock: false,
      activity_type: 'still',
      recorded_at: new Date().toISOString(),
    });

    const buf = await getBufferedLocations();
    expect(buf.length).toBe(MAX_BUFFER_SIZE);
    expect(buf[0].id).not.toBe('old-0');
  });

  it('keeps buffer entries when flush insert fails', async () => {
    await addLocationToBuffer({
      latitude: 41,
      longitude: 29,
      accuracy_m: 5,
      speed_kmh: 0,
      is_mock: false,
      activity_type: 'walking',
      recorded_at: new Date().toISOString(),
    });
    insert.mockResolvedValue({ error: { message: 'fail' } });

    const inserted = await flushLocationBuffer();
    expect(inserted).toBe(0);
    expect(await getBufferedLocations()).toHaveLength(1);
  });

  it('clears user local data keys on hygiene clear', async () => {
    const uid = 'user-1';
    store.set(bufKey(uid), '[]');
    store.set(activeVisitKey(uid), '{}');
    await clearUserLocalData(uid);
    expect(store.has(bufKey(uid))).toBe(false);
    expect(store.has(activeVisitKey(uid))).toBe(false);
  });
});
