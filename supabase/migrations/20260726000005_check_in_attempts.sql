-- E11 / Migration 5: Reddedilen check-in denemeleri için append-only denetim tablosu
-- Bu epicte yalnızca TABLO ve indeksler oluşturulur. Yazma yolu (log_check_in_rejection)
-- ve RLS politikaları E18 / E12'de eklenir.

create table if not exists public.check_in_attempts (
  id bigint generated always as identity primary key,
  field_rep_id uuid not null references public.users(id),
  customer_id uuid not null references public.customers(id),
  dealership_id uuid references public.dealerships(id),
  attempt_location geometry(Point, 4326) not null,
  distance_m double precision not null,
  is_mock_location boolean not null default false,
  rejection_reason text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_check_in_attempts_dealership
  on public.check_in_attempts (dealership_id, attempted_at desc);

create index if not exists idx_check_in_attempts_field_rep
  on public.check_in_attempts (field_rep_id, attempted_at desc);
