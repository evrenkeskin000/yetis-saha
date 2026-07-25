import { describe, expect, it } from 'vitest';
import {
  calculateExceptions,
  calculateKpis,
  getRangeDates,
} from '../report';
import type { Customer, User, Visit } from '@saha/shared';

const fixedNow = new Date('2026-07-15T12:00:00.000Z');

function visit(partial: Partial<Visit>): Visit {
  return {
    id: 'v1',
    idempotency_key: 'k1',
    field_rep_id: 'r1',
    customer_id: 'c1',
    dealership_id: 'd1',
    customer_snapshot: { business_name: 'Bakkal', address: null, category_id: null },
    check_in_at: '2026-07-15T10:00:00.000Z',
    check_out_at: '2026-07-15T10:30:00.000Z',
    check_in_location: { latitude: 41, longitude: 29 },
    check_out_location: null,
    duration_minutes: 30,
    outcome: 'agreed',
    notes: null,
    is_mock_location: false,
    cancelled_at: null,
    synced_at: '2026-07-15T10:30:00.000Z',
    created_at: '2026-07-15T10:00:00.000Z',
    ...partial,
  };
}

describe('getRangeDates', () => {
  it('returns today range starting at local midnight', () => {
    const r = getRangeDates('today', fixedNow);
    expect(r.numDays).toBe(1);
    expect(r.endISO).toBe(fixedNow.toISOString());
    expect(new Date(r.startISO).getHours()).toBe(0);
  });

  it('returns month range from first day of month', () => {
    const r = getRangeDates('month', fixedNow);
    const start = new Date(r.startISO);
    expect(start.getDate()).toBe(1);
    expect(r.numDays).toBeGreaterThanOrEqual(1);
  });
});

describe('calculateKpis', () => {
  it('counts visits and agreed outcomes', () => {
    const visits = [
      visit({ outcome: 'agreed' }),
      visit({ id: 'v2', outcome: 'not_interested', customer_id: 'c2' }),
    ];
    const reps = [{ id: 'r1' } as User];
    const customers = [{ id: 'c1' } as Customer, { id: 'c2' } as Customer];
    const kpi = calculateKpis(visits, reps, customers, 'today');
    expect(kpi.totalVisits).toBe(2);
    expect(kpi.agreedVisits).toBe(1);
    expect(kpi.distinctVisitedCustomers).toBe(2);
  });
});

describe('calculateExceptions', () => {
  it('flags short and mock visits', () => {
    const visits = [
      visit({
        id: 'short',
        duration_minutes: 2,
        outcome: 'other',
      }),
      visit({
        id: 'mock',
        is_mock_location: true,
      }),
    ];
    const rows = calculateExceptions(
      visits,
      new Map([['r1', { full_name: 'Ali' }]]),
      new Map([['c1', { business_name: 'Esnaf' }]])
    );
    expect(rows).toHaveLength(2);
    expect(rows.flatMap((r) => r.badges)).toEqual(
      expect.arrayContaining(['Kısa Ziyaret', 'Sahte Konum'])
    );
  });
});
