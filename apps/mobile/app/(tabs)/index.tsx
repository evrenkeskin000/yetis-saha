import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function VisitsTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ziyaretler</Text>
      <Text style={styles.placeholder}>Bu ekran yakında eklenecek</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
