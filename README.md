# Saha — Monorepo

Esnafları gezen pazarlama ekiplerinin merkezi takip sistemi.

## Önkoşullar

- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **Opsiyonel**: Docker & Supabase CLI (yerel veritabanı geliştirme için)

## Dizin Yapısı

```
saha/
  apps/
    mobile/         # Expo Android mobil uygulaması (@saha/mobile)
    web/            # Next.js App Router web paneli (@saha/web)
  packages/
    shared/         # Ortak tipler ve sabitler (@saha/shared)
  supabase/
    config.toml     # Supabase CLI yapılandırması
  package.json      # npm workspaces & Turborepo kök tanımı
  turbo.json        # Turborepo görev yapılandırması
  tsconfig.base.json# Ortak TypeScript konfigürasyonu
  .env.example      # Ortam değişkenleri şablonu
```

## Kurulum

Bağımlılıkları yüklemek için proje kökünde aşağıdaki komutu çalıştırın:

```bash
npm install
```

## Ortam Değişkenleri (Environment Variables)

`.env.example` dosyasındaki değişkenleri ilgili uygulamaların dizinlerine kopyalayın:

| Kaynak Değişken | Hedef Dosya | Açıklama |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `apps/web/.env.local` | Web için Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/web/.env.local` | Web için Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/web/.env.local` | Web için Service Role Key |
| `EXPO_PUBLIC_SUPABASE_URL` | `apps/mobile/.env` | Mobil için Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `apps/mobile/.env` | Mobil için Supabase Anon Key |

## Geliştirme ve Çalıştırma Komutları

- **Tüm uygulamaları geliştirmede başlat:**
  ```bash
  npm run dev
  ```

- **Sadece Web uygulamasını çalıştır:**
  ```bash
  npm --workspace @saha/web run dev
  ```

- **Sadece Mobil uygulamayı çalıştır (Expo):**
  ```bash
  npm --workspace @saha/mobile run dev
  ```

- **Sadece Android emülatör/cihaz üzerinde çalıştır:**
  ```bash
  npm --workspace @saha/mobile run android
  ```

- **TypeScript Kontrolü (Typecheck):**
  ```bash
  npm run typecheck
  ```

- **Linter Kontrolü (Lint):**
  ```bash
  npm run lint
  ```

- **Kod Formatlama (Prettier):**
  ```bash
  npm run format
  ```

- **Prod Build (Web):**
  ```bash
  npm --workspace @saha/web run build
  ```

- **Testler:**
  ```bash
  npm test
  ```
