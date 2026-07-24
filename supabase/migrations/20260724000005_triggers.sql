-- 05: trigger'lar
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.visits_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.check_in_at := now();
  new.synced_at := now();
  new.is_geofence_valid := public.validate_check_in_location(new.customer_id, new.check_in_location);
  return new;
end $$;
create trigger trg_visits_before_insert before insert on public.visits
  for each row execute function public.visits_before_insert();

create or replace function public.visits_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.check_out_location is not null and old.check_out_at is null then
    new.check_out_at := now();
  end if;
  new.synced_at := now();
  return new;
end $$;
create trigger trg_visits_before_update before update on public.visits
  for each row execute function public.visits_before_update();

create or replace function public.prevent_role_escalation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and public.current_user_role() is distinct from 'admin'
     and auth.role() is distinct from 'service_role' then
    raise exception 'Rol değiştirme yetkisi yalnızca admin kullanıcıdadır';
  end if;
  return new;
end $$;
create trigger trg_users_prevent_role_escalation before update on public.users
  for each row execute function public.prevent_role_escalation();
