import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useShift } from '../lib/ShiftContext';

export function ShiftIndicator() {
  const { isShiftActive, pendingBufferCount } = useShift();

  if (!isShiftActive) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.indicatorDot} />
      <Text style={styles.bannerText}>
        Vardiya aktif — Konum rota takibi için kaydediliyor
      </Text>
      {pendingBufferCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingBufferCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#064e3b',
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a7f3d0',
  },
  badge: {
    backgroundColor: '#047857',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
});
