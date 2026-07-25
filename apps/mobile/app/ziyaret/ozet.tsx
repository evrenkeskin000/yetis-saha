import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { UyariRozeti } from '../../src/components/UyariRozeti';
import { getCategoryColor } from '../../src/constants/map';

const OUTCOME_LABELS: Record<string, string> = {
  agreed: 'Anlaşıldı / Satış Yapıldı',
  quote_given: 'Teklif Verildi',
  decision_maker_absent: 'Karar Verici Yerinde Yok',
  not_interested: 'İlgilenmedi',
  follow_up_needed: 'Tekrar Uğranacak',
  complaint: 'Şikayet / Talep',
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

export default function ZiyaretOzetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    visitId?: string;
    businessName?: string;
    categoryName?: string;
    checkInAt?: string;
    checkOutAt?: string;
    durationMinutes?: string;
    outcome?: string;
    notes?: string;
    photoUri?: string;
    isMockLocation?: string;
  }>();

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const categoryName = params.categoryName ?? 'Kategorisiz';
  const categoryColor = getCategoryColor(categoryName);

  const outcomeKey = params.outcome ?? 'other';
  const outcomeText = OUTCOME_LABELS[outcomeKey] || outcomeKey;
  const outcomeColor = OUTCOME_COLORS[outcomeKey] || '#64748b';

  const isMockLocation = params.isMockLocation === 'true';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success Badge Banner */}
      <View style={styles.successBanner}>
        <Ionicons name="checkmark-circle" size={48} color="#10b981" />
        <Text style={styles.successTitle}>Ziyaret Başarıyla Tamamlandı</Text>
        <Text style={styles.successSubtitle}>
          Giriş/Çıkış saatleri ve ziyaret verileri kaydedildi.
        </Text>
      </View>

      {/* Summary Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrapper}>
            <Text style={styles.businessName}>
              {params.businessName || 'Esnaf'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: categoryColor }]}>
            <Text style={styles.badgeText}>{categoryName}</Text>
          </View>
        </View>

        {/* Warning badges */}
        <UyariRozeti isMockLocation={isMockLocation} />

        <View style={styles.divider} />

        {/* Timestamps & Duration */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Ionicons name="log-in-outline" size={16} color="#38bdf8" />
            <Text style={styles.infoLabel}>Giriş Saati</Text>
            <Text style={styles.infoValue}>
              {formatDateTime(params.checkInAt)}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="log-out-outline" size={16} color="#38bdf8" />
            <Text style={styles.infoLabel}>Çıkış Saati</Text>
            <Text style={styles.infoValue}>
              {formatDateTime(params.checkOutAt)}
            </Text>
          </View>
        </View>

        <View style={styles.durationRow}>
          <Ionicons name="time" size={18} color="#f59e0b" />
          <Text style={styles.durationLabel}>Toplam Süre:</Text>
          <Text style={styles.durationValue}>
            {params.durationMinutes || 0} dakika
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Outcome */}
        <View style={styles.outcomeRow}>
          <Text style={styles.fieldLabel}>Ziyaret Sonucu:</Text>
          <View
            style={[styles.outcomeBadge, { backgroundColor: outcomeColor }]}
          >
            <Text style={styles.outcomeText}>{outcomeText}</Text>
          </View>
        </View>

        {/* Notes */}
        {params.notes ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notlar:</Text>
            <Text style={styles.notesText}>{params.notes}</Text>
          </View>
        ) : null}

        {/* Photo Thumbnail */}
        {params.photoUri ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Ziyaret Fotoğrafı:</Text>
            <View style={styles.photoWrapper}>
              <Image
                source={{ uri: params.photoUri }}
                style={styles.photoImage}
              />
            </View>
          </View>
        ) : null}
      </View>

      {/* Primary Action Button */}
      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => router.replace('/(tabs)/esnaflar')}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark" size={22} color="#ffffff" />
        <Text style={styles.doneBtnText}>Tamam / Listeye Dön</Text>
      </TouchableOpacity>
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
    gap: 16,
  },
  successBanner: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
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
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  durationLabel: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  durationValue: {
    color: '#f59e0b',
    fontSize: 15,
    fontWeight: '700',
  },
  outcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outcomeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  field: {
    gap: 4,
  },
  notesText: {
    color: '#f8fafc',
    fontSize: 14,
    fontStyle: 'italic',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
  },
  photoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  doneBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
