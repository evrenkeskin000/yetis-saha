# E01 — Monorepo Altyapı Kurulumu

> **Boyut:** Küçük | **Bağımlılıklar:** Yok (ilk epic) | **Hat:** Ortak
> **Özet:** Saha projesinin Turborepo monorepo iskeletini sıfırdan kurar: Expo (Android) mobil, Next.js (App Router) web, `@saha/shared` paketi ve `supabase/` klasörü. İş mantığı yok; her üç app "hello world" çalışır ve shared'dan import yaptığı kanıtlanır. Sonraki tüm epic'lerin (E02, E03) temelidir.

**Kullanım:** Aşağıdaki promptun tamamını yeni bir agent oturumuna kopyala-yapıştır yap.

---

# E01 — Monorepo Altyapı Kurulumu

## 1. ROL
Sen kıdemli bir full-stack TypeScript mühendisisin. Monorepo mimarileri (Turborepo), React Native (Expo) ve Next.js ekosistemlerinde deneyimlisin. Minimal, temiz ve çalıştırılabilir iskelet kurarsın; gereksiz bağımlılık eklemezsin.

## 2. BAĞLAM
"Saha" projesi: Esnafları gezen pazarlama ekiplerinin merkezi takip sistemi.
- Mobil: React Native (Expo), SADECE Android
- Web: Next.js (App Router), ileride Cloudflare Pages'e deploy edilecek
- Backend: Supabase (PostgreSQL + PostGIS + Auth + Storage + Realtime) — $0/ay kısıtı
- Monorepo: Turborepo — `apps/mobile`, `apps/web`, `packages/shared`, `supabase/`
- UI dili Türkçe olacak.

Bu epic ilk epictir: çalışma dizini tamamen boştur, sıfırdan kurulum yapacaksın. Bu epic tamamlandığında E02 (veritabanı şeması) `supabase/` klasörünü, E03 (shared paket) `packages/shared` iskeletini kullanacak. Bu yüzden klasör adları ve paket adları AŞAĞIDAKİ GİBİ OLMALI — sonraki epic'ler buna bağımlı.

## 3. HEDEF
Tek `npm install` ile kurulabilen, üç uygulaması (mobile, web) ve bir ortak paketi (shared) typecheck'ten geçen, web ve mobilin `@saha/shared` paketinden canlı import yapabildiği, "hello world" seviyesinde çalışan bir Turborepo monorepo iskeleti kurmak.

## 4. KAPSAM
- Kök `package.json` (npm workspaces), `turbo.json`, ortak `tsconfig.base.json`
- `apps/mobile`: Expo iskeleti (Android hedefli, bare-minimum tek ekran)
- `apps/web`: Next.js App Router iskeleti (tek sayfa)
- `packages/shared`: `@saha/shared` paket iskeleti (placeholder export'lar)
- `supabase/config.toml`: Supabase CLI init artefaktı
- ESLint + Prettier yapılandırması (kök seviyesinde, uygulamalar extend eder)
- `.gitignore`, `.env.example`, Türkçe `README.md`
- Her iki uygulamada da shared paketten import edilen bir sabitin ekranda görünmesi (entegrasyon kanıtı)

## 5. KAPSAM DIŞI (KESİNLİKLE YAPMA)
- Hiçbir SQL/migration yazma (E02'nin işi; `supabase/migrations/` klasörünü bile oluşturma)
- `packages/shared` içine gerçek tip/sabitten fazlasını yazma (E03'ün işi; sadece placeholder)
- Supabase Auth akışı, login ekranı, navigation (React Navigation/Expo Router kurma)
- Harita kütüphaneleri (react-leaflet, react-native-maps) veya herhangi bir UI kütüphanesi (Tailwind dahil)
- Supabase servislerini başlatma (`supabase start` çalıştırma zorunluluğu yok), Docker gerektiren işler
- CI/CD pipeline, EAS Build, Cloudflare Pages deploy yapılandırması
- Test altyapısı (vitest vb. — E03'te kurulacak)
- `npm install` ve build/typecheck dışında sisteme kalıcı değişiklik yapma; git commit ATMA

## 6. TEKNİK GEREKSİNİMLER

### Dizin yapısı (tam olarak böyle)
```
saha/
  package.json
  turbo.json
  tsconfig.base.json
  .gitignore
  .env.example
  README.md
  eslint.config.mjs          # veya .eslintrc — tek kök config
  .prettierrc.json
  apps/
    mobile/
      package.json           # name: "@saha/mobile"
      app.json
      App.tsx
      index.ts               # registerRootComponent girişi
      babel.config.js
      metro.config.js        # monorepo watchFolders ayarı
      tsconfig.json
    web/
      package.json           # name: "@saha/web"
      next.config.mjs
      app/
        layout.tsx
        page.tsx
      tsconfig.json
  packages/
    shared/
      package.json           # name: "@saha/shared"
      tsconfig.json
      src/
        index.ts
  supabase/
    config.toml
```

### Kök package.json gereksinimleri
- `private: true`, `workspaces: ["apps/*", "packages/*"]`, `engines.node: ">=20"`
- Scriptler: `dev` (turbo run dev), `build`, `typecheck`, `lint`, `format` (prettier --write)
- devDependency: `turbo` (güncel stabil major), `typescript` (^5), `prettier`

### turbo.json
- Tasklar: `build` (dependsOn `^build`, outputs: `[".next/**", "dist/**"]`), `dev` (cache: false, persistent: true), `typecheck`, `lint`

### tsconfig.base.json
- `strict: true`, `target: ES2022`, `moduleResolution: "bundler"`, `module: ESNext`, `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `resolveJsonModule`. App'lerin tsconfig'leri bunu `extends` eder.

### packages/shared
- `package.json`: `name: "@saha/shared"`, `private: true`, `main` ve `types` alanları `src/index.ts`'i göstersin (build adımı YOK — tüketen taraf transpile edecek). Script: `typecheck: tsc --noEmit`.
- `src/index.ts` placeholder içeriği:
  ```ts
  export const APP_NAME = 'Saha';
  export const ROLES = ['admin', 'manager', 'field_rep'] as const;
  export type UserRole = (typeof ROLES)[number];
  ```
  (E03 bu dosyayı genişletecek; sen sadece iskeleti kur.)

### apps/web (Next.js, App Router)
- Güncel stabil Next.js + React sürümü. `app/layout.tsx`: `<html lang="tr">`, başlık "Saha". `app/page.tsx`: "Saha — Web Panel" metni + `@saha/shared`'dan import edilen `APP_NAME` değerini ekranda göster.
- `next.config.mjs`: `transpilePackages: ['@saha/shared']` ZORUNLU.
- Scriptler: `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `lint`.

### apps/mobile (Expo)
- Güncel stabil Expo SDK + uyumlu React Native. Expo Go ile çalışabilir olmalı (custom native code YOK). NOT: E05'ten itibaren MapLibre native modülü nedeniyle development build'e geçilecek; E01'de Expo Go uyumluluğu yeterlidir.
- `App.tsx`: tek ekran, "Saha — Mobil" metni + `APP_NAME` import'unu göster. UI metinleri Türkçe.
- `app.json`: `name: "Saha"`, `slug: "saha"`, `android.package: "com.saha.app"`. iOS yapılandırması ekleme (Android-only).
- `metro.config.js` monorepo için ZORUNLU ayarlar:
  ```js
  // watchFolders = monorepo kökü; nodeModulesPaths = [proje kökü node_modules, app node_modules]
  ```
- `babel.config.js`: `babel-preset-expo`.
- Scriptler: `dev: expo start`, `android: expo start --android`, `typecheck: tsc --noEmit`.

### supabase/config.toml
- `npx supabase init` çıktısına eşdeğer minimal bir `config.toml` koy (project_id: `saha`). CLI mevcutsa init ile üret; değilse elle minimal yaz. İçini doldurma (migration, bucket vb. E02'de).

### .env.example (kökte tek dosya, tüm değişkenler)
```
# Web (apps/web/.env.local'e kopyalanır)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mobil (apps/mobile/.env'e kopyalanır)
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```
README'de hangi dosyanın nereye kopyalanacağını Türkçe açıkla. Gerçek değer YAZMA.

### .gitignore
`node_modules`, `.env`, `.env.local`, `.env.*.local` (ama `!.env.example`), `.next`, `.expo`, `.turbo`, `dist`, `coverage`, `*.tsbuildinfo`.

### README.md (Türkçe)
Proje özeti, önkoşullar (Node >= 20, npm >= 10; opsiyonel: Docker + Supabase CLI), kurulum, çalıştırma komutları (web dev, expo start), dizin yapısı, ortam değişkenleri tablosu, epic yol haritası (E01 altyapı → E02 veritabanı → E03 shared paket).

## 7. KABUL KRİTERLERİ
- [ ] Kökte `npm install` hatasız tamamlanıyor
- [ ] `npx turbo run typecheck` üç pakette de (web, mobile, shared) yeşil
- [ ] `npx turbo run lint` yeşil (prettier kontrolü dahil)
- [ ] `npm --workspace @saha/web run build` başarılı (`.next` üretiliyor)
- [ ] Web sayfası ve mobil ekran `@saha/shared`'dan gelen `APP_NAME` değerini render ediyor (kodda import mevcut)
- [ ] `apps/mobile` içinde `npx expo export --platform android` bundle'ı hatasız üretiyor
- [ ] `supabase/config.toml` mevcut
- [ ] `.env.example` mevcut, hiçbir gerçek secret repoda yok
- [ ] README.md Türkçe ve komutlar doğru

## 8. DOĞRULAMA
Sırayla çalıştır ve sonuçları raporla:
1. `npm install` → exit 0
2. `npx turbo run typecheck` → 3/3 başarılı
3. `npx turbo run lint` → hatasız
4. `npm --workspace @saha/web run build` → "Compiled successfully" benzeri çıktı, exit 0
5. `cd apps/mobile && npx expo export --platform android` → bundle üretildi, exit 0
6. `npx supabase --version` → CLI erişilebilir (yoksa README'ye kurulum notu ekle, hatayı yutma)
Bir komut başarısızsa düzelt ve tekrar dene; düzeltemiyorsan hangi kabul kriterinin neden karşılanamadığını açıkça raporla.

## 9. KISITLAR
- Tüm kullanıcıya görünen metinler ve README Türkçe
- $0/ay maliyet: ücretli servis, ücretli API anahtarı, ücretli araç ÖNERME/kurma
- Sadece gerekli bağımlılıklar; UI kit, state yönetimi, harita kütüphanesi YOK
- Secret'lar asla koda gömülmez; sadece `.env.example` şablonu
- Kullanıcı açıkça istemeden `git commit` / `git push` YAPMA (git init dahi istenmedikçe yapma)
- Mevcut dosya yok; her şeyi bu yapıya göre sıfırdan oluştur
