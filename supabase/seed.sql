-- Seed Data (E11 sonrası: çoklu bayi modeli)
-- Roller: yetis_admin (bayisiz), dealer_admin (bir bayiye bağlı), field_rep (bir bayiye bağlı)
-- Bayiler: Yetiş Merkez (migration ile eklendi) + Test Bayi (bu dosyada)

-- =====================================================================
-- 0. Bayiler
-- =====================================================================
insert into public.dealerships (id, name, code, is_active) values
('b0000000-0000-0000-0000-000000000001', 'Yetiş Merkez', 'YETIS-MERKEZ', true),
('b0000000-0000-0000-0000-000000000002', 'Test Bayi',    'TEST-BAYI',    true)
on conflict (id) do nothing;

-- =====================================================================
-- 1. Auth Kullanıcıları
-- handle_new_user tetikleyicisi bunları public.users içine field_rep olarak kopyalar;
-- roller ve bayi bağlılığı Bölüm 2'de düzeltilir.
-- =====================================================================
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'yetis@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Yetiş Admin"}', now(), now()
),
(
  'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'merkez-admin@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Merkez Bayi Yöneticisi"}', now(), now()
),
(
  'a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'saha1@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Merkez Saha Temsilcisi 1"}', now(), now()
),
(
  'a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'saha2@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Merkez Saha Temsilcisi 2"}', now(), now()
),
(
  'a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'testbayi-admin@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Bayi Yöneticisi"}', now(), now()
),
(
  'a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'saha3@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Bayi Saha Temsilcisi"}', now(), now()
)
on conflict (id) do nothing;

-- auth.identities kaydı (Supabase Auth oturum açabilmesi için)
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values
(
  'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'yetis@saha.local'),
  'email', 'a0000000-0000-0000-0000-000000000001', now(), now(), now()
),
(
  'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'email', 'merkez-admin@saha.local'),
  'email', 'a0000000-0000-0000-0000-000000000002', now(), now(), now()
),
(
  'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000003', 'email', 'saha1@saha.local'),
  'email', 'a0000000-0000-0000-0000-000000000003', now(), now(), now()
),
(
  'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'email', 'saha2@saha.local'),
  'email', 'a0000000-0000-0000-0000-000000000004', now(), now(), now()
),
(
  'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000005', 'email', 'testbayi-admin@saha.local'),
  'email', 'a0000000-0000-0000-0000-000000000005', now(), now(), now()
),
(
  'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000006', 'email', 'saha3@saha.local'),
  'email', 'a0000000-0000-0000-0000-000000000006', now(), now(), now()
)
on conflict (id) do nothing;

-- =====================================================================
-- 2. Rol ve bayi ataması
-- handle_new_user her kullanıcıyı field_rep + dealership_id NULL olarak oluşturur.
-- prevent_role_escalation tetikleyicisi rol UPDATE'ini engellediği için seed sırasında
-- (yalnızca yerel geliştirme) tetikleyici geçici olarak devre dışı bırakılır.
-- =====================================================================
alter table public.users disable trigger trg_users_prevent_role_escalation;

update public.users set role = 'yetis_admin',  dealership_id = null
  where id = 'a0000000-0000-0000-0000-000000000001';
update public.users set role = 'dealer_admin', dealership_id = 'b0000000-0000-0000-0000-000000000001'
  where id = 'a0000000-0000-0000-0000-000000000002';
update public.users set role = 'field_rep',    dealership_id = 'b0000000-0000-0000-0000-000000000001'
  where id = 'a0000000-0000-0000-0000-000000000003';
update public.users set role = 'field_rep',    dealership_id = 'b0000000-0000-0000-0000-000000000001'
  where id = 'a0000000-0000-0000-0000-000000000004';
update public.users set role = 'dealer_admin', dealership_id = 'b0000000-0000-0000-0000-000000000002'
  where id = 'a0000000-0000-0000-0000-000000000005';
update public.users set role = 'field_rep',    dealership_id = 'b0000000-0000-0000-0000-000000000002'
  where id = 'a0000000-0000-0000-0000-000000000006';

alter table public.users enable trigger trg_users_prevent_role_escalation;

-- =====================================================================
-- 3. Kategoriler (global)
-- =====================================================================
insert into public.categories (id, name, icon, is_active) values
('c0000000-0000-0000-0000-000000000001', 'Bakkal/Market', 'store', true),
('c0000000-0000-0000-0000-000000000002', 'Kasap', 'drumstick-bite', true),
('c0000000-0000-0000-0000-000000000003', 'Manav', 'apple-alt', true)
on conflict (id) do nothing;

-- =====================================================================
-- 4. Esnaflar (İstanbul koordinatlı) — bayi ve oluşturan bilgisiyle
-- e...01-04 Yetiş Merkez (created_by = Merkez bayi yöneticisi)
-- e...05    Test Bayi   (created_by = Test Bayi yöneticisi)
-- =====================================================================
insert into public.customers
  (id, business_name, owner_name, phone, address, category_id, location, is_active, dealership_id, created_by) values
(
  'e0000000-0000-0000-0000-000000000001', 'Kadıköy Örnek Bakkal', 'Ahmet Yılmaz', '05321112233',
  'Moda Cad. No:12 Kadıköy / İstanbul', 'c0000000-0000-0000-0000-000000000001',
  ST_SetSRID(ST_MakePoint(29.0270, 40.9903), 4326), true,
  'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'
),
(
  'e0000000-0000-0000-0000-000000000002', 'Üsküdar Kasabı', 'Mehmet Demir', '05332223344',
  'Hakimiyeti Milliye Cad. No:45 Üsküdar / İstanbul', 'c0000000-0000-0000-0000-000000000002',
  ST_SetSRID(ST_MakePoint(29.0150, 41.0250), 4326), true,
  'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'
),
(
  'e0000000-0000-0000-0000-000000000003', 'Beşiktaş Manavı', 'Ayşe Kaya', '05343334455',
  'Barbaros Bulvarı No:88 Beşiktaş / İstanbul', 'c0000000-0000-0000-0000-000000000003',
  ST_SetSRID(ST_MakePoint(29.0050, 41.0420), 4326), true,
  'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'
),
(
  'e0000000-0000-0000-0000-000000000004', 'Fatih Market', 'Ali Öztürk', '05354445566',
  'Fevzipaşa Cad. No:102 Fatih / İstanbul', 'c0000000-0000-0000-0000-000000000001',
  ST_SetSRID(ST_MakePoint(28.9400, 41.0180), 4326), true,
  'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'
),
(
  'e0000000-0000-0000-0000-000000000005', 'Şişli Şarküteri', 'Fatma Şahin', '05365556677',
  'Halaskargazi Cad. No:150 Şişli / İstanbul', 'c0000000-0000-0000-0000-000000000001',
  ST_SetSRID(ST_MakePoint(28.9870, 41.0600), 4326), true,
  'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005'
)
on conflict (id) do nothing;

-- =====================================================================
-- 5. Ziyaretler — dealership_id ve customer_snapshot trigger tarafından doldurulur
-- Merkez temsilcisi Merkez esnafını, Test Bayi temsilcisi Test Bayi esnafını ziyaret eder.
-- =====================================================================
insert into public.visits (
  id, idempotency_key, field_rep_id, customer_id, check_in_location, outcome, notes
) values
(
  'f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001',
  ST_SetSRID(ST_MakePoint(29.0270, 40.9903), 4326), 'agreed', 'Sipariş alındı.'
),
(
  'f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002',
  ST_SetSRID(ST_MakePoint(29.0150, 41.0250), 4326), null, 'Devam eden ziyaret'
),
(
  'f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000005',
  ST_SetSRID(ST_MakePoint(28.9870, 41.0600), 4326), 'quote_given', 'Test Bayi ziyareti.'
)
on conflict (id) do nothing;

-- İlk ziyareti tamamlanmış yap (check_out ile süre üretilsin)
update public.visits
set check_in_at = now() - interval '45 minutes',
    check_out_at = now() - interval '15 minutes',
    check_out_location = ST_SetSRID(ST_MakePoint(29.0270, 40.9903), 4326)
where id = 'f0000000-0000-0000-0000-000000000001';
