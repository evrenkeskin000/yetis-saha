import {
  Camera,
  MapView,
  UserLocation,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAP_ATTRIBUTION, OSM_RASTER_STYLE } from '../constants/map';

const PIN_SIZE = 44;

export interface KonumSeciciHaritaRef {
  /** Haritayı verilen koordinata götürür ([lng, lat]). */
  goTo: (coordinate: [number, number], zoomLevel?: number) => void;
}

export interface KonumSeciciHaritaProps {
  initialCenter: [number, number];
  initialZoom: number;
  /** Harita kaydırılırken sürekli tetiklenir (canlı koordinat göstergesi). */
  onCenterChange: (coordinate: [number, number]) => void;
  /** Kaydırma durduğunda tetiklenir (ters geocoding için). */
  onCenterSettled: (coordinate: [number, number]) => void;
}

/**
 * Merkez-pin mantığıyla çalışan konum seçici harita: pin ekranın ortasında
 * sabittir, kullanıcı haritayı kaydırır ve merkezdeki nokta seçilen konumdur.
 */
export const KonumSeciciHarita = forwardRef<
  KonumSeciciHaritaRef,
  KonumSeciciHaritaProps
>(function KonumSeciciHarita(
  { initialCenter, initialZoom, onCenterChange, onCenterSettled },
  ref
) {
  const cameraRef = useRef<CameraRef>(null);
  const mapReadyRef = useRef(false);
  /** Harita yüklenmeden gelen goTo isteği burada bekletilir */
  const pendingTargetRef = useRef<{
    coordinate: [number, number];
    zoomLevel?: number;
  } | null>(null);

  const moveCamera = (coordinate: [number, number], zoomLevel?: number) => {
    cameraRef.current?.setCamera({
      centerCoordinate: coordinate,
      ...(zoomLevel !== undefined ? { zoomLevel } : {}),
      animationMode: 'easeTo',
      animationDuration: 600,
    });
  };

  useImperativeHandle(ref, () => ({
    goTo: (coordinate, zoomLevel) => {
      // Harita hazır değilse setCamera yutulur; hedefi saklayıp sonra uygula
      if (!mapReadyRef.current) {
        pendingTargetRef.current = { coordinate, zoomLevel };
        return;
      }
      moveCamera(coordinate, zoomLevel);
    },
  }));

  const handleMapReady = () => {
    mapReadyRef.current = true;
    const pending = pendingTargetRef.current;
    if (pending) {
      pendingTargetRef.current = null;
      moveCamera(pending.coordinate, pending.zoomLevel);
    }
  };

  const readCenter = (feature: {
    geometry?: { coordinates?: number[] };
  }): [number, number] | null => {
    const coords = feature?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return [coords[0], coords[1]];
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapStyle={OSM_RASTER_STYLE as any}
        logoEnabled={false}
        attributionEnabled={false}
        onRegionIsChanging={(feature) => {
          const center = readCenter(feature);
          if (center) onCenterChange(center);
        }}
        onRegionDidChange={(feature) => {
          const center = readCenter(feature);
          if (center) onCenterSettled(center);
        }}
        onDidFinishLoadingMap={handleMapReady}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCenter,
            zoomLevel: initialZoom,
          }}
        />
        <UserLocation />
      </MapView>

      {/* Sabit merkez pin — ucu tam olarak harita merkezine denk gelir */}
      <View style={styles.pinOverlay} pointerEvents="none">
        <Ionicons
          name="location"
          size={PIN_SIZE}
          color="#ef4444"
          style={styles.pinIcon}
        />
        <View style={styles.centerDot} />
      </View>

      <View style={styles.attributionBadge} pointerEvents="none">
        <Text style={styles.attributionText}>{MAP_ATTRIBUTION}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  map: {
    flex: 1,
  },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIcon: {
    // İkonun alt ucunu merkeze hizalar
    transform: [{ translateY: -PIN_SIZE / 2 }],
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
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
