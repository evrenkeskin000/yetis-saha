import { Logger as MapLibreLogger } from '@maplibre/maplibre-react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ShiftIndicator } from '../src/components/ShiftIndicator';
import { ActiveVisitProvider, useActiveVisit } from '../src/lib/ActiveVisitContext';
import { AuthProvider, useAuth } from '../src/lib/auth';
// Import background location task definition for TaskManager global scope
import '../src/lib/locationTask';
import { ShiftProvider, useShift } from '../src/lib/ShiftContext';

// MapLibre, başarısız tile isteklerini WARN olarak loglarken JS köprüsüne
// erişmeye çalışır; köprü henüz hazır değilse uygulama native tarafta çöker.
// Seviyeyi error'a çekince bu uyarılar native'de filtrelenir ve köprü çağrılmaz.
MapLibreLogger.setLogLevel('error');

function RootLayoutNav() {
  const { session, kvkkConsented, mustChangePassword, loading } = useAuth();
  const { activeVisit, isInitialLoading } = useActiveVisit();
  const { isInitialLoading: isShiftLoading } = useShift();
  const segments = useSegments();
  const router = useRouter();
  // İlk hidrasyondan sonra Stack'i ASLA unmount etme — aksi halde navigasyon
  // sıfırlanır, segments['index'] olur ve kullanıcı Ziyaretler'e atılır.
  const hasHydratedRef = useRef(false);
  if (!loading && !isInitialLoading && !isShiftLoading) {
    hasHydratedRef.current = true;
  }
  const bootstrapping =
    !hasHydratedRef.current &&
    (loading || isInitialLoading || isShiftLoading);

  useEffect(() => {
    if (loading || isInitialLoading || isShiftLoading) return;

    const root = segments[0];
    const inAuthGroup = root === '(auth)';
    const inKvkkGroup = root === 'kvkk';
    const inPasswordGroup = root === 'sifre-degistir';
    const inTabs = root === '(tabs)';
    // Yalnızca uygulama kökü /index — sekme içindeki index'i yakalama
    const onRootIndex =
      segments.length === 0 ||
      (segments.length === 1 && root === 'index');

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (mustChangePassword) {
      if (!inPasswordGroup) {
        router.replace('/sifre-degistir');
      }
      return;
    }

    if (!kvkkConsented) {
      if (!inKvkkGroup) {
        router.replace('/kvkk');
      }
      return;
    }

    // Auth/KVKK/şifre ekranlarından veya kök index'ten çık
    if (inAuthGroup || inKvkkGroup || inPasswordGroup || onRootIndex) {
      if (activeVisit) {
        router.replace('/ziyaret/aktif');
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    // Açık ziyaret: yalnızca sekmelerdeyken aktif ziyarete dön.
    // esnaf/*, ziyaret/* gibi bilinçli navigasyonu bozma.
    if (activeVisit && inTabs) {
      router.replace('/ziyaret/aktif');
    }
  }, [
    session,
    kvkkConsented,
    mustChangePassword,
    loading,
    isInitialLoading,
    isShiftLoading,
    activeVisit,
    segments,
    router,
  ]);

  if (bootstrapping) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <ShiftIndicator />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: '#0f172a' },
          headerTitleStyle: { color: '#f8fafc', fontWeight: '700' },
          headerTintColor: '#38bdf8',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="sifre-degistir" options={{ headerShown: false }} />
        <Stack.Screen name="kvkk" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="esnaf" options={{ headerShown: false }} />
        <Stack.Screen name="ziyaret" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ActiveVisitProvider>
        <ShiftProvider>
          <RootLayoutNav />
        </ShiftProvider>
      </ActiveVisitProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
});
