# E20 — Kalite: Otomatik Testler, CI Hattı ve Fiziksel Cihaz Kabul Kapısı

> **Boyut:** ORTA | **Bağımlılıklar:** E13 (test zemini), E19 (tüm işlevsel kapsam tamamlandı) | **Hat:** Ortak
> **Özet:** Projeyi "elle doğrulanan" durumdan "otomatik doğrulanan" duruma taşır: web API/rota testleri, mobil durum makinesi testleri, RLS izolasyon testlerinin CI'a bağlanması ve her PR'da çalışan bir kalite kapısı. Faz 2 kabulü fiziksel Android cihazda uçtan uca senaryo ile kapatılır.

---

# E20 — Kalite: Otomatik Testler, CI Hattı ve Fiziksel Cihaz Kabul Kapısı

## 1. ROL
Sen kıdemli bir test ve build mühendisisin. Vitest, React Testing Library, Supabase entegrasyon testleri ve GitHub Actions konusunda deneyimlisin. Testleri "yeşil görünsün diye" değil, gerçek regresyonu yakalasın diye yazarsın. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
Denetim raporu bulgusu **O-04**: Bugün otomatik test yalnızca `packages/shared` içinde (4 dosya, 31 test). `apps/web` ve `apps/mobile` altında hiçbir test dosyası yok, CI yapılandırması yok (`.github/` dizini mevcut değil). Tüm epic doğrulamaları manuel `DOĞRULAMA` adımlarına dayanıyor.

Bu durumun somut maliyeti bu denetimde görüldü: `apps/mobile` içinde `npx tsc --noEmit` **788 hata** verirken kimse fark etmemişti (E13 bunu düzeltti).

E13 ile kökte `npm test` ve Turbo `test` görevi tanımlandı. E12 ile `supabase/tests/tenant_isolation.sql` izolasyon betiği yazıldı. E19 ile işlevsel kapsam tamamlandı.

Faz 1 kapısı (bkz. [docs/epics/README.md](README.md)) fiziksel cihaz doğrulamasını zorunlu tutar; aynı kural çoklu bayi sürümü için yeniden uygulanır.

## 3. HEDEF
Her değişiklik, insan müdahalesi olmadan tip, lint, birim test, izolasyon testi ve build kapılarından geçer. Çoklu bayi izolasyonu ve ziyaret bütünlüğü kuralları regresyona karşı otomatik korunur. Sürüm, fiziksel cihazda çalıştırılan uçtan uca senaryo ile kabul edilir.

## 4. KAPSAM

### 4.1. Web test altyapısı
- `apps/web` içine Vitest + React Testing Library + `jsdom` kurulumu (`vitest.config.ts`, `test/setup.ts`).
- `package.json` → `"test": "vitest run"`.
- Supabase istemcisi için ortak mock yardımcısı: `test/supabaseMock.ts`.

Yazılacak testler:
- `middleware`: oturumsuz kullanıcı korumalı yolda `/giris`'e yönlenir; `field_rep` panele giremez; pasif kullanıcı çıkışa düşer; `must_change_password` yönlendirmesi; `/sifre-degistir` matcher kapsamında.
- API rotaları (`kullanicilar/olustur`, `davet`, `sifre-sifirla`, `sifre-degistir`, `durum`): 401/403/400/200 matrisi; `dealer_admin` başka bayide işlem yapamaz; `dealer_admin` `yetis_admin` oluşturamaz.
- `applyDealershipScope`: kapsam `all` iken filtre eklemez, tek bayi iken ekler.
- `lib/report.ts`: tarih aralığı hesaplama, KPI toplamları, şüpheli işlem tespiti (fixture verisiyle).
- `RoleGuard`: izinsiz rolde içerik render edilmez.

### 4.2. Mobil test altyapısı
- `apps/mobile` içine Vitest (Node ortamı) kurulumu; React Native bileşen render'ı **kapsam dışı**, saf mantık hedeflenir.
- `package.json` → `"test": "vitest run"`.

Yazılacak testler:
- `visits.ts`: menzil dışı check-in yolunun sunucuya insert denemesi yapmaması ve reddi raporlaması; `forceOutOfRange` yolunun bulunmaması.
- `haversineMeters` ve mesafe eşiği (`GEOFENCE_RADIUS_M`).
- `locationBuffer`: eşik dolunca flush, hata durumunda kayıtların korunması, 500 kayıt üst sınırında kırpma, kullanıcı bazlı anahtar.
- `locationTask` seyreltme mantığı (still/walking/driving eşikleri) — saf fonksiyon olarak dışa çıkarılır.
- `activeVisit`: kullanıcı değişiminde yerel durumun temizlenmesi.
- `auth`: profil hatası durumunda oturumun açık bırakılmaması.

### 4.3. Veritabanı testleri
- `supabase/tests/tenant_isolation.sql` (E12) korunur ve genişletilir: E18 kuralları eklenir (menzil dışı reddi, tek açık ziyaret, kapanmış ziyaretin güncellenememesi, mock bayrağının korunması, Yetiş Admin'in ziyaret değiştirememesi).
- `npm run test:db` script'i: yerel Supabase'i başlatıp betiği çalıştırır ve çıkış kodunu iletir.

### 4.4. CI hattı
Dosya: `.github/workflows/ci.yml`
- Tetikleyici: `pull_request` ve `main` push.
- İş 1 (`quality`): Node 20 kurulumu, `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm --workspace @saha/web run build`.
- İş 2 (`database`): Supabase CLI ile yerel veritabanı ayağa kaldırma, `supabase db reset`, `supabase/tests/tenant_isolation.sql` çalıştırma. Bu iş süre/kaynak nedeniyle yalnızca `supabase/**` veya `packages/shared/**` değişikliklerinde tetiklenir.
- Bağımlılık önbelleği (`actions/setup-node` cache) kullanılır.
- Secret gerektirmez; build için sahte (dummy) public env değerleri workflow içinde tanımlanır ve gerçek anahtar repoya yazılmaz.

### 4.5. Fiziksel cihaz kabul kapısı
Dosya: `docs/faz2-kabul-kontrol-listesi.md`
- Çoklu bayi sürümünün kabulü için fiziksel Android cihazda çalıştırılacak uçtan uca senaryo, madde madde işaretlenebilir liste olarak yazılır (madde 8'deki senaryo temel alınır).
- Emülatörde yanıltıcı olabilecek adımlar (kamera filigranı, gerçek GPS, arka plan konum, pil davranışı) ayrıca işaretlenir.

## 5. KAPSAM DIŞI
- Playwright/Cypress ile tarayıcı uçtan uca testleri (ayrı bir epic gerektirir).
- Detox ile mobil UI otomasyonu.
- Kod kapsama (coverage) eşiği zorunluluğu.
- Yeni işlevsellik veya hata düzeltmesi: bu epic yalnızca test ve otomasyon ekler. Test bir hata ortaya çıkarırsa raporla; düzeltmeyi ilgili epicin sahibine bırak.
- Ücretli CI servisi veya barındırılan test veritabanı.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Test dosyaları kaynak dosyanın yanında `__tests__` klasöründe veya `*.test.ts` olarak durur; mevcut `packages/shared` deseni izlenir.
- Supabase çağrıları mock'lanır; testler ağa çıkmaz (veritabanı işi hariç).
- Her test tek bir davranışı doğrular ve adı Türkçe olmayan teknik terimler yerine açık cümle kurar (mevcut `packages/shared` testlerindeki dil korunur).
- CI adımları yerelde birebir aynı komutlarla çalıştırılabilir olmalıdır.
- Testler zamana ve saat dilimine bağlı kırılganlık üretmemeli; `getTodayStartIso` gibi yardımcılar sabit tarihle test edilmeli.
- Yeni bağımlılıklar yalnızca `devDependencies` olarak eklenir.

## 7. KABUL KRİTERLERİ
- [ ] `npm test` kökten çalışır ve üç paketin testlerini de koşar.
- [ ] `apps/web` içinde en az 15 anlamlı test bulunur ve tamamı geçer.
- [ ] `apps/mobile` içinde en az 10 anlamlı test bulunur ve tamamı geçer.
- [ ] Middleware testleri `field_rep` panele girememe senaryosunu **olumsuz** olarak doğrular.
- [ ] API testleri `dealer_admin`'in başka bayide işlem yapamamasını 403 ile doğrular.
- [ ] Mobil testler menzil dışı check-in'in ziyaret oluşturmadığını doğrular.
- [ ] `supabase/tests/tenant_isolation.sql` E12 ve E18 senaryolarının tamamını kapsar ve tek komutla çalışır.
- [ ] CI, açılan bir PR'da otomatik çalışır ve `typecheck`, `lint`, `test`, `build` adımlarının tamamı yeşildir.
- [ ] Kasıtlı olarak bozulan bir kural (örneğin bir RLS politikasının gevşetilmesi) CI'ı **kırmalıdır** (olumsuz senaryo; doğrulama sonrası geri alınır).
- [ ] Repoda hiçbir gerçek secret bulunmaz; CI sahte env değerleriyle build alır.
- [ ] `docs/faz2-kabul-kontrol-listesi.md` fiziksel cihaz senaryosunu içerir.

## 8. DOĞRULAMA
Komutlar:
```bash
npm ci
npm run typecheck
npm run lint
npm test
npm --workspace @saha/web run build
npm run test:db
```

CI doğrulaması: Küçük bir değişiklikle PR aç; workflow'un çalıştığını ve tüm adımların yeşil olduğunu gör. Ardından `supabase/migrations` içindeki bir politikayı geçici olarak gevşet, `npm run test:db` çalıştır → **başarısız olmalı**; değişikliği geri al.

Fiziksel Android cihazda uçtan uca kabul senaryosu:
1. Yetiş Admin ile yeni bayi ve bayi yöneticisi oluştur.
2. Bayi yöneticisi ile saha temsilcisi oluştur; temsilci ilk girişte şifre değiştirsin ve KVKK onayı versin.
3. Temsilci yeni esnaf eklesin; kendi eklediği esnafı düzenlesin.
4. 100 m dışından check-in dene → reddedilmeli; deneme yönetici panelinde görünmeli.
5. Esnafın yanında check-in → filigranlı fotoğraf → check-out; süre doğru hesaplanmalı.
6. Web panelinde ziyaret canlı haritada ve `/ziyaretler` arşivinde görünmeli; fotoğraf signed URL ile açılmalı.
7. Vardiya aç/kapat → konum logları doğru bayiyle yazılmalı.
8. Temsilciyi başka bayiye taşı → mobilde eski ziyaretler "Önceki bayi kaydı" olarak görünmeli, detay açılmamalı.
9. Temsilciyi pasife al → mobil oturum kapanmalı.

## 9. KISITLAR
- Bu epicte işlevsel davranış değiştirilmez; yalnızca test, yapılandırma ve doküman eklenir.
- Testi geçirmek için üretim kodunu gevşetme (kural yumuşatma, `any`, kapsam genişletme).
- $0 maliyet: ücretli CI dakikası gerektiren ağır işler minimumda tutulur; veritabanı işi koşullu tetiklenir.
- Repoda secret bulunmaz.
- Git commit YOK.
