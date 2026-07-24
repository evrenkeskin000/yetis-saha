import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  completeVisit,
  createVisit,
  getActiveVisit,
  getCustomersNearby,
  getTodayVisits,
  getVisitPhotoUrl,
  uploadVisitPhoto,
} from '../api';

function createMockSupabaseClient() {
  const selectMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();
  const gteMock = vi.fn().mockReturnThis();
  const isMock = vi.fn().mockReturnThis();
  const orderMock = vi.fn().mockReturnThis();
  const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const insertMock = vi.fn().mockReturnThis();
  const updateMock = vi.fn().mockReturnThis();
  const rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });

  const fromMock = vi.fn().mockReturnValue({
    select: selectMock,
    eq: eqMock,
    gte: gteMock,
    is: isMock,
    order: orderMock,
    single: singleMock,
    maybeSingle: maybeSingleMock,
    insert: insertMock,
    update: updateMock,
  });

  const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null });
  const removeMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const createSignedUrlMock = vi
    .fn()
    .mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null });

  const storageFromMock = vi.fn().mockReturnValue({
    upload: uploadMock,
    remove: removeMock,
    createSignedUrl: createSignedUrlMock,
  });

  const getUserMock = vi.fn().mockResolvedValue({
    data: { user: { id: 'u0000000-0000-0000-0000-000000000001' } },
    error: null,
  });

  const client = {
    from: fromMock,
    rpc: rpcMock,
    auth: {
      getUser: getUserMock,
    },
    storage: {
      from: storageFromMock,
    },
    // Helper mocks exposed for assertions
    _mocks: {
      fromMock,
      selectMock,
      eqMock,
      gteMock,
      isMock,
      orderMock,
      singleMock,
      maybeSingleMock,
      insertMock,
      updateMock,
      rpcMock,
      uploadMock,
      removeMock,
      createSignedUrlMock,
      getUserMock,
    },
  };

  return client as unknown as SupabaseClient & {
    _mocks: typeof client._mocks;
  };
}

describe('api helpers', () => {
  it('getTodayVisits queries visits table with fieldRepId and today filter', async () => {
    const supabase = createMockSupabaseClient();
    supabase._mocks.orderMock.mockResolvedValue({
      data: [{ id: 'v1', field_rep_id: 'rep1' }],
      error: null,
    });

    const res = await getTodayVisits(supabase, 'rep1');
    expect(res).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith('visits');
    expect(supabase._mocks.eqMock).toHaveBeenCalledWith('field_rep_id', 'rep1');
    expect(supabase._mocks.gteMock).toHaveBeenCalledWith(
      'check_in_at',
      expect.any(String)
    );
  });

  it('getActiveVisit queries unfinished visit via maybeSingle', async () => {
    const supabase = createMockSupabaseClient();
    const mockVisit = { id: 'v1', check_out_at: null };
    supabase._mocks.maybeSingleMock.mockResolvedValue({
      data: mockVisit,
      error: null,
    });

    const res = await getActiveVisit(supabase, 'rep1');
    expect(res).toEqual(mockVisit);
    expect(supabase.from).toHaveBeenCalledWith('visits');
    expect(supabase._mocks.eqMock).toHaveBeenCalledWith('field_rep_id', 'rep1');
    expect(supabase._mocks.isMock).toHaveBeenCalledWith('check_out_at', null);
  });

  it('getCustomersNearby calls rpc with correct parameters (p_lat, p_lng, p_radius_m)', async () => {
    const supabase = createMockSupabaseClient();
    supabase._mocks.rpcMock.mockResolvedValue({
      data: [{ id: 'c1', distance_m: 50 }],
      error: null,
    });

    const res = await getCustomersNearby(supabase, 40.9903, 29.027, 500);
    expect(res).toHaveLength(1);
    expect(supabase.rpc).toHaveBeenCalledWith('get_customers_nearby', {
      p_lat: 40.9903,
      p_lng: 29.027,
      p_radius_m: 500,
    });
  });

  it('createVisit inserts payload without check_in_at or is_geofence_valid', async () => {
    const supabase = createMockSupabaseClient();
    const mockInserted = { id: 'v-created', idempotency_key: 'idemp-1' };
    supabase._mocks.singleMock.mockResolvedValue({
      data: mockInserted,
      error: null,
    });

    const input = {
      customer_id: 'e0000000-0000-0000-0000-000000000001',
      location: { latitude: 40.9903, longitude: 29.027 },
      idempotency_key: 'idemp-1',
    };

    const res = await createVisit(supabase, input);
    expect(res).toEqual(mockInserted);

    const insertedPayload = supabase._mocks.insertMock.mock.calls[0][0];
    expect(insertedPayload).not.toHaveProperty('check_in_at');
    expect(insertedPayload).not.toHaveProperty('is_geofence_valid');
    expect(insertedPayload.customer_id).toBe(input.customer_id);
    expect(insertedPayload.idempotency_key).toBe('idemp-1');
  });

  it('createVisit handles 23505 duplicate error by returning existing visit', async () => {
    const supabase = createMockSupabaseClient();
    const duplicateError = { code: '23505', message: 'duplicate key' };

    // First call to single (insert) fails with 23505
    // Second call to single (select existing) returns existing visit
    const existingVisit = { id: 'v-existing', idempotency_key: 'idemp-dup' };
    supabase._mocks.singleMock
      .mockResolvedValueOnce({ data: null, error: duplicateError })
      .mockResolvedValueOnce({ data: existingVisit, error: null });

    const input = {
      customer_id: 'e0000000-0000-0000-0000-000000000001',
      location: { latitude: 40.9903, longitude: 29.027 },
      idempotency_key: 'idemp-dup',
    };

    const res = await createVisit(supabase, input);
    expect(res).toEqual(existingVisit);
  });

  it('completeVisit updates outcome and location without check_out_at', async () => {
    const supabase = createMockSupabaseClient();
    const updatedVisit = { id: 'v-1', outcome: 'agreed' };
    supabase._mocks.singleMock.mockResolvedValue({
      data: updatedVisit,
      error: null,
    });

    const input = {
      visit_id: 'f0000000-0000-0000-0000-000000000001',
      outcome: 'agreed' as const,
      location: { latitude: 40.9903, longitude: 29.027 },
      notes: 'Tamamlandı',
    };

    const res = await completeVisit(supabase, input);
    expect(res).toEqual(updatedVisit);

    const updatePayload = supabase._mocks.updateMock.mock.calls[0][0];
    expect(updatePayload).not.toHaveProperty('check_out_at');
    expect(updatePayload.outcome).toBe('agreed');
    expect(updatePayload.check_out_location).toBe(
      'SRID=4326;POINT(29.027 40.9903)'
    );
  });

  it('uploadVisitPhoto rolls back storage upload if DB insert fails', async () => {
    const supabase = createMockSupabaseClient();
    const dbErr = { code: '500', message: 'DB Error' };
    supabase._mocks.singleMock.mockResolvedValue({
      data: null,
      error: dbErr,
    });

    const input = {
      visit_id: 'v1',
      data: new Uint8Array([1, 2, 3]),
    };

    await expect(uploadVisitPhoto(supabase, input)).rejects.toEqual(dbErr);
    expect(supabase.storage.from).toHaveBeenCalledWith('visit-photos');
    expect(supabase._mocks.uploadMock).toHaveBeenCalled();
    expect(supabase._mocks.removeMock).toHaveBeenCalled();
  });

  it('getVisitPhotoUrl creates and returns signed URL', async () => {
    const supabase = createMockSupabaseClient();
    const url = await getVisitPhotoUrl(supabase, 'path/to/photo.jpg', 1800);
    expect(url).toBe('https://example.com/signed');
    expect(supabase._mocks.createSignedUrlMock).toHaveBeenCalledWith(
      'path/to/photo.jpg',
      1800
    );
  });
});
