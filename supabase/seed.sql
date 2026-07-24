-- Seed Data

-- Auth Kullanıcıları ve Profiller
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'admin@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Saha Admin", "role": "admin"}', now(), now()
),
(
  'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'mudur@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Saha Müdürü", "role": "manager"}', now(), now()
),
(
  'a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'saha1@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Saha Temsilcisi 1", "role": "field_rep"}', now(), now()
),
(
  'a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'saha2@saha.local',
  extensions.crypt('Saha123!', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Saha Temsilcisi 2", "role": "field_rep"}', now(), now()
)
on conflict (id) do nothing;

-- auth.identities kaydı (Supabase Auth oturum açabilmesi için)
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values
(
  'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'admin@saha.local'),
  'email', 'a0000000-0000-0000-0000-000000000001', now(), now(), now()
),
(
  'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
  jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'email', 'mudur@saha.local'),
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
)
on conflict (id) do nothing;

-- Kategoriler
insert into public.categories (id, name, icon, is_active) values
('c0000000-0000-0000-0000-000000000001', 'Bakkal/Market', 'store', true),
('c0000000-0000-0000-0000-000000000002', 'Kasap', 'drumstick-bite', true),
('c0000000-0000-0000-0000-000000000003', 'Manav', 'apple-alt', true)
on conflict (id) do nothing;

-- Esnaflar (İstanbul Koordinatlı)
insert into public.customers (id, business_name, owner_name, phone, address, category_id, location, geofence_radius_m, is_active) values
(
  'e0000000-0000-0000-0000-000000000001', 'Kadıköy Örnek Bakkal', 'Ahmet Yılmaz', '05321112233',
  'Moda Cad. No:12 Kadıköy / İstanbul', 'c0000000-0000-0000-0000-000000000001',
  ST_SetSRID(ST_MakePoint(29.0270, 40.9903), 4326), 100, true
),
(
  'e0000000-0000-0000-0000-000000000002', 'Üsküdar Kasabı', 'Mehmet Demir', '05332223344',
  'Hakimiyeti Milliye Cad. No:45 Üsküdar / İstanbul', 'c0000000-0000-0000-0000-000000000002',
  ST_SetSRID(ST_MakePoint(29.0150, 41.0250), 4326), 100, true
),
(
  'e0000000-0000-0000-0000-000000000003', 'Beşiktaş Manavı', 'Ayşe Kaya', '05343334455',
  'Barbaros Bulvarı No:88 Beşiktaş / İstanbul', 'c0000000-0000-0000-0000-000000000003',
  ST_SetSRID(ST_MakePoint(29.0050, 41.0420), 4326), 150, true
),
(
  'e0000000-0000-0000-0000-000000000004', 'Fatih Market', 'Ali Öztürk', '05354445566',
  'Fevzipaşa Cad. No:102 Fatih / İstanbul', 'c0000000-0000-0000-0000-000000000001',
  ST_SetSRID(ST_MakePoint(28.9400, 41.0180), 4326), 100, true
),
(
  'e0000000-0000-0000-0000-000000000005', 'Şişli Şarküteri', 'Fatma Şahin', '05365556677',
  'Halaskargazi Cad. No:150 Şişli / İstanbul', 'c0000000-0000-0000-0000-000000000001',
  ST_SetSRID(ST_MakePoint(28.9870, 41.0600), 4326), 100, true
)
on conflict (id) do nothing;

-- Ziyaretler
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
)
on conflict (id) do nothing;

-- İlk ziyareti tamamlanmış yapmak için check_out_location ve check_out_at güncellemesi
update public.visits
set check_in_at = now() - interval '45 minutes',
    check_out_at = now() - interval '15 minutes',
    check_out_location = ST_SetSRID(ST_MakePoint(29.0270, 40.9903), 4326)
where id = 'f0000000-0000-0000-0000-000000000001';
