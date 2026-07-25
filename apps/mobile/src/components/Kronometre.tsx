import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface KronometreProps {
  checkInAt: string;
}

export function Kronometre({ checkInAt }: KronometreProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    // check_in_at sunucu saatiyle yazılır (DB default now()). Cihaz saati
    // sunucudan gerideyse fark negatif çıkar ve sayaç 00:00'da kilitlenirdi.
    // Bu yüzden başlangıç farkını bir kez hesaplayıp (negatifse 0), sayacı
    // ekranın açık kaldığı süreye göre yerel olarak ilerletiyoruz.
    const startTime = new Date(checkInAt).getTime();
    const mountedAt = Date.now();
    const baseElapsedSec = Math.max(0, Math.floor((mountedAt - startTime) / 1000));

    const updateTimer = () => {
      const sinceMountSec = Math.max(0, Math.floor((Date.now() - mountedAt) / 1000));
      setElapsedSeconds(baseElapsedSec + sinceMountSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [checkInAt]);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  const formatted =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  return (
    <View style={styles.container}>
      <Ionicons name="stopwatch-outline" size={20} color="#38bdf8" />
      <Text style={styles.timerText}>{formatted}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  timerText: {
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
