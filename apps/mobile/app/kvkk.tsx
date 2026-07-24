import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KVKK_AYDINLATMA_METNI } from '../src/constants/kvkk';
import { useAuth } from '../src/lib/auth';

export default function KvkkScreen() {
  const { saveKvkkConsent } = useAuth();
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!isChecked || submitting) return;

    try {
      setSubmitting(true);
      await saveKvkkConsent();
    } catch (err: any) {
      Alert.alert(
        'Hata',
        err.message ?? 'KVKK onayı kaydedilirken bir hata oluştu.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>KVKK Aydınlatma Metni</Text>
          <Text style={styles.headerSubtitle}>
            Uygulamayı kullanabilmek için metni okuyup onaylamanız gerekmektedir.
          </Text>
        </View>

        <View style={styles.card}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.kvkkText}>{KVKK_AYDINLATMA_METNI}</Text>
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setIsChecked(!isChecked)}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Aydınlatma metnini okudum, anladım ve kabul ediyorum.
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (!isChecked || submitting) && styles.buttonDisabled,
              pressed && isChecked && styles.buttonPressed,
            ]}
            onPress={handleConfirm}
            disabled={!isChecked || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Onaylıyorum ve Devam Ediyorum</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  card: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  kvkkText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  footer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#0f172a',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: -2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  buttonPressed: {
    backgroundColor: '#1d4ed8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
