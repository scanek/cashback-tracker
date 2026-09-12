import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { Bank, MonthlyCashback, CashbackItem, ScanResult } from '../types';
import { MONTH_NAMES_RU } from '../constants/banks';
import { useTheme } from '../context/ThemeContext';
import { resolveBankId } from '../services/gemini';
import {
  X,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

const SHORT_MONTHS_RU = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

interface ScanReviewModalProps {
  visible: boolean;
  scanResult: ScanResult | null;
  imageUri?: string;
  banks: Bank[];
  onClose: () => void;
  onConfirm: (cashback: MonthlyCashback) => void;
}

export const ScanReviewModal: React.FC<ScanReviewModalProps> = ({
  visible,
  scanResult,
  imageUri,
  banks,
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [items, setItems] = useState<CashbackItem[]>([]);
  const [showImagePreview, setShowImagePreview] = useState<boolean>(false);

  useEffect(() => {
    if (scanResult) {
      const resolved = resolveBankId(scanResult.bankName, scanResult.bankId);
      setSelectedBankId(resolved.id);

      if (typeof scanResult.month === 'number' && scanResult.month >= 0 && scanResult.month <= 11) {
        setMonth(scanResult.month);
      } else {
        setMonth(new Date().getMonth());
      }

      if (scanResult.year && scanResult.year >= 2020) {
        setYear(scanResult.year);
      } else {
        setYear(new Date().getFullYear());
      }

      if (scanResult.items && scanResult.items.length > 0) {
        setItems(
          scanResult.items.map((it, idx) => ({
            ...it,
            id: `item-${idx}-${Date.now()}`,
          }))
        );
        setShowImagePreview(false);
      } else {
        setItems([]);
        setShowImagePreview(Boolean(imageUri));
      }
    }
  }, [scanResult, visible, banks, imageUri]);

  if (!scanResult) return null;

  const handleUpdateItem = (id: string, field: keyof CashbackItem, value: any) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        category: '',
        percent: 5,
      },
    ]);
  };

  const handleSave = () => {
    const finalBank = banks.find((b) => b.id === selectedBankId) || banks[0];
    const cashback: MonthlyCashback = {
      id: `${finalBank.id}-${month}-${year}`,
      bankId: finalBank.id,
      month,
      year,
      items,
      updatedAt: new Date().toISOString(),
    };
    onConfirm(cashback);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerLeft}>
              <Sparkles size={20} color={colors.accent} style={{ marginRight: 8 }} />
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Результаты распознавания
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Проверьте и подтвердите категории
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Image Preview Toggle */}
            {imageUri && (
              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: colors.inputBackground,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}
                  onPress={() => setShowImagePreview(!showImagePreview)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                    {showImagePreview ? '📷 Скрыть скриншот' : '📷 Показать загруженный скриншот'}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accentBlue }}>
                    {showImagePreview ? '▲ Свернуть' : '▼ Развернуть'}
                  </Text>
                </TouchableOpacity>

                {showImagePreview && (
                  <View
                    style={{
                      marginTop: 8,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      backgroundColor: '#0F172A',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: '100%', height: 260 }}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>
            )}

            {/* Bank Selector */}
            <View
              style={[
                styles.metaCard,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Определенный банк (нажмите для смены):
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankPicker}>
                {banks.map((b) => {
                  const isSelected = b.id === selectedBankId;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.bankChip,
                        { borderColor: b.primaryColor, backgroundColor: colors.card },
                        isSelected && { backgroundColor: b.primaryColor },
                      ]}
                      onPress={() => setSelectedBankId(b.id)}
                    >
                      <Text
                        style={[
                          styles.bankChipText,
                          { color: colors.textPrimary },
                          isSelected && { color: b.textColor, fontWeight: '700' },
                        ]}
                      >
                        {b.shortName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Interactive Month & Year Picker */}
              <View style={styles.monthHeaderRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Месяц сохранения:
                </Text>
                <View style={styles.yearControl}>
                  <TouchableOpacity
                    style={[styles.yearBtn, { backgroundColor: colors.card }]}
                    onPress={() => setYear(year - 1)}
                  >
                    <ChevronLeft size={16} color={colors.accentBlue} />
                  </TouchableOpacity>
                  <Text style={[styles.yearText, { color: colors.textPrimary }]}>{year}</Text>
                  <TouchableOpacity
                    style={[styles.yearBtn, { backgroundColor: colors.card }]}
                    onPress={() => setYear(year + 1)}
                  >
                    <ChevronRight size={16} color={colors.accentBlue} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Month Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.monthPicker}
                contentContainerStyle={styles.monthPickerContent}
              >
                {SHORT_MONTHS_RU.map((mName, idx) => {
                  const isCurrent = idx === month;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.monthChip,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        isCurrent && [
                          styles.monthChipActive,
                          { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
                        ],
                      ]}
                      onPress={() => setMonth(idx)}
                    >
                      <Text
                        style={[
                          styles.monthChipText,
                          { color: colors.textSecondary },
                          isCurrent && styles.monthChipTextActive,
                        ]}
                      >
                        {mName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View
                style={[
                  styles.selectedMonthSummary,
                  { backgroundColor: colors.badgeBackground, borderColor: colors.accentBlue },
                ]}
              >
                <Calendar size={14} color={colors.accentBlue} style={{ marginRight: 6 }} />
                <Text style={[styles.selectedMonthSummaryText, { color: colors.textPrimary }]}>
                  Кэшбэк запишется на:{' '}
                  <Text style={{ color: colors.accentBlue, fontWeight: '700' }}>
                    {MONTH_NAMES_RU[month]} {year}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Recognized Items List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Категории кэшбэка ({items.length})
              </Text>
              <TouchableOpacity style={styles.addSmallBtn} onPress={handleAddItem}>
                <Plus size={14} color={colors.accentBlue} style={{ marginRight: 4 }} />
                <Text style={[styles.addSmallBtnText, { color: colors.accentBlue }]}>Добавить</Text>
              </TouchableOpacity>
            </View>

            {items.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.itemEditRow,
                  { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
                ]}
              >
                <View
                  style={[
                    styles.percentInputWrap,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <TextInput
                    style={[styles.percentInput, { color: colors.textPrimary }]}
                    value={item.percent.toString()}
                    keyboardType="numeric"
                    onChangeText={(val) =>
                      handleUpdateItem(item.id, 'percent', parseFloat(val) || 0)
                    }
                  />
                  <Text style={[styles.percentSign, { color: colors.textSecondary }]}>%</Text>
                </View>

                <View style={styles.categoryInputWrap}>
                  <TextInput
                    style={[
                      styles.categoryInput,
                      { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary },
                    ]}
                    value={item.category}
                    placeholder="Название категории"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(val) => handleUpdateItem(item.id, 'category', val)}
                  />
                  <TextInput
                    style={[
                      styles.noteInput,
                      { backgroundColor: colors.card, borderColor: colors.inputBorder, color: colors.textPrimary },
                    ]}
                    value={item.note || ''}
                    placeholder="Примечание (необязательно)"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(val) => handleUpdateItem(item.id, 'note', val)}
                  />
                </View>

                <TouchableOpacity
                  style={styles.deleteItemBtn}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Trash2 size={18} color={colors.accentRed} />
                </TouchableOpacity>
              </View>
            ))}

            {items.length === 0 && (
              <View
                style={[
                  styles.emptyItems,
                  { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
                ]}
              >
                <AlertTriangle size={24} color="#F59E0B" style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyItemsText, { color: colors.textPrimary }]}>
                  Не удалось распознать категории автоматически.
                </Text>
                <TouchableOpacity style={styles.addManualBtn} onPress={handleAddItem}>
                  <Text style={[styles.addManualBtnText, { color: colors.accentBlue }]}>
                    Добавить вручную
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accent }]}
              onPress={handleSave}
            >
              <Check size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>
                Сохранить кэшбэк ({MONTH_NAMES_RU[month]})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    padding: 16,
  },
  metaCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  bankPicker: {
    marginBottom: 8,
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 6,
  },
  yearControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yearBtn: {
    padding: 4,
    borderRadius: 6,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '700',
  },
  monthPicker: {
    marginBottom: 10,
  },
  monthPickerContent: {
    gap: 6,
  },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  monthChipActive: {},
  monthChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectedMonthSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  selectedMonthSummaryText: {
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addSmallBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  percentInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
    minWidth: 54,
    justifyContent: 'center',
  },
  percentInput: {
    fontSize: 14,
    fontWeight: '800',
    padding: 0,
    textAlign: 'center',
  },
  percentSign: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  categoryInputWrap: {
    flex: 1,
    gap: 4,
  },
  categoryInput: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  noteInput: {
    fontSize: 11,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteItemBtn: {
    padding: 8,
    marginLeft: 6,
  },
  emptyItems: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyItemsText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  addManualBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addManualBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
