import {
  Camera,
  MapView,
  MarkerView,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  DEFAULT_CAMERA,
  MAP_ATTRIBUTION,
  OSM_RASTER_STYLE,
  getCategoryColor,
} from '../constants/map';

export interface PinItem {
  id: string;
  title: string;
  subtitle?: string | null;
  categoryName?: string | null;
  coordinate: [number, number]; // [lng, lat]
  color?: string;
  rawItem?: unknown;
}

export interface HaritaGorunumuProps {
  pins?: PinItem[];
  onPinPress?: (pin: PinItem) => void;
  onLongPress?: (coordinate: [number, number]) => void;
  initialRegion?: {
    centerCoordinate: [number, number];
    zoomLevel?: number;
  };
  showUserLocation?: boolean;
  selectedPinId?: string | null;
  onCalloutPress?: (pin: PinItem) => void;
  style?: object;
}

export function HaritaGorunumu({
  pins = [],
  onPinPress,
  onLongPress,
  initialRegion,
  showUserLocation = true,
  selectedPinId,
  onCalloutPress,
  style,
}: HaritaGorunumuProps) {
  const [activePin, setActivePin] = useState<PinItem | null>(null);

  const handlePointPress = (pin: PinItem) => {
    setActivePin(pin);
    if (onPinPress) {
      onPinPress(pin);
    }
  };

  const handleLongPress = (event: any) => {
    if (onLongPress) {
      const coords = event?.geometry?.coordinates ?? event?.nativeEvent?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        onLongPress([coords[0], coords[1]]);
      }
    }
  };

  const cameraCenter =
    initialRegion?.centerCoordinate ?? DEFAULT_CAMERA.centerCoordinate;
  const cameraZoom = initialRegion?.zoomLevel ?? DEFAULT_CAMERA.zoomLevel;

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={styles.map}
        mapStyle={OSM_RASTER_STYLE as any}
        logoEnabled={false}
        attributionEnabled={false}
        onLongPress={handleLongPress}
        onPress={() => setActivePin(null)}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: cameraCenter,
            zoomLevel: cameraZoom,
          }}
        />

        {showUserLocation && <UserLocation />}

        {pins.map((pin) => {
          const pinColor =
            pin.color || getCategoryColor(pin.categoryName);
          const isSelected =
            pin.id === (selectedPinId || activePin?.id);

          return (
            <MarkerView
              key={pin.id}
              coordinate={pin.coordinate}
              isSelected={isSelected}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handlePointPress(pin)}
              >
                <View
                  style={[
                    styles.markerContainer,
                    { backgroundColor: pinColor },
                    isSelected && styles.markerSelected,
                  ]}
                >
                  <View style={styles.markerInnerDot} />
                </View>
              </TouchableOpacity>
            </MarkerView>
          );
        })}
      </MapView>

      {activePin && (
        <View style={styles.calloutCard}>
          <View style={styles.calloutHeader}>
            <View
              style={[
                styles.categoryDot,
                {
                  backgroundColor:
                    activePin.color ||
                    getCategoryColor(activePin.categoryName),
                },
              ]}
            />
            <Text style={styles.calloutTitle} numberOfLines={1}>
              {activePin.title}
            </Text>
          </View>
          {activePin.subtitle ? (
            <Text style={styles.calloutSubtitle} numberOfLines={1}>
              {activePin.subtitle}
            </Text>
          ) : null}

          {onCalloutPress && (
            <TouchableOpacity
              style={styles.calloutButton}
              onPress={() => onCalloutPress(activePin)}
              activeOpacity={0.8}
            >
              <Text style={styles.calloutButtonText}>Detaya Git</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.attributionBadge}>
        <Text style={styles.attributionText}>{MAP_ATTRIBUTION}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerSelected: {
    transform: [{ scale: 1.25 }],
    borderColor: '#f59e0b',
    borderWidth: 3,
  },
  markerInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  calloutCard: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  calloutSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  calloutButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  calloutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  attributionBadge: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: {
    color: '#94a3b8',
    fontSize: 10,
  },
});
