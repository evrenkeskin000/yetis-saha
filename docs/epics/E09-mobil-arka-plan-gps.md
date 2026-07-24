# E09 — Mobil: Arka Plan GPS + Vardiya (ücretsiz mimari: expo-location + TaskManager)

> **Boyut:** Küçük (Faz 2) | **Bağımlılıklar:** E04 (auth, Profil), E05 (development build hattı); E06 ile UI çakışması olmaması için E06 sonrası önerilir + Faz 1 kapısı (fiziksel cihazda E06 doğrulaması) | **Hat:** Mobil
> **Özet:** Profil ekranına "Vardiyayı Başlat / Bitir" toggle'ı (KVKK kill-switch). `react-native-background-geolocation` KULLANILMADI (lisans ücretli → $0 ihlali). Yerine: `expo-location` + `expo-task-manager` tabanlı %100 ücretsiz çözüm; TaskManager içinde hız bazlı aktivite tahmini, kayıt seyreltme, 5-10 dk batch gönderim. Vardiya bitince GPS tamamen durur; reboot sonrası otomatik başlatma YOK.

---

# E09 — Mobil: Arka Plan GPS + Vardiya (ücretsiz mimari: expo-location + TaskManager)

## 1. ROL
Sen kıdemli bir React Native / Expo geliştiricisisin; Android arka plan konum, foreground service ve pil dostu konum stratejilerinde deneyimlisin. KVKK hassasiyeti yüksek bir özellik geliştiriyorsun: konum takibi YALNIZCA kullanıcının bilinçli başlattığı vardiya süresince çalışır. SADECE Android. UI %100 Türkçe. Ücretli/lisanslı konum kütüphanesi KULLANMAZSIN.

## 2. BAĞLAM
Proje: saha pazarlama ekiplerinin takibi; Faz 2'de vardiya süresince rota kaydı. `apps/mobile` (Expo + Expo Router). E04 TAMAMLANDI: auth, tab'lar, Profil ekranı (`app/(tabs)/profil.tsx`), `src/lib/supabase.ts`, `useAuth`. E05 TAMAMLANDI: MapLibre geçişi + development build hattı (`npx expo prebuild` + `npx expo run:android`; Expo Go kullanılmıyor). E06 (ziyaret akışı) bu epicten bağımsız; bu epic ziyaret akışına DOKUNMAZ.

KARAR KAYDI: $0 maliyet öncelikli. `react-native-background-geolocation` KULLANILMAYACAK (Android release build ücretli lisans). Yerine: `expo-location` `startLocationUpdatesAsync` + `expo-task-manager`. Hareket tabanlı davranış manuel (hız bazlı sınıflandırma + seyreltme). Bilinen sınırları bölüm 10'da belirtilmiştir.

Backend: `location_logs` tablosu hazır; kolon isimleri ve tipleri migrations'tan doğrula. RLS hazır; kullanıcı yalnızca kendi kaydını yazar. `packages/shared`: `LocationLog` tipi.

KVKK (değişmez): Arka plan GPS SADECE "Vardiyayı Başlat" aktifken. Cihaz reboot sonrası OTOMATİK BAŞLATMA YOK. İlk başlatmada Türkçe bilgilendirme + onay. Vardiya durumu her zaman görünür (Android bildirimi + uygulama içi rozet).

ORTAM: TaskManager tabanlı arka plan konum Expo Go'da çalışmaz — E05'ten beri development build kullanılıyor.

## 3. HEDEF
Saha temsilcisi Profil'den "Vardiyayı Başlat"a bastığında Android foreground service başlar, Türkçe kalıcı bildirim görünür, TaskManager görevine düşen konumlar hız bazlı sınıflandırılıp seyreltilir ve buffer üzerinden 5-10 dk batch'lerle `location_logs`'a yazılır. "Vardiyayı Bitir" güncellemeleri tamamen durdurur. Reboot sonrası servis başlamaz.

## 4. KAPSAM
- Profil ekranına "Vardiya" bölümü: durum kartı (Aktif/Pasif, başlangıç saati, bekleyen kayıt sayısı) + toggle buton (başlat/bitir, bitirmede onay Alert'i).
- İlk başlatmada Türkçe bilgilendirme + onay (ne kaydedilir, ne zaman, nasıl durdurulur). Onay cihazda saklanır; sonra sormaz.
- İzin akışı: ön plan konum → arka plan konum (Android 10+; ayarlara yönlendirme) → Android 13+ bildirim izni. Reddedilince vardiya BAŞLAMAZ; Türkçe neden + "Ayarlara Git".
- Konfigürasyon: `Location.startLocationUpdatesAsync(TASK_NAME, { accuracy: Accuracy.High, distanceInterval: 50, deferredUpdatesInterval: 60000, showsBackgroundLocationIndicator: false, foregroundService: { notificationTitle: 'Vardiya aktif', notificationBody: 'Konumunuz rota takibi için kaydediliyor' } })`
- TaskManager: `src/lib/locationTask.ts` — global scope `defineTask`. Her konum için: aktivite sınıflandır (hız ×3.6 → km/sa) → seyreltme filtresi → kabul edilirse buffer'a ekle → ≥ 20 ise flush.
- Aktivite (hız bazlı): null/negatif → 'unknown' (walking kuralları); < 1 km/sa → 'still'; 1–15 → 'walking'; > 15 → 'driving'.
- Seyreltme (son kabul edilen kayda göre): still: < 60 sn VEYA < 20 m → DÜŞÜR; walking/unknown: < 50 m → DÜŞÜR; driving: < 200 m VE < 30 sn → DÜŞÜR. Eşikler `src/constants/shift.ts`'te.
- Buffer: `src/lib/locationBuffer.ts` — bellek + AsyncStorage yedek. Flush tetikleyicileri: ≥ 20 kayıt / 5 dk interval / vardiya bitişi / uygulama açılışı. Bulk insert `location_logs`. Flush hatasında buffer'da kalır, 500 üst sınırı aşılınca en eskiler düşer. Alan eşlemesi: `accuracy_m` ← coords.accuracy; `speed_kmh` ← speed × 3.6; `battery_level` ← expo-battery (flush anında, DB tipine göre); `is_mock` ← location.mocked; `activity_type` ← sınıflandırma; `recorded_at` ← location.timestamp.
- Vardiya bitirme: `Location.stopLocationUpdatesAsync(TASK_NAME)` → final flush → bildirim kalkar → rozet pasif. Bitiş sonrası SIFIR yeni kayıt.
- Uygulama içi gösterge: `ShiftIndicator` (tüm ekranlarda ince üst şerit: "Vardiya aktif — konum kaydediliyor"). Kaynak: `ShiftContext` + `useShift()`.
- Durum senkronu: uygulama açılışında `hasStartedLocationUpdatesAsync` ile gerçek durum sorgulanır; servis ölüyse vardiya pasif (YENİDEN BAŞLATMA YOK — KVKK).
- `app.json` config plugin: `isAndroidBackgroundLocationEnabled: true`, Türkçe izin metinleri; manifest izinleri: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.

## 5. KAPSAM DIŞI
- `react-native-background-geolocation` ve her türlü ücretli konum kütüphanesi.
- Ziyaret akışı entegrasyonu (E06); rota haritası çizimi (web); geçmiş rota ekranı.
- Reboot sonrası otomatik başlatma (KVKK → bilinçli YOK).
- Tam offline senkronizasyon (Faz 3). `apps/web`, `packages/shared`, DB migration değişikliği. iOS.

## 6. TEKNİK GEREKSİNİMLER
Yeni paketler: `expo-location` (kurulu olmalı), `expo-task-manager`, `expo-battery`, `expo-notifications` (yalnız bildirim izni). İsteğe bağlı (ilerisi): `expo-sensors` (Accelerometer) — kurma, sadece not.

Dosyalar:
- `src/lib/locationTask.ts` — global scope `defineTask(LOCATION_TASK_NAME, handler)`. Aktivite sınıflandırma, seyreltme, buffer'a yazma, eşikte flush tetikleme.
- `src/lib/locationBuffer.ts` — buffer, AsyncStorage yedek, flush scheduler, bulk insert, retry, 500 kayıt kırpımı; `mapLocationToRow` eşleme.
- `src/lib/shift.ts` — izin orkestrasyonu, start/stop, `hasStartedLocationUpdatesAsync` senkronu.
- `src/lib/ShiftContext.tsx` — uygulama geneli state + useShift + 5 dk flush interval'i.
- `src/components/ShiftIndicator.tsx` — kalıcı üst şerit; `app/_layout.tsx`'e minimal ekleme + `import '../src/lib/locationTask'`.
- `src/constants/shift.ts` — tüm eşik/sayı sabitleri, bildirim metinleri.
- `app/(tabs)/profil.tsx` — Vardiya bölümü (minimal ekleme).
- `app.json` — plugin + izin konfigürasyonu.

Log etiket: `[VardiyaGorev]`, `[Buffer]` — doğrulama için.

## 7. KABUL KRİTERLERİ
- [ ] `npx tsc --noEmit` hatasız; package.json'da `react-native-background-geolocation` YOK.
- [ ] İlk "Vardiyayı Başlat": Türkçe bilgilendirme → izin zinciri → foreground service + Türkçe bildirim.
- [ ] Vardiya aktifken kayıtlar ≤ 10 dk içinde `location_logs`'ta; alanlar dolu ve makul.
- [ ] Seyreltme: yürüyüş ~50 m aralık; araç ~200 m / 30 sn; sabit noktada kayıt üretilmez.
- [ ] "Vardiyayı Bitir" → servis durur, bildirim kalkar, final flush; 15 dk gözlemde 0 yeni kayıt.
- [ ] Rozet vardiya boyunca tüm ekranlarda; bitince kaybolur.
- [ ] Reboot sonrası servis BAŞLAMAZ; uygulama açılınca pasif.
- [ ] Uçak modunda 10+ kayıt → ağ dönünce toplu insert; kayıp/çift kayıt yok.
- [ ] Sahte konum → `is_mock=true`.
- [ ] İzin reddi (her adım ayrı) → çökme yok; Türkçe açıklama + ayarlara yönlendirme.
- [ ] Uygulama recent'ten kapatılınca servis sürer; açılınca state senkron.
- [ ] Tüm UI Türkçe; E06'da regresyon yok.

## 8. DOĞRULAMA
Komutlar: `npx tsc --noEmit`; `npx eslint .` (varsa); `npx expo run:android` (development build — Expo Go ÇALIŞMAZ).

Manuel: emülatör route replay (yürüyüş) → `adb logcat | grep VardiyaGorev` ile kabul/düşür oranları; dashboard'da kayıt aralıkları. Araç hızı simülasyonu → seyreltme. Sabit noktada 10 dk → aynı-yer kaydı yok. Uygulama öldür → servis sürüyor mu; açılış senkron. Reboot → başlamaz; pasif. Uçak modu → buffer + flush. Sahte konum → is_mock. İzin reddi senaryoları.

## 9. KISITLAR
- UI %100 Türkçe (bildirim metinleri dahil). $0: ücretli konum kütüphanesi/servisi YOK.
- SADECE Android. E06 akışına dokunma.
- KVKK: vardiya dışı konum toplama YOK; reboot otomatik başlatma YOK; onay öncesi bilgilendirme.
- Secret `.env`'de. Git commit YOK. API/şema tahmini YAPMA; tip tanımlarını ve migration'ları oku.

## 10. BİLİNEN SINIRLAR (teslim raporuna eklenir)
- Durağan tespiti hız bazlı basit sezgiseldir; Transistor kütüphanesinin motion-activity tabanlı rafine durağanlık algısı yoktur. Durağanken GPS radyosu tamamen kapanmaz → pil tüketimi ücretli çözüme göre biraz daha yüksektir.
- Uygulama "killed" durumdayken bazı Android OEM'leri (Xiaomi/Oppo/vivo) foreground service'i öldürebilir → rotada boşluklar oluşabilir. "Pil optimizasyonunu kapat" önerisi ileride eklenebilir.
- `deferredUpdatesInterval` teslimatı garanti değildir; Android batch davranışı cihaz/sürüme göre değişir → batch dolma süresi 5-10 dk bandını aşabilir.
- Durağanlık teyidi için `expo-sensors` (Accelerometer) entegrasyonu ileride opsiyonel iyileştirme olarak değerlendirilebilir.
