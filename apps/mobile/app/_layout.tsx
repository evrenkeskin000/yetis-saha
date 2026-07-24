import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ShiftIndicator } from '../src/components/ShiftIndicator';
import { ActiveVisitProvider, useActiveVisit } from '../src/lib/ActiveVisitContext';
import { AuthProvider, useAuth } from '../src/lib/auth';
// Import background location task definition for TaskManager global scope
import '../src/lib/locationTask';
import { ShiftProvider, useShift } from '../src/lib/ShiftContext';

function RootLayoutNav() {
  const { session, kvkkConsented, loading } = useAuth();
  const { activeVisit, isInitialLoading } = useActiveVisit();
  const { isInitialLoading: isShiftLoading } = useShift();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || isInitialLoading || isShiftLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inKvkkGroup = segments[0] === 'kvkk';
    const inZiyaretGroup = segments[0] === 'ziyaret';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (!kvkkConsented) {
      if (!inKvkkGroup) {
        router.replace('/kvkk');
      }
    } else if (inAuthGroup || inKvkkGroup) {
      if (activeVisit) {
        router.replace('/ziyaret/aktif');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [
    session,
    kvkkConsented,
    loading,
    isInitialLoading,
    isShiftLoading,
    activeVisit,
    segments,
  ]);

  if (loading || isInitialLoading || isShiftLoading) {
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
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="kvkk" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="esnaf/[id]"
          options={{ headerShown: true, title: 'Esnaf Detayı' }}
        />
        <Stack.Screen
          name="esnaf/yeni"
          options={{ headerShown: true, title: 'Yeni Esnaf Ekle' }}
        />
        <Stack.Screen
          name="esnaf/konum-sec"
          options={{ headerShown: true, title: 'Haritadan Konum Seç' }}
        />
        <Stack.Screen
          name="ziyaret/aktif"
          options={{ headerShown: true, title: 'Aktif Ziyaret' }}
        />
        <Stack.Screen
          name="ziyaret/kamera"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ziyaret/ozet"
          options={{ headerShown: true, title: 'Ziyaret Özeti' }}
        />
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
