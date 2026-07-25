# E18 — Ziyaret Bütünlüğü: Sert Geofence, Denetim Kaydı ve Durum Makinesi

> **Boyut:** ORTA | **Bağımlılıklar:** E12 (RLS ve denetim tablosu erişimi), E17 (mobil bayi kapsamı) | **Hat:** DB + Mobil
> **Özet:** Projenin güven temelini onarır: 100 m dışındaki check-in veritabanı seviyesinde reddedilir ve değiştirilemez bir denetim kaydına yazılır; yarım kalan ziyaretler ortadan kalkar; iptal ve check-out akışları veritabanıyla tutarlı hale gelir; sahtecilik sinyalleri korunur. Üç alt oturum (18a: DB kuralları, 18b: mobil check-in, 18c: check-out/iptal/toparlanma).

---

# E18 — Ziyaret Bütünlüğü: Sert Geofence, Denetim Kaydı ve Durum Makinesi

## 1. ROL
Sen kıdemli bir backend + React Native geliştiricisisin; GPS doğrulama, sahtecilik önleme ve dağıtık durum tutarlılığı (idempotency, crash recovery) konularında deneyimlisin. Bir kuralın istemcide değil sunucuda zorlanması gerektiğini bilirsin. UI %100 Türkçedir. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
Bu epic, denetim raporundaki kritik bulguların çoğunu kapatır ([docs/proje-denetimi-2026-07-25.md](../proje-denetimi-2026-07-25.md)):

- **K-03:** `cancelCurrentVisit` yalnızca yerel durumu temizliyor; veritabanında `check_out_at IS NULL` olan yetim ziyaret kalıyor. `startVisit` yalnızca bellekteki duruma bakıyor ve veritabanında tek açık ziyaret kısıtı yok.
- **K-04:** `performCheckOut` GPS alınamazsa `check_out_location = null` gönderiyor; tetikleyici `check_out_at` değerini yalnızca konum doluysa yazdığı için ziyaret hiç kapanmıyor ve `duration_minutes` üretilmiyor.
- **Y-01:** `visits_before_insert` menzil dışı kaydı reddetmiyor, yalnızca `is_geofence_valid` bayrağı yazıyor. Mobilde "Yine de Başlat" akışı bunu bilinçli kullanıyor. Reddedilen denemeler hiçbir yere kaydedilmiyor.
- **O-01:** Check-out, check-in anındaki `is_mock_location` bayrağını eziyor (GPS alınamazsa `false` yapıyor).
- **O-02:** Mobilde geofence eşiği sabit 100 m; veritabanında müşteri bazlı `geofence_radius_m` (25–1000) var.
- **O-03:** `visit_photos.capture_location` gerçek çekim GPS'i yerine müşterinin pin konumunu saklıyor.

E11 ile `check_in_attempts` tablosu oluşturuldu, E12 ile append-only erişim kuralları kondu; tabloyu **dolduran** yol bu epicte yazılır.

Kesin politika: 100 m tek ve değişmez eşiktir. Menzil dışı check-in reddedilir, ziyaret kaydı oluşmaz, deneme denetim tablosuna yazılır. "Yine de Başlat" akışı kaldırılır.

## 3. HEDEF
Ziyaret verisi güvenilir hale gelir: her açık ziyaret gerçekten devam eden bir ziyarettir, her kapanan ziyaretin süresi doğrudur, menzil dışı denemeler engellenip iz bırakır ve sahtecilik sinyalleri kaybolmaz.

## 4. KAPSAM

### Oturum 18a — Veritabanı kuralları

Dosya: `supabase/migrations/20260726000020_visit_integrity.sql`

1. `log_check_in_rejection(p_field_rep_id, p_customer_id, p_location, p_distance_m, p_is_mock, p_reason)` — `SECURITY DEFINER` fonksiyon; `check_in_attempts` tablosuna satır ekler, bayiyi temsilciden türetir. Yalnızca `authenticated` çalıştırabilir.
2. `visits_before_insert()` yeniden yazılır:
   - Temsilcinin bayisi ile müşterinin bayisi eşleşmiyorsa `raise exception`.
   - Mesafe `ST_Distance(...::geography)` ile hesaplanır. **100 m**'den büyükse: önce `log_check_in_rejection` çağrılır, sonra Türkçe mesajla `raise exception` (ziyaret kaydı oluşmaz).
   - `dealership_id`, `customer_snapshot`, `check_in_at = now()`, `synced_at = now()`, `is_geofence_valid = true` atanır.
   - Müşteri pasifse (`is_active = false`) reddedilir.
3. `visits_before_update()` sıkılaştırılır:
   - `check_out_at` değeri, **konum gönderilmiş olsun ya da olmasın**, `outcome` dolu geldiğinde ve `old.check_out_at is null` iken `now()` olarak yazılır (K-04).
   - Değişmez alanlar korunur: `check_in_at`, `check_in_location`, `is_geofence_valid`, `dealership_id`, `customer_snapshot`, `field_rep_id`, `idempotency_key` güncellenmeye çalışılırsa eski değere geri sabitlenir.
   - `is_mock_location` yalnızca `false → true` yönünde değişebilir; check-in'deki işaret silinemez (O-01).
   - Kapanmış ziyaret (`old.check_out_at is not null`) yeniden güncellenemez; `raise exception`.
4. Tek açık ziyaret kısıtı: `create unique index visits_one_open_per_rep on public.visits (field_rep_id) where check_out_at is null;` (K-03).
5. Yeni `cancel_visit(p_visit_id)` RPC'si: yalnızca sahibinin açık ziyaretini iptal eder; `check_out_at = now()`, `outcome = 'other'` yerine ayrı bir işaret olarak `notes` alanına dokunmadan `cancelled_at timestamptz` kolonu eklenir ve doldurulur. İptal edilen ziyaret raporlarda tamamlanmış sayılmaz.
6. `visits.cancelled_at` kolonu eklenir (nullable) ve rapor sorguları için indekslenir.

### Oturum 18b — Mobil check-in

7. `src/lib/visits.ts` → `performCheckIn`:
   - Eşik `GEOFENCE_RADIUS_M` (shared, 100) üzerinden okunur; sabit sayı yazılmaz (O-02).
   - `forceOutOfRange` parametresi ve tüm çağrı yolları **kaldırılır**.
   - Menzil dışıysa sunucuya insert denemesi yapılmadan önce kullanıcıya Türkçe uyarı gösterilir: "Esnafa X metre uzaktasınız. Ziyaret en fazla 100 metre içinden başlatılabilir." Deneme yine de sunucuya raporlanır (`log_check_in_rejection` RPC'si doğrudan çağrılır) ki istemci tarafında engellenen denemeler de iz bıraksın.
   - Sunucu `raise exception` döndürdüğünde hata mesajı kullanıcıya Türkçe gösterilir; sessizce yutulmaz.
8. `app/esnaf/[id].tsx`: "Yine de Başlat" seçeneği kaldırılır; yerine "Tamam" ve mesafeyi gösteren bilgilendirme kalır.
9. Mock konum: check-in anında tespit edilirse kullanıcıya uyarı gösterilir ve bayrak sunucuya yazılır.

### Oturum 18c — Check-out, iptal ve toparlanma

10. `performCheckOut`: `is_mock_location` alanı yalnızca `true` ise gönderilir; GPS alınamadığında bu alan payload'a **eklenmez** (O-01). `check_out_location` alınamazsa `null` gönderilir ancak ziyaret yine kapanır (18a maddesi 3 sayesinde).
11. `cancelCurrentVisit`: `cancel_visit` RPC'si çağrılır; başarısız olursa yerel durum temizlenmez ve kullanıcıya "Ziyaret iptal edilemedi, tekrar deneyin." gösterilir (K-03).
12. `startVisit`: yerel durum boş olsa bile önce `recoverActiveVisitFromSupabase` ile veritabanındaki açık ziyaret kontrol edilir; varsa yeni ziyaret açılmaz, kullanıcı aktif ziyaret ekranına yönlendirilir.
13. `app/_layout.tsx`: uygulama açılışında açık ziyaret varsa kullanıcı `ziyaret/aktif` ekranına yönlendirilir (bugün yalnızca auth/KVKK geçişlerinde yapılıyor).
14. Fotoğraf: `capture_location` alanı filigranda kullanılan **gerçek çekim GPS'i** ile doldurulur (O-03). Kamera ekranı çekim anındaki koordinatı `ActiveVisitContext` üzerinden taşır.
15. Yükleme sırası: fotoğraf yüklemesi başarılı olup check-out başarısız olursa kullanıcıya tekrar deneme sunulur ve aynı fotoğraf ikinci kez yüklenmez (idempotent yol).

## 5. KAPSAM DIŞI
- Web tarafında reddedilen denemelerin raporlanması — E16'da tablo eklendi; görsel iyileştirme E19.
- Mobil Ziyaretler sekmesi — E19.
- Çevrimdışı ziyaret kuyruğu (Faz 3).
- Bayi/rol/RLS değişikliği — E11/E12.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Kural sunucuda zorlanır; istemci kontrolü yalnızca kullanıcı deneyimi içindir. İstemci kontrolü kaldırılsa bile menzil dışı kayıt oluşmamalıdır.
- Tetikleyici hataları Türkçe ve mesafeyi içermelidir; istemci bu mesajı doğrudan gösterebilir.
- `check_in_attempts` yazımı ziyaret insert'i başarısız olsa bile kalıcı olmalıdır: `log_check_in_rejection` ayrı bir `SECURITY DEFINER` fonksiyondur ve tetikleyici içinden çağrıldığında exception ile geri alınmaması için ayrı işlem bağlamı gerektirir. Bunu sağlamak için istemci reddi RPC ile ayrıca raporlar; tetikleyici içi çağrının geri alınabileceği kabul edilir ve bu davranış dosyada yorumla belgelenir.
- Tek açık ziyaret indeksi eklenmeden önce mevcut yetim açık ziyaretler kapatılmalıdır (migration içinde `update ... set cancelled_at = now(), check_out_at = now() where check_out_at is null and check_in_at < now() - interval '1 day'`).
- Zaman damgaları daima sunucudan.
- `packages/shared` sabitleri kullanılır; mobilde sabit sayı yazılmaz.

## 7. KABUL KRİTERLERİ
- [ ] 100 m dışından check-in denemesi **ziyaret kaydı oluşturmaz**; kullanıcı mesafeyi içeren Türkçe uyarı görür (olumsuz senaryo).
- [ ] Aynı deneme `check_in_attempts` tablosuna mesafe, mock bayrağı ve `rejection_reason` ile yazılır.
- [ ] Mobil arayüzde "Yine de Başlat" seçeneği hiçbir yolda görünmez; kaynak kodda `forceOutOfRange` kalmamıştır.
- [ ] 100 m içinden check-in normal çalışır; `is_geofence_valid = true`, `check_in_at` sunucu saatidir ve cihaz saati değiştirilse bile etkilenmez.
- [ ] Aynı temsilci ikinci bir açık ziyaret **oluşturamaz** (veritabanı unique indeksi ile) (olumsuz senaryo).
- [ ] Ziyaret iptal edildiğinde veritabanında `cancelled_at` ve `check_out_at` dolar; açık ziyaret kalmaz. RPC başarısızsa yerel durum korunur.
- [ ] GPS kapalıyken check-out yapıldığında ziyaret **kapanır** ve `duration_minutes` hesaplanır.
- [ ] Check-in'de `is_mock_location = true` olan ziyarette, check-out sırasında mock kapalı olsa bile bayrak `true` kalır.
- [ ] Kapanmış bir ziyaret güncellenmeye çalışıldığında veritabanı hata verir (olumsuz senaryo).
- [ ] `check_in_at`, `is_geofence_valid` ve `customer_snapshot` alanları update ile değiştirilemez.
- [ ] `visit_photos.capture_location` filigrandaki koordinatla eşleşir.
- [ ] Uygulama kapatılıp açıldığında açık ziyaret ekranına dönülür; kronometre doğru süreden devam eder.
- [ ] `npx tsc --noEmit` (mobil), `npm run lint`, `npm test` temiz.

## 8. DOĞRULAMA
Komutlar:
```bash
supabase db reset
psql "$DATABASE_URL" -f supabase/tests/tenant_isolation.sql
cd apps/mobile && npx tsc --noEmit
cd apps/mobile && npx expo run:android
```

SQL doğrulamaları:
```sql
-- açık ziyaret tekilliği
select field_rep_id, count(*) from public.visits where check_out_at is null group by 1 having count(*) > 1;
-- reddedilen denemeler
select field_rep_id, round(distance_m) as mesafe, rejection_reason, attempted_at
from public.check_in_attempts order by attempted_at desc limit 10;
```
İlk sorgu **boş** dönmelidir.

Manuel (fiziksel cihaz zorunlu):
1. Emülatörde esnaf koordinatına git → check-in başarılı.
2. 500 m uzağa taşı → check-in reddedilmeli, mesafe gösterilmeli, `check_in_attempts` satırı oluşmalı, `visits` tablosunda yeni satır **olmamalı**.
3. Ziyaret başlat → uygulamayı öldür → yeniden aç → aktif ziyaret ekranına dönmeli.
4. Ziyaretten vazgeç → veritabanında `cancelled_at` dolmalı, açık ziyaret kalmamalı.
5. Uçak modunda check-out dene → hata mesajı; ağ açılınca tek ziyaret, tek fotoğraf.
6. Konum servisini kapatıp check-out yap → ziyaret kapanmalı, süre doğru hesaplanmalı.
7. Sahte konum uygulamasıyla check-in → mock uyarısı ve bayrak; check-out sonrası bayrak hâlâ `true`.

## 9. KISITLAR
- `apps/web` DEĞİŞMEZ.
- Şema değişikliği yalnızca bu epicte tanımlanan yeni migration dosyasıyla yapılır; var olan dosyalar düzenlenmez.
- İstemcide geofence eşiğini gevşetme veya atlatma yolu bırakma.
- SADECE Android; galeri erişimi yok; zaman damgaları sunucudan.
- Üç alt oturumda ilerle; her oturumun kabul kriterlerini sağlamadan sonrakine geçme.
- Git commit YOK.
