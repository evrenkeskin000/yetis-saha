# E13 — Shared: Bayi Sözleşmeleri, Rol Modeli ve Test Zemini

> **Boyut:** Küçük | **Bağımlılıklar:** E11 (şema), E12 (politikalar) | **Hat:** Ortak
> **Özet:** `@saha/shared` paketini yeni rol modeline ve bayi alanlarına taşır; mobil typecheck'i kıran bağımlılık yerleşimini düzeltir; kökte `test` görevi tanımlayarak monorepo genelinde tek komutla test çalıştırılmasını sağlar.

---

# E13 — Shared: Bayi Sözleşmeleri, Rol Modeli ve Test Zemini

## 1. ROL
Sen kıdemli bir TypeScript kütüphane geliştiricisisin. Monorepo bağımlılık yönetimi, Zod şemaları ve Vitest ile birim testi konusunda deneyimlisin. Tip sözleşmelerini veritabanı şemasıyla birebir tutmaya özen gösterirsin. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
E11 ve E12 TAMAMLANDI: veritabanında `dealerships` tablosu, `dealership_id` kolonları, `customers.created_by`, `visits.customer_snapshot`, `check_in_attempts` tablosu ve üç rollü model (`yetis_admin`, `dealer_admin`, `field_rep`) mevcut.

`packages/shared` bugün eski modeli yansıtıyor:
- `src/types.ts` → `UserRole = 'admin' | 'manager' | 'field_rep'`
- `src/constants.ts` → `ROLES` ve `ROLE_LABELS` aynı eski değerlerle; `APP_NAME = 'Yetiş+ Saha'`
- `src/validation.ts` → `createUserSchema` rolü `ROLES` üzerinden doğruluyor
- `src/api.ts` → `getTodayVisits`, `getActiveVisit`, `getCustomersNearby`, `createVisit`, `completeVisit`, `uploadVisitPhoto`
- `src/__tests__/` → 4 dosya, 31 test (şu an geçiyor)

**Kritik engel (denetim bulgusu K-02):** `apps/mobile` içinde `npx tsc --noEmit` şu anda **788 hata** veriyor. Hataların tamamı `TS2607` / `TS2786` ("`View` cannot be used as a JSX component") ailesinden. Kök neden: `react-native` paketi monorepo kökünde hoist edilmiş (`node_modules/react-native@0.74.5`) ancak kökte `@types/react` kurulu değil; bu yüzden RN'in kendi `.d.ts` dosyaları React tiplerini çözemiyor. `apps/mobile/node_modules/@types/react@18.2.79` yalnızca uygulama dosyalarına görünür. TypeScript 5.4 ile de aynı hata sayısı alınıyor, yani sorun derleyici sürümü değil bağımlılık yerleşimidir.

Bu engel kapatılmadan hiçbir mobil epicin kabul kriteri (`npx tsc --noEmit` temiz) sağlanamaz.

## 3. HEDEF
İki uygulama da yeni rol ve bayi sözleşmelerini tek kaynaktan alır; mobil typecheck yeniden yeşile döner; `npm test` komutu kökten çalışır ve mevcut testler yeni modele göre güncellenmiş olarak geçer.

## 4. KAPSAM

### 4.1. Bağımlılık yerleşimi düzeltmesi (önce bu yapılır)
- Kök `package.json` içine `@types/react` ekle; sürümü mobil ile uyumlu olacak şekilde sabitle (`~18.2.45` ailesinden çözülen sürüm) ki hoist edilmiş `react-native` tipleri React'i çözebilsin.
- Aynı React tipi sürümünün iki uygulamada da geçerli olduğunu doğrula; gerekirse kök `package.json` içinde `overrides` ile `@types/react` sürümünü sabitle.
- `npm install` sonrası `apps/mobile` içinde `npx tsc --noEmit` **0 hata** vermelidir. Hata sayısı sıfırlanmadan diğer maddelere geçme.
- Uygulama kaynak kodunda tip hatası bastırmak için `@ts-ignore`, `any` veya `skipLibCheck` gevşetmesi KULLANMA; sorun bağımlılık yerleşiminde çözülür.

### 4.2. Tipler (`packages/shared/src/types.ts`)
- `UserRole = 'yetis_admin' | 'dealer_admin' | 'field_rep'`.
- Yeni `Dealership` arayüzü: `id`, `name`, `code`, `is_active`, `created_at`, `updated_at`.
- `User`: `dealership_id: string | null` eklenir.
- `Customer`: `dealership_id: string`, `created_by: string` eklenir.
- `Visit`: `dealership_id: string`, `customer_snapshot: VisitCustomerSnapshot | null` eklenir.
- Yeni `VisitCustomerSnapshot`: `business_name: string`, `address: string | null`, `category_id: string | null`.
- Yeni `CheckInAttempt`: `check_in_attempts` tablosuyla birebir.
- `LocationLog`: `dealership_id: string` eklenir.

### 4.3. Sabitler (`packages/shared/src/constants.ts`)
- `ROLES = ['yetis_admin', 'dealer_admin', 'field_rep']`.
- `ROLE_LABELS`: `yetis_admin` → "Yetiş Yöneticisi", `dealer_admin` → "Bayi Yöneticisi", `field_rep` → "Saha Temsilcisi".
- `DEFAULT_DEALERSHIP_CODE = 'YETIS-MERKEZ'`.
- `GEOFENCE_RADIUS_M = 100` — check-in için tek ve değişmez eşik. `DEFAULT_GEOFENCE_RADIUS_M` korunacaksa aynı değere işaret etmeli; iki farklı eşik bırakma.
- `ALL_DEALERSHIPS = 'all'` — Yetiş Admin bayi seçicisinin varsayılan değeri (E15 kullanır).

### 4.4. Doğrulama (`packages/shared/src/validation.ts`)
- `createUserSchema`: rol enum'u yeni `ROLES` üzerinden; `dealership_id` alanı eklenir — `field_rep` ve `dealer_admin` için zorunlu, `yetis_admin` için `null` olabilir (`superRefine` ile).
- `dealershipFormSchema`: `name` (min 2), `code` (büyük harf/rakam/tire, opsiyonel), `is_active`.
- `customerFormSchema`: değişmez alanlar korunur; `geofence_radius_m` artık forma bağlı değilse şemadan çıkarma yerine sabit 100 varsayılanına indirgenir (E18 ile tutarlı olacak şekilde not düş).

### 4.5. API yardımcıları (`packages/shared/src/api.ts`)
- `createVisit`: `field_rep_id` parametresini zorunlu alır (bugün eksik, NOT NULL kolonu ihlal ederdi).
- `getCustomersNearby`: dönüş tipine `dealership_id` eklenir.
- `getVisitHistory(supabase, fieldRepId, options)`: temsilcinin kendi geçmişi için snapshot alanlarını da seçen yeni yardımcı (E19 kullanır).
- Tüm `select` listelerine yeni kolonlar eklenir.

### 4.6. Test zemini
- Kök `package.json`: `"test": "turbo run test"`.
- `turbo.json`: `"test": { "dependsOn": ["^build"] }` görevi eklenir.
- `apps/web` ve `apps/mobile` `package.json` dosyalarına en azından bir `test` script'i eklenir (E20'de gerçek testler gelene kadar `echo` yerine gerçek runner kurulmalı; bu epicte shared testleri kökten çalışmalıdır).
- Mevcut testler yeni modele göre güncellenir: `constants.test.ts` içindeki `ROLES` beklentisi, `validation.test.ts` içindeki rol örnekleri, `api.test.ts` içindeki `createVisit` çağrısı.
- Yeni testler: rol enum'u reddi (`'manager'` → geçersiz), `dealershipFormSchema`, `createUserSchema` bayi zorunluluğu, `createVisit` payload'ında `field_rep_id`.

## 5. KAPSAM DIŞI
- Web ve mobil ekranlarının yeni tiplere göre güncellenmesi — E14 ve sonrası (bu epic yalnızca sözleşmeyi ve derleme zeminini verir; uygulamalarda tip hatası oluşması beklenir ve E14'te kapatılır).
- Gerçek web/mobil test paketleri ve CI — E20.
- Veritabanı değişikliği — E11/E12'de tamamlandı.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Önce 4.1 (bağımlılık düzeltmesi), sonra sözleşme değişiklikleri. Sıra tersine çevrilirse hata sayısı ayırt edilemez.
- Rol adları kod içinde string olarak tekrar edilmez; her yerde `UserRole` ve `ROLES` kullanılır.
- Zod hata mesajları Türkçe.
- Shared paketinden `any` dönen public API yazma.
- Mevcut export adlarını gereksiz yere değiştirme; yalnızca rol değerleri ve yeni alanlar değişir.

## 7. KABUL KRİTERLERİ
- [ ] `apps/mobile` içinde `npx tsc --noEmit` **0 hata** verir (öncesi: 788).
- [ ] `npm run typecheck` üç pakette de geçer.
- [ ] `npm test` kökten çalışır ve shared testleri geçer.
- [ ] `ROLES` yalnızca `yetis_admin`, `dealer_admin`, `field_rep` içerir; `'manager'` değeri `createUserSchema` tarafından **reddedilir** (olumsuz senaryo).
- [ ] `createUserSchema`, `field_rep` için `dealership_id` boş bırakıldığında hata döndürür.
- [ ] `createVisit` çağrısı `field_rep_id` olmadan tip hatası verir.
- [ ] `Visit` tipi `customer_snapshot` alanını içerir ve `api.ts` select listesinde bu kolon seçilir.
- [ ] Kaynak kodda `@ts-ignore` veya yeni `any` kullanımı eklenmemiştir.
- [ ] `npm run lint` temiz.

## 8. DOĞRULAMA
Komutlar:
```bash
npm install
cd apps/mobile && npx tsc --noEmit ; cd -
npm run typecheck
npm run lint
npm test
```
`npx tsc --noEmit` çıktısı boş olmalıdır. Hata kalırsa `npx tsc --noEmit --explainFiles | grep "@types/react"` ile hangi React tipinin yüklendiğini kontrol et; birden fazla sürüm görünüyorsa yerleşim düzeltmesi eksiktir.

Olumsuz senaryo (elle): `packages/shared` içinde geçici bir dosyada `createUserSchema.parse({ email: 'a@b.com', full_name: 'Test', role: 'manager', password: 'Sifre123' })` çağrısının hata fırlattığını gör, sonra dosyayı sil.

## 9. KISITLAR
- `supabase/` DEĞİŞMEZ.
- Web ve mobil ekran kodunu bu epicte düzeltmeye çalışma; yalnızca derlemeyi engelleyen bağımlılık sorununu ve shared sözleşmelerini ele al.
- Yeni ücretli bağımlılık YOK; `$0` maliyet kuralı geçerli.
- UI metinleri Türkçe, kod İngilizce.
- Git commit YOK.
