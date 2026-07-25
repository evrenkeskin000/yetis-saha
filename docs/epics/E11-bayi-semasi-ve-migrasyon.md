# E11 — Veritabanı: Bayi Şeması, Rol Dönüşümü ve Veri Taşıma

> **Boyut:** Küçük | **Bağımlılıklar:** E02 (Faz 1 şeması) | **Hat:** Ortak (DB)
> **Özet:** Çoklu bayi mimarisinin veritabanı temelini kurar: `dealerships` tablosu, `Yetiş Merkez` varsayılan bayisi, `dealership_id` kolonlarının aşamalı eklenip backfill edilmesi, üç rollü modele geçiş, `customers.created_by`, ziyaret snapshot kolonu ve reddedilen check-in denemeleri tablosu. RLS politikaları bu epicte DEĞİŞMEZ (E12).

---

# E11 — Veritabanı: Bayi Şeması, Rol Dönüşümü ve Veri Taşıma

## 1. ROL
Sen kıdemli bir PostgreSQL / Supabase veritabanı mühendisisin. Mevcut veri barındıran bir üretim şemasında güvenli, geri alınabilir ve idempotent migrasyon yazma konusunda deneyimlisin. Var olan migration dosyalarını DÜZENLEMEZSİN; yalnızca yeni dosya eklersin. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
Proje: Yetiş+ Saha — saha temsilcilerinin esnaf ziyaretlerinin GPS doğrulamalı takibi. Monorepo: `apps/web`, `apps/mobile`, `packages/shared`, `supabase/`.

Mevcut şema (`supabase/migrations/20260724000001` … `20260724000008`):
- `categories(id, name, icon, is_active, created_at)`
- `users(id, email, full_name, phone, role, avatar_url, is_active, kvkk_consent_at, kvkk_consent_version, created_at, updated_at)` — `role` kısıtı: `admin`, `manager`, `field_rep`
- `customers(id, business_name, owner_name, phone, address, category_id, location, geofence_radius_m, notes, is_active, created_at)`
- `visits(id, idempotency_key, field_rep_id, customer_id, check_in_at, check_out_at, check_in_location, check_out_location, duration_minutes [generated], outcome, notes, is_geofence_valid, is_mock_location, synced_at, created_at)`
- `visit_photos(id, visit_id, storage_path, captured_at, capture_location, created_at)`
- `location_logs(id, user_id, location, accuracy_m, speed_kmh, battery_level, is_mock, activity_type, recorded_at, synced_at)`

KRİTİK ÖN KOŞUL: `supabase/migrations/20260724000008_must_change_password.sql` dosyası git'te izlenmiyor ancak web ve mobil kodu `users.must_change_password` alanına bağımlı (denetim bulgusu Y-06). Bu epic başlamadan önce dosya commit edilmeli ve hedef veritabanına uygulanmış olmalıdır.

Kesinleşen hedef kurallar için: [docs/proje-denetimi-2026-07-25.md](../proje-denetimi-2026-07-25.md) bölüm 4.

## 3. HEDEF
Veritabanı, çoklu bayi modelini taşıyacak yapıya kavuşur: her kullanıcı, esnaf, ziyaret ve konum logu bir bayiye bağlıdır; roller `yetis_admin` / `dealer_admin` / `field_rep` olur; mevcut veriler kaybolmadan `Yetiş Merkez` bayisine taşınır. Uygulama kodu bu epicte değişmez, dolayısıyla şema geriye dönük çalışmaya devam eder.

## 4. KAPSAM

### 4.1. Yeni migration dosyaları (sıra önemlidir)

1. `supabase/migrations/20260726000001_dealerships.sql`
   - `dealerships(id uuid pk, name text not null, code text unique, is_active boolean not null default true, created_at, updated_at)`
   - `set_updated_at()` fonksiyonu ve `dealerships` + `users` için `updated_at` tetikleyicisi (bugün `users.updated_at` hiç güncellenmiyor).
   - `Yetiş Merkez` kaydını sabit UUID ile ekle: `b0000000-0000-0000-0000-000000000001`, `code = 'YETIS-MERKEZ'`. `on conflict (id) do nothing`. (`b` öneki seçildi çünkü `a`=users, `c`=categories, `e`=customers, `f`=visits, `d`=idempotency_key önekleri seed'de zaten kullanılıyor.)

2. `supabase/migrations/20260726000002_tenant_columns.sql`
   - `users`, `customers`, `visits`, `location_logs` tablolarına **nullable** `dealership_id uuid references public.dealerships(id) on delete restrict`.
   - `customers.created_by uuid references public.users(id)` (nullable ekle).
   - `visits.customer_snapshot jsonb` (nullable ekle).
   - Tüm kolon eklemeleri `if not exists` ile idempotent olmalı.

3. `supabase/migrations/20260726000003_tenant_backfill.sql`
   - Tüm mevcut satırlarda `dealership_id` = Yetiş Merkez UUID.
   - `customers.created_by` boş olanlar için: en eski `yetis_admin`/`admin` kullanıcısını ata.
   - `visits.customer_snapshot` boş olanlar için mevcut `customers` satırından `jsonb_build_object('business_name', ..., 'address', ..., 'category_id', ...)` üret.
   - Backfill sonrası NOT NULL kısıtları **aşamalı** konur (her ara durum çalışır kalsın diye):
     - **Bu epicte NOT NULL:** `customers.dealership_id` (eski web insert yolları kırılmasın diye interim `DEFAULT` Yetiş Merkez ile birlikte) ve `visits.dealership_id` (Migration 4'teki `visits_before_insert` her insert'te doldurur).
     - **Bilinçli NULLABLE bırakılır:** `users.dealership_id` (Yetiş Admin bayisiz), `customers.created_by` (istemciler gönderince E16/E17'de NOT NULL), `visits.customer_snapshot` (trigger doldurur; E18'de NOT NULL), `location_logs.dealership_id` (istemci gönderince E17'de NOT NULL).
   - `customers.created_by` boş olanlar için en eski `admin`/`yetis_admin` kullanıcısını ata (bu migration Migration 4'ten önce çalıştığı için roller hâlâ eski adlarda olabilir).

4. `supabase/migrations/20260726000004_roles.sql`
   - **Sıra:** önce `users_role_check` kısıtını DÜŞÜR (yeni rol değerleri eski kısıtı ihlal eder), sonra `admin` → `yetis_admin`, `manager` → `dealer_admin` veri taşıması, en son yeni kısıtı ekle: `role in ('yetis_admin','dealer_admin','field_rep')`.
   - Varsayılan rol `field_rep` kalır.
   - `visits_before_insert()` güncellenir: yalnızca **alan doldurma** eklenir (`dealership_id` temsilciden, `customer_snapshot` esnaftan). Sert geofence reddi ve reddedilen deneme kaydı bu epicte YOK — E18'de eklenir. `is_geofence_valid` davranışı Faz 1'deki gibi korunur.
   - `prevent_role_escalation()` fonksiyonundaki `'admin'` kontrolünü `'yetis_admin'` olarak güncelle.
   - `prevent_must_change_bypass()` içindeki `'admin'` kontrolünü `'yetis_admin'` olarak güncelle.
   - `handle_new_user()`: rolü artık kullanıcı metadata'sından **okuma**; her zaman `field_rep` yaz (rol ataması yalnızca service-role ile yapılır). Bu, denetim bulgusu K-01'in ilk yarısını kapatır.

5. `supabase/migrations/20260726000005_check_in_attempts.sql`
   - `check_in_attempts(id bigint identity pk, field_rep_id uuid not null references users(id), customer_id uuid not null references customers(id), dealership_id uuid references dealerships(id), attempt_location geometry(Point,4326) not null, distance_m double precision not null, is_mock_location boolean not null default false, rejection_reason text not null, attempted_at timestamptz not null default now())`
   - Sorgu indeksleri: `(dealership_id, attempted_at desc)` ve `(field_rep_id, attempted_at desc)`.
   - Tablo bu epicte yalnızca **oluşturulur**; yazma yolu ve RLS E12/E18'de kurulur.

6. `supabase/migrations/20260726000006_tenant_indexes.sql`
   - `customers(dealership_id)`, `visits(dealership_id, check_in_at desc)`, `location_logs(dealership_id, recorded_at desc)`, `users(dealership_id)` indeksleri.

### 4.2. Seed güncellemesi
- `supabase/seed.sql`: `Yetiş Merkez` ve ikinci bir test bayisi (`Test Bayi`, `TEST-BAYI`) eklenir.
- Test kullanıcıları yeni rollerle kurulur: bir `yetis_admin` (bayisiz), her bayide bir `dealer_admin` ve en az bir `field_rep`.
- Esnaf ve ziyaret seed kayıtları ilgili bayilere dağıtılır; en az bir esnaf `Test Bayi`'ye ait olmalıdır ki E12 izolasyon testleri anlamlı olsun.

## 5. KAPSAM DIŞI
- RLS politikalarının yeniden yazılması ve aktiflik kapıları — **E12**.
- Sert geofence reddi, `visits_before_insert` tetikleyicisinin iş kuralı değişikliği ve reddedilen deneme yazımı — **E18**.
- `packages/shared` tipleri ve rol etiketleri — **E13**.
- Web ve mobil kod değişikliği (bu epic sonunda uygulamalar eski rol adlarını görmeyeceği için E13/E14 hemen ardından gelmelidir).
- Var olan `20260724*` migration dosyalarını düzenlemek.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Her migration idempotent olmalı: `if not exists`, `on conflict do nothing`, `drop constraint if exists` kullan.
- Kolon eklemede **asla** doğrudan `NOT NULL` verme; önce nullable ekle, backfill et, sonra kısıtı koy. Aksi halde mevcut veri nedeniyle migrasyon patlar.
- Rol dönüşümü ile kısıt değişimi aynı dosyada ve **önce veri, sonra kısıt** sırasıyla yapılmalı.
- `dealerships.code` büyük harfli ve tire içeren format (`YETIS-MERKEZ`).
- Yorum satırları Türkçe; SQL anahtar kelimeleri mevcut dosyalardaki gibi küçük harf.
- Yetiş Admin kullanıcısının `dealership_id` alanı NULL kalır; sorgu ve politikalar bunu tolere edecek şekilde tasarlanmalıdır (E12 için not düş).

## 7. KABUL KRİTERLERİ
- [ ] `supabase db reset` sıfırdan hatasız çalışır; seed sonrası `dealerships` en az 2 satır içerir.
- [ ] `select count(*) from customers where dealership_id is null` → 0; aynı kontrol `visits` ve `location_logs` için de 0 (backfill + seed sonrası).
- [ ] `customers.dealership_id` ve `visits.dealership_id` `NOT NULL`; `dealership_id` verilmeden esnaf eklendiğinde interim `DEFAULT` Yetiş Merkez uygulanır.
- [ ] `select distinct role from users` yalnızca `yetis_admin`, `dealer_admin`, `field_rep` döndürür.
- [ ] `insert into users (..., role) values (..., 'manager')` **hata verir** (kısıt ihlali).
- [ ] `select count(*) from visits where customer_snapshot is null` → 0.
- [ ] Yeni `auth.users` kaydı `raw_user_meta_data` içinde `"role": "yetis_admin"` ile açılsa bile `public.users.role` değeri `field_rep` olur.
- [ ] Migrationlar mevcut (dolu) bir veritabanına ikinci kez uygulandığında hata vermez.
- [ ] `check_in_attempts` tablosu ve indeksleri mevcut.
- [ ] Mevcut Faz 1 akışları çalışmaya devam eder: seed temsilcisiyle ziyaret kaydı oluşturulabilir.

## 8. DOĞRULAMA
Komutlar:
```bash
supabase db reset
supabase db push --dry-run
npm --workspace @saha/shared run test
```

SQL kontrolleri (psql veya Supabase SQL editor):
```sql
select id, name, code, is_active from public.dealerships;
select role, count(*) from public.users group by role;
select count(*) filter (where dealership_id is null) as bayisiz_esnaf from public.customers;
select count(*) filter (where customer_snapshot is null) as snapshotsiz_ziyaret from public.visits;
-- olumsuz senaryo: eski rol adı reddedilmeli
update public.users set role = 'manager' where role = 'dealer_admin';
```
Son sorgu **hata vermelidir**. İkinci kez `supabase db push` çalıştırıldığında yeni migrationlar yeniden uygulanmamalı, hata üretmemelidir.

## 9. KISITLAR
- Yalnızca `supabase/` altına dokun. `apps/web`, `apps/mobile`, `packages/shared` DEĞİŞMEZ.
- Var olan migration dosyalarını düzenleme; yalnızca yeni dosya ekle.
- Veri kaybı üreten işlem YOK: `drop column`, `truncate`, `delete from` kullanma.
- `dealer_manager` rolü OLUŞTURULMAZ.
- Seed dosyasındaki şifreler yalnızca yerel geliştirme içindir; üretim verisi yazma.
- Git commit YOK.
