import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { APP_NAME } from '@saha/shared';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME} — Mobil</Text>
      <Text style={styles.subtitle}>
        Ortak paketten aktarılan uygulama adı: {APP_NAME}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
});
