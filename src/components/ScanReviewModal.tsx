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
import { X, Check, Trash2, Plus, Sparkles, AlertTriangle } from 'lucide-react-native';

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
      let matched = banks.find((b) => b.id === scanResult.bankId);
      if (!matched && scanResult.bankName) {
        matched = banks.find(
          (b) =>
            b.name.toLowerCase().includes(scanResult.bankName.toLowerCase()) ||
            scanResult.bankName.toLowerCase().includes(b.shortName.toLowerCase())
        );
      }
      setSelectedBankId(matched ? matched.id : banks[0]?.id || 'tbank');

      setMonth(typeof scanResult.month === 'number' ? scanResult.month : new Date().getMonth());
      setYear(typeof scanResult.year === 'number' ? scanResult.year : new Date().getFullYear());

      setItems(
        (scanResult.items || []).map((item, idx) => ({
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
            {/* Image Preview & Bank Match */}
            <View style={styles.metaCard}>
              <Text style={styles.label}>Определенный банк:</Text>
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

              <Text style={[styles.label, { marginTop: 12 }]}>Месяц начисления:</Text>
              <View style={styles.monthRow}>
                <Text style={styles.monthValue}>
                  {MONTH_NAMES_RU[month]} {year}
                </Text>
              </View>
            </View>

            {/* Recognized Items List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Распознанные категории ({items.length})</Text>
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
                    onChangeText={(val) => handleUpdateItem(item.id, 'category', val)}
                    placeholder="Название категории"
                    placeholderTextColor="#64748B"
                  />
                  <TextInput
                    style={styles.noteInput}
                    value={item.note || ''}
                    onChangeText={(val) => handleUpdateItem(item.id, 'note', val)}
                    placeholder="Условие / Лимит (необязательно)"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <TouchableOpacity
                  style={styles.deleteItemBtn}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Check size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>
                Сохранить в {MONTH_NAMES_RU[month]}
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    padding: 16,
  },
  metaCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 16,
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
    flexDirection: 'row',
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    marginRight: 8,
    backgroundColor: '#0F172A',
  },
  bankChipText: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  monthRow: {
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  monthValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
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
    padding: 10,
    borderRadius: 12,
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
