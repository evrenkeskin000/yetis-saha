# E17 — Mobil: Bayi Kapsamı, Esnaf Sahipliği ve Yerel Veri İzolasyonu

> **Boyut:** Küçük | **Bağımlılıklar:** E14 (mobil auth, bayi bilgisi) | **Hat:** Mobil
> **Özet:** Mobil uygulamanın tüm sorgularını temsilcinin bayisine daraltır; bugün RLS'e takılan "Yeni Esnaf" akışını çalışır hale getirir (bayi + oluşturan alanlarıyla); temsilcinin yalnızca kendi eklediği esnafı düzenlemesini sağlar; yerel önbellek ve tamponları bayi/kullanıcı bazlı ayırır.

---

# E17 — Mobil: Bayi Kapsamı, Esnaf Sahipliği ve Yerel Veri İzolasyonu

## 1. ROL
Sen kıdemli bir React Native / Expo geliştiricisisin. Çok kiracılı mobil istemcilerde veri kapsamı, çevrimdışı önbellek hijyeni ve cihaz paylaşımı senaryoları konusunda deneyimlisin. UI %100 Türkçedir. SADECE Android. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
E14 TAMAMLANDI: mobil auth artık `is_active`, `dealership_id` ve bağlı bayinin aktifliğini okuyor; pasif hesap giriş yapamıyor; profil ekranında bayi adı görünüyor; profil yükleme hatası sessizce yutulmuyor.

Bugünkü mobil veri erişimi (hepsi bayi kavramından habersiz):
- `src/lib/customers.ts` → `fetchCustomers` tüm aktif esnafları çekiyor; `createCustomer` insert yapıyor; `parsePostGisLocation` hatalı geometride Türkiye merkezine (39, 35) düşüyor.
- `app/(tabs)/esnaflar.tsx` → tüm listeyi çekip istemcide Haversine ile yakınlık hesaplıyor; `get_customers_nearby` RPC'si kullanılmıyor; arama debounce'suz.
- `app/esnaf/yeni.tsx` ve `app/esnaf/konum-sec.tsx` → yeni esnaf ekleme akışı. **Denetim bulgusu Y-02:** `field_rep` için RLS insert'i reddediyordu; E12 ile temsilciye kendi bayisinde ekleme yetkisi verildi, ancak istemci `dealership_id` ve `created_by` alanlarını göndermiyor, bu yüzden akış hâlâ çalışmaz.
- `src/lib/locationBuffer.ts` → `@saha_location_buffer_v1` anahtarıyla tek bir tampon; `location_logs` insert'inde `dealership_id` yok.
- `src/lib/activeVisit.ts` → `@active_visit` anahtarı kullanıcıdan bağımsız.

Kesin kurallar: Temsilci yalnızca kendi bayisinin esnaflarını görür ve ziyaret eder. Esnaf ekleyebilir, ancak **yalnızca kendi oluşturduğu** esnafı düzenleyebilir. Bayi değiştiren temsilcinin eski verileri yerel önbellekte kalmamalıdır.

## 3. HEDEF
Saha temsilcisi mobil uygulamada yalnızca kendi bayisine ait esnafları görür, yeni esnafı doğru bayi ve sahiplik bilgisiyle ekler, kendi eklediği kaydı düzenleyebilir, başkasının kaydında düzenleme seçeneğini görmez. Konum logları doğru bayiyle yazılır ve cihazda kalan yerel veriler kullanıcı/bayi değişiminde temizlenir.

## 4. KAPSAM

1. **Esnaf sorguları** (`src/lib/customers.ts`)
   - `fetchCustomers`: `dealership_id` filtresi (oturum sahibinin bayisi) + `is_active`.
   - `fetchCustomerById`: bayi eşleşmezse `null` döndürür ve çağıran ekran Türkçe "Bu esnafa erişiminiz yok." mesajı gösterir.
   - `createCustomer`: `dealership_id` (profildeki bayi) ve `created_by` (`auth.uid()`) alanlarını gönderir.
   - Yeni `updateCustomer`: yalnızca `created_by = auth.uid()` olan kayıtlar için çağrılır; RLS reddinde (`42501`) Türkçe mesaj.
   - `parsePostGisLocation`: hatalı geometride sessizce (39, 35) döndürme kaldırılır; `null` döner ve çağıran kayıt listede "Konum bilgisi eksik" olarak işaretlenir.

2. **Esnaf listesi** (`app/(tabs)/esnaflar.tsx`)
   - Yakındakiler için `get_customers_nearby` RPC'si kullanılır (E12'de bayi filtresiyle sıkılaştırıldı); istemci Haversine yalnızca gösterim amaçlı kalır.
   - Arama girdisi ~300 ms debounce edilir.
   - Liste başlığında bağlı bayi adı gösterilir.
   - Boş durum: "Bayinize ait esnaf bulunamadı."

3. **Esnaf ekleme ve düzenleme** (`app/esnaf/yeni.tsx`, `app/esnaf/[id].tsx`, yeni `app/esnaf/[id]/duzenle.tsx`)
   - Ekleme akışı uçtan uca çalışır hale getirilir (bugün RLS/alan eksikliği nedeniyle başarısız).
   - Detay ekranında "Düzenle" butonu yalnızca `created_by === auth.uid()` ise görünür.
   - Düzenleme formu ekleme formunun alanlarını yeniden kullanır; konum değişikliği harita üzerinden yapılır.
   - Başarı ve hata mesajları Türkçe.

4. **Konum logları ve vardiya** (`src/lib/locationBuffer.ts`, `src/lib/locationTask.ts`, `src/lib/ShiftContext.tsx`)
   - `location_logs` insert'ine `dealership_id` eklenir.
   - Tampon anahtarı kullanıcı bazlı olur: `@saha_location_buffer_v1:<userId>`.
   - Uygulama açılışında (vardiya aktifse) bekleyen tampon bir kez flush edilir; bugün yalnızca 5 dakikalık periyot, eşik ve vardiya kapanışı tetikliyor.
   - Konum izni reddedildiğinde Türkçe açıklama + `Linking.openSettings()` ile "Ayarlara Git" seçeneği sunulur.

5. **Yerel veri hijyeni** (`src/lib/auth.tsx`, `src/lib/activeVisit.ts`)
   - Aktif ziyaret anahtarı kullanıcı bazlı olur: `@active_visit:<userId>`.
   - Çıkışta ve kullanıcı değişiminde: aktif ziyaret durumu, konum tamponu ve esnaf önbelleği temizlenir.
   - Profil yenilendiğinde `dealership_id` değişmişse yerel esnaf verileri geçersiz kılınır ve liste yeniden çekilir.

## 5. KAPSAM DIŞI
- Ziyaret akışı bütünlüğü, geofence reddi, iptal davranışı ve fotoğraf metadata'sı — **E18**.
- Mobil Ziyaretler sekmesinin doldurulması — **E19**.
- Web tarafı — E15/E16.
- Şema veya RLS değişikliği — E11/E12'de tamamlandı.
- Çevrimdışı ziyaret oluşturma kuyruğu (Faz 3).
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Bayi kimliği tek kaynaktan okunur: `useAuth()` üzerinden gelen profil. Her sorguda ayrı `users` sorgusu yapma.
- Sorgu kapsamı istemci filtresiyle yetinmez; `dealership_id` sunucuya filtre olarak gönderilir (RLS ikinci savunma hattıdır).
- AsyncStorage anahtar şemaları merkezi bir dosyada sabit olarak tutulur; string tekrarı yapma.
- `Linking.openSettings()` yalnızca izin kalıcı olarak reddedildiğinde önerilir.
- Yeni paket kurulmaz.
- Tüm kullanıcı metinleri Türkçe.

## 7. KABUL KRİTERLERİ
- [ ] Temsilci yalnızca kendi bayisinin esnaflarını görür; başka bayinin esnaf kimliğiyle detay açılmaya çalışıldığında Türkçe erişim hatası gösterilir (olumsuz senaryo).
- [ ] "Yeni Esnaf" akışı uçtan uca çalışır; kayıt doğru `dealership_id` ve `created_by` ile veritabanına düşer.
- [ ] Temsilci kendi eklediği esnafı düzenleyebilir; başkasının eklediği esnafta "Düzenle" butonu görünmez ve doğrudan çağrı RLS ile reddedilir (olumsuz senaryo).
- [ ] Yakındakiler listesi `get_customers_nearby` RPC'siyle gelir ve başka bayinin esnafını içermez.
- [ ] Arama debounce çalışır; her tuş vuruşunda sorgu atılmaz.
- [ ] `location_logs` kayıtları doğru `dealership_id` ile yazılır.
- [ ] Uygulama açılışında bekleyen konum tamponu flush edilir.
- [ ] Konum izni reddedildiğinde "Ayarlara Git" seçeneği çalışır.
- [ ] Kullanıcı A çıkış yapıp kullanıcı B giriş yaptığında A'nın aktif ziyareti, konum tamponu ve esnaf listesi cihazda görünmez (olumsuz senaryo).
- [ ] Bozuk geometri gelen esnaf, harita merkezine yanlış konumla düşmez; "Konum bilgisi eksik" olarak işaretlenir.
- [ ] `npx tsc --noEmit` (apps/mobile) temiz, `npm run lint` temiz.
- [ ] UI tamamen Türkçe.

## 8. DOĞRULAMA
Komutlar:
```bash
cd apps/mobile && npx tsc --noEmit
npm run lint
cd apps/mobile && npx expo run:android
```
(Expo Go desteklenmez; development build zorunludur.)

Manuel (emülatör + fiziksel cihaz):
1. `Test Bayi` temsilcisiyle giriş → esnaf listesinde yalnızca o bayinin kayıtları.
2. Yeni esnaf ekle → SQL ile `select dealership_id, created_by from customers order by created_at desc limit 1` doğrula.
3. Kendi eklediğin esnafta "Düzenle" görünür; seed ile başka kullanıcının eklediği esnafta görünmez.
4. Vardiyayı aç, birkaç konum topla, uygulamayı kapat, yeniden aç → tampon flush edilmeli; `location_logs.dealership_id` dolu olmalı.
5. Kullanıcı A ile oturum aç, aktif ziyaret başlat, çıkış yap, kullanıcı B ile gir → B'de aktif ziyaret görünmemeli.

## 9. KISITLAR
- `apps/web`, `supabase/`, `packages/shared` DEĞİŞMEZ (shared ihtiyacı doğarsa "SHARED İHTİYACI" notu düş).
- SADECE Android. Galeri erişimi yok.
- $0 maliyet: ücretli harita/servis eklenmez; MapLibre + OSM korunur.
- Zaman damgaları sunucudan alınır.
- Secret `.env` içinde; git commit YOK.
