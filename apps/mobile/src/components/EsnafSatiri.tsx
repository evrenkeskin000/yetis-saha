import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCategoryColor } from '../constants/map';
import type { CustomerWithCategory } from '../lib/customers';
import { formatDistance } from '../lib/geo';

export interface EsnafSatiriProps {
  customer: CustomerWithCategory;
  lastVisitAt?: string | null;
  distanceMeters?: number | null;
  onPress: (customer: CustomerWithCategory) => void;
}

export function EsnafSatiri({
  customer,
  lastVisitAt,
  distanceMeters,
  onPress,
}: EsnafSatiriProps) {
  const categoryName = customer.category?.name ?? 'Kategorisiz';
  const categoryColor = getCategoryColor(categoryName);

  const formatLastVisit = (isoDate?: string | null): string => {
    if (!isoDate) return 'Hiç ziyaret edilmedi';
    const visitDate = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - visitDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Bugün ziyaret edildi';
    if (diffDays === 1) return 'Dün ziyaret edildi';
    if (diffDays < 30) return `${diffDays} gün önce`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} ay önce`;
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} yıl önce`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(customer)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.businessName} numberOfLines={1}>
            {customer.business_name}
          </Text>
          {customer.owner_name ? (
            <Text style={styles.ownerName} numberOfLines={1}>
              {customer.owner_name}
            </Text>
          ) : null}
        </View>

        <View style={[styles.badge, { backgroundColor: categoryColor }]}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {customer.locationMissing ? (
          <View style={styles.infoRow}>
            <Ionicons name="warning-outline" size={14} color="#f59e0b" />
            <Text style={[styles.infoText, { color: '#f59e0b' }]} numberOfLines={1}>
              Konum bilgisi eksik
            </Text>
          </View>
        ) : customer.address ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#94a3b8" />
            <Text style={styles.infoText} numberOfLines={1}>
              {customer.address}
            </Text>
          </View>
        ) : null}

        {customer.phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={14} color="#94a3b8" />
            <Text style={styles.infoText} numberOfLines={1}>
              {customer.phone}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.visitBadge}>
          <Ionicons
            name={lastVisitAt ? 'time-outline' : 'alert-circle-outline'}
            size={14}
            color={lastVisitAt ? '#38bdf8' : '#f59e0b'}
          />
          <Text
            style={[
              styles.visitText,
              { color: lastVisitAt ? '#38bdf8' : '#f59e0b' },
            ]}
          >
            {formatLastVisit(lastVisitAt)}
          </Text>
        </View>

        {distanceMeters !== undefined && distanceMeters !== null && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate-outline" size={12} color="#10b981" />
            <Text style={styles.distanceText}>
              {formatDistance(distanceMeters)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  ownerName: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    gap: 4,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#cbd5e1',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    marginTop: 4,
  },
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
});
