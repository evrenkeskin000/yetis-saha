import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useActiveVisit } from '../../src/lib/ActiveVisitContext';
import { processAndCompressPhoto } from '../../src/lib/photo';

const CameraComponent = CameraView as any;
const ViewShotComponent = ViewShot as any;

export default function KameraScreen() {
  const router = useRouter();
  const { setCapturedPhoto } = useActiveVisit();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<any>(null);
  const viewShotRef = useRef<any>(null);

  const [rawPhotoUri, setRawPhotoUri] = useState<string | null>(null);
  const [watermarkInfo, setWatermarkInfo] = useState<{
    dateStr: string;
    geoStr: string;
    captureLocation: { latitude: number; longitude: number } | null;
  } | null>(null);

  const [processing, setProcessing] = useState<boolean>(false);
  const [fileSizeKb, setFileSizeKb] = useState<number | null>(null);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={48} color="#f59e0b" />
        <Text style={styles.permissionText}>
          Ziyaret fotoğrafı çekebilmek için kamera izni gereklidir.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleTakePicture = async () => {
    if (!cameraRef.current || processing) return;

    try {
      setProcessing(true);

      // 1. Get GPS coordinates
      let geoStr = 'Konum Alınamadı';
      let captureLocation: { latitude: number; longitude: number } | null = null;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        captureLocation = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        geoStr = `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;
      } catch {
        // Fallback if GPS fails
      }

      // 2. Format timestamp in TR
      const now = new Date();
      const dateStr = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString(
        'tr-TR'
      )}`;

      // 3. Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        setRawPhotoUri(photo.uri);
        setWatermarkInfo({ dateStr, geoStr, captureLocation });
      }
    } catch (err) {
      console.error('Fotoğraf çekim hatası:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmPhoto = async () => {
    if (!viewShotRef.current || processing) return;

    try {
      setProcessing(true);

      // 1. Capture watermarked view
      const watermarkedUri = await captureRef(viewShotRef, {
        format: 'jpg',
        quality: 0.9,
      });

      // 2. Compress photo (target ~200 KB)
      const compressed = await processAndCompressPhoto(watermarkedUri);
      setFileSizeKb(Math.round(compressed.sizeBytes / 1024));

      // 3. Save to ActiveVisitContext (capture_location = filigran GPS)
      await setCapturedPhoto({
        uri: compressed.uri,
        width: compressed.width,
        height: compressed.height,
        timestamp: new Date().toISOString(),
        captureLocation: watermarkInfo?.captureLocation ?? null,
      });

      router.back();
    } catch (err) {
      console.error('Filigran/Sıkıştırma hatası:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {!rawPhotoUri ? (
        // Live Camera View
        <CameraComponent style={styles.camera} ref={cameraRef} facing="back">
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.captureControls}>
              <TouchableOpacity
                style={styles.captureBtn}
                onPress={handleTakePicture}
                disabled={processing}
                activeOpacity={0.8}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <View style={styles.captureBtnInner} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CameraComponent>
      ) : (
        // Preview + Watermark View
        <View style={styles.previewContainer}>
          <ViewShotComponent
            ref={viewShotRef}
            options={{ format: 'jpg', quality: 0.9 }}
            style={styles.viewShotContainer}
            collapsable={false}
          >
            <Image
              source={{ uri: rawPhotoUri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            {/* Watermark Overlay Strip */}
            <View style={styles.watermarkStrip}>
              <Text style={styles.watermarkText}>
                YETİŞ+ ZİYARETİ | {watermarkInfo?.dateStr}
              </Text>
              <Text style={styles.watermarkText}>
                GPS: {watermarkInfo?.geoStr}
              </Text>
            </View>
          </ViewShotComponent>

          {/* Controls Bar */}
          <View style={styles.previewControls}>
            {fileSizeKb !== null && (
              <Text style={styles.sizeText}>Boyut: {fileSizeKb} KB</Text>
            )}

            <View style={styles.previewBtnRow}>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => {
                  setRawPhotoUri(null);
                  setWatermarkInfo(null);
                  setFileSizeKb(null);
                }}
                disabled={processing}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.retakeBtnText}>Yeniden Çek</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.useBtn}
                onPress={handleConfirmPhoto}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#ffffff" />
                    <Text style={styles.useBtnText}>Fotoğrafı Kullan</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#f8fafc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    top: 24,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  captureControls: {
    alignItems: 'center',
    marginBottom: 30,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  previewContainer: {
    flex: 1,
  },
  viewShotContainer: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  watermarkStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#38bdf8',
  },
  watermarkText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  previewControls: {
    backgroundColor: '#1e293b',
    padding: 16,
    gap: 12,
  },
  sizeText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#475569',
    paddingVertical: 12,
    borderRadius: 8,
  },
  retakeBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  useBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
  },
  useBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
