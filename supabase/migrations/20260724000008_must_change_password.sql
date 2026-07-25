-- 08: zorunlu şifre değişimi bayrağı

alter table public.users
  add column must_change_password boolean not null default false;

-- handle_new_user: metadata'dan must_change_password oku
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role, must_change_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'field_rep'),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  return new;
end $$;

-- Kullanıcı kendi satırında bayrağı false'a çekemez; yalnızca admin / service_role
create or replace function public.prevent_must_change_bypass() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.must_change_password is true
     and new.must_change_password is false
     and public.current_user_role() is distinct from 'admin'
     and auth.role() is distinct from 'service_role'
     and current_setting('app.clearing_must_change', true) is distinct from 'true' then
    raise exception 'Şifre değiştirme zorunluluğu yalnızca yetkili işlemle kaldırılabilir';
  end if;
  return new;
end $$;

create trigger trg_users_prevent_must_change_bypass before update on public.users
  for each row execute function public.prevent_must_change_bypass();

-- Mobil / istemci: şifre değiştirildikten sonra bayrağı temizlemek için güvenlik definer RPC
create or replace function public.complete_password_change() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  perform set_config('app.clearing_must_change', 'true', true);

  update public.users
  set must_change_password = false,
      updated_at = now()
  where id = auth.uid()
    and must_change_password = true;
end $$;

revoke all on function public.complete_password_change() from public;
grant execute on function public.complete_password_change() to authenticated;
