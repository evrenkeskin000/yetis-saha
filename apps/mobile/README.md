# Saha Mobile Application (`apps/mobile`)

React Native + Expo Router + Supabase tabanlı saha temsilcisi mobil uygulaması.

> [!IMPORTANT]
> **Development Build Zorunluluğu (E05 ve Sonrası)**
> Bu projede harita motoru olarak `@maplibre/maplibre-react-native` native kütüphanesi kullanılmaktadır.
> Native C++/Java kod bileşenleri içerdiğinden **Expo Go uygulaması desteklenmemektedir**.
> 
> Geliştirme ve doğrulama işlemleri **Development Build** ile yapılmalıdır:
> 
> ```bash
> # 1. Native projeyi oluşturun / güncelleyin
> npx expo prebuild
> 
> # 2. Android emulator veya bağlı cihaz üzerinde development build çalıştırın
> npx expo run:android
> ```

## Komutlar

- `npm run dev`: Expo dev server başlatır.
- `npm run android`: Expo android dev server.
- `npm run typecheck`: TypeScript tip kontrolü (`tsc --noEmit`).
- `npm run lint`: ESLint kontrolleri.
