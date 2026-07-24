-- 06: RLS (Row Level Security)

alter table public.categories enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.visits enable row level security;
alter table public.visit_photos enable row level security;
alter table public.location_logs enable row level security;

-- categories
create policy "categories_select" on public.categories
  for select to authenticated using (true);

create policy "categories_admin_all" on public.categories
  for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- users
create policy "users_select" on public.users
  for select to authenticated
  using (auth.uid() = id or public.current_user_role() in ('admin', 'manager'));

create policy "users_update" on public.users
  for update to authenticated
  using (auth.uid() = id or public.current_user_role() = 'admin')
  with check (auth.uid() = id or public.current_user_role() = 'admin');

-- customers
create policy "customers_select" on public.customers
  for select to authenticated
  using (
    case
      when public.current_user_role() in ('admin', 'manager') then true
      else is_active = true
    end
  );

create policy "customers_write" on public.customers
  for all to authenticated
  using (public.current_user_role() in ('admin', 'manager'))
  with check (public.current_user_role() in ('admin', 'manager'));

-- visits
create policy "visits_select" on public.visits
  for select to authenticated
  using (field_rep_id = auth.uid() or public.current_user_role() in ('admin', 'manager'));

create policy "visits_insert" on public.visits
  for insert to authenticated
  with check (field_rep_id = auth.uid());

create policy "visits_update" on public.visits
  for update to authenticated
  using (field_rep_id = auth.uid() or public.current_user_role() in ('admin', 'manager'))
  with check (field_rep_id = auth.uid() or public.current_user_role() in ('admin', 'manager'));

create policy "visits_delete" on public.visits
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- visit_photos
create policy "visit_photos_select" on public.visit_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.visits v
      where v.id = visit_photos.visit_id
        and (v.field_rep_id = auth.uid() or public.current_user_role() in ('admin', 'manager'))
    )
  );

create policy "visit_photos_insert" on public.visit_photos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.visits v
      where v.id = visit_photos.visit_id
        and (v.field_rep_id = auth.uid() or public.current_user_role() in ('admin', 'manager'))
    )
  );

create policy "visit_photos_delete" on public.visit_photos
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- location_logs
create policy "location_logs_select" on public.location_logs
  for select to authenticated
  using (user_id = auth.uid() or public.current_user_role() in ('admin', 'manager'));

create policy "location_logs_insert" on public.location_logs
  for insert to authenticated
  with check (user_id = auth.uid());
