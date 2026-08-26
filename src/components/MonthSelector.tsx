import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { MONTH_NAMES_RU } from '../constants/banks';
import { useTheme } from '../context/ThemeContext';

interface MonthSelectorProps {
  currentMonth: number;
  currentYear: number;
  onSelectMonth: (month: number, year: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  currentMonth,
  currentYear,
  onSelectMonth,
}) => {
  const { colors } = useTheme();

  const handlePrev = () => {
    if (currentMonth === 0) {
      onSelectMonth(11, currentYear - 1);
    } else {
      onSelectMonth(currentMonth - 1, currentYear);
    }
  };

  const handleNext = () => {
    if (currentMonth === 11) {
      onSelectMonth(0, currentYear + 1);
    } else {
      onSelectMonth(currentMonth + 1, currentYear);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[
            styles.navButton,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
          onPress={handlePrev}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View
          style={[
            styles.currentMonthBadge,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Calendar size={16} color={colors.accentBlue} style={{ marginRight: 6 }} />
          <Text style={[styles.monthText, { color: colors.textPrimary }]}>
            {MONTH_NAMES_RU[currentMonth]}{' '}
            <Text style={[styles.yearText, { color: colors.textSecondary }]}>{currentYear}</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.navButton,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {MONTH_NAMES_RU.map((monthName, index) => {
          const isSelected = index === currentMonth;
          return (
            <TouchableOpacity
              key={monthName}
              style={[
                styles.chip,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                isSelected && {
                  backgroundColor: colors.accentBlue,
                  borderColor: colors.accentBlue,
                },
              ]}
              onPress={() => onSelectMonth(index, currentYear)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {monthName.slice(0, 3)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  currentMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
  },
  yearText: {
    fontSize: 14,
    fontWeight: '400',
  },
  scrollContainer: {
    paddingHorizontal: 14,
    gap: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
