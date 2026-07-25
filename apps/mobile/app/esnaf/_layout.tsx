import { Stack } from 'expo-router';
import React from 'react';

export default function EsnafLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTitleStyle: { color: '#f8fafc', fontWeight: '700' },
        headerTintColor: '#38bdf8',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="yeni" options={{ title: 'Yeni Esnaf Ekle' }} />
      <Stack.Screen name="konum-sec" options={{ title: 'Haritadan Konum Seç' }} />
      {/* Alt stack kendi header'ını gösterir — burada "[id]" yazmasın */}
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
