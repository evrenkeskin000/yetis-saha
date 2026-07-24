-- 04: fonksiyonlar
create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.users where id = auth.uid() $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'field_rep')
  );
  return new;
end $$;

create or replace function public.validate_check_in_location(p_customer_id uuid, p_location geometry)
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(
     (select ST_DWithin(c.location::geography, p_location::geography, c.geofence_radius_m)
      from public.customers c
      where c.id = p_customer_id and c.is_active),
     false) $$;

create or replace function public.get_customers_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1000
) returns table (
  id uuid, business_name text, owner_name text, phone text, address text,
  category_id uuid, geofence_radius_m int, notes text,
  lat double precision, lng double precision, distance_m double precision
) language sql stable security definer set search_path = public as
$$ select c.id, c.business_name, c.owner_name, c.phone, c.address,
          c.category_id, c.geofence_radius_m, c.notes,
          ST_Y(c.location) as lat, ST_X(c.location) as lng,
          ST_Distance(c.location::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distance_m
   from public.customers c
   where c.is_active
     and ST_DWithin(c.location::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
   order by distance_m asc $$;

create or replace function public.purge_old_location_logs() returns void
language sql security definer set search_path = public as
$$ delete from public.location_logs where recorded_at < now() - interval '6 months' $$;
