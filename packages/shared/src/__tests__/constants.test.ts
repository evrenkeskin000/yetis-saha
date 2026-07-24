import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEOFENCE_RADIUS_M,
  GEOFENCE_MAX_RADIUS_M,
  GEOFENCE_MIN_RADIUS_M,
  KVKK_CONSENT_VERSION,
  LOCATION_LOG_RETENTION_MONTHS,
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  OUTCOMES,
  PHOTO_TARGET_SIZE_KB,
  ROLE_LABELS,
  ROLES,
  VISIT_PHOTOS_BUCKET,
} from '../constants';

describe('constants', () => {
  it('should define all user roles and matching labels', () => {
    expect(ROLES).toEqual(['admin', 'manager', 'field_rep']);
    ROLES.forEach((role) => {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe('string');
    });
  });

  it('should define all 7 visit outcomes with labels and colors', () => {
    expect(OUTCOMES).toHaveLength(7);
    OUTCOMES.forEach((outcome) => {
      expect(OUTCOME_LABELS[outcome]).toBeDefined();
      expect(OUTCOME_COLORS[outcome]).toBeDefined();
      expect(OUTCOME_COLORS[outcome]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('should have valid geofence bounds', () => {
    expect(DEFAULT_GEOFENCE_RADIUS_M).toBe(100);
    expect(GEOFENCE_MIN_RADIUS_M).toBe(25);
    expect(GEOFENCE_MAX_RADIUS_M).toBe(1000);
    expect(GEOFENCE_MIN_RADIUS_M).toBeLessThan(DEFAULT_GEOFENCE_RADIUS_M);
    expect(DEFAULT_GEOFENCE_RADIUS_M).toBeLessThan(GEOFENCE_MAX_RADIUS_M);
  });

  it('should define storage and retention constants', () => {
    expect(VISIT_PHOTOS_BUCKET).toBe('visit-photos');
    expect(PHOTO_TARGET_SIZE_KB).toBe(200);
    expect(LOCATION_LOG_RETENTION_MONTHS).toBe(6);
    expect(KVKK_CONSENT_VERSION).toBe('v1.0');
  });
});
