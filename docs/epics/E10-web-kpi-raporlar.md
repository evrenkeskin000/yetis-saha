# E10 — Web: KPI Dashboard + Raporlar (Faz 2)

> **Boyut:** Küçük (Faz 2) | **Bağımlılıklar:** E07 (auth, layout, MapLoader), E08 (anlamlı veri doluluğu), E09 (location_logs akıyor — ama bu epic kullanmaz; yalnız visits kullanılır) | **Hat:** Web
> **Özet:** `/raporlar` sayfasını Faz 2 içeriğiyle doldurur: tarih aralığı seçici, 4 KPI kartı, Recharts grafikler (trend + outcome dağılımı), temsilci performans tablosu, kırmızı rozetli istisna raporu, leaflet.heat ısı haritası, ekip leaderboard ve CSV export. Tüm hesaplar istemcide supabase-js ile; view/edge function yok ($0, RLS uyumlu).

---

# E10 — Web: KPI Dashboard + Raporlar (Faz 2)

## 1. ROL
Sen kıdemli bir Next.js (App Router) + TypeScript frontend geliştiricisisin; Recharts ile veri görselleştirme ve Leaflet tabanlı ısı haritaları konusunda deneyimlisin. Saf, test edilebilir hesap fonksiyonları yazarsın. UI TAMAMEN Türkçe olur. Kapsam dışına çıkmazsın; DB'ye dokunmaz, engel görürsen raporlarsın.

## 2. BAĞLAM
Proje: "Saha Ekip Takip ve Pazarlama Yönetim Sistemi" — Turborepo monorepo (`apps/web`, `apps/mobile` [DOKUNMA], `packages/shared`, `supabase/` [DOKUNMA]). Backend: Supabase Free. Hosting Cloudflare Pages → Node API yok; tüm kod istemcide.

E07+E08 TAMAMLANDI — hazır: Türkçe auth + middleware + RoleGuard; layout + sidebar ("Raporlar" menü öğesi "Faz 2" rozetli); `/raporlar` PLACEHOLDER (bu epic doldurur); browser client; `format.ts` (tr-TR tarih/saat); `outcome.ts` (renk+etiketler shared'dan); MapLoader pattern'i.

DB (hazır): users(id,email,full_name,role,is_active), customers(id,...,location GEOMETRY,is_active), visits(id,field_rep_id,customer_id,check_in_at,...,check_in_location,duration_minutes,outcome,notes,is_geofence_valid,is_mock_location). location_logs VAR ama BU EPIC'TE KULLANILMAZ — ısı haritası visits.check_in_location üzerinden.

PostgREST satır limiti 1000; aralık sorgusunda sonuç 1000'i bulursa `.range()` ile sayfala.

Ziyaret sonuçları: shared sabitlerinden Türkçe etiketler.

Bu sayfada REALTIME YOK (rapor statiktir; "Yenile" butonu yeterli) — 200 bağlantı limiti.

## 3. HEDEF
Admin/manager `/raporlar` sayfasında Bugün / Bu Hafta / Bu Ay aralığı seçerek 4 KPI kartını, ziyaret trendi + outcome dağılım grafiklerini, temsilci performans tablosunu, istisna raporunu, ziyaret ısı haritasını ve ekip leaderboard'unu görsün; her tabloyu CSV olarak indirebilsin.

## 4. KAPSAM
1. Tarih aralığı seçici: segmented kontrol [Bugün | Bu Hafta | Bu Ay]; varsayılan "Bu Hafta". Tanımlar: Bugün=yerel 00:00→şimdi; Bu Hafta=en yakın Pazartesi 00:00→şimdi; Bu Ay=ayın 1'i 00:00→şimdi. "Yenile" butonu.
2. 4 KPI kartı: Günlük Ziyaret Sayısı (temsilci başına: aralık toplam ziyaret / gün sayısı / aktif field_rep sayısı), Kapsama Oranı (aralıkta ziyaret edilen distinct esnaf / aktif esnaf), Müşteri Başı Süre (tamamlanmış ziyaretlerin ortalama duration_minutes), Dönüşüm Oranı (agreed / toplam). Payda 0 → "—".
3. Recharts grafikler: Ziyaret Trendi (Bugün=temsilci bar; Hafta/Ay=günlük bar); Sonuç Dağılımı (PieChart, shared etiket/renk, Türkçe legend).
4. Temsilci Performans Tablosu: Temsilci | Ziyaret | Tamamlanan | Ort. Süre | Anlaşma | Dönüşüm (%). Ziyaret desc; 0 ziyaretli rep de listede.
5. İstisna Raporu Tablosu: Temsilci | Esnaf | Tarih/Saat | Süre | İstisnalar (kırmızı rozet: <3 dk→"Kısa Ziyaret", geofence=false→"Geofence Dışı", is_mock=true→"Sahte Konum"). En yeni üstte; yoksa yeşil kart.
6. Ziyaret Isı Haritası: HeatMap (MapLoader + leaflet.heat). `L.heatLayer(points, {radius:25, blur:15, maxZoom:17})`. Points = aralıktaki ziyaretlerin check_in_location'dan `[lat, lng, 1]` (GeoJSON [lng,lat] → ters çevir!). OSM base layer + attribution. Veri yoksa Türkiye merkezli boş harita.
7. Ekip Leaderboard: Sıra | Temsilci | Ziyaret | Dönüşüm (%). Ziyaret desc; ilk 3 🥇🥈🥉.
8. CSV Export: Performans/İstisna/Leaderboard tabloları için ayrı buton → UTF-8 BOM + `;` ayraç + Türkçe başlıklar → Blob download. Dosya adı: `rapor_<tur>_<yyyy-MM-dd>.csv`.
9. Tek loading + Türkçe hata + boş durumlar.

## 5. KAPSAM DIŞI
- Özel tarih aralığı (date picker), PDF, e-posta rapor, zamanlanmış rapor.
- Realtime aboneliği; Panel/Esnaflar sayfalarında değişiklik.
- DB view/fonksiyon/migration/Edge Function — tüm hesaplar istemcide.
- location_logs ile rota çizimi/ısı haritası/hız analizi (sonraki epic).
- Yeni state kütüphanesi; grafik kütüphanesi değişimi (Recharts). Git commit.

## 6. TEKNİK GEREKSİNİMLER
Dosyalar:
```
src/app/(dashboard)/raporlar/page.tsx         (placeholder'ı değiştir)
src/components/raporlar/RangeSelector.tsx
src/components/raporlar/KpiCards.tsx
src/components/raporlar/VisitTrendChart.tsx
src/components/raporlar/OutcomePieChart.tsx
src/components/raporlar/RepPerformanceTable.tsx
src/components/raporlar/ExceptionTable.tsx
src/components/raporlar/Leaderboard.tsx
src/components/raporlar/CsvButton.tsx
src/components/map/HeatMapLoader.tsx          ('use client' + dynamic ssr:false)
src/components/map/HeatMap.tsx
src/lib/report.ts                             (saf hesap fonksiyonları)
src/lib/csv.ts
```
Paketler: `recharts` (^2.15), `leaflet.heat` (^0.2); dev: `@types/leaflet.heat`. Leaflet/react-leaflet E07'den kurulu.

Sorgu yaklaşımı (hepsi browser client, RLS uyumlu): `from('visits').select('...').gte('check_in_at', startISO).lte('check_in_at', endISO).order(...)`; sayfalama ile. `from('users').select('id,full_name').eq('role','field_rep').eq('is_active',true)`. `from('customers').select('id,business_name').eq('is_active',true)`. Gömülü join yok — client-side id join.

Hesaplar `src/lib/report.ts` içinde SAF fonksiyonlar (girdi: visits[], reps[], customers[], range; çıktı: KPI'lar, rep stats, exceptions, leaderboard, daily buckets). UI bileşenleri yalnız render eder.

Isı haritası koordinat: GeoJSON `coordinates[0]` = lng, `[1]` = lat → `[lat, lng, 1]`. Sayı format: `Intl.NumberFormat('tr-TR')`. Tarih: E07 format.ts'yi genişlet (hafta başı). Bölme-by-zero → "—".

Tasarım: E07/E08 kart stiliyle birebir. `ResponsiveContainer` → sabit yükseklik div (`h-72`). Client Component'ler.

## 7. KABUL KRİTERLERİ
- [ ] `npm run build` (web) hatasız; `npx tsc --noEmit` temiz; lint temiz.
- [ ] `/raporlar` sayfası render; sidebar "Raporlar" aktif.
- [ ] Aralık değiştirince tüm bölümler tutarlı güncellenir; "Yenile" yeniden fetch.
- [ ] KPI'lar el hesabıyla doğrulanabilir; payda 0 → "—".
- [ ] Trend grafiği (Bugün=temsilci bar) + Pie (Türkçe etiket/renk); grafikler SSR hatasız render.
- [ ] İstisna tablosu 3 kural (<3 dk, geofence dışı, sahte konum); rozetler kırmızı; çoklu istisna aynı satırda; yoksa yeşil kart.
- [ ] Isı haritası noktaları check-in konumlarında (lng/lat doğru); OSM + attribution; yoksa Türkiye merkezli boş.
- [ ] Leaderboard sıralaması doğru (ziyaret desc→dönüşüm desc); ilk 3 madalyalı.
- [ ] 3 CSV iner: BOM+`;`+Türkçe başlık; Excel'de doğru açılır.
- [ ] manager erişebilir; sayfada realtime kanalı YOK.
- [ ] UI tamamen Türkçe.

## 8. DOĞRULAMA
Komutlar: `npm run build --workspace=apps/web` (veya `npx turbo run build --filter=web`); `npx tsc --noEmit -p apps/web/tsconfig.json`; `npm run lint --workspace=apps/web`; `npm run dev --workspace=apps/web`.

Test verisi (SQL): bugüne 3 visit (1 agreed, 1 süre 2 dk, 1 geofence dışı); düne 2; geçen aya 1.
Manuel: admin→/raporlar→Bugün/Hafta/Ay geçişi→KPI'ları el hesabıyla karşılaştır. İstisna tablosunda 3 rozet kontrolü. Isı haritası + grafikler. CSV indir → Excel'de aç → Türkçe karakter + sütun ayrımı doğru.

## 9. KISITLAR
- UI Türkçe. $0: ücretli servis/API key YOK; DB view/fonksiyon/migration YOK.
- Cloudflare Pages uyumlu (istemci kodu; recharts/leaflet.heat yalnız Client Component).
- Minimal değişiklik; `apps/mobile`/`supabase/` DOKUNMA.
- Realtime AÇMA (200 bağlantı limiti). Sorguda 1000 satır limitini gözet (`.range()`). Git commit YOK.
