-- Vardiya durumu: panel "Sahadaki Temsilciler" sayısını anında güncellemek için
alter table public.users
  add column if not exists shift_started_at timestamptz;

comment on column public.users.shift_started_at is
  'Aktif vardiya başlangıcı; null = vardiya kapalı. Saha temsilcisi kendi satırını günceller.';

create index if not exists idx_users_shift_active
  on public.users (dealership_id)
  where shift_started_at is not null;
