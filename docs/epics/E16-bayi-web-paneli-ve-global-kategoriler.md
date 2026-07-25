# E16 — Web: Bayi Kapsamlı Panel, Esnaf/Kullanıcı Ekranları ve Global Kategoriler

> **Boyut:** ORTA | **Bağımlılıklar:** E15 (bayi seçici ve kapsam context'i) | **Hat:** Web
> **Özet:** Mevcut tüm web sorgularını bayi kapsamına alır: canlı panel, esnaf CRUD, kullanıcı yönetimi ve raporlar. Kategori yönetimini global hale getirip yazma yetkisini yalnızca Yetiş Admin'e bırakır. Esnaf oluşturma akışına bayi ve oluşturan bilgisi ekler.

---

# E16 — Web: Bayi Kapsamlı Panel, Esnaf/Kullanıcı Ekranları ve Global Kategoriler

## 1. ROL
Sen kıdemli bir Next.js (App Router) + Supabase geliştiricisisin. Çok kiracılı panellerde sorgu kapsamı yönetimi ve veri sızıntısı önleme konusunda deneyimlisin. Her sorguda "bu sorgu hangi bayinin verisini döndürüyor?" sorusunu sorarsın. UI %100 Türkçedir. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
E15 TAMAMLANDI: `DealershipScopeContext` uygulama genelinde `{ scope: 'all' | dealershipId }` yayınlıyor; Yetiş Admin üst çubuktan bayi seçebiliyor; `dealer_admin` için kapsam her zaman kendi bayisi.

Bugün bayi kavramı olmayan sorgular (hepsi güncellenecek):
- `apps/web/src/lib/hooks/useTodayVisits.ts` — bugünkü ziyaretler, aktif esnaflar ve kullanıcılar; `users` sorgusunda rol filtresi yok, bu yüzden temsilci filtresine yöneticiler de düşüyor.
- `apps/web/src/components/esnaflar/CustomerTable.tsx` — esnaf listesi ve "son ziyaret" için sınırsız `visits` çekiyor.
- `apps/web/src/app/(dashboard)/esnaflar/**` — liste, yeni, detay, düzenle.
- `apps/web/src/app/(dashboard)/raporlar/page.tsx` — KPI, grafikler, şüpheli işlem tablosu, ısı haritası, CSV.
- `apps/web/src/components/ayarlar/UserManager.tsx` — tüm kullanıcıları listeliyor.
- `apps/web/src/components/ayarlar/CategoryManager.tsx` — kategori CRUD, bugün `admin` rolüne bağlı.

RLS zaten izolasyonu zorlar (E12); bu epic **görünüm kapsamını** ve yazma yollarındaki alan doldurmayı düzeltir. Kategoriler globaldir: herkes okur, yalnızca `yetis_admin` yazar.

## 3. HEDEF
`dealer_admin` panelde yalnızca kendi bayisinin verisini görür. Yetiş Admin "Tüm Bayiler" görünümünde birleşik veriyi, tek bayi seçtiğinde yalnızca o bayinin verisini görür. Esnaf kayıtları doğru bayi ve oluşturan bilgisiyle yazılır. Kategori yazma yetkisi tek noktada toplanır.

## 4. KAPSAM

1. **Canlı panel** (`src/app/(dashboard)/panel/page.tsx`, `src/lib/hooks/useTodayVisits.ts`)
   - Ziyaret, esnaf, kullanıcı ve konum sorgularına `dealership_id` filtresi eklenir; kapsam `all` ise filtre uygulanmaz.
   - Temsilci filtresi yalnızca `role = 'field_rep'` kullanıcıları listeler.
   - Realtime aboneliği kapsam değiştiğinde temizlenip yeniden kurulur; birden fazla kanal açık kalmaz (Supabase Free bağlantı limiti).
   - "Tüm Bayiler" görünümünde ziyaret tablosuna **Bayi** kolonu eklenir.

2. **Esnaf ekranları** (`src/app/(dashboard)/esnaflar/**`, `CustomerTable.tsx`)
   - Liste kapsam filtresiyle çekilir; "Tüm Bayiler" görünümünde **Bayi** kolonu görünür.
   - "Son ziyaret" sorgusu sınırlandırılır (yalnızca listelenen esnaf kimlikleri için, tarihe göre sınırlı sorgu).
   - Yeni esnaf oluşturma: `dealership_id` kapsamdan belirlenir. Yetiş Admin "Tüm Bayiler" görünümündeyken formda bayi seçimi zorunlu hale gelir.
   - `created_by` alanı oturum sahibinin kimliğiyle doldurulur.
   - Detay ve düzenleme sayfalarında bayi bilgisi gösterilir.

3. **Kullanıcı yönetimi** (`UserManager.tsx`)
   - Liste kapsam filtresiyle çekilir; `dealer_admin` yalnızca kendi bayisinin kullanıcılarını görür.
   - Rol sütunu yeni etiketleri kullanır (`ROLE_LABELS`).
   - `dealer_admin` için rol seçenekleri yalnızca `field_rep`; Yetiş Admin `dealer_admin` ve `field_rep` atayabilir.
   - "Tüm Bayiler" görünümünde **Bayi** kolonu eklenir.

4. **Kategoriler** (`CategoryManager.tsx`, `/ayarlar/kategoriler`)
   - Sayfa tüm yöneticilere okuma amaçlı açıktır; yazma kontrolleri (ekle/düzenle/pasifleştir) yalnızca `yetis_admin` için render edilir.
   - `dealer_admin` için sayfa "Kategoriler tüm bayiler için Yetiş yönetimi tarafından tanımlanır." bilgi notu gösterir.

5. **Raporlar** (`src/app/(dashboard)/raporlar/page.tsx`, `src/lib/report.ts`)
   - Tüm sorgulara kapsam filtresi eklenir: KPI kartları, ziyaret trendi, sonuç dağılımı, temsilci sıralaması, ısı haritası.
   - Şüpheli işlem tablosuna **reddedilen check-in denemeleri** (`check_in_attempts`) eklenir; E18 bu tabloyu doldurmaya başladığında veri akmaya başlar, tablo boşsa Türkçe boş durum gösterilir.
   - CSV dışa aktarımı kapsamı yansıtır ve dosya adına bayi kodu eklenir.
   - "Tüm Bayiler" görünümünde bayi kırılımlı özet bir satır/kolon sunulur.

## 5. KAPSAM DIŞI
- `/ziyaretler` geçmiş arşivi ekranı — **E19**.
- Mobil taraf — E17.
- Ziyaret bütünlüğü, geofence reddi ve `check_in_attempts` **yazımı** — E18.
- RLS veya şema değişikliği — E11/E12'de tamamlandı.
- Yeni grafik türleri veya rapor metrikleri eklemek.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Kapsam filtresi tek bir yardımcı üzerinden uygulanır: `src/lib/scopedQuery.ts` içinde `applyDealershipScope(query, scope)`. Her sayfada elle `if` yazma.
- Kapsam değiştiğinde tüm bağlı sorgular yeniden çalışmalı; `useEffect` bağımlılıklarına kapsam eklenmelidir.
- Sorgu sayısını artırma: mevcut "üç ayrı sorgu + istemci tarafı join" deseni korunur.
- Bayi adlarını göstermek için `dealerships` tablosu bir kez çekilip istemci tarafında eşlenir.
- Realtime kanal adı kapsamı içermeli (`panel-today-<scope>`) ve `useEffect` cleanup'ında `removeChannel` çağrılmalı.
- RLS hatası (`42501`) → "Bu işlem için yetkiniz yok."
- Boş durumlar Türkçe.

## 7. KABUL KRİTERLERİ
- [ ] `dealer_admin` panelde yalnızca kendi bayisinin ziyaretlerini, esnaflarını ve temsilcilerini görür; başka bayinin kaydı hiçbir tabloda görünmez (olumsuz senaryo).
- [ ] Yetiş Admin "Tüm Bayiler" seçiliyken birleşik veriyi görür; tek bayi seçtiğinde tüm KPI, tablo, grafik ve harita o bayiye daralır.
- [ ] Panel temsilci filtresinde yalnızca `field_rep` rolündeki kullanıcılar listelenir.
- [ ] Yeni esnaf kaydı doğru `dealership_id` ve `created_by` ile veritabanına yazılır.
- [ ] Yetiş Admin "Tüm Bayiler" görünümünde esnaf eklemeye çalıştığında bayi seçimi zorunlu tutulur.
- [ ] `dealer_admin` kategori ekleme/düzenleme kontrollerini **göremez**; API üzerinden denerse RLS reddeder (olumsuz senaryo).
- [ ] `dealer_admin` kullanıcı oluştururken yalnızca `field_rep` rolünü seçebilir.
- [ ] Raporlar CSV çıktısı seçili kapsamla birebir aynı satır sayısını içerir.
- [ ] Bayi seçimi değiştiğinde birden fazla realtime kanalı açık kalmaz.
- [ ] `npm --workspace @saha/web run build`, `npm run typecheck`, `npm run lint`, `npm test` temiz.
- [ ] UI tamamen Türkçe.

## 8. DOĞRULAMA
Komutlar:
```bash
npm run typecheck
npm run lint
npm --workspace @saha/web run build
npm test
npm --workspace @saha/web run dev
```

Manuel:
1. `Test Bayi` `dealer_admin` hesabıyla giriş yap → panel, esnaflar ve raporlarda yalnızca kendi bayisinin verisi görünmeli.
2. Yetiş Admin ile "Tüm Bayiler" → toplam ziyaret sayısı, bayilerin toplamına eşit olmalı.
3. Tek bayi seç → KPI ve tablo sayıları o bayinin verisiyle eşleşmeli; tarayıcı ağ sekmesinde başka bayi kimliği dönmemeli.
4. Yeni esnaf ekle → SQL ile `select dealership_id, created_by from customers order by created_at desc limit 1` doğrula.
5. `dealer_admin` ile kategori eklemeyi dene (UI'da buton yok; doğrudan Supabase çağrısı ile) → reddedilmeli.

## 9. KISITLAR
- `apps/mobile`, `supabase/`, `packages/shared` DEĞİŞMEZ (shared ihtiyacı doğarsa "SHARED İHTİYACI" notu düş).
- Kapsam filtresini güvenlik sınırı olarak sunma; izolasyon RLS'tedir.
- Supabase Free bağlantı limiti gereği tek realtime kanalı kuralına uy.
- Cloudflare Pages uyumluluğu korunur.
- UI %100 Türkçe; kod İngilizce.
- Git commit YOK.
