# E04 — Mobil: Auth + Navigasyon İskeleti (Expo Router + Supabase Auth)

> **Boyut:** Küçük | **Bağımlılıklar:** E02 (migration'lar), E03 (shared tipleri, Zod sabitleri) | **Hat:** Mobil
> **Özet:** `apps/mobile` altında Expo Router tabanlı uygulama iskeleti kurulur. Saha temsilcisi Türkçe e-posta/şifre ekranından Supabase Auth ile giriş yapar, oturum kalıcıdır, rol kontrolü (sadece `field_rep`) ve ilk açılışta KVKK onayı uygulanır. Üç sekmeli (Ziyaretler / Esnaflar / Profil) placeholder navigasyon ve çıkış butonu teslim edilir. NOT: E04 Expo Go ile geliştirilip doğrulanabilir; E05'ten itibaren MapLibre native modülü nedeniyle development build gerekecektir.

---

# E04 — Mobil: Auth + Navigasyon İskeleti (Expo Router + Supabase Auth)

## 1. ROL
Sen kıdemli bir React Native / Expo geliştiricisisin. Turborepo monorepo içinde, SADECE Android hedefleyen bir Expo (SDK 51+) uygulamasının temelini kuruyorsun. iOS ve web ile İLGİLENMEZSİN. UI metinlerinin tamamı Türkçe olur. Minimal, çalışan, tip-güvenli kod yazarsın; kullanıcı istemeden asla git commit yapmazsın.

## 2. BAĞLAM
Proje: "Saha Ekip Takip ve Pazarlama Yönetim Sistemi" — esnafları gezen pazarlama ekiplerinin merkezi takibi. Saha temsilcileri (rol: `field_rep`) Android telefonla esnaf ziyareti yapar, check-in/out ile kaydeder.

Monorepo (Turborepo):
- `apps/mobile` — Expo React Native (SENİN KAPSAMIN, şu an boş veya yeni scaffold)
- `apps/web` — Next.js (KAPSAM DIŞI, dokunma)
- `packages/shared` — HAZIR varsay: TypeScript tipleri (User, Customer, Visit, VisitPhoto, LocationLog, Category), Zod şemaları, sabitler (ziyaret sonucu etiketleri, `GEOFENCE_RADIUS_M = 100`), API helper'ları (`createVisit`, `completeVisit`, `uploadVisitPhoto`, `getCustomersNearby`). Paket adını `packages/shared/package.json` içindeki `name` alanından doğrula (bu promptta `@saha/shared` olarak geçer; farklıysa gerçek adı kullan).
- `supabase/` — HAZIR varsay: migration'lar (categories, users, customers, visits, visit_photos, location_logs tabloları + RLS), `visit-photos` storage bucket'ı.

Backend: Supabase Free (PostgreSQL + Auth + Storage). Harita, ziyaret akışı, arka plan GPS SONRAKİ epic'lerde (E05, E06, E09) gelecek — bu epic sadece kimlik doğrulama + navigasyon iskeleti + KVKK onayıdır.

BU EPIC Expo Go ile geliştirilebilir ve öyle doğrulanmalıdır. E05'ten itibaren (MapLibre native modül) development build zorunlu olacaktır; E04'ün yapılandırması bu geçişi bozmayacak şekilde (metro.config.js watchFolders, supabase client kurulumu, env düzeni) kurulur.

Roller: `admin`, `manager`, `field_rep`. Mobil uygulamayı SADECE `field_rep` kullanabilir.

## 3. HEDEF
Saha temsilcisi uygulamayı açtığında: ilk açılışsa KVKK aydınlatma metnini görüp onaylar; Türkçe giriş ekranından Supabase Auth ile giriş yapar; oturumu uygulama kapanıp açılsa bile korunur; rolü `field_rep` değilse Türkçe uyarı alıp çıkış yapılır; giriş başarılıysa üç sekmeli (Ziyaretler / Esnaflar / Profil) iskelet ana ekrana düşer; Profil sekmesinden çıkış yapabilir.

## 4. KAPSAM
- Expo Router (file-based routing) ile route yapısı ve root layout.
- Supabase client kurulumu: `@supabase/supabase-js` + React Native uyumu için `react-native-url-polyfill`; session persistence için storage adaptörü (`expo-secure-store` birincil; değer 2048 baytı aşarsa `@react-native-async-storage/async-storage`'a düşen hibrit adaptör).
- `AuthProvider` (React Context) + `useAuth()` hook'u: session, user, rol, yüklenme durumu, `signIn`, `signOut`.
- Giriş ekranı (Türkçe): e-posta + şifre alanları, "Giriş Yap" butonu, yükleme göstergesi, Türkçe hata mesajları (örn. `Invalid login credentials` → "E-posta veya şifre hatalı."; ağ hatası → "Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.").
- Auth guard: oturum yoksa tüm korumalı rotalar `/login`'e yönlenir; oturum varsa `/login` `(tabs)`'a yönlenir. Root layout'ta `Redirect` tabanlı guard; loading state'te splash/loading göster.
- Rol kontrolü: giriş sonrası `users` tablosundan `role` oku; `field_rep` değilse Türkçe Alert ("Bu uygulama yalnızca saha temsilcileri içindir.") ve `signOut` çağır. Rol etiket eşlemesi: admin→Yönetici, manager→Müdür, field_rep→Saha Temsilcisi.
- KVKK onayı (ilk açılış): aydınlatma metni ekranı (scroll edilebilir), onay checkbox'ı, checkbox işaretlenmeden aktif olmayan "Onaylıyorum ve Devam Ediyorum" butonu. Onay kaydı: `users` tablosunda `kvkk_consent_at` + `kvkk_consent_version` kolonlarına yazılır. Onay tamamlanmadan hiçbir ekrana erişilemez. Onay durumu DB'den sorgulanır (cihaz değişiminde de sorulsun).
- Alt tab navigasyon iskeleti: 3 sekme — "Ziyaretler", "Esnaflar", "Profil" (`@expo/vector-icons` Ionicons ile ikon). Ziyaretler ve Esnaflar sekmeleri Türkçe placeholder metin içerir ("Bu ekran yakında eklenecek").
- Profil sekmesi: kullanıcı adı/e-postası/rolü (Türkçe etiket), KVKK metnine tekrar erişim linki, kırmızı "Çıkış Yap" butonu (onay Alert'i ile → `signOut` → `/login`).
- Ortam değişkenleri: `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` `apps/mobile/.env` içinden okunur; `.env.example` oluştur; `.env` `.gitignore`'dadır (doğrula).

## 5. KAPSAM DIŞI
- Esnaf listesi/harita/detay (E05), ziyaret/check-in akışı (E06), arka plan GPS / vardiya (E09).
- Kayıt ol (sign-up), şifre sıfırlama, sosyal giriş.
- iOS desteği, web desteği, tablet düzeni.
- Offline mod, ücretli servis/API anahtarı.
- `apps/web` ve `packages/shared` içinde değişiklik (shared'i sadece import et).

## 6. TEKNİK GEREKSİNİMLER
Paketler: `expo-router`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `@supabase/supabase-js`, `react-native-url-polyfill`, `expo-constants`, `expo-status-bar`, `@expo/vector-icons` (expo ile gelir).

Dosya yapısı:
- `apps/mobile/app/_layout.tsx` — root layout: AuthProvider + auth guard (Redirect) + Stack
- `apps/mobile/app/index.tsx` — login/tabs/kvkk yönlendirme
- `apps/mobile/app/(auth)/_layout.tsx`, `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/app/kvkk.tsx` — KVKK onay ekranı
- `apps/mobile/app/(tabs)/_layout.tsx` — Tabs (3 sekme, Türkçe, Ionicons)
- `apps/mobile/app/(tabs)/index.tsx` — Ziyaretler (placeholder)
- `apps/mobile/app/(tabs)/esnaflar.tsx` — Esnaflar (placeholder)
- `apps/mobile/app/(tabs)/profil.tsx` — Profil + Çıkış
- `apps/mobile/src/lib/supabase.ts` — Supabase client
- `apps/mobile/src/lib/auth.tsx` — AuthProvider + useAuth
- `apps/mobile/src/constants/kvkk.ts` — KVKK_AYDINLATMA_METNI (Türkçe, scroll, başlıklı taslak)
- `apps/mobile/src/constants/roles.ts` — rol → Türkçe etiket eşlemesi
- `apps/mobile/.env.example`

Akış: Açılış → session yüklenir → yoksa Login → varsa KVKK onayı yoksa KVKK ekranı → onay varsa Tabs.

Tüm stil: React Native `StyleSheet` (UI kütüphanesi KURMA). Koyu/açık tema gerekmez.

## 7. KABUL KRİTERLERİ
- [ ] `apps/mobile` içinde `npx tsc --noEmit` hatasız
- [ ] Yanlış şifreyle girişte Türkçe hata mesajı; İngilizce UI metni yok
- [ ] Doğru `field_rep` hesabıyla giriş sonrası 3 sekmeli ekran açılır
- [ ] Uygulama tamamen kapatılıp açıldığında oturum korunur
- [ ] `manager` veya `admin` rolüyle girişte Türkçe uyarı + çıkış
- [ ] İlk girişte KVKK ekranı çıkar; checkbox'sız buton pasif; onay sonrası DB'de kayıt; sonraki açılışlarda tekrar çıkmaz
- [ ] Profil'den çıkış yapınca login ekranı; geri tuşuyla tab'lara dönülemez
- [ ] Sekme başlıkları, buton/etiketler Türkçe
- [ ] `.env` repo'ya girmez; `.env.example` mevcut; kodda hardcoded secret yok

## 8. DOĞRULAMA
Komutlar (`apps/mobile`): `npx tsc --noEmit`; `npx eslint .` (varsa); `npx expo start -c` + Android emülatörde aç (`a`).

Manuel: yanlış şifre → Türkçe hata; doğru field_rep → tab'lar; uygulama recent'ten kapat → oturum korunur; rolü manager yap → girişte uyarı + çıkış; uçak modunda giriş → bağlantı hatası; çıkış → login → geri tuşu → dönemez.

NOT: E05'ten itibaren MapLibre nedeniyle development build zorunlu olacak; E04'ün kurduğu yapı (env, client, metro) bu geçişi bozmayacak şekildedir.

## 9. KISITLAR
- UI metinleri %100 Türkçe (hata mesajları dahil)
- $0 maliyet: ücretli servis/API anahtarı/auth sağlayıcı YOK
- SADECE Android; iOS kod/kofig yazma
- Minimal değişiklik; `apps/web` ve `packages/shared`'e dokunma
- Secret'lar `.env`'de; kullanıcı istemeden git commit YOK
