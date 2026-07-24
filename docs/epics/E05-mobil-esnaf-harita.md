# E05 — Mobil: Esnaf Listesi + Harita + Detay + Yeni Esnaf

> **Boyut:** Küçük | **Bağımlılıklar:** E04 (auth guard, tab iskeleti, supabase client, `useAuth`) | **Hat:** Mobil
> **Özet:** Esnaflar sekmesi gerçek veriye kavuşur: arama + kategori filtresi + son ziyaret sıralaması, MapLibre harita görünümü (OSM tile), esnaf detayı (bilgiler + ziyaret geçmişi + fotoğraflar), konuma göre "yakındaki esnaflar" ve Zod validasyonlu yeni esnaf formu. $0 kararı: `react-native-maps` YERİNE `@maplibre/maplibre-react-native` (tamamen ücretsiz, API anahtarsız). Native modül → E05'ten itibaren development build zorunlu.

---

# E05 — Mobil: Esnaf Listesi + Harita + Detay + Yeni Esnaf (MapLibre)

## 1. ROL
Sen kıdemli bir React Native / Expo geliştiricisisin. E04 ile kurulmuş Expo Router + Supabase Auth iskeletinin üzerine esnaf (müşteri) modülünü geliştiriyorsun. SADECE Android. UI %100 Türkçe. Kullanıcı istemeden git commit yapmazsın. Harita entegrasyonunda MapLibre (React Native) kullanırsın; ücretli/anahtarlı hiçbir harita servisine dokunmazsın.

## 2. BAĞLAM
Proje: saha pazarlama ekiplerinin esnaf ziyaretlerinin takibi. Mobil uygulama `apps/mobile` (Expo + Expo Router). E04 TAMAMLANDI varsay: `app/(tabs)/` altında Ziyaretler/Esnaflar/Profil sekmeleri, `src/lib/supabase.ts` client'ı, `src/lib/auth.tsx` (`useAuth`), auth guard ve KVKK onayı hazır. E04'ün dosya yapısını ve stil yaklaşımını (StyleSheet, UI kütüphanesi yok) aynen sürdür.

KARAR KAYDI (değişmez): $0 maliyet öncelikli. `react-native-maps` KULLANILMAYACAK — Android'de native Google Maps engine'ini başlatır ve production build'de Google API key ister (billing hesabı = maliyet riski). Harita motoru: `@maplibre/maplibre-react-native` + OpenStreetMap raster tile'ları (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`). MapLibre native modül içerdiğinden EXPO GO ARTIK ÇALIŞMAZ: bu epic'ten itibaren geliştirme ve doğrulama development build ile yapılır (`npx expo prebuild` + `npx expo run:android`). E04 Expo Go ile çalışıyordu; bu geçiş bilinçli ve kalıcıdır (E06 ve E09 da aynı build hattını kullanacak).

Backend: Supabase Free + PostGIS. `customers` tablosunda `location` (GEOMETRY, SRID 4326) ve `geofence_radius_m` kolonları var. `categories`, `visits`, `visit_photos` tabloları + `visit-photos` storage bucket'ı hazır. Kolon adlarını tahmin etme: `supabase/migrations`'tan doğrula.

`packages/shared` hazır: tipler (`Customer`, `Category`, `Visit`, `VisitPhoto`), Zod şemaları (yeni esnaf formu şeması dahil), sabitler, `getCustomersNearby` gibi API helper'ları. Paket adını `packages/shared/package.json`'dan doğrula (promptta `@saha/shared` diye geçer).

Sonraki epic E06 (ziyaret/check-in akışı) esnaf detay ekranına "Ziyareti Başlat" butonu ekleyecek — sen EKLEMEYECEKSİN ama detay ekranını buna uygun, genişletilebilir tut.

## 3. HEDEF
Saha temsilcisi; esnafları arayabilir, kategoriye göre filtreleyebilir, son ziyaret tarihine göre sıralayabilir; MapLibre + OSM tile'lı haritada kategori renkli pinlerle görebilir; mevcut konumuna göre mesafe sıralı "yakındaki esnaflar" görünümüne geçebilir; esnaf detayında bilgileri, ziyaret geçmişini ve ziyaret fotoğraflarını görebilir; uzun basma ile haritadan konum seçerek Zod validasyonlu form ile yeni esnaf ekleyebilir. Tüm bunlar development build üzerinde, hiçbir API anahtarı olmadan çalışır.

## 4. KAPSAM
- Esnaf listesi (Esnaflar sekmesi): `FlatList` (`keyExtractor`, performans ayarları), arama çubuğu (isim/adres/telefonda Türkçe karakter duyarsız filtre, debounce), kategori filtre çipleri (yatay scroll, "Tümü" dahil), sıralama: varsayılan "Son ziyaret" (hiç ziyaret edilmemişler en üstte, sonra en eski ziyaret edilenler) + alfabetik. Her satırda: isim, kategori (renk rozeti), adres özeti, son ziyaret tarihi ("Hiç ziyaret edilmedi" / göreli Türkçe tarih).
- "Yakındaki esnaflar" modu: liste üstünde toggle ile "Konuma Göre" sıralama. `expo-location` ile ön plan konumu (izin reddedilirse Türkçe bilgilendirme + liste normal sıralamada kalır), shared'daki `getCustomersNearby(lat, lng)` helper'ı kullanılır, her satırda mesafe ("850 m", "2,3 km").
- Harita görünümü (MapLibre): liste/harita geçiş toggle'ı. `MapLibreGL.MapView` + `styleJSON` olarak OSM raster stil tanımı. Ekranda "© OpenStreetMap contributors" atıf metni. Esnaf pinleri: `MapLibreGL.PointAnnotation` içinde kategori renkli özel View; pine dokununca bilgi kartı + "Detaya Git" butonu. Kullanıcı konumu: `MapLibreGL.UserLocation`. Başlangıç kamerası: kullanıcı konumu; yoksa Türkiye. MapLibre koordinat sırası `[lng, lat]` (GeoJSON standardı).
- Esnaf detay ekranı: ad, kategori rozeti, telefon (tıkla-ara `Linking.openURL('tel:...')`), adres, mini harita (tek pin), ziyaret geçmişi (tarih, Türkçe sonuç etiketi, süre, not özeti; yeniden eskiye), ziyaret fotoğrafları (yatay thumbnail; dokununca tam ekran).
- Yeni esnaf ekleme: liste "+"/FAB → form: ad (zorunlu), telefon (ops), kategori seçici (zorunlu), adres (ops), konum (zorunlu) — "Haritadan Seç" ile MapLibre haritası açar, `onLongPress` ile pin bırak/taşı, "Konumu Onayla" ile dön. Validasyon shared Zod şeması; hatalar Türkçe.
- Veri erişimi: shared helper'lar veya `src/lib/supabase.ts`; RLS engelinde bypass denemesi YAPMA, raporla.

## 5. KAPSAM DIŞI
- Check-in / "Ziyareti Başlat" butonu (E06). Detaydaki aksiyon YOK.
- Arka plan GPS (E09). Offline (Faz 3).
- Esnaf düzenleme/silme, kategori yönetimi.
- `react-native-maps`, Google API anahtarı, Mapbox/Maptiler — HİÇBİRİ.
- `apps/web`, `packages/shared`, DB migration değişikliği.

## 6. TEKNİK GEREKSİNİMLER
Yeni paketler: `@maplibre/maplibre-react-native`, `expo-location`. `react-native-maps` package.json'da OLMAMALI (varsa kaldır). Kurulum + `npx expo prebuild`.

Dosyalar:
- `app/(tabs)/esnaflar.tsx` — liste container + arama + filtre + sıralama + liste/harita toggle
- `app/esnaf/[id].tsx` — detay (Stack screen)
- `app/esnaf/yeni.tsx` — yeni esnaf formu
- `app/esnaf/konum-sec.tsx` — tam ekran konum seçici (uzun basma ile pin)
- `src/components/HaritaGorunumu.tsx` — TEK MapLibre sarmalayıcı; props: `pins`, `onPinPress`, `onLongPress`, `initialRegion`. TÜM MapLibre import'ları yalnız burada ve konum-sec'te.
- `src/components/EsnafSatiri.tsx`, `KategoriFiltre.tsx`, `FotoGaleri.tsx`
- `src/lib/geo.ts` — `haversineMeters(a, b)`
- `src/lib/customers.ts` — sorgular, location adapter, son-ziyaret haritası, mesafe sıralama
- `src/constants/map.ts` — OSM_RASTER_STYLE (styleJSON: version 8, source tiles, raster layer), attribution, varsayılan kamera (Türkiye ~[35.0, 39.0], zoom ~4.5), kategori renk paleti
- `apps/mobile/README.md` — "Development build zorunlu" notu

MapLibre API konvansiyonları: koordinat `[lng, lat]`. Uzun basma: `onPress` event'inden `feature.geometry.coordinates`. `UserLocation` ön plan izni gerektirir. Sürüme özel kurulum adımları varsa (örn. plugin config) birebir uygula, tahmin yapma — tip tanımlarını oku.

## 7. KABUL KRİTERLERİ
- [ ] `npx tsc --noEmit` hatasız. `package.json`'da `react-native-maps` YOK.
- [ ] Development build (`npx expo run:android`) ile harita açılıyor; OSM tile'ları yükleniyor; atıf metni görünür.
- [ ] Pinler kategori renginde; pine dokununca bilgi kartı → detay.
- [ ] Liste 100+ kayıtta akıcı; arama Türkçe karakter duyarlı; kategori çipi çalışıyor; varsayılan sıralama doğru.
- [ ] "Konuma Göre": izin verilirse mesafe etiketleri + doğru sıra; reddedilirse Türkçe açıklama.
- [ ] Detay: tıkla-ara; ziyaret geçmişi + fotoğraflar; boş durumlar Türkçe.
- [ ] Yeni esnaf: Zod hataları Türkçe; pin seçilmeden kayıt yok; kayıt sonrası listede+haritada doğru konum (lng/lat sırası DOĞRU).
- [ ] Check-in aksiyonu yok. Tüm UI Türkçe.

## 8. DOĞRULAMA
Komutlar: `npx tsc --noEmit`; `npx eslint .` (varsa); `npx expo prebuild`; `npx expo run:android`. NOT: Expo Go artık ÇALIŞMAZ (MapLibre native modül) — doğrulama development build üzerindedir.

Manuel: emülatör konumu İstanbul → "Konuma Göre" + mesafe; izin red → Türkçe uyarı; harita zoom/pan → OSM tile'lar; pin → detay; yeni esnaf (bilerek denize koy) → dashboard'da koordinat doğru mu; fotoğraflı kayıt → galeri; arama "ÖZTÜRK" → "Öztürk Market".

## 9. KISITLAR
- UI %100 Türkçe. $0: ücretli harita/tile/stil servisi YOK; OSM tile atıf zorunlu.
- SADECE Android. Minimal değişiklik. Secret `.env`'de. Git commit YOK.
- `packages/shared`/DB'ye dokunma; MapLibre API'si için tahmin yapma, tip tanımlarını oku.
