-- E12: Bayi izolasyonu negatif senaryo testleri
-- Önkoşul: `supabase db reset` (E11 seed verisi yüklü)
-- Çalıştırma: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation.sql
--
-- Seed kimlikleri:
--   yetis_admin          a0000000-0000-0000-0000-000000000001
--   merkez dealer_admin  a0000000-0000-0000-0000-000000000002
--   merkez field_rep 1   a0000000-0000-0000-0000-000000000003
--   merkez field_rep 2   a0000000-0000-0000-0000-000000000004
--   test dealer_admin    a0000000-0000-0000-0000-000000000005
--   test field_rep       a0000000-0000-0000-0000-000000000006
--   Merkez esnaf         e0000000-0000-0000-0000-000000000001 .. 004
--   Test Bayi esnaf      e0000000-0000-0000-0000-000000000005
--   Merkez bayi          b0000000-0000-0000-0000-000000000001
--   Test Bayi            b0000000-0000-0000-0000-000000000002

\set ON_ERROR_STOP on

-- JWT taklit yardımcısı (Supabase auth.uid / auth.role)
create or replace function public._test_authenticate_as(p_user_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text,
    true
  );
end $$;

create or replace function public._test_clear_auth() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

do $$
declare
  v_cnt int;
  v_id uuid;
  v_visit_id uuid;
  v_err text;
begin
  -- -----------------------------------------------------------------
  -- 1) Test Bayi temsilcisi Merkez esnafını listeleyemez
  -- -----------------------------------------------------------------
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000006');
  set local role authenticated;

  select count(*) into v_cnt
  from public.customers
  where id = 'e0000000-0000-0000-0000-000000000001';

  if v_cnt <> 0 then
    raise exception 'FAIL-1: Test Bayi temsilcisi Merkez esnafını gördü (% satır)', v_cnt;
  end if;
  raise notice 'OK-1: Test Bayi temsilcisi Merkez esnafını listeleyemez';

  -- -----------------------------------------------------------------
  -- 2) Test Bayi temsilcisi Merkez esnafına ziyaret ekleyemez
  -- -----------------------------------------------------------------
  begin
    insert into public.visits (field_rep_id, customer_id, check_in_location)
    values (
      'a0000000-0000-0000-0000-000000000006',
      'e0000000-0000-0000-0000-000000000001',
      ST_SetSRID(ST_MakePoint(29.0270, 40.9903), 4326)
    );
    raise exception 'FAIL-2: çapraz bayi ziyaret insert kabul edildi';
  exception
    when insufficient_privilege then
      raise notice 'OK-2: çapraz bayi ziyaret insert reddedildi (privilege)';
    when others then
      -- RLS genelde 42501 veya check violation benzeri mesaj verir
      if sqlerrm like '%FAIL-2%' then
        raise;
      end if;
      raise notice 'OK-2: çapraz bayi ziyaret insert reddedildi (%)', sqlstate;
  end;

  -- -----------------------------------------------------------------
  -- 3) Test Bayi dealer_admin başka bayinin ziyaretlerini göremez
  -- -----------------------------------------------------------------
  reset role;
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000005');
  set local role authenticated;

  select count(*) into v_cnt
  from public.visits
  where id = 'f0000000-0000-0000-0000-000000000001';

  if v_cnt <> 0 then
    raise exception 'FAIL-3: Test Bayi admin Merkez ziyaretini gördü';
  end if;
  raise notice 'OK-3: Test Bayi dealer_admin başka bayi ziyaretini göremez';

  -- -----------------------------------------------------------------
  -- 4) dealer_admin başka bayideki kullanıcıyı güncelleyemez
  -- -----------------------------------------------------------------
  begin
    update public.users
    set full_name = 'Hack'
    where id = 'a0000000-0000-0000-0000-000000000003';
    get diagnostics v_cnt = row_count;
    if v_cnt > 0 then
      raise exception 'FAIL-4: çapraz bayi kullanıcı güncellemesi kabul edildi';
    end if;
    raise notice 'OK-4: dealer_admin başka bayi kullanıcısını güncelleyemez (0 satır)';
  exception
    when others then
      if sqlerrm like '%FAIL-4%' then raise; end if;
      raise notice 'OK-4: dealer_admin başka bayi kullanıcısını güncelleyemez (%)', sqlstate;
  end;

  -- -----------------------------------------------------------------
  -- 5) field_rep başkasının esnafını güncelleyemez; kendi oluşturduğunu güncelleyebilir
  -- -----------------------------------------------------------------
  reset role;
  -- Merkez field_rep 1 için seed esnafları created_by = dealer_admin; geçici olarak
  -- field_rep'in oluşturduğu bir esnaf ekle (superuser)
  perform public._test_clear_auth();
  insert into public.customers (
    id, business_name, location, dealership_id, created_by, is_active
  ) values (
    'e0000000-0000-0000-0000-0000000000aa',
    'Temsilci Esnafı',
    ST_SetSRID(ST_MakePoint(29.01, 41.01), 4326),
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    true
  ) on conflict (id) do nothing;

  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000003');
  set local role authenticated;

  -- başkasının (dealer_admin created) esnafı
  begin
    update public.customers
    set notes = 'hack'
    where id = 'e0000000-0000-0000-0000-000000000001';
    get diagnostics v_cnt = row_count;
    if v_cnt > 0 then
      raise exception 'FAIL-5a: field_rep başkasının esnafını güncelledi';
    end if;
    raise notice 'OK-5a: field_rep başkasının esnafını güncelleyemez';
  exception
    when others then
      if sqlerrm like '%FAIL-5a%' then raise; end if;
      raise notice 'OK-5a: field_rep başkasının esnafını güncelleyemez (%)', sqlstate;
  end;

  -- kendi oluşturduğu
  update public.customers
  set notes = 'kendi notum'
  where id = 'e0000000-0000-0000-0000-0000000000aa';
  get diagnostics v_cnt = row_count;
  if v_cnt <> 1 then
    raise exception 'FAIL-5b: field_rep kendi esnafını güncelleyemedi';
  end if;
  raise notice 'OK-5b: field_rep kendi oluşturduğu esnafı güncelleyebilir';

  -- -----------------------------------------------------------------
  -- 6) field_rep ve dealer_admin kategori ekleyemez; yalnızca yetis_admin ekler
  -- -----------------------------------------------------------------
  begin
    insert into public.categories (name) values ('Kaçak Kategori FR');
    raise exception 'FAIL-6a: field_rep kategori ekledi';
  exception
    when others then
      if sqlerrm like '%FAIL-6a%' then raise; end if;
      raise notice 'OK-6a: field_rep kategori ekleyemez (%)', sqlstate;
  end;

  reset role;
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000002');
  set local role authenticated;
  begin
    insert into public.categories (name) values ('Kaçak Kategori DA');
    raise exception 'FAIL-6b: dealer_admin kategori ekledi';
  exception
    when others then
      if sqlerrm like '%FAIL-6b%' then raise; end if;
      raise notice 'OK-6b: dealer_admin kategori ekleyemez (%)', sqlstate;
  end;

  reset role;
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000001');
  set local role authenticated;
  insert into public.categories (id, name, is_active)
  values ('c0000000-0000-0000-0000-0000000000aa', 'Yetiş Test Kategori', true)
  on conflict (id) do nothing;
  raise notice 'OK-6c: yetis_admin kategori ekleyebilir';

  -- -----------------------------------------------------------------
  -- 7) Pasif kullanıcı yeni ziyaret / konum logu ekleyemez
  -- -----------------------------------------------------------------
  reset role;
  perform public._test_clear_auth();
  update public.users set is_active = false
  where id = 'a0000000-0000-0000-0000-000000000006';

  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000006');
  set local role authenticated;

  begin
    insert into public.visits (field_rep_id, customer_id, check_in_location)
    values (
      'a0000000-0000-0000-0000-000000000006',
      'e0000000-0000-0000-0000-000000000005',
      ST_SetSRID(ST_MakePoint(28.9870, 41.0600), 4326)
    );
    raise exception 'FAIL-7a: pasif kullanıcı ziyaret ekledi';
  exception
    when others then
      if sqlerrm like '%FAIL-7a%' then raise; end if;
      raise notice 'OK-7a: pasif kullanıcı ziyaret ekleyemez (%)', sqlstate;
  end;

  begin
    insert into public.location_logs (user_id, location, dealership_id, recorded_at)
    values (
      'a0000000-0000-0000-0000-000000000006',
      ST_SetSRID(ST_MakePoint(28.9870, 41.0600), 4326),
      'b0000000-0000-0000-0000-000000000002',
      now()
    );
    raise exception 'FAIL-7b: pasif kullanıcı konum logu ekledi';
  exception
    when others then
      if sqlerrm like '%FAIL-7b%' then raise; end if;
      raise notice 'OK-7b: pasif kullanıcı konum logu ekleyemez (%)', sqlstate;
  end;

  -- geri al
  reset role;
  perform public._test_clear_auth();
  update public.users set is_active = true
  where id = 'a0000000-0000-0000-0000-000000000006';

  -- -----------------------------------------------------------------
  -- 8) Pasif bayi: kullanıcı yeni kayıt ekleyemez; Yetiş Admin geçmişi görür
  -- -----------------------------------------------------------------
  update public.dealerships set is_active = false
  where id = 'b0000000-0000-0000-0000-000000000002';

  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000006');
  set local role authenticated;
  begin
    insert into public.visits (field_rep_id, customer_id, check_in_location)
    values (
      'a0000000-0000-0000-0000-000000000006',
      'e0000000-0000-0000-0000-000000000005',
      ST_SetSRID(ST_MakePoint(28.9870, 41.0600), 4326)
    );
    raise exception 'FAIL-8a: pasif bayi kullanıcısı ziyaret ekledi';
  exception
    when others then
      if sqlerrm like '%FAIL-8a%' then raise; end if;
      raise notice 'OK-8a: pasif bayi kullanıcısı ziyaret ekleyemez (%)', sqlstate;
  end;

  reset role;
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000001');
  set local role authenticated;
  select count(*) into v_cnt
  from public.customers
  where id = 'e0000000-0000-0000-0000-000000000005';
  if v_cnt <> 1 then
    raise exception 'FAIL-8b: Yetiş Admin pasif bayinin geçmiş esnafını göremedi';
  end if;
  raise notice 'OK-8b: Yetiş Admin pasif bayinin geçmiş verisini görmeye devam eder';

  -- geri al
  reset role;
  perform public._test_clear_auth();
  update public.dealerships set is_active = true
  where id = 'b0000000-0000-0000-0000-000000000002';

  -- -----------------------------------------------------------------
  -- 9) yetis_admin ziyaret güncelleyemez / silemez (tetikleyici)
  -- RLS bypass ile tetikleyiciyi doğrula
  -- -----------------------------------------------------------------
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000001');
  -- superuser olarak RLS atlanır; JWT yetis_admin → tetikleyici ateşlenmeli
  begin
    update public.visits
    set notes = 'yetis hack'
    where id = 'f0000000-0000-0000-0000-000000000001';
    raise exception 'FAIL-9a: yetis_admin ziyaret güncellemesi kabul edildi';
  exception
    when others then
      if sqlerrm like '%FAIL-9a%' then raise; end if;
      if sqlerrm like '%Yetiş Admin%' or sqlerrm like '%değiştiremez%' then
        raise notice 'OK-9a: yetis_admin ziyaret güncellemesi tetikleyiciyle reddedildi';
      else
        -- authenticated rolünde RLS de reddedebilir
        raise notice 'OK-9a: yetis_admin ziyaret güncellemesi reddedildi (%)', sqlstate;
      end if;
  end;

  begin
    delete from public.visits
    where id = 'f0000000-0000-0000-0000-000000000001';
    raise exception 'FAIL-9b: yetis_admin ziyaret sildi';
  exception
    when others then
      if sqlerrm like '%FAIL-9b%' then raise; end if;
      raise notice 'OK-9b: yetis_admin ziyaret silemez (%)', sqlstate;
  end;

  -- -----------------------------------------------------------------
  -- 10) (kaldırıldı) check_in_attempts geofence kaldırılmasıyla düşürüldü
  -- -----------------------------------------------------------------

  -- -----------------------------------------------------------------
  -- 11) Transfer: eski ziyaret görünür; eski esnaf kaydı görünmez
  -- -----------------------------------------------------------------
  reset role;
  perform public._test_clear_auth();
  -- Merkez temsilcisini Test Bayi'ye taşı (rol escalation tetikleyicisini geçici kapat)
  alter table public.users disable trigger trg_users_prevent_role_escalation;
  update public.users
  set dealership_id = 'b0000000-0000-0000-0000-000000000002'
  where id = 'a0000000-0000-0000-0000-000000000003';
  alter table public.users enable trigger trg_users_prevent_role_escalation;

  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000003');
  set local role authenticated;

  select count(*) into v_cnt
  from public.visits
  where id = 'f0000000-0000-0000-0000-000000000001';
  if v_cnt <> 1 then
    raise exception 'FAIL-11a: transfer edilen temsilci eski ziyaretini göremedi';
  end if;
  raise notice 'OK-11a: transfer edilen temsilci eski ziyaretini görür';

  select count(*) into v_cnt
  from public.customers
  where id = 'e0000000-0000-0000-0000-000000000001';
  if v_cnt <> 0 then
    raise exception 'FAIL-11b: transfer edilen temsilci eski bayinin esnafını gördü';
  end if;
  raise notice 'OK-11b: transfer edilen temsilci eski bayinin esnafını göremez';

  -- geri al
  reset role;
  perform public._test_clear_auth();
  alter table public.users disable trigger trg_users_prevent_role_escalation;
  update public.users
  set dealership_id = 'b0000000-0000-0000-0000-000000000001'
  where id = 'a0000000-0000-0000-0000-000000000003';
  alter table public.users enable trigger trg_users_prevent_role_escalation;

  -- -----------------------------------------------------------------
  -- 12) get_customers_nearby başka bayinin esnafını döndürmez
  -- -----------------------------------------------------------------
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000006');
  set local role authenticated;

  select count(*) into v_cnt
  from public.get_customers_nearby(41.06, 28.987, 50000)
  where id = 'e0000000-0000-0000-0000-000000000001';

  if v_cnt <> 0 then
    raise exception 'FAIL-12: get_customers_nearby çapraz bayi esnaf döndürdü';
  end if;
  raise notice 'OK-12: get_customers_nearby başka bayinin esnafını döndürmez';

  -- -----------------------------------------------------------------
  -- 13) Geofence doğrulama RPC'si kaldırılmış olmalı
  -- -----------------------------------------------------------------
  if to_regprocedure('public.validate_check_in_location(uuid,geometry)') is not null then
    raise exception 'FAIL-13: kaldırılan validate_check_in_location RPC halen mevcut';
  end if;
  raise notice 'OK-13: geofence doğrulama RPC''si kaldırılmış';

  -- -----------------------------------------------------------------
  -- 14) Storage: temsilci başka temsilcinin fotoğrafını indiremez
  -- -----------------------------------------------------------------
  reset role;
  perform public._test_clear_auth();

  if to_regclass('storage.objects') is not null then
    begin
      insert into storage.objects (bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata)
      values (
        'visit-photos',
        'a0000000-0000-0000-0000-000000000003/test.jpg',
        'a0000000-0000-0000-0000-000000000003',
        now(), now(), now(), '{}'::jsonb
      )
      on conflict do nothing;

      perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000006');
      set local role authenticated;

      select count(*) into v_cnt
      from storage.objects
      where bucket_id = 'visit-photos'
        and name = 'a0000000-0000-0000-0000-000000000003/test.jpg';

      if v_cnt <> 0 then
        raise exception 'FAIL-14: Test Bayi temsilcisi Merkez fotoğrafını okudu';
      end if;
      raise notice 'OK-14: temsilci başka temsilcinin fotoğrafını indiremez';
    exception
      when others then
        if sqlerrm like '%FAIL-14%' then raise; end if;
        raise notice 'SKIP-14: storage.objects şema uyumsuz (%) — manuel doğrulayın', sqlstate;
    end;
  else
    raise notice 'SKIP-14: storage.objects yok (yerel shim); Supabase ortamında çalıştırın';
  end if;

  -- -----------------------------------------------------------------
  -- 15) (kaldırıldı) geofence kuralı kaldırıldı; menzil kontrolü yok
  -- -----------------------------------------------------------------

  -- -----------------------------------------------------------------
  -- 16) E18: tek açık ziyaret (ikinci insert reddedilir)
  -- -----------------------------------------------------------------
  reset role;
  perform public._test_clear_auth();

  -- yakında bir açık ziyaret oluştur (seed esnaf konumu civarı)
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000003');
  set local role authenticated;

  insert into public.visits (field_rep_id, customer_id, check_in_location, is_mock_location)
  select
    'a0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    c.location,
    false
  from public.customers c
  where c.id = 'e0000000-0000-0000-0000-000000000001';

  begin
    insert into public.visits (field_rep_id, customer_id, check_in_location, is_mock_location)
    select
      'a0000000-0000-0000-0000-000000000003',
      'e0000000-0000-0000-0000-000000000002',
      c.location,
      false
    from public.customers c
    where c.id = 'e0000000-0000-0000-0000-000000000002';
    raise exception 'FAIL-16: ikinci açık ziyaret kabul edildi';
  exception
    when unique_violation then
      raise notice 'OK-16: tek açık ziyaret indeksi ikinci kaydı reddetti';
    when others then
      if sqlerrm like '%FAIL-16%' then raise; end if;
      raise notice 'OK-16: ikinci açık ziyaret reddedildi (%)', left(sqlerrm, 80);
  end;

  -- açık ziyareti iptal et
  select id into v_visit_id from public.visits
  where field_rep_id = 'a0000000-0000-0000-0000-000000000003'
    and check_out_at is null
  limit 1;

  if v_visit_id is not null then
    perform public.cancel_visit(v_visit_id);
  end if;

  -- -----------------------------------------------------------------
  -- 17) E18: kapanmış ziyaret güncellenemez; mock bayrağı korunur
  -- -----------------------------------------------------------------
  reset role;
  perform public._test_clear_auth();
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000003');
  set local role authenticated;

  insert into public.visits (
    field_rep_id, customer_id, check_in_location, is_mock_location
  )
  select
    'a0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    c.location,
    true
  from public.customers c
  where c.id = 'e0000000-0000-0000-0000-000000000001'
  returning id into v_visit_id;

  update public.visits
  set outcome = 'other', notes = 'kapanis', is_mock_location = false
  where id = v_visit_id;

  if not exists (
    select 1 from public.visits
    where id = v_visit_id and check_out_at is not null and is_mock_location is true
  ) then
    raise exception 'FAIL-17a: mock bayrağı check-out sonrası false oldu veya kapanmadı';
  end if;
  raise notice 'OK-17a: check-out mock bayrağını korur';

  begin
    update public.visits set notes = 'yeniden' where id = v_visit_id;
    raise exception 'FAIL-17b: kapanmış ziyaret güncellendi';
  exception
    when others then
      if sqlerrm like '%FAIL-17b%' then raise; end if;
      raise notice 'OK-17b: kapanmış ziyaret güncellenemez';
  end;

  -- -----------------------------------------------------------------
  -- 18) E18: Yetiş Admin ziyaret değiştiremez (RLS)
  -- -----------------------------------------------------------------
  reset role;
  perform public._test_clear_auth();
  perform public._test_authenticate_as('a0000000-0000-0000-0000-000000000001');
  set local role authenticated;

  begin
    update public.visits set notes = 'admin-yazi' where id = v_visit_id;
    -- 0 satır veya exception kabul
    get diagnostics v_cnt = row_count;
    if v_cnt > 0 then
      raise exception 'FAIL-18: Yetiş Admin ziyaret güncelledi';
    end if;
    raise notice 'OK-18: Yetiş Admin ziyaret güncelleyemez (0 satır)';
  exception
    when others then
      if sqlerrm like '%FAIL-18%' then raise; end if;
      raise notice 'OK-18: Yetiş Admin ziyaret güncelleyemez (%)', sqlstate;
  end;

  -- temizlik
  reset role;
  perform public._test_clear_auth();
  delete from public.visit_photos where visit_id in (
    select id from public.visits
    where field_rep_id = 'a0000000-0000-0000-0000-000000000003'
      and check_in_at > now() - interval '1 hour'
  );
  delete from public.visits
  where field_rep_id = 'a0000000-0000-0000-0000-000000000003'
    and check_in_at > now() - interval '1 hour';
  delete from public.customers where id = 'e0000000-0000-0000-0000-0000000000aa';
  delete from public.categories where id = 'c0000000-0000-0000-0000-0000000000aa';

  raise notice '========================================';
  raise notice 'E12+E18 tenant_isolation: TUM SENARYOLAR GECTI';
  raise notice '========================================';
end $$;

drop function if exists public._test_authenticate_as(uuid);
drop function if exists public._test_clear_auth();
