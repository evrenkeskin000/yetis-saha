import { Ionicons } from '@expo/vector-icons';
import type { Category, GeoPoint } from '@saha/shared';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EsnafSatiri } from '../../src/components/EsnafSatiri';
import { HaritaGorunumu, type PinItem } from '../../src/components/HaritaGorunumu';
import { KategoriFiltre } from '../../src/components/KategoriFiltre';
import {
  fetchCategories,
  fetchCustomers,
  fetchLastVisitsMap,
  filterCustomersBySearch,
  sortCustomersByDistance,
  sortCustomersByLastVisit,
  sortCustomersByName,
  type CustomerWithCategory,
} from '../../src/lib/customers';
import { haversineMeters } from '../../src/lib/geo';
import { supabase } from '../../src/lib/supabase';

type SortMode = 'last_visit' | 'alphabetical' | 'nearby';
type ViewMode = 'list' | 'map';

const FlatListComponent = FlatList as any;

export default function EsnaflarTab() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lastVisitsMap, setLastVisitsMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [searchText, setSearchText] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('last_visit');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [fetchedCustomers, fetchedCategories, fetchedVisits] = await Promise.all([
        fetchCustomers(supabase),
        fetchCategories(supabase),
        fetchLastVisitsMap(supabase),
      ]);
      setCustomers(fetchedCustomers);
      setCategories(fetchedCategories);
      setLastVisitsMap(fetchedVisits);
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Request location when 'nearby' sort is selected
  useEffect(() => {
    if (sortMode === 'nearby' && !userLocation) {
      (async () => {
        setLocationError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Konum izni verilmedi. Mesafeye göre sıralama yapılamıyor.');
          setSortMode('last_visit');
          return;
        }

        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        } catch {
          setLocationError('Mevcut konum alınamadı.');
          setSortMode('last_visit');
        }
      })();
    }
  }, [sortMode, userLocation]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter and Sort Customers
  const processedCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Category Filter
    if (selectedCategoryId) {
      result = result.filter((c) => c.category_id === selectedCategoryId);
    }

    // 2. Search Filter
    result = filterCustomersBySearch(result, searchText);

    // 3. Sort
    if (sortMode === 'nearby' && userLocation) {
      result = sortCustomersByDistance(result, userLocation);
    } else if (sortMode === 'alphabetical') {
      result = sortCustomersByName(result);
    } else {
      // Default: last_visit
      result = sortCustomersByLastVisit(result, lastVisitsMap);
    }

    return result;
  }, [customers, selectedCategoryId, searchText, sortMode, userLocation, lastVisitsMap]);

  // Map Pins construction
  const pins: PinItem[] = useMemo(() => {
    return processedCustomers.map((c) => ({
      id: c.id,
      title: c.business_name,
      subtitle: c.address || c.phone,
      categoryName: c.category?.name,
      coordinate: [c.location.longitude, c.location.latitude],
      rawItem: c,
    }));
  }, [processedCustomers]);

  const renderCustomerItem: ListRenderItem<CustomerWithCategory> = useCallback(
    ({ item }) => (
      <EsnafSatiri
        customer={item}
        lastVisitAt={lastVisitsMap.get(item.id)}
        distanceMeters={
          userLocation ? haversineMeters(userLocation, item.location) : null
        }
        onPress={(c) => router.push(`/esnaf/${c.id}`)}
      />
    ),
    [lastVisitsMap, userLocation, router]
  );

  return (
    <View style={styles.container}>
      {/* Search & Control Header */}
      <View style={styles.headerControls}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Esnaf adı, yetkili, adres veya telefon..."
            placeholderTextColor="#64748b"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* View Mode & Sort Mode Row */}
        <View style={styles.controlRow}>
          <View style={styles.sortChips}>
            <TouchableOpacity
              style={[
                styles.sortChip,
                sortMode === 'last_visit' && styles.activeSortChip,
              ]}
              onPress={() => setSortMode('last_visit')}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortMode === 'last_visit' && styles.activeSortChipText,
                ]}
              >
                Son Ziyaret
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortChip,
                sortMode === 'alphabetical' && styles.activeSortChip,
              ]}
              onPress={() => setSortMode('alphabetical')}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortMode === 'alphabetical' && styles.activeSortChipText,
                ]}
              >
                A-Z
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortChip,
                sortMode === 'nearby' && styles.activeSortChip,
              ]}
              onPress={() => setSortMode('nearby')}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortMode === 'nearby' && styles.activeSortChipText,
                ]}
              >
                Yakındaki
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle View Mode Button */}
          <TouchableOpacity
            style={styles.viewToggleBtn}
            onPress={() =>
              setViewMode((prev) => (prev === 'list' ? 'map' : 'list'))
            }
          >
            <Ionicons
              name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
              size={20}
              color="#38bdf8"
            />
            <Text style={styles.viewToggleText}>
              {viewMode === 'list' ? 'Harita' : 'Liste'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Chips */}
      <KategoriFiltre
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* Location Error Warning */}
      {locationError && (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={16} color="#f59e0b" />
          <Text style={styles.warningText}>{locationError}</Text>
        </View>
      )}

      {/* Main Content: List or Map */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Esnaflar yükleniyor...</Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatListComponent
          data={processedCustomers}
          keyExtractor={(item: CustomerWithCategory) => item.id}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={15}
          windowSize={7}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#38bdf8"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={48} color="#64748b" />
              <Text style={styles.emptyTitle}>Esnaf Bulunamadı</Text>
              <Text style={styles.emptySubtitle}>
                Arama kriterlerinize uyan esnaf bulunmuyor veya henüz esnaf eklenmedi.
              </Text>
            </View>
          }
        />
      ) : (
        <HaritaGorunumu
          pins={pins}
          showUserLocation={true}
          initialRegion={
            userLocation
              ? {
                  centerCoordinate: [userLocation.longitude, userLocation.latitude],
                  zoomLevel: 12,
                }
              : undefined
          }
          onCalloutPress={(pin) => router.push(`/esnaf/${pin.id}`)}
        />
      )}

      {/* FAB - Add New Customer */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/esnaf/yeni')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  headerControls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    marginLeft: 8,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortChips: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeSortChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  sortChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  activeSortChipText: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  viewToggleText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 8,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
