import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentPositionAsync = vi.fn();
const requestForegroundPermissionsAsync = vi.fn();
const randomUUID = vi.fn(() => 'idem-1');
const getUser = vi.fn();
const rpc = vi.fn();
const insert = vi.fn();
const select = vi.fn();
const single = vi.fn();
const from = vi.fn();

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...a: unknown[]) =>
    requestForegroundPermissionsAsync(...a),
  getCurrentPositionAsync: (...a: unknown[]) => getCurrentPositionAsync(...a),
  Accuracy: { High: 1, Balanced: 2 },
}));

vi.mock('expo-crypto', () => ({
  randomUUID: () => randomUUID(),
}));

import { performCheckIn } from '../visits';

function supabaseMock() {
  return {
    auth: { getUser },
    rpc,
    from,
  } as never;
}

const customer = {
  id: 'c1',
  business_name: 'Bakkal',
  location: { latitude: 41.0, longitude: 29.0 },
  dealership_id: 'd1',
} as never;

describe('performCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    getUser.mockResolvedValue({ data: { user: { id: 'rep1' } } });
    rpc.mockResolvedValue({ data: null, error: null });
    from.mockReturnValue({
      insert: (...a: unknown[]) => {
        insert(...a);
        return {
          select: () => {
            select();
            return { single };
          },
        };
      },
    });
  });

  it('has no forceOutOfRange parameter on performCheckIn', () => {
    expect(performCheckIn.length).toBe(2);
  });

  it('inserts visit even when far from the customer (no geofence rule)', async () => {
    getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 41.01, longitude: 29.0 }, // ~1.1 km north
      mocked: false,
    });
    single.mockResolvedValue({
      data: { id: 'v1' },
      error: null,
    });

    const res = await performCheckIn(supabaseMock(), customer);
    expect(res.visit).toBeTruthy();
    expect(insert).toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('inserts visit near the customer and reports mock location flag', async () => {
    getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 41.0001, longitude: 29.0 },
      mocked: true,
    });
    single.mockResolvedValue({
      data: { id: 'v1' },
      error: null,
    });

    const res = await performCheckIn(supabaseMock(), customer);
    expect(res.visit).toBeTruthy();
    expect(res.isMockLocation).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_mock_location: true })
    );
  });
});
