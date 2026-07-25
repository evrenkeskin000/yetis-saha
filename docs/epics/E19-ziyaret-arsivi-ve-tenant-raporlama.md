# E19 — Ziyaret Arşivi: Web `/ziyaretler`, Mobil Geçmiş ve Denetim Raporları

> **Boyut:** Küçük | **Bağımlılıklar:** E16 (web bayi kapsamı), E18 (snapshot ve denetim verisi) | **Hat:** Web + Mobil
> **Özet:** Projedeki iki yer tutucu ekranı doldurur: web `/ziyaretler` geçmiş arşivi ve mobil Ziyaretler sekmesi. Transfer edilmiş temsilcinin eski ziyaretleri yalnızca snapshot tabanlı liste satırı olarak gösterilir. Reddedilen check-in denemeleri yönetici tarafında raporlanır.

---

# E19 — Ziyaret Arşivi: Web `/ziyaretler`, Mobil Geçmiş ve Denetim Raporları

## 1. ROL
Sen kıdemli bir full-stack geliştiricisin; büyük veri tablolarında sayfalama, filtreleme ve performanslı sorgu tasarımı konusunda deneyimlisin. Yetki sınırlarını arayüz tasarımına da yansıtırsın. UI %100 Türkçedir. Kullanıcı istemeden git commit yapmazsın.

## 2. BAĞLAM
E16 ve E18 TAMAMLANDI. Hazır gelenler:
- Web tarafında `DealershipScopeContext` ve kapsam filtresi yardımcısı (`applyDealershipScope`).
- `visits.customer_snapshot` her ziyaret için dolu; `visits.dealership_id` değişmez; `visits.cancelled_at` mevcut.
- `check_in_attempts` tablosu reddedilen denemelerle dolmaya başladı; okuma yetkisi aynı bayideki `dealer_admin` ve Yetiş Admin'de.
- `@saha/shared` içinde `getVisitHistory` yardımcısı ve `VisitCustomerSnapshot` tipi mevcut.

Doldurulacak yer tutucular:
- `apps/web/src/app/(dashboard)/ziyaretler/page.tsx` — "Bu modül yakında eklenecek" metni.
- `apps/mobile/app/(tabs)/index.tsx` — "Bu ekran yakında eklenecek" metni.

Kesin kural (transfer izolasyonu): Bayi değiştiren temsilci, eski bayideki ziyaretlerini görmeye devam eder; ancak bu kayıtlar **yalnızca liste satırı** olarak gösterilir. Eski bayinin güncel müşteri kaydına, fotoğraflarına ve ziyaret detay ekranına erişilemez. Liste satırındaki esnaf adı `customer_snapshot` verisinden okunur.

## 3. HEDEF
Yöneticiler geçmiş ziyaretleri bayi kapsamında filtreleyip inceleyebilir ve şüpheli denemeleri görebilir. Saha temsilcisi kendi ziyaret geçmişini mobilde görür; transfer sonrası eski kayıtlar bilgi sızdırmadan listelenir.

## 4. KAPSAM

### 4.1. Web — `/ziyaretler` geçmiş arşivi

Dosyalar:
```
src/app/(dashboard)/ziyaretler/page.tsx
src/components/ziyaretler/VisitArchiveTable.tsx
src/components/ziyaretler/VisitFilters.tsx
src/components/ziyaretler/RejectedAttemptsTable.tsx
src/lib/hooks/useVisitArchive.ts
```

- Filtreler: tarih aralığı (varsayılan son 30 gün), temsilci (yalnızca `field_rep`), esnaf araması, sonuç (`OUTCOME_LABELS`), durum (Tamamlandı / Devam Ediyor / İptal Edildi), yalnızca mock konumlu kayıtlar.
- Tablo kolonları: Tarih/Saat | Temsilci | Esnaf | Süre | Sonuç | Durum | Uyarı rozetleri (mock). "Tüm Bayiler" kapsamında ayrıca **Bayi** kolonu.
- Sayfalama: sunucu tarafı `range()` ile sayfa başına 50 kayıt; toplam sayı `count: 'exact'` ile alınır. Tüm veriyi istemciye çekme.
- Satır tıklaması ilgili esnaf detayına gider; esnaf kaydı erişilemiyorsa (silinmiş/başka bayi) satır tıklanamaz olur ve snapshot adı gösterilir.
- İptal edilmiş ziyaretler "İptal Edildi" rozetiyle görünür ve KPI sayımlarına dahil edilmez.
- Reddedilen denemeler ayrı bir sekme/bölümde: Tarih/Saat | Temsilci | Esnaf | Mesafe | Sebep | Mock. Kapsam filtresine tabidir; boşsa Türkçe boş durum.
- CSV dışa aktarımı (UTF-8 BOM, mevcut rapor deseniyle aynı).

### 4.2. Mobil — Ziyaretler sekmesi

Dosyalar:
```
app/(tabs)/index.tsx
src/components/ZiyaretGecmisiSatiri.tsx
src/lib/visitHistory.ts
```

- Temsilcinin kendi ziyaretleri, tarihe göre azalan sıralı, sonsuz kaydırma veya "Daha Fazla Yükle" ile sayfalı.
- Satır içeriği: esnaf adı (`customer_snapshot.business_name`), tarih/saat, süre, sonuç etiketi, uyarı rozetleri.
- Üstte özet: bu hafta tamamlanan ziyaret sayısı ve toplam süre.
- **Mevcut bayi** kayıtları tıklanabilir → esnaf detayına gider. **Eski bayi** kayıtları (`visit.dealership_id !== profil.dealership_id`) tıklanamaz; satırda "Önceki bayi kaydı" etiketi görünür ve detay/fotoğraf açılmaz.
- Devam eden ziyaret varsa listenin en üstünde "Devam eden ziyaret" kartı ve aktif ziyaret ekranına kısayol.
- Boş durum: "Henüz tamamlanmış ziyaretiniz yok."

## 5. KAPSAM DIŞI
- Ziyaret düzenleme veya silme (hiçbir rol için).
- Yeni KPI metriği veya grafik türü — E16'da tanımlananlar korunur.
- Fotoğrafların mobilde yeniden indirilmesi/önbelleklenmesi.
- Çevrimdışı geçmiş görüntüleme (Faz 3).
- Şema veya RLS değişikliği — E11/E12/E18'de tamamlandı.
- Git commit.

## 6. TEKNİK GEREKSİNİMLER
- Web sorguları sunucu tarafında sayfalanır ve kapsam filtresi `applyDealershipScope` üzerinden uygulanır.
- Esnaf adı için önce `customer_snapshot` okunur; yalnızca erişilebilir kayıtlarda güncel `customers` verisi tercih edilebilir. Snapshot yoksa "Kayıt bilgisi yok" gösterilir.
- Mobilde sayfa boyutu 20; `getVisitHistory` yardımcısı kullanılır, ekran içinde ham sorgu yazılmaz.
- Erişilemeyen esnaf için istemci "hata gösterme" değil "sessiz düşürme" yapar: satır görünür kalır, yalnızca navigasyon kapatılır.
- Tarih ve süre biçimlendirmesi mevcut `format.ts` yardımcılarıyla; sonuç renkleri `OUTCOME_COLORS` ile.
- Boş durumlar ve hata mesajları Türkçe.
- Yeni paket kurulmaz.

## 7. KABUL KRİTERLERİ
- [ ] Web `/ziyaretler` sayfasında yer tutucu metin kalmamıştır; gerçek veri listelenir.
- [ ] `dealer_admin` yalnızca kendi bayisinin ziyaretlerini görür; başka bayinin kaydı listede yoktur (olumsuz senaryo).
- [ ] Yetiş Admin "Tüm Bayiler" kapsamında Bayi kolonunu görür; tek bayi seçildiğinde liste daralır.
- [ ] Filtreler (tarih, temsilci, esnaf, sonuç, durum, mock) birlikte çalışır ve sonuç sayısı tutarlıdır.
- [ ] Sayfalama sunucu tarafındadır; 50'den fazla kayıtta ikinci sayfa doğru veriyi getirir ve tek seferde tüm tablo çekilmez.
- [ ] İptal edilmiş ziyaret "İptal Edildi" olarak görünür ve tamamlanan sayımına girmez.
- [ ] Reddedilen denemeler tablosu mesafe ve sebep bilgisiyle listelenir; veri yoksa Türkçe boş durum gösterilir.
- [ ] CSV çıktısı ekrandaki filtre ve kapsamla birebir aynı satırları içerir.
- [ ] Mobil Ziyaretler sekmesinde yer tutucu metin kalmamıştır; temsilcinin kendi geçmişi listelenir.
- [ ] Bayi değiştirilmiş temsilci eski ziyaretlerini listede görür; bu satırlar "Önceki bayi kaydı" etiketlidir, tıklanamaz ve esnaf detayı/fotoğrafı açılmaz (olumsuz senaryo).
- [ ] Devam eden ziyaret varsa listenin başında kısayol kartı görünür.
- [ ] `npm --workspace @saha/web run build`, `npx tsc --noEmit` (mobil), `npm run lint`, `npm test` temiz.
- [ ] UI tamamen Türkçe.

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

Manuel:
1. `dealer_admin` ile `/ziyaretler` → yalnızca kendi bayisinin kayıtları; filtreleri sırayla uygula.
2. Yetiş Admin ile "Tüm Bayiler" → toplam kayıt sayısı bayilerin toplamına eşit olmalı; tek bayi seçildiğinde daralmalı.
3. Reddedilen denemeler sekmesi → E18 doğrulamasında oluşturduğun menzil dışı deneme burada görünmeli.
4. SQL ile bir temsilcinin `users.dealership_id` değerini başka bayiye taşı → mobilde Ziyaretler sekmesini aç → eski ziyaretler listede kalmalı, "Önceki bayi kaydı" etiketli ve tıklanamaz olmalı; eski bayinin esnaf detayı açılmamalı.
5. Bir ziyareti iptal et → arşivde "İptal Edildi" görünmeli, tamamlanan sayısına eklenmemeli.

## 9. KISITLAR
- `supabase/` ve `packages/shared` DEĞİŞMEZ (shared ihtiyacı doğarsa "SHARED İHTİYACI" notu düş).
- Ziyaret düzenleme/silme arayüzü eklenmez.
- Tüm veriyi istemciye çekip istemcide sayfalama yapma.
- Transfer edilmiş temsilciye eski bayinin güncel müşteri verisini gösterme.
- $0 maliyet korunur; UI %100 Türkçe.
- Git commit YOK.
