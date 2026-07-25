import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  USER_SCOPED_LEGACY_KEYS,
  activeCustomerKey,
  activePhotoKey,
  activeVisitKey,
  locationBufferKey,
} from '../constants/storageKeys';

/** Çıkış / kullanıcı değişiminde yerel ziyaret + konum tamponunu temizler. */
export async function clearUserLocalData(userId: string | null | undefined) {
  try {
    const keys: string[] = [...USER_SCOPED_LEGACY_KEYS];
    if (userId) {
      keys.push(
        locationBufferKey(userId),
        activeVisitKey(userId),
        activeCustomerKey(userId),
        activePhotoKey(userId)
      );
    }
    await AsyncStorage.multiRemove(keys);
  } catch (err) {
    console.error('[storage] clearUserLocalData hatası:', err);
  }
}
