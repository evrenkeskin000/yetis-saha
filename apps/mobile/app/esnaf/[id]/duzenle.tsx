import { Ionicons } from '@expo/vector-icons';
import type { Category } from '@saha/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ZodError } from 'zod';
import { useAuth } from '../../../src/lib/auth';
import {
  CustomerAccessError,
  fetchCustomerById,
  fetchCategories,
  updateCustomer,
} from '../../../src/lib/customers';
import { ensureFreshSession, isJwtExpiredError } from '../../../src/lib/session';
import { supabase } from '../../../src/lib/supabase';

export default function EsnafDuzenleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dealershipId, user } = useAuth();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    address?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  /** Haritadan dönen çözümlenmiş adres — buton üzerinde gösterilir */
  const [pickedAddress, setPickedAddress] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        await ensureFreshSession(supabase);
        const cats = await fetchCategories(supabase).catch(async (err) => {
          if (!isJwtExpiredError(err)) throw err;
          await ensureFreshSession(supabase);
          return fetchCategories(supabase);
        });
        setCategories(cats);
      } catch (err) {
        console.warn('Kategori yükleme hatası:', err);
        Alert.alert(
          'Kategoriler Yüklenemedi',
          isJwtExpiredError(err)
            ? 'Oturum süreniz dolmuş. Lütfen çıkış yapıp tekrar giriş yapın.'
            : 'Kategoriler alınamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
        );
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!id || !dealershipId || !user?.id) return;
    (async () => {
      try {
        setLoading(true);
        const customer = await fetchCustomerById(supabase, id, dealershipId);
        if (!customer) {
          Alert.alert('Erişim Engellendi', 'Bu esnafa erişiminiz yok.', [
            { text: 'Tamam', onPress: () => router.back() },
          ]);
          return;
        }
        if (customer.created_by !== user.id) {
          Alert.alert(
            'Yetki Yok',
            'Yalnızca kendi eklediğiniz esnafı düzenleyebilirsiniz.',
            [{ text: 'Tamam', onPress: () => router.back() }]
          );
          return;
        }

        setBusinessName(customer.business_name || '');
        setOwnerName(customer.owner_name || '');
        setPhone(customer.phone || '');
        setAddress(customer.address || '');
        setCategoryId(customer.category_id || '');
        setNotes(customer.notes || '');
        if (customer.location) {
          setLocation(customer.location);
        }
      } catch (err) {
        console.error(err);
        const msg =
          err instanceof CustomerAccessError
            ? err.message
            : 'Esnaf bilgileri yüklenemedi.';
        Alert.alert('Hata', msg, [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, dealershipId, user?.id, router]);

  useEffect(() => {
    if (params.lat && params.lng) {
      const lat = parseFloat(params.lat);
      const lng = parseFloat(params.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        setLocation({ latitude: lat, longitude: lng });
        setErrors((prev) => ({ ...prev, location: '' }));
      }
    }
    if (params.address) {
      setPickedAddress(params.address);
      // Kullanıcının yazdığı adresi ezmemek için yalnızca boşsa doldur
      setAddress((prev) => (prev.trim().length === 0 ? params.address! : prev));
    }
  }, [params.lat, params.lng, params.address]);

  const handleSubmit = async () => {
    setErrors({});
    if (!location) {
      setErrors((prev) => ({
        ...prev,
        location: 'Lütfen haritadan esnaf konumunu seçin',
      }));
      return;
    }
    if (!id || !user?.id) return;

    const payload = {
      business_name: businessName,
      owner_name: ownerName || undefined,
      phone: phone || undefined,
      address: address || undefined,
      category_id: categoryId,
      location,
      notes: notes || undefined,
    };

    try {
      setSubmitting(true);
      await updateCustomer(supabase, id, payload, { userId: user.id });
      Alert.alert('Başarılı', 'Esnaf bilgileri güncellendi.', [
        {
          text: 'Tamam',
          onPress: () => router.replace(`/esnaf/${id}`),
        },
      ]);
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          fieldErrors[path] = issue.message;
        }
        setErrors(fieldErrors);
      } else {
        const errorMsg =
          (err as Error)?.message || 'Güncelleme sırasında bir hata oluştu';
        Alert.alert('Hata', errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMapPicker = () => {
    if (!id) return;
    router.push({
      pathname: '/esnaf/konum-sec',
      params: {
        ...(location
          ? {
              initialLat: location.latitude.toFixed(6),
              initialLng: location.longitude.toFixed(6),
            }
          : {}),
        returnTo: `/esnaf/${id}/duzenle`,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Esnaf yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Esnafı Düzenle</Text>

        <View style={styles.field}>
          <Text style={styles.label}>
            İşletme Adı <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              errors.business_name ? styles.inputError : null,
            ]}
            placeholder="Örn. Öztürk Gıda Market"
            placeholderTextColor="#64748b"
            value={businessName}
            onChangeText={setBusinessName}
          />
          {Boolean(errors.business_name) && (
            <Text style={styles.errorText}>{errors.business_name}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Yetkili Adı Soyadı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn. Ahmet Öztürk"
            placeholderTextColor="#64748b"
            value={ownerName}
            onChangeText={setOwnerName}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Telefon Numarası</Text>
          <TextInput
            style={[styles.input, errors.phone ? styles.inputError : null]}
            placeholder="05XXXXXXXXX"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          {Boolean(errors.phone) && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Kategori <Text style={styles.required}>*</Text>
          </Text>
          {loadingCategories ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      isSelected && styles.categoryOptionSelected,
                    ]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        isSelected && styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Adres</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Açık adres bilgisi..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Konum Bilgisi <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.locationPickerBtn,
              location ? styles.locationPickerBtnActive : null,
              errors.location ? styles.inputError : null,
            ]}
            onPress={handleOpenMapPicker}
            activeOpacity={0.8}
          >
            <Ionicons
              name={location ? 'location' : 'map-outline'}
              size={20}
              color={location ? '#10b981' : '#38bdf8'}
            />
            <Text
              style={[
                styles.locationPickerBtnText,
                location ? styles.locationPickerBtnTextActive : null,
              ]}
              numberOfLines={2}
            >
              {location
                ? pickedAddress ??
                  `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : 'Haritadan Konum Seç'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
          {Boolean(errors.location) && (
            <Text style={styles.errorText}>{errors.location}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notlar</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Esnafla ilgili özel notlar..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting ? styles.disabledButton : null]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>Değişiklikleri Kaydet</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },
  required: { color: '#ef4444' },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12 },
  categoryScroll: { gap: 8, paddingVertical: 4 },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryOptionText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  categoryOptionTextSelected: { color: '#ffffff', fontWeight: '600' },
  locationPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  locationPickerBtnActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  locationPickerBtnText: {
    flex: 1,
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '500',
  },
  locationPickerBtnTextActive: { color: '#10b981', fontWeight: '600' },
  submitButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  disabledButton: { backgroundColor: '#475569', opacity: 0.6 },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
