# Proje Denetim Raporu — 25 Temmuz 2026

Bu rapor, çoklu bayi (multi-tenancy) dönüşümü öncesinde projenin **gerçek** çalışma durumunu tespit eder.
Her bulgu, ya çalıştırılan bir komutun çıktısına ya da kod satırına dayanır; varsayım olan maddeler ayrıca işaretlenmiştir.

Denetim kapsamı: `apps/web`, `apps/mobile`, `packages/shared`, `supabase/`, `docs/epics/`, kök yapılandırma.

---

## 1. Çalıştırılan Doğrulamalar

| Komut | Sonuç | Not |
|:--|:--|:--|
| `npm --workspace @saha/shared run test` | **Geçti** — 4 dosya / 31 test | Tek otomatik test paketi |
| `npm run lint` | **Geçti** — 3 paket | Uyarı yok |
| `npm --workspace @saha/web run build` | **Geçti** — 15 rota | 4 edge API rotası dahil |
| `npm run typecheck` | **BAŞARISIZ** — `@saha/mobile` | `@saha/web` ve `@saha/shared` geçti |
| `npx tsc --noEmit` (`apps/mobile`) | **BAŞARISIZ** — 788 hata | Tüm RN ekranlarını etkiliyor |

Ek kontroller:

- CI yapılandırması yok: `.github/` dizini mevcut değil.
- Kökte `test` script'i yok ([package.json](../package.json)); `turbo.json` içinde `test` görevi tanımlı değil.
- `apps/web` ve `apps/mobile` altında hiçbir test dosyası yok.

### 1.1. Terminal geçmişinden gözlemler

- Android debug build'i **en son başarılı** (`BUILD SUCCESSFUL in 57s`); daha önceki oturumlarda `MLRNPackage` (MapLibre) ve `expo-modules-core` Kotlin hataları nedeniyle başarısız build'ler kayıtlı. Yani derleme hattı kırılgan ama şu an ayakta.
- Metro/emülatör logunda vardiya ve konum tamponu çalışıyor: `[VardiyaGorev] Konum kabul edildi (still)`, `[Buffer] 1 kayıt başarıyla location_logs tablosuna gönderildi.`
- Next.js dev sunucusu ayakta; her başlangıçta `Failed to patch lockfile` uyarısı üretiyor (workspace + `npm error code ENOWORKSPACES`). İşlevi engellemiyor, gürültü yaratıyor.

---

## 2. Sayfa ve Ekran Envanteri

### 2.1. Web (`apps/web`)

| Rota | Durum | Not |
|:--|:--|:--|
| `/` | Çalışıyor | `/panel` yönlendirmesi |
| `/giris` | Çalışıyor | Rol, `is_active`, `must_change_password` kontrolü |
| `/panel` | Çalışıyor, **yetki açığı var** | `RoleGuard` yok (B-04) |
| `/esnaflar`, `/esnaflar/yeni`, `/esnaflar/[id]`, `/esnaflar/[id]/duzenle` | Çalışıyor | İstemci taraflı `RoleGuard` |
| `/ziyaretler` | **Yer tutucu** | "Bu modül yakında eklenecek" |
| `/raporlar` | Çalışıyor | KPI, Recharts, ısı haritası, CSV |
| `/ayarlar`, `/ayarlar/kategoriler`, `/ayarlar/kullanicilar` | Çalışıyor | Yalnız `admin` |
| `/sifre-degistir` | Çalışıyor, **guard açığı var** | Middleware matcher'ında yok (B-05) |
| `/api/kullanicilar/{davet,olustur,sifre-degistir,sifre-sifirla}` | Çalışıyor | Edge runtime + service role |

### 2.2. Mobil (`apps/mobile`)

| Ekran | Durum | Not |
|:--|:--|:--|
| `(auth)/login.tsx` | Çalışıyor | `is_active` kontrolü yok (B-07) |
| `sifre-degistir.tsx` | Çalışıyor | `complete_password_change` RPC |
| `kvkk.tsx` | Çalışıyor | Sürümlü onay |
| `(tabs)/index.tsx` (Ziyaretler) | **Yer tutucu** | "Bu ekran yakında eklenecek" |
| `(tabs)/esnaflar.tsx` | Çalışıyor | Liste, harita, filtre |
| `(tabs)/profil.tsx` | Çalışıyor | Vardiya anahtarı, tampon sayacı |
| `esnaf/[id].tsx` | Çalışıyor | Detay, ziyaret başlatma, galeri |
| `esnaf/yeni.tsx`, `esnaf/konum-sec.tsx` | **Arayüz hazır, kayıt RLS'e takılıyor** | B-02 |
| `ziyaret/aktif.tsx`, `ziyaret/kamera.tsx`, `ziyaret/ozet.tsx` | Çalışıyor, bütünlük açıkları var | B-01, B-03, B-08 |

**Not:** Mobil ekranların çalışır durumu emülatör logları ve kod incelemesine dayanır. Kamera filigranı ve gerçek GPS doğruluğu yalnızca fiziksel cihazda kesinleşir (E20 kapısı).

---

## 3. Bulgular

Önem: **K** = Kritik, **Y** = Yüksek, **O** = Orta.

### K-01 — Kendi kaydıyla rol yükseltme (privilege escalation)

`handle_new_user`, rolü doğrudan kullanıcı metadata'sından okuyor ve kayıt açık:

```14:14:supabase/migrations/20260724000004_functions.sql
    coalesce(new.raw_user_meta_data->>'role', 'field_rep')
```

```17:17:supabase/config.toml
enable_signup = true
```

Anon anahtarına sahip herkes `{ "role": "admin" }` metadata'sıyla kayıt olup admin olabilir. `config.toml` yerel ortamı bağlar; barındırılan projede kayıt ayarının da kapalı olduğu **ayrıca doğrulanmalıdır**. Çözüm epiği: **E12**.

### K-02 — Mobil typecheck 788 hata veriyor

`apps/mobile` içinde `npx tsc --noEmit` 788 hata üretiyor; tamamı `TS2607` / `TS2786` ("`View` cannot be used as a JSX component") ailesinden ve tüm ekranları kapsıyor.

Kök neden: kökte `@types/react` kurulu değil. `react-native` paketi kökte hoist edilmiş durumda (`node_modules/react-native@0.74.5`), dolayısıyla RN'in kendi `.d.ts` dosyaları React tiplerini çözemiyor; `apps/mobile/node_modules/@types/react@18.2.79` yalnızca uygulama dosyalarına görünür. TypeScript 5.4 ile de aynı 788 hata alınıyor, yani sorun derleyici sürümü değil bağımlılık yerleşimi.

Etkisi: her mobil epicin kabul kriteri olan `npx tsc --noEmit` kapısı şu an geçilemez durumda. Çözüm epiği: **E13**.

### K-03 — Ziyaretten vazgeçmek veritabanında açık kayıt bırakıyor

```136:141:apps/mobile/src/lib/ActiveVisitContext.tsx
  const cancelCurrentVisit = async () => {
    // Note: cancellation clears local state (visit stays in DB as unchecked-out or aborted)
    setActiveVisit(null);
    setActiveCustomer(null);
    setCapturedPhotoState(null);
    await clearActiveVisitState();
  };
```

Kayıt `check_out_at IS NULL` olarak kalır. `startVisit` yalnızca bellekteki `activeVisit`'e bakar, veritabanındaki açık ziyarete bakmaz; ayrıca tek açık ziyaret kısıtı veritabanında tanımlı değil. Sonuç: yetim açık ziyaretler, çoklu aktif ziyaret ve `maybeSingle` ile yapılan toparlanmanın bozulması. Çözüm epiği: **E18**.

### K-04 — GPS alınamazsa check-out ziyareti hiç kapatmıyor

Mobil taraf, konum alınamazsa `check_out_location` alanını `null` gönderiyor:

```143:153:apps/mobile/src/lib/visits.ts
  const ewktLocation = userLocation
    ? `SRID=4326;POINT(${userLocation.longitude} ${userLocation.latitude})`
    : null;
```

Tetikleyici ise `check_out_at` değerini yalnızca konum doluysa yazıyor:

```20:22:supabase/migrations/20260724000005_triggers.sql
  if new.check_out_location is not null and old.check_out_at is null then
    new.check_out_at := now();
  end if;
```

Sonuç: kullanıcı "Ziyareti Bitir" akışını tamamlasa bile ziyaret açık kalır, `duration_minutes` üretilmez ve rapor sayıları yanlışlanır. Çözüm epiği: **E18**.

### Y-01 — Geofence yalnızca işaretliyor, engellemiyor

`visits_before_insert` yalnızca `is_geofence_valid` bayrağını yazar; menzil dışı kayıt reddedilmez. Mobil tarafta "Yine de Başlat" akışı bunu bilinçli olarak kullanır. Kesinleşen hedef ise 100 m dışını **kesin engellemek** ve reddedilen denemeyi değiştirilemez bir denetim kaydına yazmaktır. Reddedilen deneme kaydı için tablo/RPC bulunmuyor. Çözüm epiği: **E18**.

### Y-02 — Saha temsilcisi esnaf ekleyemiyor

```39:42:supabase/migrations/20260724000006_rls.sql
create policy "customers_write" on public.customers
  for all to authenticated
  using (public.current_user_role() in ('admin', 'manager'))
  with check (public.current_user_role() in ('admin', 'manager'));
```

Mobil "Yeni Esnaf" ekranı `field_rep` rolüyle insert denediği için RLS engeline takılır. Ayrıca `customers` tablosunda `created_by` alanı yok; "yalnızca kendi eklediği esnafı düzenleme" kuralı bugün uygulanamaz. Çözüm epiği: **E17**.

### Y-03 — `field_rep` web paneline girebiliyor

Middleware yalnızca oturum kontrolü yapar; rol kontrolü yoktur ve `/panel` sayfasında `RoleGuard` kullanılmaz. Mobil ile giriş yapmış bir temsilcinin tarayıcı oturumu `/panel` içeriğini açabilir; RLS gereği kendi ziyaretlerini ve aktif esnafları görür. Çözüm epiği: **E14**.

### Y-04 — Pasif kullanıcı erişimi sürüyor

`is_active` yalnızca web giriş ekranında kontrol edilir. RLS politikalarının hiçbiri `is_active` bakmaz; mobil taraf bu alanı hiç okumaz. Pasife alınan kullanıcı, geçerli JWT süresince veri yazmaya devam edebilir. Çözüm epikleri: **E12** (veritabanı), **E14** (uygulama).

### Y-05 — `/sifre-degistir` middleware kapsamı dışında

`updateSession` bu yolu korumalı sayar, ancak `middleware.ts` matcher listesinde yer almaz:

```8:18:apps/web/src/middleware.ts
export const config = {
  matcher: [
    '/',
    '/giris',
    '/panel/:path*',
    '/esnaflar/:path*',
    '/ziyaretler/:path*',
    '/raporlar/:path*',
    '/ayarlar/:path*',
  ],
};
```

Oturumsuz kullanıcı sayfayı açabilir; API 401 döndürdüğü için veri sızıntısı yoktur, ancak akış tutarsızdır. Çözüm epiği: **E14**.

### Y-06 — Takip edilmeyen migrasyona bağımlılık

`must_change_password` alanı yalnızca `supabase/migrations/20260724000008_must_change_password.sql` içinde tanımlı ve bu dosya git'te izlenmiyor. Web profil sorgusu ve mobil auth bu alanı okuyor; migrasyon uygulanmazsa profil yüklemesi hata verir. Çözüm epiği: **E11**.

### Y-07 — Ziyaret geçmişi canlı müşteri kaydına bağlı

`visits` tablosunda müşteri anlık görüntüsü (snapshot) yok. Esnaf adı değişirse veya temsilci başka bayiye geçerse geçmiş kayıtlar yanlış/erişilemez görünür. Kesinleşen kural, transfer sonrası temsilcinin yalnızca snapshot tabanlı liste görmesidir. Çözüm epikleri: **E11** (kolon), **E19** (ekran).

### O-01 — Mock konum bayrağı check-out'ta eziliyor

`performCheckOut`, `is_mock_location` alanını check-out anındaki ölçümle (konum alınamazsa `false`) yeniden yazar. Check-in anındaki sahtecilik sinyali kaybolabilir. Çözüm epiği: **E18**.

### O-02 — İstemci geofence yarıçapı sabit 100 m

Mobil `visits.ts` içinde eşik `100` olarak sabit; veritabanında ise müşteri bazında `geofence_radius_m` (25–1000) kullanılır. Hedef politika sabit 100 m olduğundan bu tutarsızlık şema tarafında da çözülmelidir. Çözüm epiği: **E18**.

### O-03 — Fotoğraf konumu gerçek çekim GPS'i değil

`completeCurrentVisit`, `capture_location` olarak müşterinin pin konumunu gönderir; filigrandaki canlı GPS ile kayıt altına alınan koordinat farklıdır. Çözüm epiği: **E18**.

### O-04 — Test ve CI zemini yok

Otomatik test yalnızca `packages/shared` içinde. Web rotaları, API rotaları, mobil durum makinesi ve RLS politikaları için test yok; CI hiç yok. Çoklu bayi izolasyonu bu zemin olmadan güvenle doğrulanamaz. Çözüm epiği: **E20**.

### O-05 — Belge kayması (documentation drift)

Tespit edilen kaymalar ve bu denetim kapsamında yapılan düzeltmeler:

| Kayma | Durum |
|:--|:--|
| [proje_incelemesi.md](../proje_incelemesi.md) var olmayan migrasyon adlarına (`20260725000000_initial_schema.sql`, `20260725000001_dealership_schema.sql`) ve var olmayan alanlara (`is_geofence_verified`, `customers.deleted_at`) atıf yapıyordu | Düzeltildi; gerçek dosya adları ve `is_geofence_valid` yazıldı |
| Aynı belge `dealer_manager` rolünü içeriyordu | Düzeltildi; üç rollü model yazıldı |
| Storage limiti 5MB olarak anlatılıyordu; gerçek değer 2MB | Düzeltildi |
| Kök [README.md](../README.md) yol haritası E03'te bitiyordu | Düzeltildi; Faz 1 ve Faz 2 listeleri eklendi |
| `docs/epics/E06-mobil-ziyaret-akisi.md` "Yine de Başlat" akışını kabul kriteri sayıyor; yeni politika bunu yasaklıyor | **Açık** — E06 tarihsel kayıt olarak korunur, kural E18 ile değiştirilir |
| Epic belgeleri "Saha" derken kod `Yetiş+ Saha` markasını kullanıyor | **Açık** — marka birleştirmesi ayrı bir düzenleme gerektirir |

---

## 4. Kesinleşen Hedef Mimari

Bu bölüm, çoklu bayi dönüşümünde bağlayıcı olan kararları özetler. `proje_incelemesi.md` ile çelişen ifadelerde bu bölüm geçerlidir.

### 4.1. Roller

| Rol | Yetki |
|:--|:--|
| `yetis_admin` | Tüm bayileri ve verileri görür. Bayi, bayi admini, kullanıcı, esnaf ve global kategori yönetir. Ziyaret ve GPS kayıtlarını **değiştiremez**. |
| `dealer_admin` | Yalnızca kendi bayisi: saha elemanı yaşam döngüsü (oluşturma, düzenleme, pasife alma, şifre sıfırlama), esnaf yönetimi, panel ve raporlar. |
| `field_rep` | Mobil operasyon. Kendi bayisinin esnaflarını görür, esnaf ekler, yalnızca kendi eklediği esnafı düzenler. |

`dealer_manager` rolü **kapsam dışıdır**. Mevcut `admin` → `yetis_admin`, mevcut `manager` → varsayılan bayinin `dealer_admin` rolüne taşınır.

### 4.2. Bağlayıcı kurallar

1. **Varsayılan bayi:** Mevcut tüm veriler `Yetiş Merkez` (`YETIS-MERKEZ`) bayisine taşınır. `dealership_id` kolonları önce nullable eklenir, backfill sonrası `NOT NULL` yapılır.
2. **Geofence:** 100 m dışındaki check-in veritabanı seviyesinde reddedilir. Reddedilen her deneme, append-only bir denetim tablosuna yazılır.
3. **Esnaf sahipliği:** `customers.dealership_id` zorunlu, `customers.created_by` zorunlu. Temsilci yalnızca kendi oluşturduğu kaydı düzenler.
4. **Aktiflik:** Pasif kullanıcı ve pasif bayi, oturum açamaz ve yeni işlem yapamaz. Geçmiş veriler silinmez; Yetiş Admin görmeye devam eder.
5. **Transfer izolasyonu:** `users.dealership_id` güncellenir; `visits.dealership_id` ve `location_logs.dealership_id` **asla** güncellenmez. Temsilci eski ziyaretlerini yalnızca snapshot tabanlı liste satırı olarak görür; eski bayinin güncel müşteri kaydına erişemez.
6. **Kategoriler:** Global; yalnızca `yetis_admin` yazabilir.
7. **Giriş:** Tek form; rol belirlendikten sonra otomatik yönlendirme.
8. **Bayi seçici:** Yetiş Admin için "Tüm Bayiler" + tek bayi seçimi; varsayılan "Tüm Bayiler".
9. **Lisans/kota:** Sert kullanıcı limiti yok.

---

## 5. Bulgu → Epic Eşlemesi

| Bulgu | Epic |
|:--|:--|
| Y-06 (takip edilmeyen migrasyon), Y-07 (snapshot kolonu) | E11 |
| K-01 (rol yükseltme), Y-04 (pasif erişim, veritabanı) | E12 |
| K-02 (mobil typecheck), O-04 (test zemini, sözleşmeler) | E13 |
| Y-03 (web rol açığı), Y-04 (pasif erişim, uygulama), Y-05 (middleware) | E14 |
| Bayi yönetimi ve bayi seçici (yeni yetenek) | E15 |
| Kategori yazma yetkisi, panel/rapor bayi kapsamı | E16 |
| Y-02 (temsilci esnaf ekleme ve sahiplik) | E17 |
| K-03, K-04, Y-01, O-01, O-02, O-03 | E18 |
| `/ziyaretler` yer tutucuları (web + mobil), Y-07 ekran tarafı | E19 |
| O-04 (CI, e2e, fiziksel cihaz kapısı) | E20 |
| O-05 (belge kayması) | Bu rapor + E11 ile birlikte güncellenir |

Ayrıntılı epic tanımları için: [docs/epics/README.md](epics/README.md)
