import type { UserRole, VisitOutcome } from './types';

export const APP_NAME = 'Saha';

export const ROLES = ['admin', 'manager', 'field_rep'] as const;
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Yönetici',
  manager: 'Ekip Lideri',
  field_rep: 'Saha Temsilcisi',
};

export const OUTCOMES = [
  'agreed',
  'quote_given',
  'decision_maker_absent',
  'not_interested',
  'follow_up_needed',
  'complaint',
  'other',
] as const;

export const OUTCOME_LABELS: Record<VisitOutcome, string> = {
  agreed: 'Anlaşma Sağlandı',
  quote_given: 'Teklif Verildi',
  decision_maker_absent: 'Karar Verici Yerinde Yok',
  not_interested: 'İlgilenmedi',
  follow_up_needed: 'Tekrar Uğranacak',
  complaint: 'Şikayet İletti',
  other: 'Diğer',
};

export const OUTCOME_COLORS: Record<VisitOutcome, string> = {
  agreed: '#16a34a',
  quote_given: '#2563eb',
  decision_maker_absent: '#d97706',
  not_interested: '#dc2626',
  follow_up_needed: '#7c3aed',
  complaint: '#ea580c',
  other: '#64748b',
};

export const DEFAULT_GEOFENCE_RADIUS_M = 100;
export const GEOFENCE_MIN_RADIUS_M = 25;
export const GEOFENCE_MAX_RADIUS_M = 1000;

export const VISIT_PHOTOS_BUCKET = 'visit-photos';
export const PHOTO_TARGET_SIZE_KB = 200;

export const LOCATION_LOG_RETENTION_MONTHS = 6;
export const KVKK_CONSENT_VERSION = 'v1.0';
