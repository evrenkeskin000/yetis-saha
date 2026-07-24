import { Ionicons } from '@expo/vector-icons';
import type { VisitPhoto } from '@saha/shared';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface FotoGaleriItem extends VisitPhoto {
  signed_url?: string;
}

export interface FotoGaleriProps {
  photos: FotoGaleriItem[];
}

export function FotoGaleri({ photos }: FotoGaleriProps) {
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={24} color="#64748b" />
        <Text style={styles.emptyText}>Henüz fotoğraf yüklenmemiş</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {photos.map((photo) => {
          const uri = photo.signed_url;
          if (!uri) return null;

          return (
            <TouchableOpacity
              key={photo.id}
              style={styles.thumbnailWrapper}
              onPress={() => setSelectedPhotoUrl(uri)}
              activeOpacity={0.8}
            >
              <Image source={{ uri }} style={styles.thumbnail} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={Boolean(selectedPhotoUrl)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhotoUrl(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhotoUrl(null)}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>

          {selectedPhotoUrl && (
            <Image
              source={{ uri: selectedPhotoUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    gap: 10,
  },
  thumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 20,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
});
