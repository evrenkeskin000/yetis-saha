-- E12 / Migration 12: SECURITY DEFINER sıkılaştırma + Yetiş Admin mutation engeli
-- get_customers_nearby ve validate_check_in_location bayi sınırını atlıyordu; burada kapatılır.

-- =====================================================================
-- 1. get_customers_nearby: bayi filtresi
-- Yetiş Admin tüm aktif esnafları görür; diğerleri yalnızca kendi bayisini.
-- =====================================================================
create or replace function public.get_customers_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1000
) returns table (
  id uuid, business_name text, owner_name text, phone text, address text,
  category_id uuid, geofence_radius_m int, notes text,
  lat double precision, lng double precision, distance_m double precision
) language sql stable security definer set search_path = public as
$$
  select c.id, c.business_name, c.owner_name, c.phone, c.address,
         c.category_id, c.geofence_radius_m, c.notes,
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

-- =====================================================================
-- 2. validate_check_in_location: başka bayinin müşterisi için false
-- Yetiş Admin için bayi kontrolü uygulanmaz (nadiren çağrılır; false değil mesafe sonucu).
-- =====================================================================
create or replace function public.validate_check_in_location(
  p_customer_id uuid, p_location geometry
) returns boolean
language sql stable security definer set search_path = public as
$$
  select coalesce(
    (
      select ST_DWithin(
               c.location::geography,
               p_location::geography,
               c.geofence_radius_m
             )
      from public.customers c
      where c.id = p_customer_id
        and c.is_active
        and (
          public.is_yetis_admin()
          or c.dealership_id = public.auth_user_dealership_id()
        )
    ),
    false
  )
$$;

-- =====================================================================
-- 3. purge_old_location_logs: yalnızca service_role
-- =====================================================================
revoke all on function public.purge_old_location_logs() from public;
revoke all on function public.purge_old_location_logs() from authenticated;
grant execute on function public.purge_old_location_logs() to service_role;

-- =====================================================================
-- 4. Rol + dealership_id değişimini koru
-- prevent_role_escalation: rol VEYA dealership_id değişimi yalnız yetis_admin / service_role
-- =====================================================================
create or replace function public.prevent_role_escalation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (
       new.role is distinct from old.role
       or new.dealership_id is distinct from old.dealership_id
     )
     and public.current_user_role() is distinct from 'yetis_admin'
     and auth.role() is distinct from 'service_role' then
    raise exception 'Rol veya bayi değiştirme yetkisi yalnızca Yetiş Admin kullanıcıdadır';
  end if;
  return new;
end $$;

-- =====================================================================
-- 5. Yetiş Admin ziyaret / konum kaydı değiştiremez (denetim izi koruması)
-- RLS zaten engeller; tetikleyici savunma hattı ve kabul kriteri için.
-- =====================================================================
create or replace function public.prevent_yetis_admin_mutation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_role() = 'yetis_admin'
     and auth.role() is distinct from 'service_role' then
    raise exception 'Yetiş Admin ziyaret ve konum kayıtlarını değiştiremez';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists trg_visits_prevent_yetis_admin on public.visits;
create trigger trg_visits_prevent_yetis_admin
  before update or delete on public.visits
  for each row execute function public.prevent_yetis_admin_mutation();

drop trigger if exists trg_location_logs_prevent_yetis_admin on public.location_logs;
create trigger trg_location_logs_prevent_yetis_admin
  before update or delete on public.location_logs
  for each row execute function public.prevent_yetis_admin_mutation();
