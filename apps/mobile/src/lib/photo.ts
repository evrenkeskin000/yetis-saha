import type { SupabaseClient } from '@supabase/supabase-js';
import type { GeoPoint, VisitPhoto } from '@saha/shared';
import { uploadVisitPhoto } from '@saha/shared';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface ProcessedPhotoResult {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Compresses photo to target ~200 KB or less.
 * First resizes to 1280px with 0.7 compression. If > 200 KB, resizes to 1024px with 0.5 compression.
 */
export async function processAndCompressPhoto(
  uri: string
): Promise<ProcessedPhotoResult> {
  // Step 1: Initial compression (1280px width, 0.7 quality)
  let result = await manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.7, format: SaveFormat.JPEG }
  );

  let fileInfo = await FileSystem.getInfoAsync(result.uri);
  let sizeBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

  // Step 2: Stronger compression if > 200 KB
  if (sizeBytes > 200 * 1024) {
    result = await manipulateAsync(
      result.uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.5, format: SaveFormat.JPEG }
    );
    fileInfo = await FileSystem.getInfoAsync(result.uri);
    sizeBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : sizeBytes;
  }

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    sizeBytes,
  };
}

/**
 * Reads local photo file, converts to ArrayBuffer, uploads to Supabase Storage, and inserts visit_photo.
 */
export async function uploadVisitPhotoWithBuffer(
  supabase: SupabaseClient,
  visitId: string,
  photoUri: string,
  location?: GeoPoint | null
): Promise<VisitPhoto> {
  const base64Str = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64Str);

  const visitPhoto = await uploadVisitPhoto(supabase, {
    visit_id: visitId,
    data: arrayBuffer,
    content_type: 'image/jpeg',
    file_ext: 'jpg',
    captured_at: new Date().toISOString(),
    location: location ?? undefined,
  });

  // Clean up temporary local file
  try {
    await FileSystem.deleteAsync(photoUri, { idempotent: true });
  } catch {
    // Ignore cleanup error
  }

  return visitPhoto;
}
