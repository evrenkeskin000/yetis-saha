-- Manuel test hesapları (Yetiş Merkez)
-- Şifre hepsi: Saha123!

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
  '{"full_name": "Merkez Saha Temsilcisi"}', now(), now()
)
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  updated_at = now();

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
)
on conflict (id) do nothing;

alter table public.users disable trigger trg_users_prevent_role_escalation;

insert into public.users (id, email, full_name, role, dealership_id, is_active, must_change_password)
values
  ('a0000000-0000-0000-0000-000000000001', 'yetis@saha.local', 'Yetiş Admin', 'yetis_admin', null, true, false),
  ('a0000000-0000-0000-0000-000000000002', 'merkez-admin@saha.local', 'Merkez Bayi Yöneticisi', 'dealer_admin', 'b0000000-0000-0000-0000-000000000001', true, false),
  ('a0000000-0000-0000-0000-000000000003', 'saha1@saha.local', 'Merkez Saha Temsilcisi', 'field_rep', 'b0000000-0000-0000-0000-000000000001', true, false)
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  dealership_id = excluded.dealership_id,
  is_active = true,
  must_change_password = false,
  updated_at = now();

alter table public.users enable trigger trg_users_prevent_role_escalation;

select email, role, dealership_id is not null as has_bayi, is_active
from public.users
where email in ('yetis@saha.local', 'merkez-admin@saha.local', 'saha1@saha.local')
order by role;
