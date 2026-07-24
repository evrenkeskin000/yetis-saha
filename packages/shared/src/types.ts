export type UserRole = 'admin' | 'manager' | 'field_rep';
export type VisitOutcome =
  | 'agreed'
  | 'quote_given'
  | 'decision_maker_absent'
  | 'not_interested'
  | 'follow_up_needed'
  | 'complaint'
  | 'other';
export type ActivityType = 'still' | 'walking' | 'driving' | 'unknown';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  kvkk_consent_at: string | null;
  kvkk_consent_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  address: string | null;
  category_id: string | null;
  location: GeoPoint;
  geofence_radius_m: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Visit {
  id: string;
  idempotency_key: string;
  field_rep_id: string;
  customer_id: string;
  check_in_at: string;
  check_out_at: string | null;
  check_in_location: GeoPoint;
  check_out_location: GeoPoint | null;
  duration_minutes: number | null;
  outcome: VisitOutcome | null;
  notes: string | null;
  is_geofence_valid: boolean | null;
  is_mock_location: boolean;
  synced_at: string;
  created_at: string;
}

export interface VisitPhoto {
  id: string;
  visit_id: string;
  storage_path: string;
  captured_at: string | null;
  capture_location: GeoPoint | null;
  created_at: string;
}

export interface LocationLog {
  id: number;
  user_id: string;
  location: GeoPoint;
  accuracy_m: number | null;
  speed_kmh: number | null;
  battery_level: number | null;
  is_mock: boolean;
  activity_type: ActivityType | null;
  recorded_at: string;
  synced_at: string;
}

export interface NearbyCustomer {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  address: string | null;
  category_id: string | null;
  geofence_radius_m: number;
  notes: string | null;
  lat: number;
  lng: number;
  distance_m: number;
}

export interface VisitWithCustomer
  extends Omit<Visit, 'check_in_location' | 'check_out_location'> {
  customer: Pick<
    Customer,
    'id' | 'business_name' | 'address' | 'category_id'
  > | null;
}

export interface CreateVisitInput {
  customer_id: string;
  location: GeoPoint;
  is_mock_location?: boolean;
  notes?: string;
  idempotency_key?: string;
}

export interface CompleteVisitInput {
  visit_id: string;
  outcome: VisitOutcome;
  location: GeoPoint;
  notes?: string;
  is_mock_location?: boolean;
}

export interface UploadVisitPhotoInput {
  visit_id: string;
  data: ArrayBuffer | Uint8Array;
  content_type?: string;
  captured_at?: string;
  location?: GeoPoint;
  file_ext?: string;
}
