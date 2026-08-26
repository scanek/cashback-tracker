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
import { Bank, MonthlyCashback, ScanResult, CashbackItem } from '../types';
import { MONTH_NAMES_RU } from '../constants/banks';
import {
  X,
  Check,
  Trash2,
  Plus,
  Sparkles,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

const SHORT_MONTHS_RU = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
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
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [items, setItems] = useState<CashbackItem[]>([]);

  useEffect(() => {
    if (scanResult) {
      // Find matching bank
      const matched = banks.find(
        (b) =>
          b.id === scanResult.bankId ||
          b.name.toLowerCase().includes(scanResult.bankName.toLowerCase()) ||
          b.shortName.toLowerCase().includes(scanResult.bankName.toLowerCase())
      );
      setSelectedBankId(matched ? matched.id : banks[0]?.id || 'tbank');

      // Month & Year
      setMonth(typeof scanResult.month === 'number' ? scanResult.month : new Date().getMonth());
      setYear(typeof scanResult.year === 'number' ? scanResult.year : new Date().getFullYear());

      // Items
      setItems(
        scanResult.items.map((item, idx) => ({
          id: `${Date.now()}-${idx}`,
          category: item.category,
          percent: item.percent,
          note: item.note,
        }))
      );
    }
  }, [scanResult, visible]);

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
        category: 'Новая категория',
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
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkles size={20} color="#FFDD2D" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.title}>Результаты распознавания</Text>
                <Text style={styles.subtitle}>Проверьте и подтвердите категории</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Bank Selector */}
            <View style={styles.metaCard}>
              <Text style={styles.label}>Определенный банк (нажмите для смены):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankPicker}>
                {banks.map((b) => {
                  const isSelected = b.id === selectedBankId;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.bankChip,
                        { borderColor: b.primaryColor },
                        isSelected && { backgroundColor: b.primaryColor },
                      ]}
                      onPress={() => setSelectedBankId(b.id)}
                    >
                      <Text
                        style={[
                          styles.bankChipText,
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
                <Text style={styles.label}>Месяц сохранения:</Text>
                <View style={styles.yearControl}>
                  <TouchableOpacity
                    style={styles.yearBtn}
                    onPress={() => setYear(year - 1)}
                  >
                    <ChevronLeft size={16} color="#38BDF8" />
                  </TouchableOpacity>
                  <Text style={styles.yearText}>{year}</Text>
                  <TouchableOpacity
                    style={styles.yearBtn}
                    onPress={() => setYear(year + 1)}
                  >
                    <ChevronRight size={16} color="#38BDF8" />
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
                        isCurrent && styles.monthChipActive,
                      ]}
                      onPress={() => setMonth(idx)}
                    >
                      <Text
                        style={[
                          styles.monthChipText,
                          isCurrent && styles.monthChipTextActive,
                        ]}
                      >
                        {mName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.selectedMonthSummary}>
                <Calendar size={14} color="#FFDD2D" style={{ marginRight: 6 }} />
                <Text style={styles.selectedMonthSummaryText}>
                  Кэшбэк запишется на: <Text style={{ color: '#FFDD2D', fontWeight: '700' }}>{MONTH_NAMES_RU[month]} {year}</Text>
                </Text>
              </View>
            </View>

            {/* Recognized Items List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Категории кэшбэка ({items.length})</Text>
              <TouchableOpacity style={styles.addSmallBtn} onPress={handleAddItem}>
                <Plus size={14} color="#38BDF8" style={{ marginRight: 4 }} />
                <Text style={styles.addSmallBtnText}>Добавить</Text>
              </TouchableOpacity>
            </View>

            {items.map((item) => (
              <View key={item.id} style={styles.itemEditRow}>
                <View style={styles.percentInputWrap}>
                  <TextInput
                    style={styles.percentInput}
                    value={item.percent.toString()}
                    keyboardType="numeric"
                    onChangeText={(val) =>
                      handleUpdateItem(item.id, 'percent', parseFloat(val) || 0)
                    }
                  />
                  <Text style={styles.percentSign}>%</Text>
                </View>

                <View style={styles.categoryInputWrap}>
                  <TextInput
                    style={styles.categoryInput}
                    value={item.category}
                    placeholder="Название категории"
                    placeholderTextColor="#64748B"
                    onChangeText={(val) => handleUpdateItem(item.id, 'category', val)}
                  />
                  <TextInput
                    style={styles.noteInput}
                    value={item.note || ''}
                    placeholder="Примечание (необязательно)"
                    placeholderTextColor="#475569"
                    onChangeText={(val) => handleUpdateItem(item.id, 'note', val)}
                  />
                </View>

                <TouchableOpacity
                  style={styles.deleteItemBtn}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            {items.length === 0 && (
              <View style={styles.emptyItems}>
                <AlertTriangle size={24} color="#F59E0B" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyItemsText}>
                  Не удалось распознать категории автоматически.
                </Text>
                <TouchableOpacity style={styles.addManualBtn} onPress={handleAddItem}>
                  <Text style={styles.addManualBtnText}>Добавить вручную</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
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
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    padding: 16,
  },
  metaCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
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
    backgroundColor: '#0F172A',
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  yearControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  yearBtn: {
    padding: 4,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginHorizontal: 6,
  },
  monthPicker: {
    marginBottom: 8,
  },
  monthPickerContent: {
    paddingVertical: 2,
  },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    marginRight: 6,
  },
  monthChipActive: {
    backgroundColor: '#FFDD2D',
    borderColor: '#FFDD2D',
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  monthChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  selectedMonthSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 221, 45, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 221, 45, 0.2)',
  },
  selectedMonthSummaryText: {
    fontSize: 12,
    color: '#F8FAFC',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  addSmallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  itemEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  percentInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  percentInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#38BDF8',
    minWidth: 26,
    textAlign: 'center',
    padding: 0,
  },
  percentSign: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
  },
  categoryInputWrap: {
    flex: 1,
  },
  categoryInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    padding: 0,
    marginBottom: 4,
  },
  noteInput: {
    fontSize: 11,
    color: '#94A3B8',
    padding: 0,
  },
  deleteItemBtn: {
    padding: 6,
  },
  emptyItems: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 12,
  },
  addManualBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addManualBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFDD2D',
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
