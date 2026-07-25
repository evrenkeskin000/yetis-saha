import { Ionicons } from '@expo/vector-icons';
import type { VisitOutcome } from '@saha/shared';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Kronometre } from '../../src/components/Kronometre';
import { SonucSecici } from '../../src/components/SonucSecici';
import { UyariRozeti } from '../../src/components/UyariRozeti';
import { getCategoryColor } from '../../src/constants/map';
import { useActiveVisit } from '../../src/lib/ActiveVisitContext';

export default function AktifZiyaretScreen() {
  const router = useRouter();
  const {
    activeVisit,
    activeCustomer,
    capturedPhoto,
    completeCurrentVisit,
    cancelCurrentVisit,
    isInitialLoading,
  } = useActiveVisit();

  const [selectedOutcome, setSelectedOutcome] = useState<VisitOutcome | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (isInitialLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Ziyaret bilgisi yükleniyor...</Text>
      </View>
    );
  }

  if (!activeVisit || !activeCustomer) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#f59e0b" />
        <Text style={styles.noVisitTitle}>Aktif Ziyaret Bulunamadı</Text>
        <Text style={styles.noVisitSubtitle}>
          Şu anda açık olan bir saha ziyaretiniz bulunmuyor.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(tabs)/esnaflar')}
        >
          <Text style={styles.backBtnText}>Esnaflar Listesine Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categoryName = activeCustomer.category?.name ?? 'Kategorisiz';
  const categoryColor = getCategoryColor(categoryName);

  const canFinish = Boolean(selectedOutcome) && Boolean(capturedPhoto);

  const handleFinishVisit = async () => {
    if (!canFinish || !selectedOutcome || submitting) return;

    try {
      setSubmitting(true);
      const completed = await completeCurrentVisit(selectedOutcome, notes);
      router.replace({
        pathname: '/ziyaret/ozet',
        params: {
          visitId: completed.id,
          businessName: activeCustomer.business_name,
          categoryName,
          checkInAt: completed.check_in_at,
          checkOutAt: completed.check_out_at ?? new Date().toISOString(),
          durationMinutes: String(completed.duration_minutes ?? 0),
          outcome: selectedOutcome,
          notes,
          photoUri: capturedPhoto?.uri,
          isMockLocation: String(completed.is_mock_location ?? false),
        },
      });
    } catch (err) {
      console.error('Ziyareti bitirme hatası:', err);
      const errorMsg = (err as Error)?.message || 'Ağ hatası oluştu';
      Alert.alert(
        'Tamamlama Hatası',
        `${errorMsg}. Lütfen bağlantınızı kontrol edip tekrar deneyin.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Tekrar Dene', onPress: handleFinishVisit },
        ]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelVisit = () => {
    Alert.alert(
      'Ziyareti İptal Et',
      'Aktif ziyareti iptal etmek istediğinize emin misiniz? (Giriş kaydı kalacaktır).',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelCurrentVisit();
              router.replace('/(tabs)/esnaflar');
            } catch (err) {
              Alert.alert(
                'İptal Edilemedi',
                (err as Error)?.message ||
                  'Ziyaret iptal edilemedi, tekrar deneyin.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Active Visit Info Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrapper}>
            <Text style={styles.businessName}>{activeCustomer.business_name}</Text>
            {activeCustomer.owner_name ? (
              <Text style={styles.ownerName}>{activeCustomer.owner_name}</Text>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: categoryColor }]}>
            <Text style={styles.badgeText}>{categoryName}</Text>
          </View>
        </View>

        {/* Warning Badges */}
        <UyariRozeti isMockLocation={activeVisit.is_mock_location} />

        <View style={styles.divider} />

        {/* Timer */}
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>Geçen Süre:</Text>
          <Kronometre checkInAt={activeVisit.check_in_at} />
        </View>
      </View>

      {/* Outcome Selector */}
      <View style={styles.card}>
        <SonucSecici
          selectedOutcome={selectedOutcome}
          onSelectOutcome={setSelectedOutcome}
        />

        {/* Notes */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Ziyaret Notları</Text>
            <Text style={styles.charCount}>{notes.length}/1000</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Ziyaret ile ilgili detaylı notlar..."
            placeholderTextColor="#64748b"
            multiline
            maxLength={1000}
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Mandatory Camera Trigger */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Ziyaret Fotoğrafı <Text style={styles.required}>* (Zorunlu)</Text>
          </Text>

          {!capturedPhoto ? (
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => router.push('/ziyaret/kamera')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={24} color="#38bdf8" />
              <Text style={styles.cameraBtnText}>Fotoğraf Çek (Zorunlu)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoPreviewCard}>
              <Image source={{ uri: capturedPhoto.uri }} style={styles.photoThumbnail} />
              <View style={styles.photoInfo}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.photoStatusText}>Fotoğraf Çekildi</Text>
                <TouchableOpacity
                  style={styles.changePhotoBtn}
                  onPress={() => router.push('/ziyaret/kamera')}
                >
                  <Text style={styles.changePhotoBtnText}>Değiştir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.finishBtn, !canFinish && styles.disabledBtn]}
          onPress={handleFinishVisit}
          disabled={!canFinish || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={22} color="#ffffff" />
              <Text style={styles.finishBtnText}>Ziyareti Bitir</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancelVisit}
          disabled={submitting}
        >
          <Text style={styles.cancelBtnText}>Vazgeç / İptal</Text>
        </TouchableOpacity>
      </View>
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
    gap: 14,
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
  noVisitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 12,
  },
  noVisitSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
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
  ownerName: {
    fontSize: 13,
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
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  field: {
    gap: 6,
    marginVertical: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  required: {
    color: '#ef4444',
  },
  charCount: {
    fontSize: 12,
    color: '#64748b',
  },
  textArea: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    height: 90,
    textAlignVertical: 'top',
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 8,
    paddingVertical: 14,
  },
  cameraBtnText: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600',
  },
  photoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    gap: 12,
  },
  photoThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  photoInfo: {
    flex: 1,
    gap: 4,
  },
  photoStatusText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  changePhotoBtn: {
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changePhotoBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  finishBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  disabledBtn: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  finishBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
