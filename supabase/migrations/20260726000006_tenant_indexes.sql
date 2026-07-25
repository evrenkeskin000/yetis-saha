-- E11 / Migration 6: Tenant bazlı sorgular için indeksler
-- Bayi kapsamlı listeleme (panel, esnaf, rapor, konum) sorguları bu indekslere dayanır.

create index if not exists idx_users_dealership
  on public.users (dealership_id);

create index if not exists idx_customers_dealership
  on public.customers (dealership_id);

create index if not exists idx_visits_dealership_check_in
  on public.visits (dealership_id, check_in_at desc);

create index if not exists idx_location_logs_dealership_recorded
  on public.location_logs (dealership_id, recorded_at desc);
