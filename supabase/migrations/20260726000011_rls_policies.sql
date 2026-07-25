-- E12 / Migration 11: Bayi bazlı RLS politikaları
-- Eski politikalar düşürülür, yenileri kurulur. 20260724000006_rls.sql tarihsel kayıt olarak kalır.

-- =====================================================================
-- RLS etkinleştir (idempotent)
-- =====================================================================
alter table public.dealerships enable row level security;
alter table public.categories enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.visits enable row level security;
alter table public.visit_photos enable row level security;
alter table public.location_logs enable row level security;
alter table public.check_in_attempts enable row level security;

-- =====================================================================
-- Eski politikaları düşür
-- =====================================================================
drop policy if exists "categories_select" on public.categories;
drop policy if exists "categories_admin_all" on public.categories;
drop policy if exists "users_select" on public.users;
drop policy if exists "users_update" on public.users;
drop policy if exists "customers_select" on public.customers;
drop policy if exists "customers_write" on public.customers;
drop policy if exists "visits_select" on public.visits;
drop policy if exists "visits_insert" on public.visits;
drop policy if exists "visits_update" on public.visits;
drop policy if exists "visits_delete" on public.visits;
drop policy if exists "visit_photos_select" on public.visit_photos;
drop policy if exists "visit_photos_insert" on public.visit_photos;
drop policy if exists "visit_photos_delete" on public.visit_photos;
drop policy if exists "location_logs_select" on public.location_logs;
drop policy if exists "location_logs_insert" on public.location_logs;

-- Yeniden çalıştırmada yeni isimler de düşsün
drop policy if exists "dealerships_select" on public.dealerships;
drop policy if exists "dealerships_insert" on public.dealerships;
drop policy if exists "dealerships_update" on public.dealerships;
drop policy if exists "categories_insert" on public.categories;
drop policy if exists "categories_update" on public.categories;
drop policy if exists "categories_delete" on public.categories;
drop policy if exists "customers_insert" on public.customers;
drop policy if exists "customers_update" on public.customers;
drop policy if exists "visit_photos_select" on public.visit_photos;
drop policy if exists "visit_photos_insert" on public.visit_photos;
drop policy if exists "check_in_attempts_select" on public.check_in_attempts;

-- =====================================================================
-- dealerships
-- SELECT: Yetiş Admin tümü; diğerleri yalnızca kendi bayisi
-- INSERT/UPDATE: yalnızca Yetiş Admin
-- DELETE: yok
-- =====================================================================
create policy "dealerships_select" on public.dealerships
  for select to authenticated
  using (
    public.is_yetis_admin()
    or id = public.auth_user_dealership_id()
  );

create policy "dealerships_insert" on public.dealerships
  for insert to authenticated
  with check (public.is_yetis_admin());

create policy "dealerships_update" on public.dealerships
  for update to authenticated
  using (public.is_yetis_admin())
  with check (public.is_yetis_admin());

-- =====================================================================
-- categories (global)
-- SELECT: tüm authenticated
-- yazma: yalnızca Yetiş Admin
-- =====================================================================
create policy "categories_select" on public.categories
  for select to authenticated
  using (true);

create policy "categories_insert" on public.categories
  for insert to authenticated
  with check (public.is_yetis_admin());

create policy "categories_update" on public.categories
  for update to authenticated
  using (public.is_yetis_admin())
  with check (public.is_yetis_admin());

create policy "categories_delete" on public.categories
  for delete to authenticated
  using (public.is_yetis_admin());

-- =====================================================================
-- users
-- SELECT: kendisi | aynı bayideki dealer_admin | Yetiş Admin tümü
-- UPDATE: kendisi | aynı bayideki dealer_admin | Yetiş Admin
-- (rol / dealership_id değişimi tetikleyicilerle korunur)
-- =====================================================================
create policy "users_select" on public.users
  for select to authenticated
  using (
    public.is_yetis_admin()
    or id = auth.uid()
    or (
      public.current_user_role() = 'dealer_admin'
      and dealership_id is not null
      and dealership_id = public.auth_user_dealership_id()
    )
  );

create policy "users_update" on public.users
  for update to authenticated
  using (
    public.is_yetis_admin()
    or id = auth.uid()
    or (
      public.current_user_role() = 'dealer_admin'
      and dealership_id is not null
      and dealership_id = public.auth_user_dealership_id()
    )
  )
  with check (
    public.is_yetis_admin()
    or id = auth.uid()
    or (
      public.current_user_role() = 'dealer_admin'
      and dealership_id is not null
      and dealership_id = public.auth_user_dealership_id()
    )
  );

-- =====================================================================
-- customers
-- SELECT: Yetiş Admin tümü; kendi bayisi (field_rep için ek: is_active)
-- INSERT: aktif kullanıcı, kendi bayisi, created_by = self
-- UPDATE: Yetiş Admin | dealer_admin kendi bayisi | field_rep yalnızca kendi oluşturduğu
-- DELETE: yok
-- =====================================================================
create policy "customers_select" on public.customers
  for select to authenticated
  using (
    public.is_yetis_admin()
    or (
      dealership_id = public.auth_user_dealership_id()
      and (
        public.current_user_role() = 'dealer_admin'
        or is_active = true
      )
    )
  );

create policy "customers_insert" on public.customers
  for insert to authenticated
  with check (
    -- Yetiş Admin herhangi bir bayiye esnaf ekleyebilir (master veri yönetimi)
    public.is_yetis_admin()
    or (
      public.auth_user_is_active()
      and dealership_id = public.auth_user_dealership_id()
      and created_by = auth.uid()
    )
  );

create policy "customers_update" on public.customers
  for update to authenticated
  using (
    public.is_yetis_admin()
    or (
      public.current_user_role() = 'dealer_admin'
      and dealership_id = public.auth_user_dealership_id()
    )
    or (
      public.current_user_role() = 'field_rep'
      and created_by = auth.uid()
      and dealership_id = public.auth_user_dealership_id()
    )
  )
  with check (
    public.is_yetis_admin()
    or (
      public.current_user_role() = 'dealer_admin'
      and dealership_id = public.auth_user_dealership_id()
    )
    or (
      public.current_user_role() = 'field_rep'
      and created_by = auth.uid()
      and dealership_id = public.auth_user_dealership_id()
    )
  );

-- =====================================================================
-- visits
-- SELECT: Yetiş Admin tümü | kendi geçmişi (field_rep_id) | aynı bayideki dealer_admin
-- INSERT: kendi adına, aktif, müşteri kendi bayisinde
-- UPDATE: yalnızca kendi açık ziyareti (check_out_at is null)
-- DELETE: yok
-- =====================================================================
create policy "visits_select" on public.visits
  for select to authenticated
  using (
    public.is_yetis_admin()
    or field_rep_id = auth.uid()
    or (
      public.current_user_role() = 'dealer_admin'
      and dealership_id = public.auth_user_dealership_id()
    )
  );

create policy "visits_insert" on public.visits
  for insert to authenticated
  with check (
    field_rep_id = auth.uid()
    and public.auth_user_is_active()
    and exists (
      select 1 from public.customers c
      where c.id = customer_id
        and c.dealership_id = public.auth_user_dealership_id()
        and c.is_active = true
    )
  );

create policy "visits_update" on public.visits
  for update to authenticated
  using (
    field_rep_id = auth.uid()
    and check_out_at is null
  )
  with check (
    field_rep_id = auth.uid()
  );

-- =====================================================================
-- visit_photos
-- SELECT: ziyaret sahibi | aynı bayideki dealer_admin | Yetiş Admin
-- INSERT: ziyaret sahibi (açık ziyaret) veya aynı bayideki dealer_admin
-- DELETE: yok
-- =====================================================================
create policy "visit_photos_select" on public.visit_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.visits v
      where v.id = visit_photos.visit_id
        and (
          public.is_yetis_admin()
          or v.field_rep_id = auth.uid()
          or (
            public.current_user_role() = 'dealer_admin'
            and v.dealership_id = public.auth_user_dealership_id()
          )
        )
    )
  );

create policy "visit_photos_insert" on public.visit_photos
  for insert to authenticated
  with check (
    public.auth_user_is_active()
    and exists (
      select 1 from public.visits v
      where v.id = visit_id
        and v.field_rep_id = auth.uid()
        and v.check_out_at is null
    )
  );

-- =====================================================================
-- location_logs
-- SELECT: kendisi | aynı bayideki dealer_admin | Yetiş Admin
-- INSERT: kendi adına, aktif, doğru bayi
-- UPDATE/DELETE: yok
-- =====================================================================
create policy "location_logs_select" on public.location_logs
  for select to authenticated
  using (
    public.is_yetis_admin()
    or user_id = auth.uid()
    or (
      public.current_user_role() = 'dealer_admin'
      and dealership_id = public.auth_user_dealership_id()
    )
  );

create policy "location_logs_insert" on public.location_logs
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and dealership_id = public.auth_user_dealership_id()
    and public.auth_user_is_active()
  );

-- =====================================================================
-- check_in_attempts (append-only)
-- SELECT: aynı bayideki dealer_admin | Yetiş Admin
-- INSERT: politika YOK (yalnızca SECURITY DEFINER fonksiyon — E18)
-- UPDATE/DELETE: politika YOK
-- =====================================================================
create policy "check_in_attempts_select" on public.check_in_attempts
  for select to authenticated
  using (
    public.is_yetis_admin()
    or (
      public.current_user_role() = 'dealer_admin'
      and dealership_id = public.auth_user_dealership_id()
    )
  );
