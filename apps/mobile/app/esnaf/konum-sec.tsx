import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HaritaGorunumu, type PinItem } from '../../src/components/HaritaGorunumu';

export default function KonumSecScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialLat?: string; initialLng?: string }>();

  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(() => {
    if (params.initialLat && params.initialLng) {
      const lat = parseFloat(params.initialLat);
      const lng = parseFloat(params.initialLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lng, lat];
      }
    }
    return null;
  });

  const handleLongPress = (coord: [number, number]) => {
    setSelectedCoord(coord);
  };

  const handleConfirm = () => {
    if (!selectedCoord) return;
    const [lng, lat] = selectedCoord;
    router.navigate({
      pathname: '/esnaf/yeni',
      params: {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
      },
    });
  };

  const pins: PinItem[] = selectedCoord
    ? [
        {
          id: 'selected-location',
          title: 'Seçilen Konum',
          subtitle: `${selectedCoord[1].toFixed(5)}, ${selectedCoord[0].toFixed(5)}`,
          coordinate: selectedCoord,
          color: '#ef4444',
        },
      ]
    : [];

  return (
    <View style={styles.container}>
      {/* Instructions Banner */}
      <View style={styles.instructionBanner}>
        <Ionicons name="information-circle" size={20} color="#38bdf8" />
        <Text style={styles.instructionText}>
          Haritada pin koymak istediğiniz konuma **uzun basın** (long press).
        </Text>
      </View>

      {/* Map view */}
      <HaritaGorunumu
        pins={pins}
        onLongPress={handleLongPress}
        showUserLocation={true}
        initialRegion={
          selectedCoord
            ? { centerCoordinate: selectedCoord, zoomLevel: 14 }
            : undefined
        }
      />

      {/* Confirmation Footer */}
      <View style={styles.footer}>
        {selectedCoord ? (
          <View style={styles.coordBox}>
            <Ionicons name="location-outline" size={16} color="#10b981" />
            <Text style={styles.coordText}>
              Enlem: {selectedCoord[1].toFixed(5)}, Boylam: {selectedCoord[0].toFixed(5)}
            </Text>
          </View>
        ) : (
          <Text style={styles.noCoordText}>Henüz bir konum seçilmedi</Text>
        )}

        <TouchableOpacity
          style={[styles.confirmButton, !selectedCoord && styles.disabledButton]}
          onPress={handleConfirm}
          disabled={!selectedCoord}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
          <Text style={styles.confirmButtonText}>Konumu Onayla</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    zIndex: 10,
  },
  instructionText: {
    color: '#f8fafc',
    fontSize: 13,
    flex: 1,
  },
  footer: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  coordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 8,
    borderRadius: 8,
  },
  coordText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  noCoordText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
