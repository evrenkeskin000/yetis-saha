# Saha — Epic Geliştirme Planı

Bu klasör, **Yetiş+ Saha Ekip Takip ve Pazarlama Yönetim Sistemi**'nin AI coding agent'lar ile geliştirilmesi için hazırlanmış epic promptlarını içerir.

- **Kapsam:** Faz 1 (MVP, E01–E10 — tamamlandı) + Faz 2 (çoklu bayi dönüşümü, E11–E20 — güncel plan). Faz 3 (rota optimizasyonu, bölge yönetimi, offline-first, bildirimler) bu planda **yoktur**.
- **Öncelik:** $0/ay maliyet. Bu öncelik doğrultusunda iki mimari karar alınmıştır (bkz. Karar Kayıtları).

## Güncel Durum (25 Temmuz 2026)

Faz 2'ye başlamadan önce projenin gerçek durumu denetlendi. Bulgular, kanıtları ve hangi epicte kapatılacakları: [docs/proje-denetimi-2026-07-25.md](../proje-denetimi-2026-07-25.md).

Öne çıkanlar: mobil `tsc` 788 hata veriyordu (E13), menzil dışı check-in engellenmiyordu (E18), saha temsilcisi esnaf ekleyemiyordu (E17), `field_rep` web paneline girebiliyordu (E14) ve otomatik test/CI zemini yoktu (E20). Bu nedenle E11–E20, hem çoklu bayi mimarisini kurar hem de mevcut açıkları ilgili adımlara dağıtarak kapatır.

**Rol modeli (kesin):** `yetis_admin`, `dealer_admin`, `field_rep`. `dealer_manager` rolü kapsam dışıdır. E01–E10 belgelerinde geçen `admin` / `manager` adları tarihseldir.

## Nasıl Kullanılır

1. Aşağıdaki sırayla ilerle. Her epic için **yeni ve temiz bir agent oturumu** aç (önceki oturumun bağlam şişkinliğini taşıma).
2. İlgili `E0X-*.md` dosyasındaki promptun tamamını agent'a ver.
3. Agent bitince, prompttaki DOĞRULAMA komutlarını **kendin çalıştır** — agent'ın "geçti" demesine güvenme.
4. Kabul kriterleri sağlanmadan bir sonraki epice geçme; yarım epic üstüne yeni epic başlatma.

## Faz 1 — Epic Listesi (Tamamlandı, tarihsel kayıt)

Aşağıdaki epicler Faz 1 kapsamında tamamlanmıştır. Rol adları (`admin`, `manager`) ve E06'daki "Yine de Başlat" akışı gibi maddeler **artık geçerli değildir**; yerlerine E11–E20 geçer. Bu dosyalar yeniden yazılmaz, geçmiş kaydı olarak korunur.

| # | Epic | Boyut | Bağımlılıklar | Hat |
|:--|:-----|:------|:--------------|:----|
| E01 | Monorepo Altyapı Kurulumu | Küçük | — | Ortak |
| E02 | Veritabanı Şeması + Auth + RLS | Küçük | E01 | Ortak |
| E03 | Shared Package (types / validation / api) | Küçük | E01, E02 | Ortak |
| E04 | Mobil — Auth + Navigasyon + KVKK Onayı | Küçük | E02, E03 | Mobil |
| E05 | Mobil — Esnaf Listesi + Harita + Detay | Küçük | E04 | Mobil |
| **E06** | **Mobil — Ziyaret Akışı (Check-in / Form / Fotoğraf / Check-out)** | **ORTA** | E05 | Mobil |
| E07 | Web — Auth + Dashboard Kabuğu + Canlı Harita | Küçük | E02, E03 | Web |
| E08 | Web — Esnaf + Kategori + Kullanıcı Yönetimi | Küçük | E07 | Web |
| E09 | Mobil — Arka Plan GPS + Vardiya (Faz 2) | Küçük | E06 + Faz 1 kapısı | Mobil |
| E10 | Web — KPI Dashboard + Raporlar (Faz 2) | Küçük | E08, E09 | Web |

## Faz 2 — Çoklu Bayi Epic Listesi (Güncel Plan)

| # | Epic | Boyut | Bağımlılıklar | Hat |
|:--|:-----|:------|:--------------|:----|
| [E11](E11-bayi-semasi-ve-migrasyon.md) | Bayi Şeması, Rol Dönüşümü ve Veri Taşıma | Küçük | E02 | DB |
| [E12](E12-tenant-rls-ve-veri-izolasyonu.md) | Bayi Bazlı RLS, Aktiflik Kapıları ve Veri İzolasyonu | **ORTA** | E11 | DB |
| [E13](E13-shared-sozlesmeler-ve-test-zemini.md) | Shared Sözleşmeler, Rol Modeli ve Test Zemini | Küçük | E11, E12 | Ortak |
| [E14](E14-auth-ve-hesap-yasamdongusu.md) | Giriş Akışı, Rol Kapıları ve Hesap Yaşam Döngüsü | **ORTA** | E13 | Web + Mobil |
| [E15](E15-yetis-admin-bayi-yonetimi.md) | Yetiş Admin Bayi Yönetimi ve Bayi Seçici | Küçük | E14 | Web |
| [E16](E16-bayi-web-paneli-ve-global-kategoriler.md) | Bayi Kapsamlı Panel, Esnaf/Kullanıcı ve Global Kategoriler | **ORTA** | E15 | Web |
| [E17](E17-mobil-bayi-kapsami-ve-esnaf-sahipligi.md) | Mobil Bayi Kapsamı, Esnaf Sahipliği ve Veri İzolasyonu | Küçük | E14 | Mobil |
| [E18](E18-ziyaret-butunlugu-geofence-ve-denetim.md) | Ziyaret Bütünlüğü: Sert Geofence, Denetim Kaydı, Durum Makinesi | **ORTA** | E12, E17 | DB + Mobil |
| [E19](E19-ziyaret-arsivi-ve-tenant-raporlama.md) | Ziyaret Arşivi: Web `/ziyaretler`, Mobil Geçmiş, Denetim Raporları | Küçük | E16, E18 | Web + Mobil |
| [E20](E20-ci-e2e-ve-fiziksel-cihaz-kabul.md) | Otomatik Testler, CI Hattı ve Fiziksel Cihaz Kabul Kapısı | **ORTA** | E13, E19 | Ortak |

### Faz 2 Bağımlılık Grafiği

```mermaid
graph TD
    E11[E11 Bayi Şeması + Rol Dönüşümü] --> E12[E12 Tenant RLS + Aktiflik]
    E11 --> E13[E13 Shared + Test Zemini]
    E12 --> E13
    E13 --> E14[E14 Auth + Rol Kapıları]
    E14 --> E15[E15 Bayi Yönetimi + Seçici]
    E14 --> E17[E17 Mobil Bayi Kapsamı]
    E15 --> E16[E16 Bayi Kapsamlı Web Paneli]
    E12 --> E18[E18 Ziyaret Bütünlüğü]
    E17 --> E18
    E16 --> E19[E19 Ziyaret Arşivi]
    E18 --> E19
    E19 --> E20[E20 CI + Kabul Kapısı]
    E13 --> E20
```

### Faz 2 Çalıştırma Sırası

| Sıra | Epic | Neden bu sırada | Bittiğinde hazır olan |
|:--|:--|:--|:--|
| 1 | E11 | Tüm tenant çalışması şemaya bağlı | `dealerships`, `dealership_id`, üç rollü model, Yetiş Merkez verisi |
| 2 | E12 | Eski politikalar artık var olmayan rolleri referans alıyor; sistem bu adım olmadan yönetilemez | Bayi izolasyonu, aktiflik kapıları, append-only denetim erişimi |
| 3 | E13 | Mobil `tsc` 788 hata veriyor; sözleşmeler eski rolleri taşıyor | Yeşil typecheck, yeni tipler/sabitler, kökten `npm test` |
| 4 | E14 | Uygulamalar yeni rolleri tanımadan hiçbir ekran doğru çalışmaz | Rol kapıları, pasif hesap bloklama, hesap yaşam döngüsü |
| 5 | E15 ∥ E17 | Web ve mobil hatları buradan itibaren paralel ilerler | E15: bayi CRUD + seçici. E17: mobil kapsam + esnaf sahipliği |
| 6 | E16 ∥ E18 | E16 seçiciyi tüketir; E18 mobil kapsamın üstüne kurulur | E16: kapsamlı panel/rapor. E18: güvenilir ziyaret verisi |
| 7 | E19 | İki yer tutucu ekran ancak snapshot ve kapsam hazırken doldurulabilir | Geçmiş arşivi ve denetim raporları |
| 8 | E20 | Test edilecek işlevin tamamlanmış olması gerekir | CI kapısı ve fiziksel cihaz kabulü |

**Paralel hat kuralı (Faz 2):** E15/E17 ve E16/E18 çiftleri farklı uygulamalara dokunur. `packages/shared` yalnızca E13'te değişir; sonraki epiclerde ihtiyaç doğarsa "SHARED İHTİYACI" notu düşülür ve ayrı bir mini oturumda toplu olarak eklenir. Şema değişikliği yalnızca E11, E12 ve E18'de yapılır.

## Faz 1 Bağımlılık Grafiği (tarihsel)

```mermaid
graph TD
    E01[E01 Monorepo Altyapı] --> E02[E02 DB Şema + Auth + RLS]
    E01 --> E03[E03 Shared Package]
    E02 --> E03
    E02 --> E04[E04 Mobil Auth + Nav + KVKK]
    E03 --> E04
    E04 --> E05[E05 Mobil Esnaf + Harita]
    E05 --> E06a[E06a Check-in + Geofence]
    E06a --> E06b[E06b Form + Kamera + Filigran]
    E06b --> E06c[E06c Check-out + Sağlamlık]
    E02 --> E07[E07 Web Auth + Dashboard + Canlı Harita]
    E03 --> E07
    E07 --> E08[E08 Web Yönetim CRUD]
    E06c --> KAPI{Faz 1 Kapısı: fiziksel cihaz testi}
    KAPI --> E09[E09 Arka Plan GPS + Vardiya]
    E08 --> E10[E10 KPI + Raporlar]
    E09 --> E10
```

## Faz 1 Çalıştırma Sırası ve Handoff Notları (tarihsel)

| Sıra | Epic | Hat | Önkoşul | Bittiğinde sonrakine hazır olan |
|:-----|:-----|:----|:--------|:-------------------------------|
| 1 | E01 | ortak | — | Çalışan turbo pipeline, 3 app iskeleti, env şablonları, `supabase/config.toml` |
| 2 | E02 | ortak | E01 | Tüm tablolar + RLS + geofence RPC + storage bucket + seed + test kullanıcıları |
| 3 | E03 | ortak | E01, E02 | Şemayla birebir örtüşen tipler/Zod/sabitler; iki hat buradan import eder |
| 4 | E04 ∥ E07 | mobil ∥ web | E02, E03 | **Paralel başlangıç.** E04: mobil auth+tab iskeleti+KVKK onayı. E07: web giriş+kabuk+canlı harita |
| 5 | E05 ∥ E08 | mobil ∥ web | E04 / E07 | E05: esnaf listesi/harita/detay — E06 akışını tetikleyecek ekran hazır. E08: CRUD'lar+foto galeri (E06'yı beklemez) |
| 6 | E06a→b→c | mobil | E05 | Uçtan uca ziyaret akışı; web raporlarının okuyacağı gerçek veri üretilmeye başlar |
| 7 | — **Faz 1 kapısı** — | | E06, E08 | Aşağıdaki kapı kontrolü |
| 8 | E09 | mobil | E06, Faz 1 kapısı | Vardiya + konum logları akıyor |
| 9 | E10 | web | E08, E09 | KPI/rapor/CSV; Faz 2 tamam |

### E06 Alt Oturumları (orta boyut → 3 oturum)

- **E06a — Check-in:** konum izinleri + GPS alma, isMock tespiti, sunucu geofence RPC, aktif/yarım ziyaret toparlanma, ziyaret kaydı açma.
- **E06b — Form + Kamera:** sonuç + not formu, zorunlu anlık kamera (galeri yok), filigran, sıkıştırma, Storage upload.
- **E06c — Check-out + sağlamlık:** check-out (sunucu zamanı), özet ekranı, retry/idempotency, uçtan uca senaryo testi.

Her alt oturum aynı E06 promptuyla çalıştırılır; agent'a hangi oturumda olduğunu söyle (örn. "E06'yı çalıştır, oturum 6b ile başla: 6a tamamlandı").

## Paralel Hat Kuralları (çakışma önleme)

- `packages/shared`'a aynı anda **tek hat** dokunur. Faz 2'de shared yalnızca E13'te değişir; diğer epic promptları "shared'ı değiştirme; eksik varsa 'SHARED İHTİYACI' notu düş" kısıtı içerir. Biriken ihtiyaçlar ayrı bir mini shared oturumunda eklenir (diğer hat o sırada duraklar).
- Migration üretimi tekil: Faz 1'de yalnızca E02, Faz 2'de yalnızca E11, E12 ve E18 şema değiştirir. Başka bir epic şema ihtiyacı duyarsa dur ve ayrı mini epic aç.
- Klasör ayrımı: mobil hattı `apps/web`'e, web hattı `apps/mobile`'a dokunamaz (promptların KISITLAR bölümünde yazılı).

## Faz 1 Cihaz Kapısı (E09/E10 öncesi şarttı — geçildi)

- Gerçek Android cihazda 1 tam ziyaret: check-in (geofence geçti) → zorunlu foto + filigran → check-out.
- Web canlı haritada ziyaretin anlık görünmesi; fotoğrafın signed URL ile açılması.
- Emülatör/kamerada yanıltıcı sonuçlar olabileceğinden E06 ve E09'un kabulü mutlaka fiziksel cihazda.

## Faz 2 Kabul Kapısı (E20)

Çoklu bayi sürümü, E20 kapsamındaki fiziksel Android cihaz senaryosu geçilmeden kabul edilmez: bayi ve kullanıcı oluşturma, zorunlu şifre değişimi, esnaf ekleme/düzenleme, menzil dışı check-in reddi, başarılı ziyaret, web arşivinde görünürlük, vardiya konum logları, temsilci transferi ve pasife alma. Ayrıntı: [E20](E20-ci-e2e-ve-fiziksel-cihaz-kabul.md).

## Her Epic Öncesi / Sonrası Kontroller

**Öncesi:**
- Bir önceki epic'in DOĞRULAMA adımları bizzat geçti mi?
- Yeni oturuma verilen prompt self-contained'dir (bu dosyalar öyle hazırlandı) — ek bağlam gerekiyorsa sadece "tamamlananlar" listesini sözlü teyit et.

**Sonrası:**
- DOĞRULAMA komutlarını kendin çalıştır.
- `git status` / `git diff --stat` ile değişiklik listesini gözden geçir: kapsam dışı dosyaya dokunulmuşsa geri aldır.
- Yeni migration eklendiyse `supabase db reset` + seed ile sıfırdan kurulumu test et.
- `.env.example` dışında dosyaya secret yazılmış mı diye tara.
- Faz 2'de ek olarak: `npm test` ve (E12 sonrası) `supabase/tests/tenant_isolation.sql` çalıştır — bayi izolasyonu regresyonu en pahalı hatadır.

## Hata Durumunda

- Aynı promptu hata çıktısıyla birlikte tekrar ver: "X komutu şu hatayı verdi, düzelt."
- 2 denemede düzelmezse epic'i ikiye böl veya bir önceki epic'in handoff varsayımını sorgula (örn. E02'nin RPC imzası prompttakiyle uyuşmuyor olabilir).
- Uzun hata loglarını agent'a kırpılmış ver; gerekiyorsa ilgili 20-30 satırı ilet.

## Kalite Kontrol Listesi (bir epic promptu "iyi" mi?)

1. Self-contained mı? (agent'ın başka doküman okuması gerekmiyor)
2. Tek hedef var mı ve HEDEF bölümüyle örtüşüyor mu?
3. KAPSAM DIŞI ≥ 3 madde mi ve maddeler gerçek mi?
4. Kabul kriterleri test edilebilir mi, en az 1 olumsuz senaryo içeriyor mu?
5. Doğrulama komutları birebir çalıştırılabilir mi?
6. İsimler (dosya yolları, tablo/sütun, RPC) önceden verilmiş mi?
7. Bağımlılıklar ve hazır gelen çıktılar BAĞLAM'da listelenmiş mi?
8. $0 maliyet ihlali yok mu?
9. Güvenlik kritik kontrolleri (geofence, zaman damgası, filigran) sunucuda mı istenmiş?
10. Türkçe UI / İngilizce kod ayrımı hatırlatılmış mı?
11. Kısıtlar yerinde mi? ("git commit yok", "minimal değişiklik", "mevcut migration'ları düzenleme")
12. Boyut gerçekçi mi? (küçük = tek oturum; orta = alt oturumlara bölünmüş)

## Neden Sadece E06 Orta?

E06, birbirinden bağımsız hata ayıklama döngüsü gerektiren beş riskli bileşeni tek epictе topluyor: konum servisleri (izin akışları, isMock tespiti, emülatör–gerçek cihaz farkları), sunucu geofence entegrasyonu, kamera pipeline'ı (izin, galeri yasağı, filigran, upload + retry), ziyaret durum makinesi (aktif ziyaret toparlanma) ve check-out hesapları (sunucu zamanı, süre). Tek oturumda birleştiklerinde bağlam penceresi şişer, hata ayıklama kalitesi düşer ve "yarım kalan ziyaret akışı" gibi geri dönülmesi pahalı durumlar doğar. Bu yüzden 3 alt oturuma bölündü; her alt oturum sonunda cihazda ara doğrulama yapılabilir. Diğer epic'ler tek düzlemli ve öngörülebilir olduğundan küçük kalır.

## Karar Kayıtları ($0 maliyet öncelikli)

- **Mobil harita:** `react-native-maps` **kullanılmayacak** — Android'de native Google Maps engine'i başlatır ve production build'de Google API key ister (billing hesabı = maliyet riski). Yerine: `@maplibre/maplibre-react-native` + OpenStreetMap raster tile. Sonuç: **E05'ten itibaren Expo Go yok, development build** (`npx expo prebuild` + `npx expo run:android`).
- **Arka plan GPS:** `react-native-background-geolocation` **kullanılmayacak** — Android release build ücretli lisans ister. Yerine: `expo-location` + `expo-task-manager` (%100 ücretsiz). Bilinen sınırlar (pil, OEM killed-state) E09 promptunun 10. bölümünde belgelidir.
- **Web harita:** `react-leaflet` + OSM (anahtarsız).
- **OSM tile politikası:** `tile.openstreetmap.org` düşük trafik / fair-use politikasına tabidir; atıf zorunludur. Ekip büyürse ücretsiz alternatif tile sağlayıcı veya self-host değerlendir.
- **KVKK retention:** pg_cron satırları migration'da yorumludur; hosted ortamda manuel etkinleştirme veya GitHub Actions cron + service role ile çalıştırılır. Operasyon checklist'ine ekle — unutulursa sessizce hiç çalışmaz.
- **PostGIS I/O konvansiyonu:** okumada GeoJSON `[lng, lat]`; yazmada EWKT `SRID=4326;POINT(lng lat)`. lng/lat karışıklığı en olası hatadır; her iki platformda tek adapter/helper üzerinden geçilir.
- **Realtime:** `visits` tablosu `supabase_realtime` publication'ında olmalı (E07 canlılığı için); agent DB'ye dokunmaz, gerekirse `alter publication supabase_realtime add table visits;` DB sahibince çalıştırılır. Supabase Free 200 eşzamanlı bağlantı limiti: E07 tek kanal + sıkı cleanup; E10 bilinçli olarak aboneliksiz.
