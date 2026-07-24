# E02 — Veritabanı Şeması + Auth + RLS

> **Boyut:** Küçük | **Bağımlılıklar:** E01 (monorepo iskeleti, `supabase/config.toml` mevcut) | **Hat:** Ortak
> **Özet:** Faz 1+2 DB şemasının tamamını sıralı SQL migration'ları, PostGIS indexleri, rol bazlı RLS politikaları, auth trigger'ı, storage bucket + RLS, seed verisi ve sunucu tarafı geofence doğrulama fonksiyonlarıyla kurar.

---

# E02 — Veritabanı Şeması + Auth + RLS

## 1. ROL
Sen kıdemli bir Supabase/PostgreSQL mimarısın. PostGIS, Row Level Security, Supabase Auth ve storage politikalarında uzmansın. Güvenliği varsayılan olarak kapalı tutar (RLS her tabloda açık), idempotent ve sıralı migration'lar yazarsın.

## 2. BAĞLAM
"Saha" projesi: Esnafları gezen pazarlama ekiplerinin takip sistemi. Backend Supabase Free ($0/ay; 500MB DB, 1GB storage). Roller: `admin`, `manager`, `field_rep`. Temel kural: field_rep yalnızca KENDİ verisini görür/düzenler; admin ve manager tüm ekibi görür. Anti-spoofing şartları: geofence doğrulaması SUNUCUDA PostGIS `ST_DWithin` ile yapılır, cihaz saatine güvenilmez (check-in/out zamanlarını sunucu basar), mock location bayrağı istemciden gelir ama saklanır. KVKK: konum logları en fazla 6 ay saklanır; aydınlatma metni onayı `users` tablosunda tutulur.

E01 tamamlandı: Turborepo monorepo mevcut, `supabase/config.toml` yerinde. Sen `supabase/migrations/` ve `supabase/seed.sql`'i oluşturacaksın. Faz 3 tabloları (territories, daily_plans) bu kapsamda YOK.

## 3. HEDEF
`supabase db reset` komutuyla sıfırdan ayağa kalkan, şeması + indexleri + RLS'i + storage bucket'ı + seed verisi tam, rol bazlı erişimi test edilebilir bir yerel Supabase veritabanı kurmak.

## 4. KAPSAM
- Sıralı migration dosyaları: extension'lar, tablolar, indexler, fonksiyonlar/trigger'lar, RLS, storage
- `handle_new_user` auth trigger'ı (auth.users → public.users)
- Sunucu tarafı geofence doğrulama: `validate_check_in_location` + visits insert/update trigger'ları (sunucu zaman damgası + `is_geofence_valid` hesabı)
- `get_customers_nearby` RPC fonksiyonu (E03 bunu çağıracak)
- `visit-photos` storage bucket (private) + storage.objects RLS
- `seed.sql`: 1 admin, 1 manager, 2 field_rep, 3 kategori, İstanbul koordinatlı 5 esnaf
- Konum logları için 6 aylık retention: `purge_old_location_logs()` + pg_cron satırı (not'lu)
- `config.toml` içinde email auth ayarı (yerel geliştirme: email confirmation kapalı)

## 5. KAPSAM DIŞI (KESİNLİKLE YAPMA)
- Faz 3: `territories`, `daily_plans` ve bunlarla ilgili hiçbir tablo/kolon
- Edge Functions, webhook, 3. parti servis entegrasyonu
- KPI/rapor view'ları, materialized view'lar (Faz 2 raporları ayrı epic'te)
- Frontend/mobil entegrasyonu, client kodu (E03'ün işi)
- Gerçek (hosted) Supabase projesi oluşturma/apply etme — sadece yerel migration + seed
- Realtime publication kanal mantığı (DB'de publication satırı ekleme)
- KVKK aydınlatma metni UI/içeriği (sadece DB alanları)
- Migration'ları hosted projeye push etme; git commit ATMA

## 6. TEKNİK GEREKSİNİMLER

### Migration dosya düzeni
`supabase/migrations/` altında sıralı, açıklayıcı isimli dosyalar (örn. `20240101000001_extensions.sql`, `...02_tables.sql`, `...03_indexes.sql`, `...04_functions.sql`, `...05_triggers.sql`, `...06_rls.sql`, `...07_storage.sql`). Seed `supabase/seed.sql`'de.

### Tablolar (DDL — ek kolon ekleme, tam olarak uygula)
```sql
-- 01: extension'lar
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- 02: tablolar
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role text not null default 'field_rep' check (role in ('admin','manager','field_rep')),
  avatar_url text,
  is_active boolean not null default true,
  kvkk_consent_at timestamptz,
  kvkk_consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text,
  phone text,
  address text,
  category_id uuid references public.categories(id),
  location geometry(Point, 4326) not null,
  geofence_radius_m int not null default 100 check (geofence_radius_m between 25 and 1000),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique default gen_random_uuid(),
  field_rep_id uuid not null references public.users(id),
  customer_id uuid not null references public.customers(id),
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_location geometry(Point, 4326) not null,
  check_out_location geometry(Point, 4326),
  duration_minutes int generated always as (
    case when check_out_at is null then null
         else greatest(0, round(extract(epoch from (check_out_at - check_in_at)) / 60)::int)
    end
  ) stored,
  outcome text check (outcome in ('agreed','quote_given','decision_maker_absent','not_interested','follow_up_needed','complaint','other')),
  notes text,
  is_geofence_valid boolean,
  is_mock_location boolean not null default false,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  storage_path text not null unique,
  captured_at timestamptz,
  capture_location geometry(Point, 4326),
  created_at timestamptz not null default now()
);

create table public.location_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id),
  location geometry(Point, 4326) not null,
  accuracy_m real,
  speed_kmh real,
  battery_level smallint check (battery_level between 0 and 100),
  is_mock boolean not null default false,
  activity_type text check (activity_type in ('still','walking','driving','unknown')),
  recorded_at timestamptz not null,
  synced_at timestamptz not null default now()
);
```

### Indexler (03)
```sql
create index customers_location_gist on public.customers using gist (location);
create index visits_check_in_location_gist on public.visits using gist (check_in_location);
create index location_logs_location_gist on public.location_logs using gist (location);
create index location_logs_user_time_idx on public.location_logs (user_id, recorded_at desc);
create index visits_rep_time_idx on public.visits (field_rep_id, check_in_at desc);
create index customers_category_idx on public.customers (category_id);
```

### Fonksiyonlar (04) — isimler ve imzalar E03 tarafından tüketilecek, DEĞİŞTİRME
```sql
create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.users where id = auth.uid() $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'field_rep')
  );
  return new;
end $$;

create or replace function public.validate_check_in_location(p_customer_id uuid, p_location geometry)
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(
     (select ST_DWithin(c.location::geography, p_location::geography, c.geofence_radius_m)
      from public.customers c
      where c.id = p_customer_id and c.is_active),
     false) $$;

create or replace function public.get_customers_nearby(
  p_lat double precision, p_lng double precision, p_radius_m int default 1000
) returns table (
  id uuid, business_name text, owner_name text, phone text, address text,
  category_id uuid, geofence_radius_m int, notes text,
  lat double precision, lng double precision, distance_m double precision
) language sql stable security definer set search_path = public as
$$ select c.id, c.business_name, c.owner_name, c.phone, c.address,
          c.category_id, c.geofence_radius_m, c.notes,
          ST_Y(c.location) as lat, ST_X(c.location) as lng,
          ST_Distance(c.location::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distance_m
   from public.customers c
   where c.is_active
     and ST_DWithin(c.location::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
   order by distance_m asc $$;

create or replace function public.purge_old_location_logs() returns void
language sql security definer set search_path = public as
$$ delete from public.location_logs where recorded_at < now() - interval '6 months' $$;
```

### Trigger'lar (05)
```sql
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
  if new.role is distinct from old.role and public.current_user_role() is distinct from 'admin' then
    raise exception 'Rol değiştirme yetkisi yalnızca admin kullanıcıdadır';
  end if;
  return new;
end $$;
create trigger trg_users_prevent_role_escalation before update on public.users
  for each row execute function public.prevent_role_escalation();
```

### RLS (06) — 6 tabloda da `enable row level security`
- **categories**: SELECT → tüm `authenticated`; INSERT/UPDATE/DELETE → yalnız `current_user_role() = 'admin'`
- **users**: SELECT → `auth.uid() = id` VEYA admin/manager; UPDATE → `auth.uid() = id` (rol koruması trigger'da) VEYA admin; INSERT/DELETE → politika YOK (trigger yönetir)
- **customers**: SELECT → tüm `authenticated` (admin/manager tüm satırlar, field_rep yalnız `is_active = true`); INSERT/UPDATE/DELETE → admin VEYA manager
- **visits**: SELECT → `field_rep_id = auth.uid()` VEYA admin/manager; INSERT → `with check (field_rep_id = auth.uid())`; UPDATE → `field_rep_id = auth.uid()` VEYA admin/manager; DELETE → yalnız admin
- **visit_photos**: SELECT → `exists (select 1 from visits v where v.id = visit_id and (v.field_rep_id = auth.uid() or current_user_role() in ('admin','manager')))`; INSERT → aynı koşul `with check`; DELETE → yalnız admin
- **location_logs**: SELECT → `user_id = auth.uid()` VEYA admin/manager; INSERT → `with check (user_id = auth.uid())`; UPDATE/DELETE → politika YOK (append-only; temizlik `purge_old_location_logs()` ile)

### Storage (07)
```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 2097152, array['image/jpeg','image/png','image/webp']);
```
Dosya yolu: `{field_rep_id}/{visit_id}/{photo_uuid}.jpg`. `storage.objects` politikaları:
- INSERT: bucket_id = 'visit-photos' AND `(storage.foldername(name))[1] = auth.uid()::text`
- SELECT: aynı prefix VEYA `current_user_role() in ('admin','manager')`
- UPDATE: yalnız kendi prefix'i
- DELETE: kendi prefix'i VEYA admin

### Retention
```sql
-- Konum logları KVKK gereği en fazla 6 ay saklanır.
-- pg_cron etkinleştirildikten sonra:
-- select cron.schedule('purge-location-logs', '15 3 * * *', $$select public.purge_old_location_logs()$$);
-- Alternatif ($0): GitHub Actions cron + service role key ile çağrı.
```

### config.toml
E01'in oluşturduğu `supabase/config.toml` dosyasında yalnızca şu bölümü düzenle:
```toml
[auth.email]
enable_signup = true
enable_confirmations = false
```

### seed.sql
Yerel Supabase'de çalışan yöntem: `auth.users` + `auth.identities`'e doğrudan insert (seed postgres rolüyle çalışır). `handle_new_user` trigger'ı `public.users`'ı OTOMATİK doldurur. Sabit UUID'ler kullan.

Kullanıcılar: admin@saha.local / mudur@saha.local / saha1@saha.local / saha2@saha.local — şifre: Saha123!
Kategoriler: Bakkal/Market, Kasap, Manav
Esnaflar: İstanbul koordinatlı 5 esnaf (Kadıköy, Üsküdar, Beşiktaş, Fatih, Şişli)
Seed içinde ziyaretler: saha1'in 1 tamamlanmış, saha2'nin 1 açık ziyareti.

Detaylı SQL için E02 tam prompt metninin alt kısmına bak (yukarıdaki özet kod migration'a dönüştürülür). UUID'ler: admin 'a0000000-...-0001', manager '...-0002', saha1 '...-0003', saha2 '...-0004'; kategoriler 'c0000000-...-0001' vs.

## 7. KABUL KRİTERLERİ
- [ ] `npx supabase db reset` hatasız: tüm migration'lar + seed sırayla uygulanıyor
- [ ] PostGIS aktif: `select PostGIS_Full_Version();` sürüm döndürüyor
- [ ] 6 tablonun tamamında RLS enabled; `pg_policies`'te politika matrisi birebir mevcut
- [ ] Seed sonrası: 4 `public.users` (trigger ile), 3 kategori, 5 esnaf, 2 ziyaret (biri tamamlanmış, `duration_minutes` hesaplanmış)
- [ ] `validate_check_in_location`: aynı nokta → `true`, ~7 km uzak nokta → `false`
- [ ] `get_customers_nearby(40.9903, 29.0270, 2000)`: `lat`, `lng`, `distance_m` kolonlarıyla, mesafeye göre artan sıralı sonuç
- [ ] Trigger davranışı: geçmiş tarihli `check_in_at` ile insert edilen ziyarette `check_in_at ≈ now()` ve `is_geofence_valid` hesaplanmış
- [ ] RLS: field_rep başkasının ziyaretini göremez; field_rep kendi rolünü `admin` yapamaz; manager tüm ziyaretleri görebilir
- [ ] Storage: `visit-photos` bucket private, 2MB limit, görsel MIME kısıtlı; field_rep yalnız kendi prefix'ine yazabilir
- [ ] `config.toml`'da `[auth.email] enable_confirmations = false`
- [ ] pg_cron satırları YORUMLU halde ve açıklama notuyla migration'da

## 8. DOĞRULAMA
Docker + Supabase CLI gerektirir. Sırayla çalıştır:
1. `npx supabase start` → `npx supabase db reset` → hatasız
2. Fonksiyon testleri (psql ile):
   - `select public.validate_check_in_location('e0000000-...-0001', ST_SetSRID(ST_MakePoint(29.0270, 40.9903), 4326));` → `t`
   - `select public.validate_check_in_location('e0000000-...-0001', ST_SetSRID(ST_MakePoint(28.9397, 41.0186), 4326));` → `f`
3. Trigger testi: eski tarihle `insert into visits` → `check_in_at ≈ now()` ve `is_geofence_valid` dolu
4. RLS testi (psql'de JWT claim ayarı ile): rep1 yalnız kendi visit'leri; manager tümü; field_rep role'ünü admin yapamaz
5. Storage: bucket public=false, file_size_limit=2097152
6. `npx supabase stop` (opsiyonel)

## 9. KISITLAR
- $0/ay: yalnızca Supabase Free özellikleri; pg_cron satırı yorumlu (hosted'da manuel etkinleştirme)
- Faz 3 tabloları (territories, daily_plans) ve KPI view'ları KESİNLİKLE YOK
- Seed e-postaları `@saha.local`, şifre `Saha123!` — yalnız yerel
- Migration'lar `db reset`'e dayanıklı; mevcut E01 dosyalarına dokunma
- Secret/service role key hiçbir dosyaya gömülmez
- Kullanıcı istemeden `git commit` ATMA; hosted projeye `db push` YAPMA
