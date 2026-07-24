# E08 — Web: Esnaf + Kategori + Kullanıcı Yönetimi

> **Boyut:** Küçük | **Bağımlılıklar:** E07 (auth, middleware, RoleGuard, dashboard layout, MapLoader, placeholder'lar) | **Hat:** Web
> **Özet:** Placeholder'ları doldurur: esnaf listesi (arama/filtre/son ziyaret), haritadan konum seçimli ekleme/düzenleme formu (shared Zod, PostGIS EWKT), pasife alma, esnaf detay (ziyaret geçmişi + signed URL fotoğraf galerisi). Admin-only: kategori CRUD ve kullanıcı davet/rol/aktif-pasif yönetimi (edge API route ile).

---

# E08 — Web: Esnaf + Kategori + Kullanıcı Yönetimi

## 1. ROL
Sen kıdemli bir Next.js (App Router) + TypeScript frontend geliştiricisisin. Form UX'i, Zod validasyonu, Supabase (PostGIS + Storage + Auth Admin) ve react-leaflet konularında deneyimlisin. UI TAMAMEN Türkçe olur. Kapsam dışına çıkmazsın; RLS/şema engeliyle karşılaşırsan DB'ye dokunmaz, raporlarsın.

## 2. BAĞLAM
Proje: "Saha Ekip Takip ve Pazarlama Yönetim Sistemi" — Turborepo monorepo (`apps/web`, `apps/mobile` [DOKUNMA], `packages/shared`, `supabase/` [DOKUNMA]). Backend: Supabase Free (PostgreSQL + PostGIS + Auth + Realtime + Storage). Hosting: Cloudflare Pages → Node API kullanma; sunucu kodu minimum + edge uyumlu.

E07 TAMAMLANDI — hazır: Next.js 15 + Tailwind iskeleti; Türkçe `/giris` + Auth; middleware session guard; `(dashboard)` layout (sidebar: Panel / Esnaflar / Ziyaretler / Raporlar / Ayarlar[yalnız admin]) + RoleGuard; `/esnaflar` ve `/ayarlar` PLACEHOLDER (bu epic doldurur); `src/lib/supabase/client.ts`; `format.ts`, `outcome.ts` (renk+etiketler shared'dan); MapLoader pattern'i; `useProfile`.

DB (hazır): categories(id,name,icon,is_active), users(id,email,full_name,role,is_active), customers(id,business_name,owner_name,phone,address,category_id,location GEOMETRY,geofence_radius_m,is_active), visits(id,...,outcome,notes,is_geofence_valid,is_mock_location), visit_photos(visit_id,storage_path,captured_at).

PostGIS I/O: SELECT'te geometry GeoJSON `{type:'Point',coordinates:[lng,lat]}`. INSERT/UPDATE'te EWKT `SRID=4326;POINT(lng lat)` (lng ÖNCE). Shared'da `toEwkt` helper'ı varsa onu kullan; web'de `src/lib/geo.ts`'e yaz.

Storage: `visit-photos` private bucket → signed URL: `supabase.storage.from('visit-photos').createSignedUrl(storage_path, 3600)`.

Yetki: Esnaf CRUD admin+manager; kategori/kullanıcı yönetimi YALNIZ admin. RLS DB'de zorlanır; UI ayrıca RoleGuard.

Env: E07'ye ek olarak `SUPABASE_SERVICE_ROLE_KEY` (YALNIZ API route'ta; NEXT_PUBLIC DEĞİL). `.env.local.example`'a anahtar adını ekle, değer YAZMA.

## 3. HEDEF
Admin/manager esnafları arayıp filtreleyebilsin, haritadan tıklayarak konum seçtiği Zod-validasyonlu form ile esnaf ekleyip düzenleyebilsin, pasife alabilsin; esnaf detayında ziyaret geçmişini ve signed URL fotoğraf galerisini görsün. Admin, Ayarlar altında kategori CRUD ve kullanıcı yönetimi (davet, rol atama, aktif/pasif) yapabilsin.

## 4. KAPSAM
1. `/esnaflar` liste: tablo (İşletme Adı | Yetkili | Telefon | Kategori | Son Ziyaret | Durum | İşlemler); arama; kategori filtresi; son ziyaret kolonu (esnafın en yeni visit'i); Durum rozeti (Aktif/Pasif); satır aksiyonları: Detay, Düzenle, Pasife Al/Aktifleştir; "Yeni Esnaf" butonu.
2. `/esnaflar/yeni` ve `/esnaflar/[id]/duzenle`: CustomerForm (shared Zod şeması: işletme adı*, yetkili, telefon, adres, kategori*, geofence_radius_m varsayılan 100, konum*). Konum: haritaya tıklayarak seç (LocationPickerMap). Submit → safeParse → hatalar alan altında Türkçe. Konum EWKT ile yazılır. Başarıda `/esnaflar`'a dön + Türkçe başarı mesajı.
3. `LocationPickerMap`: MapLoader pattern (dynamic ssr:false); OSM tile; tek marker; tıklayınca taşınır; koordinat form'a yazılır; düzenlemede mevcut konum başlangıç; varsayılan Türkiye.
4. Pasife alma: confirm → `is_active=false`; liste "Pasif" rozeti; Aktifleştir geri al. Hard delete YOK.
5. `/esnaflar/[id]` detay: bilgi kartı; ziyaret geçmişi tablosu (Tarih/Saat | Temsilci | Süre | Sonuç [E07 OutcomeBadge] | Geofence rozeti | Notlar; check_in_at desc); fotoğraf galerisi (visit_photos → signed URL → thumbnail grid, tıklayınca yeni sekme; yoksa "Henüz fotoğraf yok").
6. `/ayarlar` index (admin): iki kart linki — "Kategori Yönetimi", "Kullanıcı Yönetimi".
7. `/ayarlar/kategoriler` (admin): tablo (İkon | Ad | Durum | İşlemler) + inline ekleme (Ad*, İkon [emoji input], Aktif) + satır içi düzenleme/kaydet/iptal. Pasif kategori esnaf form select'inde görünmez; eski kayıtlarda adı kalır. Unique ihlali → "Bu kategori adı zaten mevcut."
8. `/ayarlar/kullanicilar` (admin): tablo (Ad Soyad | E-posta | Rol | Durum | İşlemler); rol select (Yönetici/Müdür/Saha Temsilcisi → `users` update); aktif/pasif toggle; davet formu (E-posta*, Ad Soyad*, Rol*) → `POST /api/kullanicilar/davet`; sonuç Türkçe mesaj.
9. API route `src/app/api/kullanicilar/davet/route.ts`: `export const runtime = 'edge'`; admin session kontrol (cookie tabanlı); service-role client ile `auth.admin.inviteUserByEmail` → yeni user'a `users` upsert; hatalar Türkçe JSON. Service key loglanmaz/client'a dönmez.

## 5. KAPSAM DIŞI
- KPI/grafik/ısı haritası/leaderboard/CSV (E10). Panel sayfası değişikliği (E07). `/ziyaretler` geçmiş sayfası.
- Şifre sıfırlama, Supabase e-posta şablonları. DB migration/RLS/bucket değişikliği.
- Foto YÜKLEME (mobil işi) — web yalnız gösterir.
- Server Actions; react-hook-form/formik. Realtime aboneliği bu sayfalara EKLEME.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
Dosyalar:
```
src/app/(dashboard)/esnaflar/page.tsx
src/app/(dashboard)/esnaflar/yeni/page.tsx
src/app/(dashboard)/esnaflar/[id]/page.tsx
src/app/(dashboard)/esnaflar/[id]/duzenle/page.tsx
src/app/(dashboard)/ayarlar/page.tsx
src/app/(dashboard)/ayarlar/kategoriler/page.tsx
src/app/(dashboard)/ayarlar/kullanicilar/page.tsx
src/app/api/kullanicilar/davet/route.ts
src/components/esnaflar/CustomerTable.tsx, CustomerForm.tsx, LocationPickerMap.tsx, PhotoGallery.tsx, VisitHistoryTable.tsx
src/components/ayarlar/CategoryManager.tsx, UserManager.tsx, InviteUserForm.tsx
src/lib/geo.ts (GeoJSON parse + toEwkt — shared'da varsa import)
```

Yeni paket kurma ihtiyacı YOK: validasyon shared Zod; tüm formlar controlled state + safeParse; harita ve supabase E07'den zaten kurulu.

Phone serbest metin. Geofence radius number input (20-1000). Next 15 dynamic route `params` → `use(params)` ile. Tablolar/kartlar E07 stiliyle birebir. Boş durumlar Türkçe.

Liste sorguları: customers + categories + visits (üç ayrı sorgu; client-side id join — FK tahmini YOK). Detay: customer + kendi visits'i + visit_photos; signed URL'ler toplu `createSignedUrls(paths, 3600)` ile. RLS hatası (42501) → "Bu işlem için yetkiniz yok."

Davet route: `runtime='edge'`; @supabase/ssr server client ile oturum doğrulama; admin değilse 403; service-role client ile invite; users upsert.

## 7. KABUL KRİTERLERİ
- [ ] `npm run build` (web) hatasız; `npx tsc --noEmit` temiz; lint temiz.
- [ ] Esnaf listesi: arama (işletme + yetkili), kategori filtresi, Son Ziyaret kolonu doğru; pasif esnaf rozetli.
- [ ] Yeni esnaf: Zod hataları Türkçe; haritadan konum seçilmeden kayıt yok; kayıt sonrası listede + DB'de location doğru (lng/lat sırası).
- [ ] Düzenleme: mevcut değerlerle dolu; harita marker doğru konumda; konum değiştirilip kaydedilebilir.
- [ ] Pasife Al onaylı çalışır; Aktifleştir geri alır; hard delete yok.
- [ ] Detay: ziyaret geçmişi sıralı; sonuç/geofence rozetleri E07 ile tutarlı; fotoğraflar signed URL ile açılır (HTTP 200); yoksa "Henüz fotoğraf yok".
- [ ] manager `/ayarlar` engellenir (E07 RoleGuard); manager esnaf ekleyebilir (RLS engellerse Türkçe mesaj).
- [ ] admin kategori CRUD: ekle/düzenle/pasifleştir; unique ihlali → "Bu kategori adı zaten mevcut."; pasif kategori select'ten düşer, eski kayıtlarda adı kalır.
- [ ] Kullanıcı daveti: Auth'ta kullanıcı oluşur → `public.users`'ta full_name/role doğru; manager'ın API route çağrısı 403.
- [ ] Rol değiştirme `users`'a yansır; pasif hesapla giriş engellenir.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` build çıktısında bulunamaz.
- [ ] UI tamamen Türkçe.

## 8. DOĞRULAMA
Komutlar: `npm run build --workspace=apps/web`; `npx tsc --noEmit -p apps/web/tsconfig.json`; `npm run lint --workspace=apps/web`; `npm run dev --workspace=apps/web`.

Manuel: admin → Yeni Esnaf (boş alan submit → hatalar; haritadan İstanbul'da nokta seç → kaydet → listede görünür → detay). SQL ile visit+photo ekle → detayda geçmiş+galeri. manager → esnaf ekleme dene; `/ayarlar/kullanicilar` → engel. Kategori: "Market" ekle → formda görünür → pasife al → select'ten düşer → aynı adla tekrar → unique hata mesajı. Kullanıcı davet → Auth + `public.users` doğrula.

## 9. KISITLAR
- UI Türkçe. $0: ücretli servis/API key YOK.
- Cloudflare Pages uyumlu (API route edge). Minimal değişiklik (E07 yapısını bozma).
- `apps/mobile` / `supabase/` DOKUNMA. RLS/şema/bucket değişikliği YASAK (engel görürsen raporla).
- Secret `.env.local`; service-role key yalnızca API route'ta. Git commit YOK.
