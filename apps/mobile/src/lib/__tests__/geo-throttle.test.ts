import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../geo';
import {
  classifyActivity,
  shouldAcceptLocation,
} from '../locationThrottle';

describe('haversineMeters', () => {
  it('returns ~0 for identical points', () => {
    const p = { latitude: 41, longitude: 29 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('returns ~1km for points ~1km apart', () => {
    const a = { latitude: 41.0, longitude: 29.0 };
    const b = { latitude: 41.01, longitude: 29.0 };
    expect(haversineMeters(a, b)).toBeGreaterThan(1000);
  });
});

describe('locationThrottle', () => {
  it('classifies still / walking / driving by speed', () => {
    expect(classifyActivity(0)).toBe('still');
    expect(classifyActivity(5)).toBe('walking');
    expect(classifyActivity(20)).toBe('driving');
  });

  it('rejects still points that are both too close and too soon', () => {
    const last = { latitude: 41, longitude: 29, timestamp: 1_000_000 };
    expect(
      shouldAcceptLocation(41.00005, 29, 1_000_000 + 10_000, 'still', last)
    ).toBe(false);
  });

  it('accepts a still point in place once the time threshold passes', () => {
    const last = { latitude: 41, longitude: 29, timestamp: 1_000_000 };
    expect(
      shouldAcceptLocation(41, 29, 1_000_000 + 61_000, 'still', last)
    ).toBe(true);
  });

  it('accepts first location always', () => {
    expect(shouldAcceptLocation(41, 29, 1, 'walking', null)).toBe(true);
  });
});
