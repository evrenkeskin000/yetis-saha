import type { Category } from '@saha/shared';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCategoryColor } from '../constants/map';

export interface KategoriFiltreProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function KategoriFiltre({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: KategoriFiltreProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            selectedCategoryId === null && styles.activeChip,
          ]}
          onPress={() => onSelectCategory(null)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              selectedCategoryId === null && styles.activeChipText,
            ]}
          >
            Tümü
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const categoryColor = getCategoryColor(cat.name);

          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                isSelected && {
                  backgroundColor: categoryColor,
                  borderColor: categoryColor,
                },
              ]}
              onPress={() => onSelectCategory(isSelected ? null : cat.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: categoryColor },
                  isSelected && { backgroundColor: '#ffffff' },
                ]}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.activeChipText,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeChip: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  activeChipText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
