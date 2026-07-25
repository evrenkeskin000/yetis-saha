-- E12 / Migration 10: RLS yardımcı fonksiyonları
-- Politikalar bu fonksiyonlara dayanır. Hepsi stable + security definer + search_path = public.

-- Mevcut current_user_role() korunur (yeniden tanımlanmaz; davranış aynı).

create or replace function public.is_yetis_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.current_user_role() = 'yetis_admin', false) $$;

create or replace function public.auth_user_dealership_id() returns uuid
language sql stable security definer set search_path = public as
$$ select dealership_id from public.users where id = auth.uid() $$;

-- Kullanıcı aktif VE (bayisiz Yetiş Admin VEYA bağlı bayi aktif)
create or replace function public.auth_user_is_active() returns boolean
language sql stable security definer set search_path = public as
$$
  select coalesce(
    (
      select u.is_active
        and (
          u.dealership_id is null
          or exists (
            select 1 from public.dealerships d
            where d.id = u.dealership_id and d.is_active
          )
        )
      from public.users u
      where u.id = auth.uid()
    ),
    false
  )
$$;

revoke all on function public.is_yetis_admin() from public;
revoke all on function public.auth_user_dealership_id() from public;
revoke all on function public.auth_user_is_active() from public;

grant execute on function public.is_yetis_admin() to authenticated;
grant execute on function public.auth_user_dealership_id() to authenticated;
grant execute on function public.auth_user_is_active() to authenticated;

-- current_user_role zaten authenticated'e grant edilmiş olabilir; idempotent hale getir
revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;
