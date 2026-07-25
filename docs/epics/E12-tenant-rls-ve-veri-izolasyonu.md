# E12 — Veritabanı: Bayi Bazlı RLS, Aktiflik Kapıları ve Veri İzolasyonu

> **Boyut:** ORTA | **Bağımlılıklar:** E11 (dealerships, tenant kolonları, üç rollü model) | **Hat:** Ortak (DB)
> **Özet:** Tüm RLS politikalarını bayi bazlı yeniden yazar; `is_active` kontrolünü veritabanı seviyesine indirir; `SECURITY DEFINER` fonksiyonlarını bayi sınırıyla kapatır; storage politikalarını günceller; Yetiş Admin'in operasyon kayıtlarını değiştirmesini engeller. İki alt oturumda çalıştırılır (12a: yardımcılar + tablo politikaları, 12b: fonksiyonlar + storage + izolasyon testleri).

---

# E12 — Veritabanı: Bayi Bazlı RLS, Aktiflik Kapıları ve Veri İzolasyonu

## 1. ROL
Sen kıdemli bir PostgreSQL güvenlik mühendisisin. Supabase RLS, `SECURITY DEFINER` fonksiyonların tuzakları ve çok kiracılı (multi-tenant) veri izolasyonu konusunda deneyimlisin. Politikaları yazarken her zaman "başka bayinin verisi hangi yoldan sızabilir?" sorusunu sorarsın. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
E11 TAMAMLANDI. Hazır gelenler:
- `dealerships` tablosu ve `Yetiş Merkez` (`b0000000-0000-0000-0000-000000000001`).
- `users.dealership_id` (Yetiş Admin için NULL olabilir), `customers.dealership_id` + `created_by`, `visits.dealership_id` + `customer_snapshot`, `location_logs.dealership_id` — hepsi dolu.
- Roller: `yetis_admin`, `dealer_admin`, `field_rep`.
- `check_in_attempts` tablosu oluşturuldu ama RLS'i yok.

Mevcut politikalar `supabase/migrations/20260724000006_rls.sql` içinde ve hâlâ `admin` / `manager` rollerini referans alıyor; bu adlar artık tabloda yok, dolayısıyla **politikalar fiilen kimseye yönetici yetkisi vermiyor**. Bu epic olmadan sistem yönetilemez durumdadır.

Denetim bulguları: K-01 (kayıt ile rol yükseltme), Y-04 (pasif kullanıcı erişimi). Kesin kurallar: [docs/proje-denetimi-2026-07-25.md](../proje-denetimi-2026-07-25.md) bölüm 4.

## 3. HEDEF
Bir bayinin kullanıcısı, başka bir bayinin esnafını, ziyaretini, konum logunu veya fotoğrafını hiçbir sorgu yolundan göremez ve değiştiremez. Pasif kullanıcı ve pasif bayi veri yazamaz. Yetiş Admin her şeyi görür, master verileri yönetir, ancak ziyaret ve konum kayıtlarını değiştiremez. Saha temsilcisi bayi değiştirse bile kendi geçmiş ziyaretlerinin liste kaydını görmeye devam eder.

## 4. KAPSAM

### Oturum 12a — Yardımcı fonksiyonlar ve tablo politikaları

Dosya: `supabase/migrations/20260726000010_rls_helpers.sql`
- `current_user_role()` korunur (stable, security definer).
- `is_yetis_admin() returns boolean` — `current_user_role() = 'yetis_admin'`.
- `auth_user_dealership_id() returns uuid` — oturum sahibinin bayisi.
- `auth_user_is_active() returns boolean` — `users.is_active` **ve** bağlı bayi aktifse (bayisiz Yetiş Admin için yalnızca `users.is_active`) true.
- Tüm yardımcılar `stable security definer set search_path = public` ve `revoke all ... from public` + `grant execute ... to authenticated`.

Dosya: `supabase/migrations/20260726000011_rls_policies.sql`
- Eski politikaları `drop policy if exists` ile düşür, yenilerini kur.
- `dealerships`: SELECT → Yetiş Admin tümü, diğerleri yalnızca kendi bayisi. INSERT/UPDATE → yalnızca Yetiş Admin. DELETE → yok.
- `categories`: SELECT → tüm authenticated. INSERT/UPDATE/DELETE → yalnızca Yetiş Admin (global kategori kuralı).
- `users`: SELECT → kendisi, aynı bayideki `dealer_admin`, Yetiş Admin tümü. UPDATE → kendisi (sınırlı), aynı bayideki `dealer_admin`, Yetiş Admin. Rol ve `dealership_id` değişimi `prevent_role_escalation` ile korunur.
- `customers`: SELECT → Yetiş Admin tümü; diğerleri yalnızca kendi bayisi (temsilci için ek olarak `is_active`). INSERT → Yetiş Admin (herhangi bir bayi) **veya** `dealership_id = auth_user_dealership_id()` + `created_by = auth.uid()` + `auth_user_is_active()`. UPDATE → `dealer_admin` kendi bayisinde tümü, `field_rep` yalnızca `created_by = auth.uid()`, Yetiş Admin tümü. DELETE → yok (pasifleştirme kullanılır).
- `visits`: SELECT → Yetiş Admin tümü, `field_rep_id = auth.uid()` (transfer sonrası kendi geçmişi), aynı bayideki `dealer_admin`. INSERT → `field_rep_id = auth.uid()` ve `auth_user_is_active()`. UPDATE → yalnızca `field_rep_id = auth.uid()` **ve** `check_out_at is null` (kendi açık ziyaretini kapatmak için). DELETE → yok.
- `visit_photos`: SELECT/INSERT → ilgili ziyaretin sahibi veya aynı bayideki `dealer_admin`; Yetiş Admin SELECT. DELETE → yok.
- `location_logs`: SELECT → kendisi, aynı bayideki `dealer_admin`, Yetiş Admin. INSERT → `user_id = auth.uid()`, `dealership_id = auth_user_dealership_id()`, `auth_user_is_active()`. UPDATE/DELETE → yok.
- `check_in_attempts`: SELECT → aynı bayideki `dealer_admin` ve Yetiş Admin. INSERT → yalnızca `SECURITY DEFINER` fonksiyon üzerinden (doğrudan insert politikası verme). UPDATE/DELETE → **hiç kimse** (append-only).

### Oturum 12b — Fonksiyon sıkılaştırma, storage ve testler

Dosya: `supabase/migrations/20260726000012_function_hardening.sql`
- `get_customers_nearby(...)`: sonuçları `dealership_id = auth_user_dealership_id()` ile filtrele (Yetiş Admin için tümü). Bugün `SECURITY DEFINER` olduğu için RLS'i atlıyor ve bayi sınırını delebiliyor.
- `validate_check_in_location(p_customer_id, p_location)`: çağıranın bayisiyle eşleşmeyen müşteri için `false` döndür.
- `purge_old_location_logs()`: davranış aynı; yalnızca `service_role` çağırabilsin (`revoke execute ... from authenticated`).
- Yetiş Admin sınırı: `visits` ve `location_logs` üzerine `prevent_yetis_admin_mutation` tetikleyicisi ekle — `yetis_admin` rolüyle yapılan UPDATE/DELETE denemesinde `raise exception`.

Dosya: `supabase/migrations/20260726000013_storage_policies.sql`
- `visit-photos` bucket politikalarındaki `admin`/`manager` referanslarını yeni rollerle değiştir.
- Okuma yetkisi: dosyanın sahibi temsilci, ziyaretin bayisindeki `dealer_admin`, Yetiş Admin.
- Yazma yetkisi: yalnızca aktif temsilci, yalnızca kendi klasörü (`{user_id}/...`).

Dosya: `supabase/tests/tenant_isolation.sql` (yeni dizin)
- `set local role authenticated` + `set local request.jwt.claims` ile farklı kullanıcıları taklit ederek negatif senaryoları çalıştıran, başarısızlıkta `raise exception` üreten idempotent bir SQL betiği.
- Kapsanacak senaryolar madde 7'deki kabul kriterleriyle birebir eşleşmelidir.

## 5. KAPSAM DIŞI
- Sert geofence reddi ve reddedilen deneme **yazımı** — E18 (bu epic yalnızca tabloya erişim kurallarını belirler).
- Uygulama kodu (`apps/web`, `apps/mobile`, `packages/shared`) — E13/E14.
- Yeni tablo veya kolon eklemek — E11'de tamamlandı.
- CI entegrasyonu — E20.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Politika isimleri mevcut konvansiyonu izler: `<tablo>_<işlem>` (örn. `customers_insert`).
- Her politika `to authenticated` hedefler; `public` role politika verme.
- `USING` ve `WITH CHECK` ifadelerini ayrı ayrı düşün: okuma sızıntısı `USING`, yazma sızıntısı `WITH CHECK` üzerinden olur.
- Yardımcı fonksiyonlar politikalarda tekrar tekrar çağrılacağı için `stable` işaretlenmeli.
- Yetiş Admin `dealership_id IS NULL` olduğundan, `dealership_id = auth_user_dealership_id()` karşılaştırması Yetiş Admin için asla true dönmez; bu yüzden her politikada `is_yetis_admin() OR ...` ayrı dal olarak yazılmalı.
- `check_in_attempts` için UPDATE/DELETE politikası **yazılmaz**; RLS açıkken politikası olmayan işlem reddedilir.
- Yorumlar Türkçe; SQL küçük harf.

## 7. KABUL KRİTERLERİ
Her madde `supabase/tests/tenant_isolation.sql` içinde otomatik doğrulanmalıdır. Listenin tamamı bilinçli olarak **olumsuz senaryolardan** oluşur: bu epicte doğrulanması gereken şey, bir işlemin çalışması değil, çalışmamasıdır.

- [ ] `Test Bayi` temsilcisi `Yetiş Merkez` esnafını **listeleyemez** (0 satır).
- [ ] `Test Bayi` temsilcisi `Yetiş Merkez` esnafına ziyaret **ekleyemez** (politika veya tetikleyici reddi).
- [ ] `Test Bayi` `dealer_admin`'i başka bayinin ziyaretlerini **göremez**.
- [ ] `dealer_admin` başka bayideki kullanıcıyı **güncelleyemez**.
- [ ] `field_rep` başkasının oluşturduğu esnafı **güncelleyemez**; kendi oluşturduğunu güncelleyebilir.
- [ ] `field_rep` kategori ekleyemez; `dealer_admin` de ekleyemez; yalnızca `yetis_admin` ekleyebilir.
- [ ] `is_active = false` yapılan kullanıcı yeni ziyaret ve konum logu **ekleyemez**.
- [ ] Bayisi `is_active = false` olan kullanıcı yeni kayıt **ekleyemez**; Yetiş Admin bu bayinin geçmiş verisini görmeye devam eder.
- [ ] `yetis_admin` bir ziyaret satırını **güncelleyemez ve silemez** (tetikleyici hatası).
- [ ] `check_in_attempts` satırı hiçbir rol tarafından **güncellenemez veya silinemez**.
- [ ] Bayi değiştirilen temsilci, eski bayideki ziyaretlerini `visits` üzerinden **görmeye devam eder**; ancak o ziyaretin esnaf kaydını `customers` üzerinden **göremez**.
- [ ] `get_customers_nearby` başka bayinin esnafını döndürmez.
- [ ] `validate_check_in_location` başka bayinin müşterisi için `false` döner.
- [ ] Storage: temsilci başka temsilcinin fotoğrafını indiremez.

## 8. DOĞRULAMA
Komutlar:
```bash
supabase db reset
psql "$DATABASE_URL" -f supabase/tests/tenant_isolation.sql
```
Betik hatasız tamamlanmalı ve her senaryo için `NOTICE` satırı basmalıdır. Bir senaryo geçemezse betik `exception` ile durur.

Manuel: Supabase Studio'da `Test Bayi` temsilcisi olarak oturum açıp `/esnaflar` sorgusunu çalıştır; yalnızca kendi bayisinin esnaflarının döndüğünü gör. Ardından `dealerships` üzerinden `Test Bayi`'yi pasife alıp aynı temsilcinin ziyaret ekleyemediğini doğrula.

## 9. KISITLAR
- Yalnızca `supabase/` altına dokun.
- Var olan migration dosyalarını düzenleme; `20260724000006_rls.sql` dosyası tarihsel kayıt olarak kalır, politikalar yeni dosyada düşürülüp yeniden kurulur.
- Politika mantığını uygulama katmanına bırakma: "web zaten filtreliyor" gerekçesiyle gevşek politika yazma.
- `dealer_manager` rolü YOK.
- İki alt oturumda ilerle; 12a kabul kriterlerini sağlamadan 12b'ye geçme.
- Git commit YOK.
