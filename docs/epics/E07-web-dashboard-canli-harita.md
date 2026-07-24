# E07 — Web: Auth + Dashboard Kabuğu + Canlı Harita

> **Boyut:** Küçük | **Bağımlılıklar:** E02 (migration'lar), E03 (shared tipleri) | **Hat:** Web
> **Özet:** `apps/web` Next.js 15 iskeletini kurar; Supabase Auth + Türkçe giriş, middleware session guard, rol bazlı menü/yönlendirme, sidebar'lı dashboard kabuğu ve "Bugünkü Ziyaretler" sayfasını (OSM + react-leaflet + Supabase Realtime canlılık) teslim eder. Esnaflar/Ziyaretler/Raporlar/Ayarlar placeholder olarak kalır.

---

# E07 — Web: Auth + Dashboard Kabuğu + Canlı Harita

## 1. ROL
Sen kıdemli bir Next.js (App Router) + TypeScript frontend geliştiricisisin. Supabase Auth, react-leaflet ve Tailwind CSS konularında deneyimlisin. Sade, temiz ve TAMAMEN Türkçe bir admin paneli kodu yazarsın. Kapsam dışına çıkmazsın; emin olamadığın DB/RLS/FK detayını uydurmak yerine görev sonu raporunda "DOĞRULANAMADI" olarak işaretlersin.

## 2. BAĞLAM
Proje: "Saha Ekip Takip ve Pazarlama Yönetim Sistemi" — Turborepo monorepo:
- `apps/web` — Next.js admin paneli (BU EPIC'TE OLUŞTURULACAK; root workspace'lere dahil et)
- `apps/mobile` — React Native Expo (DOKUNMA)
- `packages/shared` — paylaşılan tipler, Zod şemaları, sabitler, api helper'ları
- `supabase/` — migration'lar (DOKUNMA)

Backend: Supabase Free (PostgreSQL + PostGIS + Auth + Realtime + Storage). DB hazır varsay: categories, users(id,email,full_name,role,is_active), customers(id,...,location GEOMETRY), visits(id,field_rep_id,customer_id,check_in_at,check_out_at,check_in_location,duration_minutes,outcome,notes,is_geofence_valid,is_mock_location), visit_photos(visit_id,storage_path,captured_at).

Outcome-Türkçe etiketler shared'dan: agreed→'Anlaşıldı', quote_given→'Teklif Verildi', ... PostgREST geometry: SELECT'te GeoJSON `{type:"Point",coordinates:[lng,lat]}`.

Roller: admin=her şey, manager=ekip görünümü+raporlar, field_rep=web'e GİREMEZ. RLS DB'de zorlar; UI ek olarak rol bazlı menü.

Hosting Cloudflare Pages → kodu edge uyumlu yaz (Node API kullanma, sunucu kodu minimum, veri istemcide supabase-js ile). `output:'export'` AYARLAMA (middleware'i bozar).

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` `.env.local.example`.

Bu epic ilk web epic'idir. E08 ve E10 bu iskelet üzerine inşa edilecek.

## 3. HEDEF
Yönetici (admin/manager) Türkçe girişten panele girsin; sidebar'lı dashboard'da "Panel" sayfasında bugünkü ziyaretleri canlı haritada, tabloda ve özet kartlarında görsün; Realtime ile yeni ziyaretler/check-out'lar sayfa yenilenmeden yansısın.

## 4. KAPSAM
1. `apps/web` iskeleti: Next.js 15 App Router + TS + Tailwind v4; package.json (name "web"), next.config.mjs (`transpilePackages: ['<shared>']`, `images: { unoptimized: true }`), tsconfig, postcss, root layout (`<html lang="tr">`, title "Saha Yönetim Paneli"), `/` → `/panel` yönlendirme.
2. Supabase browser client: `src/lib/supabase/client.ts` (`@supabase/ssr` `createBrowserClient`).
3. `src/middleware.ts`: session guard — oturumsuz `/panel` → `/giris`; oturumlu `/giris` → `/panel`; @supabase/ssr cookie-refresh pattern.
4. `/giris` sayfası: Türkçe e-posta/şifre formu; hatalar Türkçe. Giriş sonrası `users` tablosundan rol + is_active kontrolü: field_rep → "Bu panele erişim yetkiniz yok."; pasif → "Hesabınız pasif durumda."
5. `(dashboard)` route group layout: sol sidebar (Panel / Esnaflar / Ziyaretler / Raporlar ["Faz 2" rozeti] / Ayarlar [YALNIZ admin]) + üst bar (kullanıcı adı, rol rozeti, "Çıkış Yap"). Rol `useProfile` hook'uyla client-side okunur.
6. `/panel` = "Bugünkü Ziyaretler" sayfası:
   a. Özet kartları (3): Bugünkü Toplam Ziyaret | Aktif Temsilci | Devam Eden/Tamamlanan
   b. Canlı harita (react-leaflet + OSM): esnaf noktaları circleMarker; bugünkü ziyaretler outcome renginde; popup (esnaf adı + temsilci + saat + sonuç). Lejant.
   c. Ziyaret tablosu: Temsilci | Esnaf | Saat | Sonuç (renkli rozet) | Süre | Geofence ("İçinde" yeşil / "Dışı" kırmızı; is_mock ek rozet)
   d. Temsilci filtresi: dropdown → tablo+harita birlikte filtre
   e. Realtime: TEK kanal `panel-today` ile visits INSERT + UPDATE aboneliği; cleanup'li.
7. Placeholder sayfalar: `/esnaflar`, `/ziyaretler`, `/raporlar`, `/ayarlar` — "Bu modül yakında eklenecek."
8. Yardımcılar: `format.ts` (tr-TR saat/tarih, `startOfTodayISO`), `outcome.ts` (renk+etiket), `hooks/useTodayVisits.ts` (fetch+realtime+join), `hooks/useProfile.ts`.

## 5. KAPSAM DIŞI
- Esnaf/kategori/kullanıcı CRUD (E08); KPI/grafik/ısı haritası/CSV (E10); ziyaret geçmişi sayfası.
- Mobil uygulama, DB/publication/RLS değişikliği, Storage işlemleri.
- Deploy/CI yapılandırması (wrangler, Pages, adapter).
- shadcn/ui, state kütüphanesi (redux/zustand/react-query), i18n, form kütüphanesi KURMA. Git commit YOK.

## 6. TEKNİK GEREKSİNİMLER
Dosyalar:
```
src/middleware.ts
src/app/layout.tsx, globals.css, page.tsx (redirect /panel)
src/app/(auth)/giris/page.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/panel/page.tsx
src/app/(dashboard)/esnaflar/page.tsx (placeholder)
src/app/(dashboard)/ziyaretler/page.tsx (placeholder)
src/app/(dashboard)/raporlar/page.tsx (placeholder)
src/app/(dashboard)/ayarlar/page.tsx (placeholder)
src/components/Sidebar.tsx, Topbar.tsx, RoleGuard.tsx
src/components/map/MapLoader.tsx ('use client' + dynamic ssr:false)
src/components/map/LiveMap.tsx
src/components/panel/SummaryCards.tsx, VisitTable.tsx, RepFilter.tsx, OutcomeBadge.tsx
src/lib/supabase/client.ts, supabase/middleware.ts
src/lib/hooks/useProfile.ts, hooks/useTodayVisits.ts
src/lib/format.ts, outcome.ts
```

Paketler: `next@^15`, `react@^19`, `react-dom@^19`, `@supabase/supabase-js@^2`, `@supabase/ssr`, `leaflet@^1.9`, `react-leaflet@^5`, `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `lucide-react`; dev: `typescript`, `@types/react`, `@types/react-dom`, `@types/node`, `@types/leaflet`, `eslint`, `eslint-config-next`. Shared workspace dep.

Kritik notlar:
- Leaflet SSR: MapLoader Client Component içinde `dynamic(() => import('./LiveMap'), { ssr: false, loading: () => <div>Harita yükleniyor…</div> })`.
- Marker ikonları kırılmasın diye `circleMarker` kullan. Esnaf: #64748b; outcome renkleri (agreed #16a34a, quote_given #2563eb, ...).
- Tile: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution: `© OpenStreetMap contributors`.
- Middleware: @supabase/ssr createServerClient + cookies pattern; matcher: `['/panel/:path*','/esnaflar/:path*','/ziyaretler/:path*','/raporlar/:path*','/ayarlar/:path*','/giris']`.
- Ayarlar admin-only: RoleGuard ile (`role !== 'admin'` → `/panel`). Sidebar'da manager'a AYARLAR GÖSTERME.
- Veri: 3 ayrı sorgu (bugünkü visits, customers, active reps) + client-side id join (FK tahmini YAPMA).
- Realtime:
  ```ts
  const ch = supabase.channel('panel-today')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visits' }, handler)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visits' }, handler)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
  ```
  TEK kanal; publication `supabase_realtime`'e `visits` tablosu eklenmemişse sessizce çalışmaz → raporla gerekli SQL'i. 200 bağlantı Free limiti → sıkı cleanup.
- Tarih/saat: `Intl.DateTimeFormat('tr-TR', ...)`. Tasarım: sade admin teması (bg-slate-100, dark sidebar bg-slate-900, kartlar rounded-xl shadow-sm bg-white p-4). Desktop-first.
- Tüm metinler Türkçe.

## 7. KABUL KRİTERLERİ
- [ ] `npm run build` (web) hatasız; `npx tsc --noEmit` temiz; lint temiz.
- [ ] Oturumsuz `/panel` → `/giris`; giriş → `/panel`; çıkış → korumalı sayfalar erişilemez.
- [ ] Yanlış şifre → Türkçe hata. field_rep → engel + uyarı. Pasif kullanıcı → "Hesabınız pasif durumda."
- [ ] manager'da sidebar'da Ayarlar yok; `/ayarlar` URL'si `/panel`'e düşer.
- [ ] Harita OSM render; esnaf noktaları + ziyaret marker'ları (outcome rengi); popup Türkçe; lejant var.
- [ ] Özet kartları, tablo ve filtre doğru; harita+tablo birlikte daralır.
- [ ] Realtime: DB'ye bugüne INSERT → sayfada anında marker+satır; UPDATE → süre/durum güncellenir. Tek kanal, cleanup'li.
- [ ] DIŞINDA: placeholder sayfalar render; konsolda hata yok. UI tamamen Türkçe.

## 8. DOĞRULAMA
Komutlar: `npm install` → `npm run build --workspace=apps/web` / `npx turbo run build --filter=web`; `npx tsc --noEmit -p apps/web/tsconfig.json`; `npm run lint --workspace=apps/web`; geliştirme: `npm run dev --workspace=apps/web`.

Manuel: admin giriş → tüm menü → /panel harita+tablo+kartlar. manager → Ayarlar yok; URL engeli. field_rep → engel. Panel açıkken SQL ile bugüne INSERT → anlık görünüm; UPDATE → satır güncellenir. Filtre → tek temsilci. Çıkış → /giris; korumalı URL → /giris.

## 9. KISITLAR
- UI Türkçe. $0: ücretli servis/harita API key YOK (OSM tile).
- Cloudflare Pages uyumluluğu: Node API yok; output: 'export' yok.
- Minimal değişiklik; `apps/mobile`/`supabase/` DOKUNMA; shared'a yalnızca eksik sabit/tip eklemesi.
- Secret .env'de; kullanıcı istemeden git commit YOK.
