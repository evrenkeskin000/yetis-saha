# E03 — Shared Package (types / constants / validation / api)

> **Boyut:** Küçük | **Bağımlılıklar:** E01 (monorepo iskeleti, `@saha/shared` paket iskeleti), E02 (DB şeması, RPC'ler, trigger'lar, storage bucket) | **Hat:** Ortak
> **Özet:** `packages/shared`'ı doldurur: DB şemasıyla birebir TypeScript tipleri, Türkçe etiketli sabitler, Zod form şemaları ve E02'nin RPC/trigger davranışlarına tam uyumlu Supabase sorgu helper'ları. Build adımı olmadan (kaynak TS'i tüketen taraf transpile eder) hem Expo hem Next.js tarafından tüketilir; vitest birim testleri dahil.

---

# E03 — Shared Package (types / constants / validation / api)

## 1. ROL
Sen kıdemli bir TypeScript mühendisisin. Cross-platform (React Native + Next.js) paylaşılan kütüphane tasarımı, Zod ile doğrulama ve Supabase (supabase-js) istemci kalıplarında deneyimlisin. Platformdan bağımsız, bağımlılığı minimal, test edilmiş kod yazarsın.

## 2. BAĞLAM
"Saha" projesi: Esnafları gezen pazarlama ekiplerinin takip sistemi. Mobil (Expo, yalnız Android) ve web (Next.js) aynı monorepoda; ikisi de `@saha/shared` paketini tüketir. Maliyet kısıtı $0/ay. UI dili Türkçe.

Önceki epic'ler tamamlandı:
- **E01**: Turborepo iskeleti hazır. `packages/shared` iskeleti mevcut; `main`/`types` → `./src/index.ts` (BUILD ADIMI YOK — tüketen taraf kendi transpile eder). Bu yapıyı DEĞİŞTİRME.
- **E02**: Veritabanı kurulu. Bilmen gereken sözleşmeler:
  - Tablolar: categories, users (kvkk_consent_at, kvkk_consent_version), customers (location GEOMETRY, geofence_radius_m DEFAULT 100), visits (idempotency_key UNIQUE, duration_minutes GENERATED, is_geofence_valid, is_mock_location, synced_at), visit_photos, location_logs (id bigint GENERATED ALWAYS AS IDENTITY, battery_level smallint, activity_type, recorded_at)
  - Enum: `role ∈ ('admin','manager','field_rep')`; `outcome ∈ ('agreed','quote_given','decision_maker_absent','not_interested','follow_up_needed','complaint','other')`; `activity_type ∈ ('still','walking','driving','unknown')`
  - **SUNUCU DAVRANIŞLARI (helper'lar buna uymak ZORUNDA):** visits BEFORE INSERT trigger'ı `check_in_at := now()` basar ve `is_geofence_valid`'i sunucuda hesaplar → insert payload'ında `check_in_at` ve `is_geofence_valid` ASLA GÖNDERME. BEFORE UPDATE trigger'ı `check_out_location` set edilince `check_out_at := now()` basar → update'te `check_out_at` GÖNDERME.
  - RPC: `get_customers_nearby(p_lat, p_lng, p_radius_m DEFAULT 1000)` → `(id, business_name, ..., lat, lng, distance_m)` döndürür.
  - Storage: bucket 'visit-photos' PRIVATE, path `{user_id}/{visit_id}/{uuid}.jpg`, RLS prefix bazlı.
  - Geometry: PostgREST üzerinden WKB hex döner; uygulama sınırında `GeoPoint { latitude, longitude }` taşınır. Yazmada EWKT `SRID=4326;POINT(lng lat)`.
- Bu epic'in çıktısını sonraki tüm epic'ler tüketecek — imzaları ve isimleri aynen koru.

## 3. HEDEF
`packages/shared`'ı; DB şemasıyla birebir tipli, Türkçe etiketli sabitler ve Zod doğrulamaları içeren, E02 sunucu davranışlarına tam uyumlu Supabase sorgu helper'ları sunan, vitest ile test edilmiş, her iki platformun build adımı olmadan tüketebildiği tek doğruluk kaynağına dönüştürmek.

## 4. KAPSAM
- `src/types.ts` — DB ile birebir tipler + RPC dönüş tipleri + DTO'lar
- `src/constants.ts` — roller/outcome'lar + Türkçe etiketler + renkler + geofence/KVKK/storage sabitleri
- `src/validation.ts` — Zod şemaları (esnaf formu, ziyaret tamamlama formu, check-in)
- `src/geo.ts` — `toEwkt`, `generateUUID`, `getTodayStartIso` yardımcıları
- `src/api.ts` — `getTodayVisits`, `getActiveVisit`, `getCustomersNearby`, `createVisit`, `completeVisit`, `uploadVisitPhoto`, `getVisitPhotoUrl`
- `src/index.ts` — barrel export
- `vitest.config.ts` + `src/__tests__/` altında birim testler
- `packages/shared/package.json` — bağımlılıklar ve scriptler (`test`, `typecheck`)

## 5. KAPSAM DIŞI (KESİNLİKLE YAPMA)
- Supabase client OLUŞTURMA: `createClient(...)` ÇAĞIRMA; yalnızca `import type { SupabaseClient }` kullanılır (client örneği helper'lara parametre gelir)
- Build adımı ekleme: tsup/rollup/esbuild YASAK; `main`/`types` `./src/index.ts` kalır; `"type": "module"` EKLEME
- Platform-spesifik bağımlılık: `expo-*`, `@react-native-async-storage/*`, `next/*` bu pakete GİREMEZ
- React hook'ları, context, state yönetimi, UI bileşeni
- Auth helper'ları (signIn/signOut — app katmanında), offline kuyruk/AsyncStorage
- Fotoğraf sıkıştırma (mobil epic'te); burada yalnızca upload imzası
- `supabase gen types` ile kod üretimi (elle yazılan tipler esastır)
- E01/E02 dosyalarında değişiklik

## 6. TEKNİK GEREKSİNİMLER

### package.json (packages/shared)
- `dependencies`: `zod` (^3.23)
- `peerDependencies`: `@supabase/supabase-js` (^2)
- `devDependencies`: `@supabase/supabase-js` (^2 — tipler için), `vitest` (^2), `typescript` (^5)
- Scriptler: `"test": "vitest run"`, `"test:watch": "vitest"`, `"typecheck": "tsc --noEmit"`
- `main`/`types` → `./src/index.ts`; `"type"` alanı EKLEME

### src/types.ts
```ts
export type UserRole = 'admin' | 'manager' | 'field_rep';
export type VisitOutcome = 'agreed' | 'quote_given' | 'decision_maker_absent' | 'not_interested' | 'follow_up_needed' | 'complaint' | 'other';
export type ActivityType = 'still' | 'walking' | 'driving' | 'unknown';
export interface GeoPoint { latitude: number; longitude: number; }
export interface Category { id: string; name: string; icon: string | null; is_active: boolean; created_at: string; }
export interface User { id: string; email: string; full_name: string; phone: string | null; role: UserRole; avatar_url: string | null; is_active: boolean; kvkk_consent_at: string | null; kvkk_consent_version: string | null; created_at: string; updated_at: string; }
export interface Customer { id: string; business_name: string; owner_name: string | null; phone: string | null; address: string | null; category_id: string | null; location: GeoPoint; geofence_radius_m: number; notes: string | null; is_active: boolean; created_at: string; }
export interface Visit { id: string; idempotency_key: string; field_rep_id: string; customer_id: string; check_in_at: string; check_out_at: string | null; check_in_location: GeoPoint; check_out_location: GeoPoint | null; duration_minutes: number | null; outcome: VisitOutcome | null; notes: string | null; is_geofence_valid: boolean | null; is_mock_location: boolean; synced_at: string; created_at: string; }
export interface VisitPhoto { id: string; visit_id: string; storage_path: string; captured_at: string | null; capture_location: GeoPoint | null; created_at: string; }
export interface LocationLog { id: number; user_id: string; location: GeoPoint; accuracy_m: number | null; speed_kmh: number | null; battery_level: number | null; is_mock: boolean; activity_type: ActivityType | null; recorded_at: string; synced_at: string; }
export interface NearbyCustomer { id: string; business_name: string; owner_name: string | null; phone: string | null; address: string | null; category_id: string | null; geofence_radius_m: number; notes: string | null; lat: number; lng: number; distance_m: number; }
export interface VisitWithCustomer extends Omit<Visit, 'check_in_location' | 'check_out_location'> { customer: Pick<Customer, 'id' | 'business_name' | 'address' | 'category_id'> | null; }
export interface CreateVisitInput { customer_id: string; location: GeoPoint; is_mock_location?: boolean; notes?: string; idempotency_key?: string; }
export interface CompleteVisitInput { visit_id: string; outcome: VisitOutcome; location: GeoPoint; notes?: string; is_mock_location?: boolean; }
export interface UploadVisitPhotoInput { visit_id: string; data: ArrayBuffer | Uint8Array; content_type?: string; captured_at?: string; location?: GeoPoint; file_ext?: string; }
```

### src/constants.ts
```ts
export const ROLES = ['admin', 'manager', 'field_rep'] as const;
export const ROLE_LABELS: Record<UserRole, string> = { admin: 'Yönetici', manager: 'Ekip Lideri', field_rep: 'Saha Temsilcisi' };
export const OUTCOMES = ['agreed','quote_given','decision_maker_absent','not_interested','follow_up_needed','complaint','other'] as const;
export const OUTCOME_LABELS: Record<VisitOutcome, string> = { agreed: 'Anlaşma Sağlandı', quote_given: 'Teklif Verildi', decision_maker_absent: 'Karar Verici Yerinde Yok', not_interested: 'İlgilenmedi', follow_up_needed: 'Tekrar Uğranacak', complaint: 'Şikayet İletti', other: 'Diğer' };
export const OUTCOME_COLORS: Record<VisitOutcome, string> = { agreed: '#16a34a', quote_given: '#2563eb', decision_maker_absent: '#d97706', not_interested: '#dc2626', follow_up_needed: '#7c3aed', complaint: '#ea580c', other: '#64748b' };
export const DEFAULT_GEOFENCE_RADIUS_M = 100; export const GEOFENCE_MIN_RADIUS_M = 25; export const GEOFENCE_MAX_RADIUS_M = 1000;
export const VISIT_PHOTOS_BUCKET = 'visit-photos'; export const PHOTO_TARGET_SIZE_KB = 200;
export const LOCATION_LOG_RETENTION_MONTHS = 6; export const KVKK_CONSENT_VERSION = 'v1.0';
```

### src/geo.ts
```ts
export function toEwkt(p: GeoPoint): string; // 'SRID=4326;POINT(lng lat)'
export function generateUUID(): string; // Hermes/crypto uyumlu
export function getTodayStartIso(now?: Date): string; // UTC+3 (TR) gün başı, UTC ISO string
```

### src/validation.ts (Zod — tüm hata mesajları Türkçe)
- `geoPointSchema`: lat [-90,90], lng [-180,180] + Türkiye sınırı refine (lat 35.5-42.5, lng 25.5-45)
- `trPhoneSchema`: `/^(?:\+90|0)?5\d{9}$/`, mesaj `'Geçerli bir cep telefonu girin (05XXXXXXXXX)'`
- `customerFormSchema`: business_name (min 2), owner_name (ops), phone (ops), address (ops), category_id (uuid), location (geoPointSchema), geofence_radius_m (25-1000), notes (ops max 500)
- `checkInSchema`: customer_id (uuid), location (geoPoint), is_mock_location (boolean default false), notes (ops max 500)
- `visitCompletionSchema`: visit_id (uuid), outcome (7'li enum), location (geoPoint), notes (ops max 500), is_mock_location (boolean default false)
- Her şema için `export type XFormValues = z.infer<...>`

### src/api.ts (imzalar — supabase-js client parametre, tüm hatalar fırlatılır)
- `getTodayVisits(supabase, fieldRepId)`: visits select + customer join, today filter via `getTodayStartIso()`
- `getActiveVisit(supabase, fieldRepId)`: check_out_at IS NULL, maybeSingle
- `getCustomersNearby(supabase, lat, lng, radiusM?)`: `rpc('get_customers_nearby', { p_lat, p_lng, p_radius_m })`
- `createVisit(supabase, input)`: Zod doğrula → insert (`check_in_at`/`is_geofence_valid` GÖNDERME) → 23505 hatasında select ile mevcut kaydı döndür (idempotency)
- `completeVisit(supabase, input)`: update outcome/notes/check_out_location/is_mock_location → `check_out_at` GÖNDERME (trigger basar)
- `uploadVisitPhoto(supabase, input)`: storage upload → visit_photos insert → insert hatasında storage sil (rollback)
- `getVisitPhotoUrl(supabase, storagePath, expiresInSec?)`: createSignedUrl

### Testler (vitest, `src/__tests__/`)
- constants: tüm etiket-sabit eşleşmeleri, değer kontrolü
- geo: `toEwkt` lng/lat sırası, `generateUUID` benzersizlik, `getTodayStartIso` TR gün başı
- validation: telefon kabul/red, form valid/invalid, Türkiye dışı konum hatası, 7 outcome kabulü
- api: mock `SupabaseClient` ile her helper'ın doğru RPC/imza çağırdığı; createVisit 23505 idempotency; completeVisit check_out_at yok; uploadVisitPhoto rollback

## 7. KABUL KRİTERLERİ
- [ ] `npm --workspace @saha/shared run typecheck` 0 hata
- [ ] `npm --workspace @saha/shared run test` tüm testler yeşil (≥ 20 test)
- [ ] `npx turbo run typecheck` monorepo genelinde (web + mobile + shared) yeşil
- [ ] `npm --workspace @saha/web run build` hâlâ başarılı (E01 davranışı bozulmadı)
- [ ] `api.ts` içinde `check_in_at`/`check_out_at`/`is_geofence_valid` yalnızca select listelerinde; insert/update payload'larında YOK
- [ ] RPC parametre isimleri E02 imzasıyla birebir (`p_lat`, `p_lng`, `p_radius_m`)
- [ ] Pakette platform-spesifik import yok: `grep -r "expo\|next\|@react-native" packages/shared/src` boş
- [ ] `@supabase/supabase-js` yalnızca `import type` ile
- [ ] Tüm kullanıcıya değecek stringler Türkçe

## 8. DOĞRULAMA
Sırayla çalıştır:
1. `npm install` (kök) → exit 0
2. `npm --workspace @saha/shared run typecheck` → 0 hata
3. `npm --workspace @saha/shared run test` → tüm suit geçer
4. `npx turbo run typecheck` → 3/3 yeşil
5. `npm --workspace @saha/web run build` → başarılı

## 9. KISITLAR
- UI metinleri, etiketler, hata mesajları TÜRKÇE; kod tanımlayıcıları İngilizce
- $0/ay: yalnızca açık kaynak bağımlılıklar (zod, vitest)
- Build adımı YOK; `main`/`types` `./src/index.ts` kalır
- Platform-spesifik API kullanma (expo, next, window, AsyncStorage YASAK); `crypto.randomUUID` varlığı runtime'da kontrol edilir (Hermes)
- E02 şemasında olmayan alan/tablo/RPC türetme; imzaları değiştirme
- Secret/URL hiçbir dosyaya gömülmez; kullanıcı istemeden `git commit` ATMA
