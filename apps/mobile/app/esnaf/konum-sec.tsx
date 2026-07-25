import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KonumSeciciHarita,
  type KonumSeciciHaritaRef,
} from '../../src/components/KonumSeciciHarita';
import { DEFAULT_CAMERA } from '../../src/constants/map';
import {
  reverseGeocode,
  searchPlaces,
  type PlaceResult,
} from '../../src/lib/geocoding';

/** Seçim yapılırken kullanılan yakın zoom — sokak seviyesi. */
const PICK_ZOOM = 17;
const SEARCH_DEBOUNCE_MS = 500;

export default function KonumSecScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    initialLat?: string;
    initialLng?: string;
    returnTo?: string;
  }>();

  const mapRef = useRef<KonumSeciciHaritaRef>(null);

  const initialCoord = (() => {
    const lat = parseFloat(params.initialLat ?? '');
    const lng = parseFloat(params.initialLng ?? '');
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lng, lat] as [number, number];
    }
    return null;
  })();

  // Harita merkezi = seçilen konum
  const [center, setCenter] = useState<[number, number]>(
    initialCoord ?? DEFAULT_CAMERA.centerCoordinate
  );
  const [hasPickedArea, setHasPickedArea] = useState<boolean>(
    initialCoord !== null
  );

  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState<boolean>(false);

  const [locating, setLocating] = useState<boolean>(false);
  const [userCoord, setUserCoord] = useState<
    { latitude: number; longitude: number } | null
  >(null);

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);

  const reverseAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const goToUserLocation = useCallback(
    async (options: { silent?: boolean } = {}) => {
      try {
        setLocating(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!options.silent) {
            setSearchError(
              'Konum izni verilmedi. Haritayı kaydırarak konum seçebilirsiniz.'
            );
          }
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coord: [number, number] = [
          loc.coords.longitude,
          loc.coords.latitude,
        ];
        setUserCoord({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setCenter(coord);
        setHasPickedArea(true);
        mapRef.current?.goTo(coord, PICK_ZOOM);
      } catch (err) {
        console.error('Konum alınamadı:', err);
        if (!options.silent) {
          setSearchError('Konum alınamadı. Haritayı kaydırarak seçebilirsiniz.');
        }
      } finally {
        setLocating(false);
      }
    },
    []
  );

  // Kayıtlı konum yoksa kullanıcının bulunduğu yere odaklan
  useEffect(() => {
    if (initialCoord) {
      mapRef.current?.goTo(initialCoord, PICK_ZOOM);
      return;
    }
    goToUserLocation({ silent: true });
    // Yalnızca ilk açılışta çalışır
  }, []);

  // Harita durduğunda adresi çöz
  const handleCenterSettled = useCallback((coord: [number, number]) => {
    setCenter(coord);
    setHasPickedArea(true);

    reverseAbortRef.current?.abort();
    const controller = new AbortController();
    reverseAbortRef.current = controller;

    setAddressLoading(true);
    reverseGeocode(coord[1], coord[0], { signal: controller.signal })
      .then((found) => {
        if (controller.signal.aborted) return;
        setAddress(found);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAddress(null);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setAddressLoading(false);
      });
  }, []);

  // Arama (debounce'lu)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      setSearching(true);
      setSearchError(null);
      searchPlaces(trimmed, { signal: controller.signal, near: userCoord })
        .then((found) => {
          if (controller.signal.aborted) return;
          setResults(found);
          setShowResults(true);
          if (found.length === 0) {
            setSearchError('Sonuç bulunamadı. Haritadan da seçebilirsiniz.');
          }
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.error('Adres arama hatası:', err);
          setSearchError('Adres aranamadı. Haritadan seçebilirsiniz.');
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, userCoord]);

  useEffect(() => {
    return () => {
      reverseAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, []);

  const handleSelectResult = (place: PlaceResult) => {
    const coord: [number, number] = [place.longitude, place.latitude];
    setCenter(coord);
    setHasPickedArea(true);
    setAddress(place.address || place.name);
    setShowResults(false);
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
    mapRef.current?.goTo(coord, PICK_ZOOM);
  };

  const handleConfirm = () => {
    const [lng, lat] = center;
    const returnTo = params.returnTo || '/esnaf/yeni';
    router.navigate({
      pathname: returnTo as '/esnaf/yeni',
      params: {
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        ...(address ? { address } : {}),
      },
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Haritadan Konum Seç' }} />
      {/* Arama */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Adres veya işletme ara..."
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setSearchError(null);
          }}
          onFocus={() => setShowResults(results.length > 0)}
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator size="small" color="#38bdf8" /> : null}
        {query.length > 0 && !searching ? (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
          >
            <Ionicons name="close-circle" size={18} color="#64748b" />
          </TouchableOpacity>
        ) : null}
      </View>

      {searchError ? (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
          <Text style={styles.warningText}>{searchError}</Text>
        </View>
      ) : null}

      <View style={styles.mapWrapper}>
        <KonumSeciciHarita
          ref={mapRef}
          initialCenter={initialCoord ?? DEFAULT_CAMERA.centerCoordinate}
          initialZoom={initialCoord ? PICK_ZOOM : DEFAULT_CAMERA.zoomLevel}
          onCenterChange={setCenter}
          onCenterSettled={handleCenterSettled}
        />

        {/* Arama sonuçları haritanın üstünde */}
        {showResults && results.length > 0 ? (
          <View style={styles.resultsOverlay}>
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => handleSelectResult(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={18} color="#38bdf8" />
                  <View style={styles.resultTextWrapper}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.address ? (
                      <Text style={styles.resultAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : null}

        {/* Bulunduğum konum */}
        <TouchableOpacity
          style={styles.myLocationBtn}
          onPress={() => goToUserLocation()}
          disabled={locating}
          activeOpacity={0.8}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <Ionicons name="locate" size={22} color="#0f172a" />
          )}
        </TouchableOpacity>

        <View style={styles.hintPill} pointerEvents="none">
          <Text style={styles.hintText}>
            Haritayı kaydırıp pini esnafın üzerine getirin
          </Text>
        </View>
      </View>

      {/* Onay */}
      <View style={styles.footer}>
        <View style={styles.addressBox}>
          {addressLoading ? (
            <>
              <ActivityIndicator size="small" color="#94a3b8" />
              <Text style={styles.addressPending}>Adres bulunuyor...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="location"
                size={16}
                color={hasPickedArea ? '#10b981' : '#94a3b8'}
              />
              <View style={styles.addressTextWrapper}>
                <Text style={styles.addressText} numberOfLines={2}>
                  {address ?? 'Adres bilgisi yok'}
                </Text>
                <Text style={styles.coordText}>
                  {center[1].toFixed(6)}, {center[0].toFixed(6)}
                </Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, !hasPickedArea && styles.disabledButton]}
          onPress={handleConfirm}
          disabled={!hasPickedArea}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
          <Text style={styles.confirmButtonText}>Bu Konumu Kullan</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    padding: 0,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    marginTop: 10,
    position: 'relative',
  },
  resultsOverlay: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    maxHeight: 260,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  resultTextWrapper: {
    flex: 1,
  },
  resultName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  resultAddress: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 1,
  },
  myLocationBtn: {
    position: 'absolute',
    right: 16,
    bottom: 56,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  hintPill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hintText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  footer: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
  },
  addressTextWrapper: {
    flex: 1,
  },
  addressText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  addressPending: {
    color: '#94a3b8',
    fontSize: 13,
  },
  coordText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
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
