import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react-native';
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
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(currentYear);

  const realNow = new Date();
  const realCurrentMonth = realNow.getMonth();
  const realCurrentYear = realNow.getFullYear();
  const isCurrentMonthNow = currentMonth === realCurrentMonth && currentYear === realCurrentYear;

  const handleOpenPicker = () => {
    setPickerYear(currentYear);
    setPickerVisible(true);
  };

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

  const handleGoToToday = () => {
    onSelectMonth(realCurrentMonth, realCurrentYear);
    setPickerVisible(false);
  };

  const handleSelectFromPicker = (monthIndex: number) => {
    onSelectMonth(monthIndex, pickerYear);
    setPickerVisible(false);
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
          <ChevronLeft size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.centerWrap}>
          <TouchableOpacity
            style={[
              styles.currentMonthBadge,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={handleOpenPicker}
            activeOpacity={0.7}
          >
            <Calendar size={15} color={colors.accentBlue} style={{ marginRight: 6 }} />
            <Text style={[styles.monthText, { color: colors.textPrimary }]}>
              {MONTH_NAMES_RU[currentMonth]}{' '}
              <Text style={[styles.yearText, { color: colors.textSecondary }]}>{currentYear}</Text>
            </Text>
          </TouchableOpacity>

          {!isCurrentMonthNow && (
            <TouchableOpacity
              style={[
                styles.todayBtn,
                { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: colors.accentBlue },
              ]}
              onPress={handleGoToToday}
              activeOpacity={0.7}
            >
              <Text style={[styles.todayBtnText, { color: colors.accentBlue }]}>Сегодня</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.navButton,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Quick Month & Year Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Выберите период
              </Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Year Selector Row in Modal */}
            <View style={[styles.yearSelectorRow, { borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={[styles.yearNavBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                onPress={() => setPickerYear((y) => y - 1)}
                activeOpacity={0.7}
              >
                <ChevronLeft size={16} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={[styles.modalYearText, { color: colors.textPrimary }]}>
                {pickerYear} год
              </Text>

              <TouchableOpacity
                style={[styles.yearNavBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                onPress={() => setPickerYear((y) => y + 1)}
                activeOpacity={0.7}
              >
                <ChevronRight size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthsGrid}>
              {MONTH_NAMES_RU.map((monthName, index) => {
                const isSelected = index === currentMonth && pickerYear === currentYear;
                const isRealCurrent = index === realCurrentMonth && pickerYear === realCurrentYear;

                return (
                  <TouchableOpacity
                    key={monthName}
                    style={[
                      styles.gridItem,
                      { backgroundColor: colors.background, borderColor: colors.cardBorder },
                      isRealCurrent && { borderColor: colors.accentBlue },
                      isSelected && {
                        backgroundColor: colors.accentBlue,
                        borderColor: colors.accentBlue,
                      },
                    ]}
                    onPress={() => handleSelectFromPicker(index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.gridItemText,
                        { color: isRealCurrent ? colors.accentBlue : colors.textPrimary },
                        isSelected && styles.gridItemTextSelected,
                      ]}
                    >
                      {monthName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Jump to Today Button */}
            <TouchableOpacity
              style={[styles.modalTodayBtn, { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder }]}
              onPress={handleGoToToday}
              activeOpacity={0.7}
            >
              <Calendar size={14} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.modalTodayBtnText, { color: colors.textPrimary }]}>
                Перейти к текущему месяцу ({MONTH_NAMES_RU[realCurrentMonth]} {realCurrentYear})
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  currentMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  todayBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
  },
  yearText: {
    fontSize: 13,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  yearSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  yearNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalYearText: {
    fontSize: 15,
    fontWeight: '800',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '31%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalTodayBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
