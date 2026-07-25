# E14 — Web + Mobil: Giriş Akışı, Rol Kapıları ve Hesap Yaşam Döngüsü

> **Boyut:** ORTA | **Bağımlılıklar:** E13 (roller, tipler, derleme zemini) | **Hat:** Web + Mobil
> **Özet:** Tek giriş formu ve role göre yönlendirme kurar; `field_rep` kullanıcısını web panelinden, pasif kullanıcıyı her iki uygulamadan tamamen dışarıda tutar; zorunlu şifre değişimi akışındaki guard boşluklarını kapatır; bayi admininin kendi saha elemanlarını uçtan uca yönetmesini sağlar. İki alt oturum (14a: web, 14b: mobil).

---

# E14 — Web + Mobil: Giriş Akışı, Rol Kapıları ve Hesap Yaşam Döngüsü

## 1. ROL
Sen kıdemli bir full-stack geliştiricisin; Next.js App Router middleware'i, Supabase Auth ve Expo Router guard akışları konusunda deneyimlisin. Yetkilendirmeyi asla yalnızca istemci tarafına bırakmazsın. UI %100 Türkçedir. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
E13 TAMAMLANDI: `@saha/shared` yeni rolleri (`yetis_admin`, `dealer_admin`, `field_rep`) ve `dealership_id` alanlarını export ediyor; mobil typecheck temiz; `npm test` kökten çalışıyor. E12 ile RLS tarafında pasif kullanıcı ve bayi kapıları zaten var; bu epic uygulama katmanını hizalar.

Mevcut durum ve kapatılacak açıklar (denetim raporu bölüm 3):
- **Y-03:** `middleware.ts` yalnızca oturum kontrol ediyor, rol kontrol etmiyor; `/panel` sayfasında `RoleGuard` yok. Mobil ile giriş yapmış bir `field_rep`, tarayıcıda `/panel` içeriğini açabiliyor.
- **Y-04:** `is_active` yalnızca web giriş ekranında kontrol ediliyor; mobil hiç bakmıyor. Pasife alınan kullanıcı geçerli JWT ile çalışmaya devam ediyor.
- **Y-05:** `/sifre-degistir` yolu `updateSession` içinde korumalı sayılıyor ama `middleware.ts` matcher listesinde yok.
- `apps/web/src/components/RoleGuard.tsx` içindeki `allowedRoles` tipi hâlâ `'admin' | 'manager'`.
- `apps/web/src/app/api/kullanicilar/*` rotaları `admin` rolüne göre yetki kontrolü yapıyor.
- Mobil `src/lib/auth.tsx` profil yüklemesi hata verirse `mustChangePassword` sessizce `false` kalıyor.

Hedef rol yetkileri: `yetis_admin` bayi/kullanıcı/esnaf/kategori yönetir; `dealer_admin` kendi bayisinin saha elemanlarını yönetir (oluşturma, düzenleme, pasife alma, şifre sıfırlama); `field_rep` yalnızca mobil.

## 3. HEDEF
Kullanıcı `/giris` üzerinde tek bir form doldurur ve rolüne uygun ekrana yönlendirilir. Web paneline yalnızca `yetis_admin` ve `dealer_admin` girebilir. Pasif hesap ve pasif bayi her iki uygulamada da giriş yapamaz, açık oturum bir sonraki kontrolde sonlandırılır. Zorunlu şifre değişimi tüm giriş yollarında tutarlı çalışır. Bayi admini kendi ekibini uçtan uca yönetebilir.

## 4. KAPSAM

### Oturum 14a — Web

1. **Middleware** (`apps/web/src/middleware.ts`, `src/lib/supabase/middleware.ts`)
   - `matcher` listesine `/sifre-degistir/:path*` eklenir (Y-05).
   - Oturum doğrulandıktan sonra `users` tablosundan `role`, `is_active` ve bağlı bayinin `is_active` bilgisi okunur.
   - `field_rep` korumalı bir yola girmeye çalışırsa oturum sonlandırılır ve `/giris?hata=mobil_kullanici` adresine yönlendirilir.
   - Pasif kullanıcı veya pasif bayi → oturum sonlandırılır, `/giris?hata=hesap_pasif`.
   - `must_change_password` true ise `/sifre-degistir` dışındaki tüm korumalı yollar oraya yönlendirilir (bugün yalnızca client layout yapıyor).

2. **Giriş sayfası** (`apps/web/src/app/(auth)/giris/page.tsx`)
   - Tek e-posta/şifre formu korunur; "Süper Admin Girişi / Bayi Paneli Girişi" gibi ikinci bir buton **eklenmez**.
   - Başarılı girişte role göre yönlendirme: `yetis_admin` → `/panel` (tüm bayiler kapsamı), `dealer_admin` → `/panel` (kendi bayisi), `field_rep` → giriş reddi + "Bu hesap mobil uygulama içindir." mesajı.
   - `hata` query parametresine karşılık gelen Türkçe uyarılar gösterilir.

3. **RoleGuard ve sayfa kapıları**
   - `RoleGuard` tipi `UserRole` üzerinden çalışacak şekilde güncellenir.
   - `/panel` sayfasına `RoleGuard` eklenir (`yetis_admin`, `dealer_admin`).
   - `/ayarlar` ve alt sayfaları: kategori yönetimi yalnızca `yetis_admin`; kullanıcı yönetimi `yetis_admin` ve `dealer_admin`.
   - `Sidebar` menü öğeleri role göre filtrelenir.

4. **Kullanıcı yönetimi API'leri** (`apps/web/src/app/api/kullanicilar/*`)
   - Yetki kontrolü: `yetis_admin` her bayide; `dealer_admin` yalnızca kendi bayisinde işlem yapabilir. Gövdeden gelen `dealership_id` **doğrulanır**, güvenilmez.
   - `dealer_admin`, `yetis_admin` veya başka bir `dealer_admin` oluşturamaz; yalnızca `field_rep` açabilir.
   - `olustur`: `must_change_password: true` ile açar (mevcut davranış korunur).
   - `davet`: aynı bayrağı set eder (bugün eksik, tutarsızlık yaratıyor).
   - `sifre-sifirla`: hedef kullanıcı çağıranın bayisinde olmalı; işlem sonrası `must_change_password: true`.
   - Yeni `apps/web/src/app/api/kullanicilar/durum/route.ts`: kullanıcıyı pasife alma/aktifleştirme. Pasife alınan kullanıcının Supabase oturumları da sonlandırılır (`auth.admin.signOut`).

5. **Zorunlu şifre değişimi**
   - `/sifre-degistir` API'si yalnızca `must_change_password = true` olan kullanıcıya izin verir (bugün her aktif kullanıcı çağırabiliyor).
   - `(dashboard)/layout.tsx`: `profile === null` durumunda dashboard kabuğu render edilmez, `/giris`'e yönlendirilir.

### Oturum 14b — Mobil

6. **Auth sağlayıcı** (`apps/mobile/src/lib/auth.tsx`)
   - Profil sorgusuna `is_active` ve `dealership_id` eklenir; `dealerships(name, is_active)` ilişkisi çekilir.
   - Profil yüklemesi başarısız olursa oturum **açık bırakılmaz**: kullanıcı çıkışa yönlendirilir ve Türkçe hata gösterilir. Sessizce `mustChangePassword = false` yapma davranışı kaldırılır.
   - Pasif kullanıcı veya pasif bayi → giriş reddi: "Hesabınız pasif durumda. Bayi yöneticinizle görüşün."
   - Rol `field_rep` değilse giriş reddi (mevcut davranış korunur).
   - Uygulama ön plana geldiğinde profil yeniden doğrulanır; pasife alınmışsa oturum kapatılır.

7. **Bayi bilgisi**
   - `profil.tsx` ekranında bağlı bayinin adı gösterilir.

## 5. KAPSAM DIŞI
- Bayi CRUD ekranları ve bayi seçici — E15.
- Panel/esnaf/rapor sorgularının bayi kapsamına alınması — E16.
- Mobil esnaf sahipliği ve tenant-scoped listeler — E17.
- Ziyaret bütünlüğü ve geofence — E18.
- Otomatik test yazımı — E20 (bu epicte doğrulama manuel + mevcut komutlarla yapılır).
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Middleware'de her istekte veritabanı sorgusu yapılacağı için tek ve dar bir `select` kullan (`role, is_active, must_change_password, dealership_id` + bayi aktifliği).
- Yetki kararı sunucu tarafında verilir; `RoleGuard` yalnızca kullanıcı deneyimi içindir, güvenlik sınırı değildir.
- Service-role anahtarı yalnızca `app/api/**` içinde kullanılır ve asla istemciye sızmaz.
- API rotaları edge runtime'da kalır.
- Tüm yeni kullanıcı mesajları Türkçe ve eylem önerir ("Bayi yöneticinizle görüşün." gibi).
- Rol string'leri `@saha/shared` üzerinden gelir.

## 7. KABUL KRİTERLERİ
- [ ] `field_rep` hesabıyla `/giris` üzerinden giriş **reddedilir**; mobil oturumu olan bir `field_rep` tarayıcıda `/panel` adresine gittiğinde panele **giremez** (olumsuz senaryo).
- [ ] Pasife alınan kullanıcı webde bir sonraki istekte `/giris?hata=hesap_pasif` adresine düşer; mobilde uygulama ön plana geldiğinde oturumu kapanır.
- [ ] Bayisi pasife alınan `dealer_admin` giriş yapamaz; Yetiş Admin aynı bayinin geçmiş verilerini görmeye devam eder.
- [ ] Oturumsuz kullanıcı `/sifre-degistir` adresine gittiğinde `/giris`'e yönlendirilir.
- [ ] `must_change_password = true` olan kullanıcı hangi korumalı yola giderse gitsin `/sifre-degistir` ekranına düşer; şifre değişince normal akışa döner.
- [ ] `must_change_password = false` olan bir kullanıcının `/api/kullanicilar/sifre-degistir` çağrısı **reddedilir**.
- [ ] `dealer_admin`, başka bayideki kullanıcı için şifre sıfırlama çağrısı yaptığında **403** alır.
- [ ] `dealer_admin`, `yetis_admin` rolüyle kullanıcı oluşturmaya çalıştığında **403** alır.
- [ ] `dealer_admin` kendi bayisinde saha elemanı oluşturur, düzenler, pasife alır ve şifresini sıfırlar; oluşturulan kullanıcı ilk girişte şifre değiştirmeye zorlanır.
- [ ] `davet` ile açılan kullanıcı da `must_change_password = true` ile başlar.
- [ ] Mobil: profil sorgusu hata verirse kullanıcı giriş ekranına döner, sessizce içeri alınmaz.
- [ ] Mobil profil ekranında bağlı bayi adı görünür.
- [ ] `npm run typecheck`, `npm run lint`, `npm --workspace @saha/web run build` ve `npm test` geçer.

## 8. DOĞRULAMA
Komutlar:
```bash
npm run typecheck
npm run lint
npm --workspace @saha/web run build
npm test
npm --workspace @saha/web run dev
cd apps/mobile && npx expo run:android
```

Manuel senaryolar:
1. `field_rep` hesabıyla web girişi dene → reddedilmeli.
2. Mobilde giriş yap, aynı tarayıcı profilinde `/panel` adresini aç → panele girememeli.
3. Yetiş Admin ile `field_rep` hesabını pasife al → mobil uygulamayı arka plandan öne getir → oturum kapanmalı.
4. Bayiyi pasife al → o bayinin `dealer_admin` hesabıyla giriş dene → reddedilmeli.
5. Yeni saha elemanı oluştur → mobilde ilk girişte şifre değiştirme ekranı gelmeli → değiştirdikten sonra KVKK ve sekmeler açılmalı.
6. `dealer_admin` ile başka bayinin kullanıcısına şifre sıfırlama isteği gönder (curl) → 403.

## 9. KISITLAR
- `supabase/` DEĞİŞMEZ (RLS E12'de tamamlandı; engel görürsen raporla).
- Yetkilendirmeyi yalnızca `RoleGuard` ile çözme; middleware ve API kontrolü zorunludur.
- Giriş sayfasına ikinci bir portal/buton ekleme.
- UI %100 Türkçe; kod İngilizce.
- Secret'lar `.env.local` / `.env` içinde; service-role anahtarı istemciye taşınmaz.
- İki alt oturumda ilerle; 14a bitmeden 14b'ye geçme.
- Git commit YOK.
