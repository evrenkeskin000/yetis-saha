import { describe, expect, it } from 'vitest';
import {
  ALL_DEALERSHIPS,
  DEFAULT_DEALERSHIP_CODE,
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
    expect(ROLES).toEqual(['yetis_admin', 'dealer_admin', 'field_rep']);
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

  it('should define dealership, storage and retention constants', () => {
    expect(DEFAULT_DEALERSHIP_CODE).toBe('YETIS-MERKEZ');
    expect(ALL_DEALERSHIPS).toBe('all');
    expect(VISIT_PHOTOS_BUCKET).toBe('visit-photos');
    expect(PHOTO_TARGET_SIZE_KB).toBe(200);
    expect(LOCATION_LOG_RETENTION_MONTHS).toBe(6);
    expect(KVKK_CONSENT_VERSION).toBe('v1.0');
  });
});
