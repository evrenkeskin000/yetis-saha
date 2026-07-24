-- 02: tablolar
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role text not null default 'field_rep' check (role in ('admin','manager','field_rep')),
  avatar_url text,
  is_active boolean not null default true,
  kvkk_consent_at timestamptz,
  kvkk_consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text,
  phone text,
  address text,
  category_id uuid references public.categories(id),
  location geometry(Point, 4326) not null,
  geofence_radius_m int not null default 100 check (geofence_radius_m between 25 and 1000),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique default gen_random_uuid(),
  field_rep_id uuid not null references public.users(id),
  customer_id uuid not null references public.customers(id),
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_location geometry(Point, 4326) not null,
  check_out_location geometry(Point, 4326),
  duration_minutes int generated always as (
    case when check_out_at is null then null
         else greatest(0, round(extract(epoch from (check_out_at - check_in_at)) / 60)::int)
    end
  ) stored,
  outcome text check (outcome in ('agreed','quote_given','decision_maker_absent','not_interested','follow_up_needed','complaint','other')),
  notes text,
  is_geofence_valid boolean,
  is_mock_location boolean not null default false,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  storage_path text not null unique,
  captured_at timestamptz,
  capture_location geometry(Point, 4326),
  created_at timestamptz not null default now()
);

create table public.location_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id),
  location geometry(Point, 4326) not null,
  accuracy_m real,
  speed_kmh real,
  battery_level smallint check (battery_level between 0 and 100),
  is_mock boolean not null default false,
  activity_type text check (activity_type in ('still','walking','driving','unknown')),
  recorded_at timestamptz not null,
  synced_at timestamptz not null default now()
);
