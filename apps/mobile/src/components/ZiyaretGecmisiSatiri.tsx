import { Ionicons } from '@expo/vector-icons';
import type { Visit } from '@saha/shared';
import { OUTCOME_LABELS, OUTCOME_COLORS } from '@saha/shared';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UyariRozeti } from './UyariRozeti';
import { visitDisplayName } from '../lib/visitHistory';

interface ZiyaretGecmisiSatiriProps {
  visit: Visit;
  isPreviousDealership: boolean;
  onPress?: () => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ZiyaretGecmisiSatiri({
  visit,
  isPreviousDealership,
  onPress,
}: ZiyaretGecmisiSatiriProps) {
  const cancelled = Boolean(visit.cancelled_at);
  const inProgress = !visit.check_out_at && !cancelled;
  const outcomeLabel = cancelled
    ? 'İptal Edildi'
    : inProgress
      ? 'Devam Ediyor'
      : visit.outcome
        ? OUTCOME_LABELS[visit.outcome] || visit.outcome
        : 'Belirtilmedi';
  const outcomeColor = cancelled
    ? '#64748b'
    : inProgress
      ? '#f59e0b'
      : visit.outcome
        ? OUTCOME_COLORS[visit.outcome]
        : '#64748b';

  const content = (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.businessName} numberOfLines={2}>
          {visitDisplayName(visit)}
        </Text>
        <View style={[styles.outcomeBadge, { backgroundColor: outcomeColor }]}>
          <Text style={styles.outcomeText}>{outcomeLabel}</Text>
        </View>
      </View>

      <Text style={styles.dateText}>{formatDateTime(visit.check_in_at)}</Text>

      <View style={styles.metaRow}>
        {!cancelled && visit.duration_minutes != null ? (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#94a3b8" />
            <Text style={styles.metaText}>{visit.duration_minutes} dk</Text>
          </View>
        ) : null}
        {isPreviousDealership ? (
          <View style={styles.prevBadge}>
            <Text style={styles.prevBadgeText}>Önceki bayi kaydı</Text>
          </View>
        ) : null}
      </View>

      <UyariRozeti isMockLocation={visit.is_mock_location} />
    </View>
  );

  if (onPress && !isPreviousDealership && !cancelled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  businessName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  outcomeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 140,
  },
  outcomeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  prevBadge: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prevBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fbbf24',
  },
});
