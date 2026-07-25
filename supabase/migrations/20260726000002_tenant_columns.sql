-- E11 / Migration 2: Tenant kolonlarını NULLABLE olarak ekle
-- Mevcut veri bulunduğu için kolonlar önce nullable eklenir; backfill Migration 3'te yapılır,
-- NOT NULL kısıtları da orada konur. Tüm eklemeler idempotenttir.

-- users: bayi bağlılığı (Yetiş Admin için NULL kalır)
alter table public.users
  add column if not exists dealership_id uuid references public.dealerships(id) on delete restrict;

-- customers: bayi sahipliği + oluşturan kullanıcı
alter table public.customers
  add column if not exists dealership_id uuid references public.dealerships(id) on delete restrict,
  add column if not exists created_by uuid references public.users(id);

-- visits: bayi anlık görüntüsü + esnaf snapshot'ı (transfer sonrası geçmiş için)
alter table public.visits
  add column if not exists dealership_id uuid references public.dealerships(id) on delete restrict,
  add column if not exists customer_snapshot jsonb;

-- location_logs: bayi bağlılığı
alter table public.location_logs
  add column if not exists dealership_id uuid references public.dealerships(id) on delete restrict;
