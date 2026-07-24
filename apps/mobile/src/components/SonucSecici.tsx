import type { VisitOutcome } from '@saha/shared';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface OutcomeOption {
  key: VisitOutcome;
  label: string;
  color: string;
}

export const OUTCOME_OPTIONS: OutcomeOption[] = [
  { key: 'agreed', label: 'Anlaşıldı / Satış Yapıldı', color: '#10b981' },
  { key: 'quote_given', label: 'Teklif Verildi', color: '#38bdf8' },
  { key: 'decision_maker_absent', label: 'Karar Verici Yerinde Yok', color: '#f59e0b' },
  { key: 'not_interested', label: 'İlgilenmedi', color: '#ef4444' },
  { key: 'follow_up_needed', label: 'Tekrar Uğranacak', color: '#8b5cf6' },
  { key: 'complaint', label: 'Şikayet / Talep', color: '#ec4899' },
  { key: 'other', label: 'Diğer', color: '#64748b' },
];

export interface SonucSeciciProps {
  selectedOutcome: VisitOutcome | null;
  onSelectOutcome: (outcome: VisitOutcome) => void;
}

export function SonucSecici({
  selectedOutcome,
  onSelectOutcome,
}: SonucSeciciProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Ziyaret Sonucu <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.optionsList}>
        {OUTCOME_OPTIONS.map((opt) => {
          const isSelected = selectedOutcome === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.optionCard,
                isSelected && {
                  borderColor: opt.color,
                  backgroundColor: 'rgba(30, 41, 59, 0.9)',
                },
              ]}
              onPress={() => onSelectOutcome(opt.key)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioButton,
                  isSelected && { borderColor: opt.color },
                ]}
              >
                {isSelected && (
                  <View
                    style={[styles.radioDot, { backgroundColor: opt.color }]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && { color: '#f8fafc', fontWeight: '700' },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionLabel: {
    fontSize: 14,
    color: '#cbd5e1',
    flex: 1,
  },
});
