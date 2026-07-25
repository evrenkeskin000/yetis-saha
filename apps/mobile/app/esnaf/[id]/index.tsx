import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FotoGaleri } from '../../../src/components/FotoGaleri';
import { HaritaGorunumu, type PinItem } from '../../../src/components/HaritaGorunumu';
import { getCategoryColor } from '../../../src/constants/map';
import { useActiveVisit } from '../../../src/lib/ActiveVisitContext';
import { useAuth } from '../../../src/lib/auth';
import {
  CustomerAccessError,
  fetchCustomerDetail,
  type CustomerDetailData,
} from '../../../src/lib/customers';
import { supabase } from '../../../src/lib/supabase';

const OUTCOME_LABELS: Record<string, string> = {
  agreed: 'Anlaşıldı',
  quote_given: 'Teklif Verildi',
  decision_maker_absent: 'Yetkili Yok',
  not_interested: 'İlgilenmiyor',
  follow_up_needed: 'Takip Edilecek',
  complaint: 'Şikayet',
  other: 'Diğer',
};

const OUTCOME_COLORS: Record<string, string> = {
  agreed: '#10b981',
  quote_given: '#38bdf8',
  decision_maker_absent: '#f59e0b',
  not_interested: '#ef4444',
  follow_up_needed: '#8b5cf6',
  complaint: '#ec4899',
  other: '#64748b',
};

export default function EsnafDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeVisit, startVisit } = useActiveVisit();
  const { dealershipId, user } = useAuth();

  const [data, setData] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startingVisit, setStartingVisit] = useState<boolean>(false);

  useEffect(() => {
    if (!id || !dealershipId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const detail = await fetchCustomerDetail(supabase, id, dealershipId);
        setData(detail);
      } catch (err) {
        console.error('Detay yükleme hatası:', err);
        if (err instanceof CustomerAccessError) {
          setError(err.message);
        } else {
          setError('Esnaf detayları yüklenirken hata oluştu.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, dealershipId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Detaylar yükleniyor...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Esnaf bulunamadı'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { customer, visits, photos } = data;
  const categoryName = customer.category?.name ?? 'Kategorisiz';
  const categoryColor = getCategoryColor(categoryName);
  const canEdit = !!user?.id && customer.created_by === user.id;

  const pins: PinItem[] =
    customer.location && !customer.locationMissing
      ? [
          {
            id: customer.id,
            title: customer.business_name,
            subtitle: customer.address,
            categoryName,
            coordinate: [
              customer.location.longitude,
              customer.location.latitude,
            ],
          },
        ]
      : [];

  const handleCallPhone = () => {
    if (customer.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleStartVisit = async () => {
    if (activeVisit) {
      if (activeVisit.customer_id === customer.id) {
        router.push('/ziyaret/aktif');
      } else {
        Alert.alert(
          'Devam Eden Ziyaret Var',
          'Zaten açık olan bir saha ziyaretiniz bulunuyor. Yeni ziyaret başlatmadan önce mevcut ziyareti tamamlamalısınız.',
          [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Aktif Ziyarete Git',
              onPress: () => router.push('/ziyaret/aktif'),
            },
          ]
        );
      }
      return;
    }

    try {
      setStartingVisit(true);
      const res = await startVisit(customer);

      if (!res.visit) {
        Alert.alert(
          'Ziyaret Başlatılamadı',
          res.error || 'Ziyaret başlatılamadı. Lütfen tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      if (res.isMockLocation) {
        Alert.alert(
          'Sahte Konum Uyarısı',
          'Cihazda sahte konum tespit edildi. Ziyaret başlatıldı; bu durum kayıt altına alındı.',
          [
            {
              text: 'Tamam',
              onPress: () => router.push('/ziyaret/aktif'),
            },
          ]
        );
        return;
      }

      router.push('/ziyaret/aktif');
    } catch (err) {
      Alert.alert('Hata', (err as Error)?.message || 'Ziyaret başlatılamadı.');
    } finally {
      setStartingVisit(false);
    }
  };

  const formatDate = (isoString: string): string => {
    const d = new Date(isoString);
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrapper}>
            <Text style={styles.businessName}>{customer.business_name}</Text>
            {customer.owner_name ? (
              <Text style={styles.ownerName}>Yetkili: {customer.owner_name}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <View style={[styles.badge, { backgroundColor: categoryColor }]}>
              <Text style={styles.badgeText}>{categoryName}</Text>
            </View>
            {canEdit ? (
              <TouchableOpacity
                onPress={() => router.push(`/esnaf/${customer.id}/duzenle`)}
                style={styles.editBtn}
              >
                <Ionicons name="create-outline" size={16} color="#38bdf8" />
                <Text style={styles.editBtnText}>Düzenle</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Contact & Address info */}
        <View style={styles.infoList}>
          {customer.phone ? (
            <TouchableOpacity
              style={styles.infoItem}
              onPress={handleCallPhone}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={18} color="#38bdf8" />
              <Text style={[styles.infoText, styles.phoneText]}>
                {customer.phone}
              </Text>
              <Ionicons name="open-outline" size={14} color="#38bdf8" />
            </TouchableOpacity>
          ) : null}

          {customer.address ? (
            <View style={styles.infoItem}>
              <Ionicons name="location" size={18} color="#94a3b8" />
              <Text style={styles.infoText}>{customer.address}</Text>
            </View>
          ) : null}

          {customer.notes ? (
            <View style={styles.infoItem}>
              <Ionicons name="document-text-outline" size={18} color="#94a3b8" />
              <Text style={styles.infoText}>{customer.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Start Visit Button */}
        <TouchableOpacity
          style={[
            styles.startVisitBtn,
            startingVisit && styles.startVisitBtnDisabled,
          ]}
          onPress={handleStartVisit}
          disabled={startingVisit}
          activeOpacity={0.85}
        >
          {startingVisit ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="play-circle" size={22} color="#ffffff" />
              <Text style={styles.startVisitBtnText}>
                {activeVisit && activeVisit.customer_id === customer.id
                  ? 'Aktif Ziyarete Dön'
                  : 'Ziyareti Başlat'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Mini Map */}
      <View style={styles.sectionHeader}>
        <Ionicons name="map-outline" size={18} color="#f8fafc" />
        <Text style={styles.sectionTitle}>Konum Haritası</Text>
      </View>
      {customer.location && !customer.locationMissing ? (
        <View style={styles.mapContainer}>
          <HaritaGorunumu
            pins={pins}
            showUserLocation={false}
            initialRegion={{
              centerCoordinate: [
                customer.location.longitude,
                customer.location.latitude,
              ],
              zoomLevel: 15,
            }}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="warning-outline" size={32} color="#f59e0b" />
          <Text style={styles.emptyText}>Konum bilgisi eksik</Text>
        </View>
      )}

      {/* Visit Photos */}
      <View style={styles.sectionHeader}>
        <Ionicons name="camera-outline" size={18} color="#f8fafc" />
        <Text style={styles.sectionTitle}>Ziyaret Fotoğrafları ({photos.length})</Text>
      </View>
      <FotoGaleri photos={photos} />

      {/* Visit History */}
      <View style={styles.sectionHeader}>
        <Ionicons name="time-outline" size={18} color="#f8fafc" />
        <Text style={styles.sectionTitle}>Ziyaret Geçmişi ({visits.length})</Text>
      </View>

      {visits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={32} color="#64748b" />
          <Text style={styles.emptyText}>Henüz ziyaret yapılmadı</Text>
        </View>
      ) : (
        <View style={styles.visitList}>
          {visits.map((v: { id: string; outcome: string | null; check_in_at: string; duration_minutes?: number | null; notes?: string | null }) => {
            const outcomeText = v.outcome ? OUTCOME_LABELS[v.outcome] || v.outcome : 'Belirtilmedi';
            const outcomeColor = v.outcome ? OUTCOME_COLORS[v.outcome] || '#64748b' : '#64748b';

            return (
              <View key={v.id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                  <Text style={styles.visitDate}>{formatDate(v.check_in_at)}</Text>
                  <View style={[styles.outcomeBadge, { backgroundColor: outcomeColor }]}>
                    <Text style={styles.outcomeText}>{outcomeText}</Text>
                  </View>
                </View>

                {v.duration_minutes !== null && v.duration_minutes !== undefined && (
                  <Text style={styles.visitDuration}>
                    Süre: {v.duration_minutes} dakika
                  </Text>
                )}

                {v.notes ? (
                  <Text style={styles.visitNotes}>Not: {v.notes}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrapper: {
    flex: 1,
    marginRight: 8,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  ownerName: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  editBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  infoList: {
    gap: 10,
    marginBottom: 14,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#cbd5e1',
    flex: 1,
  },
  phoneText: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  startVisitBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  startVisitBtnDisabled: {
    backgroundColor: '#059669',
    opacity: 0.7,
  },
  startVisitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  emptyContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  visitList: {
    gap: 8,
  },
  visitCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  outcomeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  visitDuration: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  visitNotes: {
    fontSize: 13,
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
});
