import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { MONTH_NAMES_RU } from '../constants/banks';

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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.navButton} onPress={handlePrev} activeOpacity={0.7}>
          <ChevronLeft size={20} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.currentMonthBadge}>
          <Calendar size={16} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.monthText}>
            {MONTH_NAMES_RU[currentMonth]} <Text style={styles.yearText}>{currentYear}</Text>
          </Text>
        </View>

        <TouchableOpacity style={styles.navButton} onPress={handleNext} activeOpacity={0.7}>
          <ChevronRight size={20} color="#94A3B8" />
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
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectMonth(index, currentYear)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
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
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
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
    borderRadius: 17,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  yearText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
  },
  scrollContainer: {
    paddingHorizontal: 14,
    gap: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  chipSelected: {
    backgroundColor: '#38BDF8',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
