-- E11 / Migration 4: Üç rollü modele geçiş ve rol/güvenlik fonksiyonlarının güncellenmesi
-- Sıra önemlidir: yeni rol değerleri eski CHECK kısıtını ihlal edeceği için önce kısıt DÜŞÜRÜLÜR,
-- sonra roller taşınır, en son yeni kısıt eklenir.
-- prevent_role_escalation tetikleyicisi hâlâ eski 'admin' kontrolünü taşıdığı için
-- rol UPDATE'lerinden önce geçici olarak kapatılır (remote db push'ta JWT yoktur).

-- 0. Rol dönüşümünü engelleyen eski tetikleyiciyi geçici kapat
alter table public.users disable trigger trg_users_prevent_role_escalation;

-- 1. Eski CHECK kısıtını kaldır (aksi halde 'yetis_admin' güncellemesi ihlal eder)
alter table public.users drop constraint if exists users_role_check;

-- 2. Rol dönüşümü
update public.users set role = 'yetis_admin'  where role = 'admin';
update public.users set role = 'dealer_admin' where role = 'manager';

-- 3. Üç rollü yeni CHECK kısıtını ekle
alter table public.users
  add constraint users_role_check check (role in ('yetis_admin', 'dealer_admin', 'field_rep'));

-- 4. handle_new_user: rolü ARTIK metadata'dan OKUMA (privilege escalation bulgusu K-01).
--    Yeni kullanıcı her zaman field_rep olarak açılır; rol ataması yalnızca service-role ile yapılır.
--    must_change_password bayrağı metadata'dan okunmaya devam eder.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role, must_change_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'field_rep',
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  return new;
end $$;

-- 5. prevent_role_escalation: yetkili rol artık 'yetis_admin'
create or replace function public.prevent_role_escalation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and public.current_user_role() is distinct from 'yetis_admin'
     and auth.role() is distinct from 'service_role' then
    raise exception 'Rol değiştirme yetkisi yalnızca Yetiş Admin kullanıcıdadır';
  end if;
  return new;
end $$;

-- 6. prevent_must_change_bypass: yetkili rol artık 'yetis_admin'
create or replace function public.prevent_must_change_bypass() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.must_change_password is true
     and new.must_change_password is false
     and public.current_user_role() is distinct from 'yetis_admin'
     and auth.role() is distinct from 'service_role'
     and current_setting('app.clearing_must_change', true) is distinct from 'true' then
    raise exception 'Şifre değiştirme zorunluluğu yalnızca yetkili işlemle kaldırılabilir';
  end if;
  return new;
end $$;

-- 7. visits_before_insert: bayi kimliğini ve esnaf snapshot'ını doldur.
--    Bu epicte yalnızca ALAN DOLDURMA yapılır; sert geofence reddi ve reddedilen deneme
--    kaydı E18'de eklenir (is_geofence_valid davranışı Faz 1'deki gibi korunur).
create or replace function public.visits_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rep_dealership_id uuid;
  v_customer public.customers%rowtype;
begin
  select dealership_id into v_rep_dealership_id from public.users where id = new.field_rep_id;
  select * into v_customer from public.customers where id = new.customer_id;

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
  new.is_geofence_valid := public.validate_check_in_location(new.customer_id, new.check_in_location);
  return new;
end $$;

-- 8. Tetikleyiciyi yeniden aç (yeni fonksiyon tanımıyla)
alter table public.users enable trigger trg_users_prevent_role_escalation;
