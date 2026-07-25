-- E11 / Migration 3: Mevcut veriyi Yetiş Merkez'e taşı ve NOT NULL kısıtlarını koy
-- NOT: Temiz bir `supabase db reset` sırasında tablolar bu noktada boştur (veri seed ile gelir),
-- bu yüzden UPDATE'ler 0 satır etkiler. Bu migration asıl olarak MEVCUT (üretim) veritabanının
-- güvenli yükseltme yolunu sağlar ve fresh reset'te de zararsızdır.

-- Sabit: Yetiş Merkez bayi kimliği
-- b0000000-0000-0000-0000-000000000001

-- 1. users: Yetiş Admin dışındaki tüm kullanıcıları Yetiş Merkez'e bağla.
--    Roller bu aşamada hâlâ eski adlarda ('admin','manager','field_rep'); dönüşüm Migration 4'te.
--    'admin' rolü Yetiş Admin'e karşılık gelir ve bayisiz (NULL) kalır.
update public.users
set dealership_id = 'b0000000-0000-0000-0000-000000000001'
where dealership_id is null
  and role is distinct from 'admin';

-- 2. customers: tüm esnafları Yetiş Merkez'e taşı ve oluşturanı en eski yöneticiye ata.
update public.customers
set dealership_id = 'b0000000-0000-0000-0000-000000000001'
where dealership_id is null;

update public.customers c
set created_by = (
  select u.id from public.users u
  where u.role in ('admin', 'yetis_admin')
  order by u.created_at asc
  limit 1
)
where c.created_by is null;

-- 3. visits: bayi kimliğini temsilcinin bayisinden, snapshot'ı esnaf kaydından üret.
update public.visits v
set dealership_id = coalesce(
  (select u.dealership_id from public.users u where u.id = v.field_rep_id),
  'b0000000-0000-0000-0000-000000000001'
)
where v.dealership_id is null;

update public.visits v
set customer_snapshot = jsonb_build_object(
  'business_name', c.business_name,
  'address', c.address,
  'category_id', c.category_id
)
from public.customers c
where c.id = v.customer_id
  and v.customer_snapshot is null;

-- 4. location_logs: tüm konum loglarını Yetiş Merkez'e taşı.
update public.location_logs
set dealership_id = 'b0000000-0000-0000-0000-000000000001'
where dealership_id is null;

-- 5. NOT NULL kısıtları ve interim varsayılanlar
-- customers.dealership_id: eski insert yolları (E16 öncesi web "Yeni Esnaf") kırılmasın diye
-- interim DEFAULT Yetiş Merkez verilir; E16 açık bayi seçimini zorunlu kıldığında default kaldırılabilir.
alter table public.customers
  alter column dealership_id set default 'b0000000-0000-0000-0000-000000000001';
alter table public.customers
  alter column dealership_id set not null;

-- visits.dealership_id: her insert'te trigger (Migration 4) doldurur; güvenle NOT NULL yapılır.
alter table public.visits
  alter column dealership_id set not null;

-- NOT: Aşağıdaki alanlar bilinçli olarak bu epicte NULLABLE bırakılır:
--   - customers.created_by  -> istemciler gönderdikten sonra E16/E17'de NOT NULL yapılır
--   - visits.customer_snapshot -> trigger doldurur; E18'de NOT NULL yapılır
--   - location_logs.dealership_id -> istemci gönderdikten sonra E17'de NOT NULL yapılır
--   - users.dealership_id -> Yetiş Admin için NULL olabilir; kalıcı olarak nullable
