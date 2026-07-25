-- Geofence kuralının kaldırılması
-- Ziyaret başlatmak için esnafa 100 m yakın olma şartı ve buna bağlı tüm
-- DB nesneleri (check_in_attempts, log_check_in_rejection, validate_check_in_location,
-- visits.is_geofence_valid, customers.geofence_radius_m) kaldırılır.
-- Check-in konumu (visits.check_in_location) ve sahte konum tespiti korunur.

-- ---------------------------------------------------------------------------
-- 1) log_check_in_rejection RPC'sini düşür
-- ---------------------------------------------------------------------------
drop function if exists public.log_check_in_rejection(uuid, uuid, geometry, double precision, boolean, text);

-- ---------------------------------------------------------------------------
-- 2) check_in_attempts tablosunu düşür (RLS politikası ve indeksler birlikte)
-- ---------------------------------------------------------------------------
drop table if exists public.check_in_attempts cascade;

-- ---------------------------------------------------------------------------
-- 3) validate_check_in_location artık kullanılmıyor
-- ---------------------------------------------------------------------------
drop function if exists public.validate_check_in_location(uuid, geometry);

-- ---------------------------------------------------------------------------
-- 4) visits_before_insert — geofence kontrolü olmadan
--    Kalan kurallar: bayi eşleşmesi, pasif esnaf, snapshot/alan doldurma.
-- ---------------------------------------------------------------------------
create or replace function public.visits_before_insert() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_dealership_id uuid;
  v_customer public.customers%rowtype;
begin
  select dealership_id into v_rep_dealership_id
  from public.users
  where id = new.field_rep_id;

  select * into v_customer
  from public.customers
  where id = new.customer_id;

  if not found then
    raise exception 'Esnaf bulunamadı';
  end if;

  if coalesce(v_customer.is_active, false) is not true then
    raise exception 'Pasif esnafa ziyaret başlatılamaz';
  end if;

  if v_rep_dealership_id is distinct from v_customer.dealership_id then
    raise exception 'Esnaf başka bir bayie ait; ziyaret başlatılamaz';
  end if;

  new.dealership_id := coalesce(new.dealership_id, v_rep_dealership_id, v_customer.dealership_id);
  new.customer_snapshot := coalesce(
    new.customer_snapshot,
    jsonb_build_object(
      'business_name', v_customer.business_name,
      'address', v_customer.address,
      'category_id', v_customer.category_id
    )
  );
  new.check_in_at := now();
  new.synced_at := now();
  new.cancelled_at := null;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) visits_before_update — is_geofence_valid koruması kaldırıldı
-- ---------------------------------------------------------------------------
create or replace function public.visits_before_update() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.check_out_at is not null then
    raise exception 'Kapanmış ziyaret güncellenemez';
  end if;

  -- Değişmez alanları koru
  new.check_in_at := old.check_in_at;
  new.check_in_location := old.check_in_location;
  new.dealership_id := old.dealership_id;
  new.customer_snapshot := old.customer_snapshot;
  new.field_rep_id := old.field_rep_id;
  new.idempotency_key := old.idempotency_key;
  new.customer_id := old.customer_id;

  -- is_mock_location yalnızca false → true olabilir
  if old.is_mock_location then
    new.is_mock_location := true;
  end if;

  -- İptal: cancelled_at set edilmişse kapat
  if new.cancelled_at is not null and old.cancelled_at is null then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.check_out_at := coalesce(new.check_out_at, now());
  -- Normal check-out: outcome doluysa konum olsun/olmasın kapat (K-04)
  elsif new.outcome is not null and old.check_out_at is null then
    new.check_out_at := now();
  end if;

  new.synced_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) get_customers_nearby — geofence_radius_m olmadan yeni dönüş tipi
--    (Dönüş tipi değiştiği için önce drop gerekir.)
-- ---------------------------------------------------------------------------
drop function if exists public.get_customers_nearby(double precision, double precision, int);

create function public.get_customers_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1000
) returns table (
  id uuid, business_name text, owner_name text, phone text, address text,
  category_id uuid, notes text,
  lat double precision, lng double precision, distance_m double precision
) language sql stable security definer set search_path = public as
$$
  select c.id, c.business_name, c.owner_name, c.phone, c.address,
         c.category_id, c.notes,
         ST_Y(c.location) as lat, ST_X(c.location) as lng,
         ST_Distance(
           c.location::geography,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
         ) as distance_m
  from public.customers c
  where c.is_active
    and (
      public.is_yetis_admin()
      or c.dealership_id = public.auth_user_dealership_id()
    )
    and ST_DWithin(
      c.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  order by distance_m asc
$$;

revoke all on function public.get_customers_nearby(double precision, double precision, int) from public;
grant execute on function public.get_customers_nearby(double precision, double precision, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Kolonları düşür
-- ---------------------------------------------------------------------------
alter table public.visits drop column if exists is_geofence_valid;
alter table public.customers drop column if exists geofence_radius_m;
