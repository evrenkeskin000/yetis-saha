# Faz 2 — Fiziksel Cihaz Kabul Kontrol Listesi

Çoklu bayi sürümünün kabulü için **fiziksel Android cihazda** uçtan uca doğrulama.
Emülatörde yanıltıcı olabilecek adımlar `⚠` ile işaretlidir.

## Önkoşullar

- [ ] E18 migration (`20260726000020_visit_integrity.sql`) uzak/yerel DB'de uygulanmış
- [ ] Seed veya gerçek test hesapları hazır (Yetiş Admin, iki bayi, temsilciler)
- [ ] CI `quality` işi yeşil

## Senaryo

1. [ ] Yetiş Admin ile yeni bayi ve bayi yöneticisi oluştur
2. [ ] Bayi yöneticisi ile saha temsilcisi oluştur; temsilci ilk girişte şifre değiştirsin ve KVKK onayı versin
3. [ ] Temsilci yeni esnaf eklesin; kendi eklediği esnafı düzenlesin
4. [ ] 100 m dışından check-in dene → reddedilmeli; deneme yönetici panelinde (`/ziyaretler` → Reddedilen Denemeler) görünmeli ⚠ GPS
5. [ ] Esnafın yanında check-in → filigranlı fotoğraf → check-out; süre doğru hesaplanmalı ⚠ kamera / GPS
6. [ ] Web panelinde ziyaret canlı haritada ve `/ziyaretler` arşivinde görünmeli; fotoğraf signed URL ile açılmalı
7. [ ] Vardiya aç/kapat → konum logları doğru bayiyle yazılmalı ⚠ arka plan konum / pil
8. [ ] Temsilciyi başka bayiye taşı → mobilde eski ziyaretler "Önceki bayi kaydı" olarak görünmeli, detay açılmamalı
9. [ ] Temsilciyi pasife al → mobil oturum kapanmalı

## Emülatörde yanıltıcı adımlar

| Adım | Neden |
|------|--------|
| Kamera filigranı | Emülatör kamera / GPS metni gerçek cihazdan farklı olabilir |
| Gerçek GPS geofence | Emülatör konum spoof ile menzil testi yanıltıcı olabilir |
| Arka plan konum | OEM pil optimizasyonu emülatörde yok |
| Mock konum bayrağı | Sahte konum uygulaması fiziksel cihazda gerekir |

## İmza

- Test eden: _______________
- Cihaz / Android sürümü: _______________
- Tarih: _______________
- Sonuç: [ ] Kabul  [ ] Red (notlar: _______________)
