-- 03: indexler
create index customers_location_gist on public.customers using gist (location);
create index visits_check_in_location_gist on public.visits using gist (check_in_location);
create index location_logs_location_gist on public.location_logs using gist (location);
create index location_logs_user_time_idx on public.location_logs (user_id, recorded_at desc);
create index visits_rep_time_idx on public.visits (field_rep_id, check_in_at desc);
create index customers_category_idx on public.customers (category_id);
