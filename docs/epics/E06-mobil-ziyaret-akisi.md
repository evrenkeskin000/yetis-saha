# E06 — Mobil: Ziyaret Akışı (Check-in / Form / Fotoğraf / Check-out)

> **Boyut:** ORTA | **Bağımlılıklar:** E04 (auth), E05 (esnaf detay ekranı, `src/lib/geo.ts`, development build hattı) | **Hat:** Mobil
> **Özet:** Sistemin kalbi. Esnaf detayından "Ziyareti Başlat": konum izni → GPS alımı → 100 m geofence (istemci haversine + sunucu RPC) → isMock tespiti → idempotency-key'li check-in → kronometre → sonuç+not formu + ZORUNLU filigranlı/sıkıştırılmış kamera fotoğrafı → "Ziyareti Bitir" (sunucu saati ile check-out) → özet. 3 alt oturum (6a/6b/6c). Development build ile çalışır.

**ÖNEMLİ:** Bu prompt uzundur. 3 alt oturumda çalıştır: önce 6a (check-in+geofence), sonra 6b (form+fotoğraf), sonra 6c (check-out+sağlamlık). Her oturum için agent'a oturum no'sunu belirt.

---

# E06 — Mobil: Ziyaret Akışı (Check-in / Form / Fotoğraf / Check-out)

## 1. ROL
Sen kıdemli bir React Native / Expo geliştiricisisin; saha uygulamalarında GPS doğrulama, kamera ve güvenilirlik (idempotency, retry, crash recovery) konularında deneyimlisin. Bu epic projenin EN KRİTİK iş akışıdır. SADECE Android. UI %100 Türkçe. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
Proje: saha pazarlama ekiplerinin esnaf ziyaretlerinin GPS-doğrulamalı takibi. `apps/mobile` (Expo + Expo Router).

E04 TAMAMLANDI: auth, tab'lar, `src/lib/supabase.ts`, `useAuth`.
E05 TAMAMLANDI: esnaf listesi/harita, `app/esnaf/[id].tsx` detay ekranı, `src/lib/geo.ts` içinde `haversineMeters`, `src/lib/customers.ts`. E05 ile MapLibre geçişi yapıldı ve development build hattı kuruldu. Bu epic de `npx expo run:android` ile çalıştırılır; Expo Go desteklenmez.

Backend (hazır): Supabase Free + PostGIS. `visits` tablosu: `idempotency_key` (unique), `duration_minutes` (generated), `is_geofence_valid`, `is_mock_location`, `check_in_at`/`check_out_at` SUNUCU zamanıyla yazılır. Sunucu geofence: `validate_check_in_location` RPC (PostGIS ST_DWithin, 100m). `visit_photos` tablosu + `visit-photos` bucket + RLS hazır.

`packages/shared` hazır: tipler, sabitler (GEOFENCE_RADIUS_M=100, outcome etiketleri), helper'lar (createVisit, completeVisit, uploadVisitPhoto — imzaları shared'dan aynen oku; eksik/uyumsuz bulursan raporla).

Ziyaret iş kuralları (değişmez):
- Check-in esnafın 100 m yarıçapında GPS doğrulaması ister; menzil dışı denemede Türkçe uyarı + mesafe; kullanıcı ısrar ederse `is_geofence_valid=false`.
- Android `location.mocked` tespiti → `is_mock_location=true` + uyarı.
- Fotoğraf ZORUNLU, sadece uygulama içi kamera (galeri KAPALI); GPS+tarih filigranı; ~200 KB sıkıştırma.
- Aynı anda TEK aktif ziyaret. Açık ziyaret açılışta toparlanır.
- Zaman damgaları sunucudan; cihaz saati güvenilmez.
- 3 alt oturum: 6a/6b/6c. Sırayla, her biri kendi kabul kriterlerini sağlamadan sonrakine geçme.

## 3. HEDEF
Saha temsilcisi esnaf detayında "Ziyareti Başlat"a bastığında konum izni+GPS alınır, geofence doğrulanır, isMock işaretlenir, idempotency-key'li check-in sunucu zaman damgasıyla açılır, kronometre başlar. Sonuç+not girilir, ZORUNLU filigranlı foto çekilir (~200 KB). "Ziyareti Bitir" ile check-out sunucu saatiyle yazılır, süre otomatik hesaplanır, özet gösterilir. Açık ziyaret uygulama kapanırsa toparlanır; ağ hatalarında retry vardır.

## 4. KAPSAM

### Oturum 6a — Geofence + Check-in + Aktif Ziyaret Durumu
- Esnaf detayına "Ziyareti Başlat" butonu (yeşil, primary).
- Konum izni: `expo-location` ön plan izni; reddedilirse Türkçe açıklama + "Ayarlara Git"; izinsiz check-in YOK.
- GPS alımı: yüksek doğruluk, ~15 sn timeout, accuracy > 50 m ise bilgi notu.
- İstemci geofence: `haversineMeters` ile mesafe; 100 m içinde devam.
- Sunucu geofence: `validate_check_in_location` RPC çağrılır; sonuç sunucu lehine kullanılır.
- Menzil dışı: Alert — "Esnafa <X> m uzaktasınız (izin verilen en fazla 100 m)." + "Vazgeç / Yine de Başlat" (`is_geofence_valid=false`).
- isMock: `location.mocked === true` → `is_mock_location=true` + uyarı; kayıt engellenmez.
- Check-in: shared `createVisit` helper; idempotency_key `Crypto.randomUUID()` (expo-crypto); `check_in_at` GÖNDERME (sunucu basar).
- Aktif ziyaret state: `ActiveVisitContext` + AsyncStorage persist (`active_visit`). Kronometre (check_in_at'e göre offset).
- Tek aktif ziyaret: başka ziyaret başlatmaya çalışınca uyarı + aktif ziyarete yönlendirme.
- Toparlanma: açılışta `visits` tablosunda kullanıcıya ait `check_out_at IS NULL` sorgulanır → AsyncStorage eşleştirilir → aktif ziyaret ekranına yönlendir.

### Oturum 6b — Ziyaret Formu + Zorunlu Fotoğraf
- Sonuç seçimi: radio grubu (ZORUNLU). Etiketler shared: Anlaşıldı, Teklif Verildi, Karar Verici Yerinde Yok, İlgilenmedi, Tekrar Uğranacak, Şikayet, Diğer.
- Not: çok satırlı TextInput, opsiyonel, ~1000 karakter sınırı + sayaç.
- Fotoğraf (ZORUNLU): `expo-camera` ile tam ekran; galeri KAPALI. Çekim sonrası önizleme + "Yeniden Çek / Kullan".
- Filigran: çekim anındaki GPS + tarih/saat, fotoğrafa işlenir. Birincil yöntem: `react-native-view-shot` ile Image + absolute Text şeridini yakala (collapsable=false). Alternatif: `@shopify/react-native-skia`. Görsel filigran ZORUNLU — sadece EXIF'e yazma kabul edilmez.
- Sıkıştırma: `expo-image-manipulator` ile genişlik 1280 px → compress 0.7; > 200 KB ise 1024 px + 0.5 devam et. Hedef ≤ ~200 KB.
- Upload: shared `uploadVisitPhoto` helper ile `visit-photos` bucket + `visit_photos` satırı.
- Ağ hatası: upload başarısızsa ziyaret TAMAMLANAMAZ; foto cihazda geçici + "bekliyor" durumu.

### Oturum 6c — Check-out + Özet + Sağlamlık
- "Ziyareti Bitir": son kontrol (sonuç+fotoğraf) → shared `completeVisit` → `check_out_at` SUNUCU yazar; `duration_minutes` DB generated'dan okunur.
- Çift tıklama koruması: buton pasif + ActivityIndicator.
- Özet ekranı: esnaf adı, check-in/out saatleri (Türkçe), süre, sonuç, not, fotoğraf, geofence/mock uyarı rozetleri. "Tamam" → esnaf detayı.
- Retry: check-in/foto/check-out ağ hatasında Alert + "Tekrar Dene / Vazgeç". Idempotency key ile güvenli.
- Temizlik: check-out sonrası AsyncStorage `active_visit` silinir.
- İptal: aktif ziyaret ekranında "Vazgeç" (onay Alert'li) — kaydı silme, raporla.

## 5. KAPSAM DIŞI
- Arka plan GPS / vardiya (E09). Offline kuyruk (Faz 3).
- Galeri fotoğrafı, video, çoklu foto. Ziyaret düzenleme/silme. Push bildirimi.
- `packages/shared` ve DB değişikliği. `apps/web`.

## 6. TEKNİK GEREKSİNİMLER
Yeni paketler: `expo-location`, `expo-camera`, `expo-image-manipulator`, `expo-file-system`, `expo-crypto`, `react-native-view-shot`, gerekirse `base64-arraybuffer`.

Dosyalar:
- `app/ziyaret/aktif.tsx` — aktif ziyaret: kronometre, sonuç radio, not, fotoğraf CTA, "Ziyareti Bitir" + "Vazgeç"
- `app/ziyaret/kamera.tsx` — tam ekran kamera (çekim → önizleme → Kullan/Yeniden Çek)
- `app/ziyaret/ozet.tsx` — ziyaret özeti
- `src/lib/visits.ts` — check-in/out orkestrasyonu: izin, GPS, haversine+RPC, isMock, idempotency, retry
- `src/lib/photo.ts` — filigran kompoziti, sıkıştırma döngüsü, geçici dosya, upload
- `src/lib/activeVisit.ts` — AsyncStorage persist + recovery
- `src/components/Kronometre.tsx`, `SonucSecici.tsx`, `UyariRozeti.tsx`
- `app/esnaf/[id].tsx` — "Ziyareti Başlat" butonu ekle (E05 detayına min ek)

Zaman damgası kuralı: check_in_at/check_out_at ASLA cihaz saati; DB default/RPC kullan. Kronometre sunucudan dönen check_in_at ile çalışır.

## 7. KABUL KRİTERLERİ
- [ ] `npx tsc --noEmit` hatasız.
- [ ] 100 m içinde check-in: `is_geofence_valid=true`, sunucu check_in_at dolu, cihaz saati değiştirilse bile etkilenmez.
- [ ] 100 m dışında: Türkçe uyarı + mesafe; "Vazgeç" kayıt açmaz; "Yine de Başlat" `is_geofence_valid=false` olur.
- [ ] Sahte konum aktifken: `is_mock_location=true` + uyarı; kayıt işaretli.
- [ ] İkinci ziyaret başlatılamaz; aktif ziyarete yönlendirilir.
- [ ] Uygulama kapanıp açılınca: aynı ziyaret ekranı + kronometre doğru süreden devam + çekilmiş/yüklenmemiş fotoğraf kaybolmaz.
- [ ] Sonuç+ fotoğraf zorunlu; şartlar sağlanmadan "Ziyareti Bitir" pasif.
- [ ] Galeri yok; sadece kamera.
- [ ] Filigran görsel olarak okunur; dosya ~200 KB veya altı.
- [ ] Check-out sonrası duration_minutes doğru; özet ekranı Türkçe.
- [ ] Uçak modunda retry → ağ dönünce çift kayıt yok (idempotency key ile).
- [ ] Tüm UI Türkçe.

## 8. DOĞRULAMA
Komutlar: `npx tsc --noEmit`; `npx eslint .` (varsa); `npx expo run:android` (development build — Expo Go ÇALIŞMAZ).

Manuel (fiziksel cihaz + emülatör):
1. Emülatörde "Extended controls → Location" ile esnaf koordinatına git → normal check-in.
2. 500 m uzağa → geofence uyarısı + mesafe + "Yine de Başlat" → `is_geofence_valid=false`.
3. Fake GPS uygulaması → is_mock uyarısı + işaret.
4. Uygulamayı öldür, yeniden aç → toparlanma.
5. Fotoğraf çek → uçak modu → "Ziyareti Bitir" retry → ağ aç → tek ziyaret, tek foto.
6. Cihaz saatini 2 saat ileri → check_in_at/süre sunucu saatine göre doğru.
7. Özet ile dashboard duration_minutes eşleşir.

## 9. KISITLAR
- UI %100 Türkçe. $0 maliyet: ücretli harita/görüntü/servis YOK.
- SADECE Android. Galeri erişimi YOK (anti-spoofing). Zaman damgaları sunucudan.
- Secret '.env'de. Git commit YOK.
- 3 oturumda ilerle; her oturum sonunda kabul kriterlerini işaretle.
