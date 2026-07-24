'use client';

import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, ExternalLink } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { formatDateTimeTR } from '../../lib/format';

export interface PhotoItem {
  id: string;
  storage_path: string;
  captured_at?: string | null;
}

interface PhotoGalleryProps {
  photos: PhotoItem[];
}

interface SignedPhoto extends PhotoItem {
  signedUrl: string | null;
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [signedPhotos, setSignedPhotos] = useState<SignedPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSignedUrls() {
      if (!photos || photos.length === 0) {
        setSignedPhotos([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();
        const paths = photos.map((p) => p.storage_path);

        const { data, error } = await supabase.storage
          .from('visit-photos')
          .createSignedUrls(paths, 3600);

        if (error) {
          console.error('Fotoğraf URL imzalanırken hata:', error);
          setSignedPhotos(photos.map((p) => ({ ...p, signedUrl: null })));
        } else {
          const urlMap = new Map<string, string>();
          (data || []).forEach((item) => {
            if (item.path && item.signedUrl) {
              urlMap.set(item.path, item.signedUrl);
            }
          });

          setSignedPhotos(
            photos.map((p) => ({
              ...p,
              signedUrl: urlMap.get(p.storage_path) || null,
            }))
          );
        }
      } catch (err) {
        console.error('Signed URL yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSignedUrls();
  }, [photos]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center text-slate-500 text-sm font-medium">
        Fotoğraf galerisi yükleniyor...
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-2">
        <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-slate-500 text-sm font-medium">Henüz fotoğraf yok</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-teal-600" />
        <span>Fotoğraf Galerisi ({photos.length})</span>
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {signedPhotos.map((photo) => (
          <div
            key={photo.id}
            className="group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-square shadow-2xs hover:shadow-md transition-all"
          >
            {photo.signedUrl ? (
              <a
                href={photo.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full"
              >
                <img
                  src={photo.signedUrl}
                  alt="Ziyaret Fotoğrafı"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </a>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400 p-2 text-center">
                Görsel yüklenemedi
              </div>
            )}

            {photo.captured_at && (
              <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 backdrop-blur-xs px-2 py-1 text-[10px] font-mono text-white text-center truncate">
                {formatDateTimeTR(photo.captured_at)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
