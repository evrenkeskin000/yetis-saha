# E15 — Web: Yetiş Admin Bayi Yönetimi ve Bayi Seçici

> **Boyut:** Küçük | **Bağımlılıklar:** E14 (rol kapıları, kullanıcı yaşam döngüsü) | **Hat:** Web
> **Özet:** Yetiş Admin için bayi CRUD ekranını, bayi admini oluşturma akışını ve üst çubuktaki "Tüm Bayiler + tek bayi" seçicisini kurar. Seçici, panel/esnaf/rapor ekranlarının okuyacağı ortak bayi kapsamını (scope) yayınlar.

---

# E15 — Web: Yetiş Admin Bayi Yönetimi ve Bayi Seçici

## 1. ROL
Sen kıdemli bir Next.js (App Router) + TypeScript frontend geliştiricisisin. Yönetim panelleri, tablo/form UX'i ve uygulama genelinde paylaşılan bağlam (context) tasarımı konusunda deneyimlisin. UI %100 Türkçedir. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
E14 TAMAMLANDI: Web paneline yalnızca `yetis_admin` ve `dealer_admin` girebiliyor; middleware rol ve aktiflik kontrolü yapıyor; kullanıcı oluşturma/pasife alma/şifre sıfırlama API'leri bayi sınırını doğruluyor.

Hazır gelenler:
- `dealerships(id, name, code, is_active, created_at, updated_at)` tablosu ve `Yetiş Merkez` kaydı (E11).
- RLS: `dealerships` yazma yetkisi yalnızca `yetis_admin` (E12).
- `@saha/shared`: `Dealership` tipi, `dealershipFormSchema`, `ALL_DEALERSHIPS = 'all'` sabiti (E13).
- `apps/web/src/components/Topbar.tsx` ve `Sidebar.tsx` mevcut; bugün bayi kavramı yok.

Kesin kurallar: Bayi adminlerini **yalnızca** Yetiş Admin oluşturur. Bayi seçicide "Tüm Bayiler" seçeneği bulunur ve varsayılan seçim budur. Bayi pasife alındığında o bayinin kullanıcıları giriş yapamaz; geçmiş veriler silinmez ve Yetiş Admin tarafından görülmeye devam eder.

## 3. HEDEF
Yetiş Admin, panel üzerinden yeni bayi açabilir, bilgilerini düzenleyebilir, bayiyi pasife alabilir ve o bayiye bir bayi yöneticisi tanımlayabilir. Üst çubuktaki seçici ile "Tüm Bayiler" ile tek bir bayi arasında geçiş yapar; bu seçim uygulama genelinde tek bir kaynaktan okunur.

## 4. KAPSAM

1. **Bayi listesi** — `apps/web/src/app/(dashboard)/ayarlar/bayiler/page.tsx`
   - Yalnızca `yetis_admin` (RoleGuard + sunucu tarafı kontrol).
   - Tablo: Bayi Adı | Kod | Kullanıcı Sayısı | Esnaf Sayısı | Durum | İşlemler.
   - Sayımlar ayrı sorgularla alınır (FK tahmini yapma), istemci tarafında eşlenir.
   - Satır aksiyonları: Düzenle, Pasife Al / Aktifleştir, Bayi Yöneticisi Ekle.
   - "Yeni Bayi" butonu.

2. **Bayi formu** — `apps/web/src/components/ayarlar/DealershipForm.tsx`
   - Alanlar: Bayi Adı*, Kod (opsiyonel; boşsa addan türetilir, büyük harf + tire), Aktif.
   - `dealershipFormSchema` ile `safeParse`; hatalar alan altında Türkçe.
   - Kod çakışmasında (unique ihlali) "Bu bayi kodu zaten kullanılıyor." mesajı.

3. **Pasife alma**
   - Onay diyaloğu, sonucun ne anlama geldiğini açıkça yazar: "Bu bayinin kullanıcıları giriş yapamayacak. Geçmiş veriler silinmez."
   - `is_active = false`; hard delete YOK.
   - Pasif bayi listede rozetli görünür ve bayi seçicide "(Pasif)" etiketiyle listelenir.

4. **Bayi yöneticisi oluşturma** — `apps/web/src/components/ayarlar/CreateDealerAdminForm.tsx`
   - Alanlar: Ad Soyad*, E-posta*, Geçici Şifre*, Bayi* (liste, seçili satırdan ön dolu).
   - Mevcut `POST /api/kullanicilar/olustur` rotası `role: 'dealer_admin'` ve `dealership_id` ile çağrılır.
   - Oluşturulan kullanıcı `must_change_password = true` ile başlar.
   - Yalnızca `yetis_admin` bu formu görür.

5. **Bayi seçici** — `apps/web/src/components/DealershipSwitcher.tsx` + `src/lib/DealershipScopeContext.tsx`
   - `Topbar` içinde, yalnızca `yetis_admin` için görünür.
   - Seçenekler: "Tüm Bayiler" (varsayılan) + aktif bayiler + pasif bayiler ("(Pasif)" etiketli).
   - Seçim `DealershipScopeContext` üzerinden `{ scope: 'all' | dealershipId, dealership: Dealership | null }` olarak yayınlanır.
   - `dealer_admin` için context her zaman kendi bayisini döndürür ve seçici render edilmez.
   - Seçim sayfa yenilemesinde kaybolmaması için `sessionStorage` içinde saklanır; geçersiz/erişilemez bir kimlik saklanmışsa "Tüm Bayiler"e düşülür.

6. **Ayarlar ana sayfası** — `apps/web/src/app/(dashboard)/ayarlar/page.tsx`
   - "Bayi Yönetimi" kartı eklenir (yalnızca `yetis_admin`).
   - Kategori kartı yalnızca `yetis_admin`, Kullanıcı kartı her iki yönetici rolü için görünür.

## 5. KAPSAM DIŞI
- Panel, esnaf listesi ve raporların seçiciye göre filtrelenmesi — **E16** (bu epic yalnızca context'i yayınlar).
- Kategori yönetimi yetki değişikliği — E16.
- Mobil taraf — E17.
- Bayi silme (hard delete) — hiçbir zaman kapsamda değil.
- Bayi bazlı kota/lisans limiti — ürün kararı gereği yok.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Dosyalar:
```
src/app/(dashboard)/ayarlar/bayiler/page.tsx
src/components/ayarlar/DealershipForm.tsx
src/components/ayarlar/CreateDealerAdminForm.tsx
src/components/DealershipSwitcher.tsx
src/lib/DealershipScopeContext.tsx
src/lib/hooks/useDealerships.ts
```
- `DealershipScopeContext` `(dashboard)/layout.tsx` içinde sağlanır ki tüm dashboard sayfaları erişebilsin.
- Seçici değeri **asla** veri erişimi için tek başına yetki kaynağı sayılmaz; izolasyon RLS ile sağlanır. Seçici yalnızca görünümü daraltır.
- Yeni paket kurulmaz; mevcut Tailwind + lucide-react bileşen dili korunur.
- Boş durumlar Türkçe ("Henüz bayi eklenmemiş.").
- RLS hatası (`42501`) → "Bu işlem için yetkiniz yok."

## 7. KABUL KRİTERLERİ
- [ ] Yetiş Admin yeni bayi oluşturur; liste ve bayi seçicide anında görünür.
- [ ] Aynı kod ile ikinci bayi oluşturma denemesi Türkçe unique hata mesajı verir (olumsuz senaryo).
- [ ] Bayi pasife alınır; o bayinin `dealer_admin` hesabı giriş yapamaz (E14 kapısı); Yetiş Admin bayinin geçmiş verilerini görmeye devam eder.
- [ ] `dealer_admin` `/ayarlar/bayiler` adresine gittiğinde erişemez (olumsuz senaryo).
- [ ] `dealer_admin` için bayi seçici görünmez; kendi bayisi dışında kapsam seçemez.
- [ ] Yetiş Admin bir bayiye `dealer_admin` oluşturur; kullanıcı ilk girişte şifre değiştirmeye zorlanır.
- [ ] Bayi seçici varsayılan olarak "Tüm Bayiler" gelir; seçim sayfa yenilendiğinde korunur.
- [ ] Pasif bayi seçicide "(Pasif)" etiketiyle listelenir.
- [ ] `npm --workspace @saha/web run build`, `npm run typecheck`, `npm run lint` temiz.
- [ ] UI tamamen Türkçe.

## 8. DOĞRULAMA
Komutlar:
```bash
npm run typecheck
npm run lint
npm --workspace @saha/web run build
npm --workspace @saha/web run dev
```

Manuel:
1. Yetiş Admin → Ayarlar → Bayi Yönetimi → "Yeni Bayi" ile `Test Bayi 2` oluştur.
2. Aynı kodla tekrar dene → Türkçe hata.
3. Yeni bayiye `dealer_admin` oluştur → o hesapla giriş yap → şifre değiştirme ekranı gelmeli → `/ayarlar/bayiler` adresine gitmeye çalış → erişememeli.
4. Yetiş Admin ile bayiyi pasife al → bayi admininin girişi reddedilmeli.
5. Bayi seçicide tek bayi seç → sayfayı yenile → seçim korunmalı.

## 9. KISITLAR
- `apps/mobile`, `supabase/`, `packages/shared` DEĞİŞMEZ (shared ihtiyacı doğarsa "SHARED İHTİYACI" notu düş, kendin ekleme).
- Cloudflare Pages uyumluluğu korunur; Node-only API kullanma.
- Bayi silme işlevi eklenmez.
- $0 maliyet: yeni ücretli servis yok.
- Git commit YOK.
