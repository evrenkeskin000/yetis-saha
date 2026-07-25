import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KVKK_AYDINLATMA_METNI } from '../../src/constants/kvkk';
import { getRoleLabel } from '../../src/constants/roles';
import {
  SHIFT_DISCLAIMER_CONSENT_KEY,
  SHIFT_KVKK_DISCLAIMER_MESSAGE,
  SHIFT_KVKK_DISCLAIMER_TITLE,
} from '../../src/constants/shift';
import { useAuth } from '../../src/lib/auth';
import { useShift } from '../../src/lib/ShiftContext';
import { ShiftPermissionError } from '../../src/lib/shift';

export default function ProfileTab() {
  const { userName, userEmail, userRole, dealershipName, signOut } = useAuth();
  const {
    isShiftActive,
    shiftStartTime,
    pendingBufferCount,
    startShiftAction,
    stopShiftAction,
    flushBufferNow,
  } = useShift();

  const [kvkkModalVisible, setKvkkModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  function formatTime(isoString?: string | null): string {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  }

  async function handleStartShift() {
    try {
      setActionLoading(true);
      const hasConsented = await AsyncStorage.getItem(
        SHIFT_DISCLAIMER_CONSENT_KEY
      );

      if (!hasConsented) {
        Alert.alert(
          SHIFT_KVKK_DISCLAIMER_TITLE,
          SHIFT_KVKK_DISCLAIMER_MESSAGE,
          [
            {
              text: 'Vazgeç',
              style: 'cancel',
              onPress: () => setActionLoading(false),
            },
            {
              text: 'Kabul Et ve Başlat',
              onPress: async () => {
                try {
                  await AsyncStorage.setItem(
                    SHIFT_DISCLAIMER_CONSENT_KEY,
                    'true'
                  );
                  await startShiftAction();
                } catch (err: unknown) {
                  showShiftStartError(err);
                } finally {
                  setActionLoading(false);
                }
              },
            },
          ]
        );
      } else {
        await startShiftAction();
        setActionLoading(false);
      }
    } catch (err: unknown) {
      showShiftStartError(err);
      setActionLoading(false);
    }
  }

  function showShiftStartError(err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Vardiya başlatılamadı.';
    const openSettings =
      err instanceof ShiftPermissionError ? err.openSettings : true;

    if (openSettings) {
      Alert.alert('Vardiya Başlatılamadı', message, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ayarlara Git',
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ]);
    } else {
      Alert.alert('Vardiya Başlatılamadı', message);
    }
  }

  function handleStopShift() {
    Alert.alert(
      'Vardiyayı Bitir',
      'Günün vardiyasını sonlandırıp konum kaydını durdurmak istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Vardiyayı Bitir',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await stopShiftAction();
            } catch (err: any) {
              Alert.alert('Hata', err.message || `${err}`);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  function handleSignOutPress() {
    Alert.alert(
      'Çıkış Yap',
      'Oturumunuz kapatılacaktır. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            if (isShiftActive) {
              await stopShiftAction();
            }
            await signOut();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* User Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userName ? userName.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>

          <Text style={styles.name}>{userName ?? 'Saha Temsilcisi'}</Text>
          <Text style={styles.email}>{userEmail ?? 'ornek@saha.local'}</Text>
          {dealershipName ? (
            <Text style={styles.dealership}>{dealershipName}</Text>
          ) : null}

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleLabel(userRole)}</Text>
          </View>
        </View>

        {/* Shift Section */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftHeader}>
            <View>
              <Text style={styles.shiftTitle}>Vardiya Takibi</Text>
              <Text style={styles.shiftSubtitle}>
                Arka plan rota kaydı ve çalışma saatleri
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isShiftActive ? styles.statusActive : styles.statusPassive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isShiftActive
                    ? styles.statusActiveText
                    : styles.statusPassiveText,
                ]}
              >
                {isShiftActive ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
          </View>

          {isShiftActive && (
            <View style={styles.shiftDetails}>
              <View style={styles.shiftDetailRow}>
                <Text style={styles.shiftDetailLabel}>Başlangıç Saati:</Text>
                <Text style={styles.shiftDetailValue}>
                  {formatTime(shiftStartTime)}
                </Text>
              </View>

              <View style={styles.shiftDetailRow}>
                <Text style={styles.shiftDetailLabel}>Bekleyen Kayıt:</Text>
                <Text style={styles.shiftDetailValue}>
                  {pendingBufferCount} konum
                </Text>
              </View>
            </View>
          )}

          <View style={styles.shiftActions}>
            {isShiftActive ? (
              <Pressable
                disabled={actionLoading}
                style={({ pressed }) => [
                  styles.stopShiftButton,
                  pressed && styles.buttonPressed,
                  actionLoading && styles.buttonDisabled,
                ]}
                onPress={handleStopShift}
              >
                <Text style={styles.stopShiftButtonText}>
                  {actionLoading ? 'İşleniyor...' : 'Vardiyayı Bitir'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                disabled={actionLoading}
                style={({ pressed }) => [
                  styles.startShiftButton,
                  pressed && styles.buttonPressed,
                  actionLoading && styles.buttonDisabled,
                ]}
                onPress={handleStartShift}
              >
                <Text style={styles.startShiftButtonText}>
                  {actionLoading ? 'İşleniyor...' : 'Vardiyayı Başlat'}
                </Text>
              </Pressable>
            )}

            {isShiftActive && pendingBufferCount > 0 && (
              <Pressable
                style={styles.syncNowButton}
                onPress={flushBufferNow}
              >
                <Text style={styles.syncNowText}>Şimdi Gönder</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* KVKK & Links */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionRowPressed,
            ]}
            onPress={() => setKvkkModalVisible(true)}
          >
            <Text style={styles.actionText}>KVKK Aydınlatma Metni</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Footer Logout */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={handleSignOutPress}
          >
            <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
          </Pressable>
        </View>

        {/* KVKK Modal */}
        <Modal
          visible={kvkkModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setKvkkModalVisible(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>KVKK Aydınlatma Metni</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setKvkkModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Kapat</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalKvkkText}>{KVKK_AYDINLATMA_METNI}</Text>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  dealership: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e0f2fe',
  },
  shiftCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  shiftSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
  },
  statusPassive: {
    backgroundColor: '#334155',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#34d399',
  },
  statusPassiveText: {
    color: '#94a3b8',
  },
  shiftDetails: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  shiftDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftDetailLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  shiftDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  shiftActions: {
    gap: 10,
  },
  startShiftButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startShiftButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  stopShiftButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopShiftButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  syncNowButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  syncNowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38bdf8',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  actionRowPressed: {
    backgroundColor: '#334155',
  },
  actionText: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 22,
    color: '#64748b',
  },
  footer: {
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: '#991b1b',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonPressed: {
    backgroundColor: '#7f1d1d',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  modalKvkkText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#cbd5e1',
  },
});
