import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface UyariRozetiProps {
  isGeofenceValid?: boolean | null;
  isMockLocation?: boolean | null;
}

export function UyariRozeti({
  isGeofenceValid,
  isMockLocation,
}: UyariRozetiProps) {
  const showGeofenceWarning = isGeofenceValid === false;
  const showMockWarning = Boolean(isMockLocation);

  if (!showGeofenceWarning && !showMockWarning) return null;

  return (
    <View style={styles.container}>
      {showGeofenceWarning && (
        <View style={[styles.badge, styles.geofenceBadge]}>
          <Ionicons name="location-outline" size={12} color="#f59e0b" />
          <Text style={styles.geofenceText}>100m Dışı Ziyaret</Text>
        </View>
      )}

      {showMockWarning && (
        <View style={[styles.badge, styles.mockBadge]}>
          <Ionicons name="warning-outline" size={12} color="#ef4444" />
          <Text style={styles.mockText}>Sahte Konum (Mock)</Text>
        </View>
      )}
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
  geofenceBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  geofenceText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
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
