import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface UyariRozetiProps {
  isMockLocation?: boolean | null;
}

export function UyariRozeti({ isMockLocation }: UyariRozetiProps) {
  const showMockWarning = Boolean(isMockLocation);

  if (!showMockWarning) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, styles.mockBadge]}>
        <Ionicons name="warning-outline" size={12} color="#ef4444" />
        <Text style={styles.mockText}>Sahte Konum (Mock)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mockBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  mockText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
});
