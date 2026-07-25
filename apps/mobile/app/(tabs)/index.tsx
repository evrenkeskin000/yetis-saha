import { Ionicons } from '@expo/vector-icons';
import type { Visit } from '@saha/shared';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ZiyaretGecmisiSatiri } from '../../src/components/ZiyaretGecmisiSatiri';
import { useActiveVisit } from '../../src/lib/ActiveVisitContext';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import {
  VISIT_HISTORY_PAGE_SIZE,
  fetchMyVisitHistory,
  fetchWeekSummary,
  isPreviousDealershipVisit,
  type WeekSummary,
} from '../../src/lib/visitHistory';

export default function VisitsTab() {
  const router = useRouter();
  const { user, dealershipId } = useAuth();
  const { activeVisit, activeCustomer } = useActiveVisit();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<WeekSummary>({
    completedCount: 0,
    totalMinutes: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const [history, week] = await Promise.all([
        fetchMyVisitHistory(supabase, user.id, 0),
        fetchWeekSummary(supabase, user.id),
      ]);
      setVisits(history);
      setOffset(history.length);
      setHasMore(history.length >= VISIT_HISTORY_PAGE_SIZE);
      setSummary(week);
    } catch (err) {
      console.error('Ziyaret geçmişi yüklenemedi:', err);
      setError('Ziyaret geçmişi yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!user?.id || !hasMore || loadingMore) return;
    try {
      setLoadingMore(true);
      const next = await fetchMyVisitHistory(supabase, user.id, offset);
      setVisits((prev) => [...prev, ...next]);
      setOffset((prev) => prev + next.length);
      setHasMore(next.length >= VISIT_HISTORY_PAGE_SIZE);
    } catch (err) {
      console.error('Daha fazla ziyaret yüklenemedi:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Ziyaretler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#38bdf8"
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {activeVisit && activeCustomer ? (
              <TouchableOpacity
                style={styles.activeCard}
                onPress={() => router.push('/ziyaret/aktif')}
                activeOpacity={0.8}
              >
                <View style={styles.activeCardTop}>
                  <Ionicons name="walk-outline" size={20} color="#38bdf8" />
                  <Text style={styles.activeTitle}>Devam eden ziyaret</Text>
                </View>
                <Text style={styles.activeBusiness} numberOfLines={1}>
                  {activeCustomer.business_name}
                </Text>
                <Text style={styles.activeHint}>Aktif ziyarete git →</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Bu Hafta</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.completedCount}
                  </Text>
                  <Text style={styles.summaryLabel}>Tamamlanan</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.totalMinutes}
                  </Text>
                  <Text style={styles.summaryLabel}>Toplam dk</Text>
                </View>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color="#64748b" />
            <Text style={styles.emptyText}>
              Henüz tamamlanmış ziyaretiniz yok.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const prev = isPreviousDealershipVisit(item, dealershipId);
          return (
            <ZiyaretGecmisiSatiri
              visit={item}
              isPreviousDealership={prev}
              onPress={
                prev
                  ? undefined
                  : () => router.push(`/esnaf/${item.customer_id}`)
              }
            />
          );
        }}
        ListFooterComponent={
          hasMore && visits.length > 0 ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => void loadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#38bdf8" />
              ) : (
                <Text style={styles.loadMoreText}>Daha Fazla Yükle</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerBlock: {
    marginBottom: 12,
    gap: 12,
  },
  activeCard: {
    backgroundColor: '#0c4a6e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
    gap: 6,
  },
  activeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTitle: {
    color: '#7dd3fc',
    fontWeight: '700',
    fontSize: 13,
  },
  activeBusiness: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  activeHint: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 24,
  },
  summaryItem: {
    gap: 2,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  loadMoreBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadMoreText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 14,
  },
});
