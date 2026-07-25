-- Fix GoTrue schema query failure: NULL tokens must be empty strings
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  email_change = coalesce(email_change, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  raw_app_meta_data = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb),
  updated_at = now()
where email in ('yetis@saha.local', 'merkez-admin@saha.local', 'saha1@saha.local');

-- Align identity_data with GoTrue expectations
update auth.identities i
set
  identity_data = jsonb_build_object(
    'sub', i.user_id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  updated_at = now()
from auth.users u
where i.user_id = u.id
  and u.email in ('yetis@saha.local', 'merkez-admin@saha.local', 'saha1@saha.local');

select email,
  confirmation_token is null as conf_null,
  recovery_token is null as rec_null,
  email_change_token_new is null as ectn_null
from auth.users
where email in ('yetis@saha.local', 'merkez-admin@saha.local', 'saha1@saha.local')
order by email;
