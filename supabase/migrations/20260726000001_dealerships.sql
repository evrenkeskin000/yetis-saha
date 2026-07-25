-- E11 / Migration 1: Bayiler tablosu, updated_at otomasyonu ve Yetiş Merkez varsayılan bayisi
-- Bu dosya yalnızca yeni yapı ekler; mevcut tablolar değiştirilmez (kolonlar Migration 2'de eklenir).

-- 1. Genel updated_at tetikleyici fonksiyonu (bugüne kadar users.updated_at hiç güncellenmiyordu)
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- 2. Bayiler tablosu
create table if not exists public.dealerships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. updated_at tetikleyicileri
drop trigger if exists trg_dealerships_set_updated_at on public.dealerships;
create trigger trg_dealerships_set_updated_at before update on public.dealerships
  for each row execute function public.set_updated_at();

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- 4. Yetiş Merkez varsayılan bayisi (sabit UUID: tüm mevcut veri buraya taşınır)
insert into public.dealerships (id, name, code, is_active)
values ('b0000000-0000-0000-0000-000000000001', 'Yetiş Merkez', 'YETIS-MERKEZ', true)
on conflict (id) do nothing;
