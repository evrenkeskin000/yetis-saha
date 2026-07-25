import { Stack } from 'expo-router';
import React from 'react';

export default function EsnafIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTitleStyle: { color: '#f8fafc', fontWeight: '700' },
        headerTintColor: '#38bdf8',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Esnaf Detayı' }} />
      <Stack.Screen name="duzenle" options={{ title: 'Esnaf Düzenle' }} />
    </Stack>
  );
}
