import { Stack } from 'expo-router';
import React from 'react';

export default function ZiyaretLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTitleStyle: { color: '#f8fafc', fontWeight: '700' },
        headerTintColor: '#38bdf8',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="aktif" options={{ title: 'Aktif Ziyaret' }} />
      <Stack.Screen name="kamera" options={{ headerShown: false }} />
      <Stack.Screen name="ozet" options={{ title: 'Ziyaret Özeti' }} />
    </Stack>
  );
}
