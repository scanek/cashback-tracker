import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Bank, MonthlyCashback, CashbackItem } from '../types';
import { STANDARD_CATEGORIES } from '../constants/categories';
import { MONTH_NAMES_RU } from '../constants/banks';
import { X, Plus, Trash2, Check, Sparkles } from 'lucide-react-native';

interface AddCashbackModalProps {
  visible: boolean;
  bank: Bank | null;
  month: number;
  year: number;
  initialCashback?: MonthlyCashback;
  onClose: () => void;
  onSave: (cashback: MonthlyCashback) => void;
}

const COMMON_PERCENTS = [1, 3, 5, 6, 7, 10, 15, 20];

export const AddCashbackModal: React.FC<AddCashbackModalProps> = ({
  visible,
  bank,
  month,
  year,
  initialCashback,
  onClose,
  onSave,
}) => {
  const [items, setItems] = useState<CashbackItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedPercent, setSelectedPercent] = useState<number>(5);
  const [customPercent, setCustomPercent] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialCashback?.items) {
      setItems([...initialCashback.items]);
    } else {
      setItems([
        { id: 'default-all', category: '1% на все покупки', percent: 1 },
      ]);
    }
  }, [initialCashback, visible]);

  if (!bank) return null;

  const handleAddItem = () => {
    const categoryName = customCategory.trim() || selectedCategory;
    const percentValue = customPercent ? parseFloat(customPercent) : selectedPercent;

    if (!categoryName) return;

    const newItem: CashbackItem = {
      id: Date.now().toString(),
      category: categoryName,
      percent: isNaN(percentValue) ? 5 : percentValue,
      note: note.trim() || undefined,
    };

    setItems([...items, newItem]);
    setSelectedCategory('');
    setCustomCategory('');
    setNote('');
    setCustomPercent('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleSaveAll = () => {
    const cashback: MonthlyCashback = {
      id: initialCashback?.id || `${bank.id}-${month}-${year}`,
      bankId: bank.id,
      month,
      year,
      items,
      updatedAt: new Date().toISOString(),
    };
    onSave(cashback);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalContent}>
          {/* Top Bar */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{bank.name}</Text>
              <Text style={styles.subtitle}>
                Кэшбэк на {MONTH_NAMES_RU[month]} {year}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Current Added Items */}
            <Text style={styles.sectionTitle}>Категории кэшбэка ({items.length})</Text>
            {items.length === 0 ? (
              <Text style={styles.emptyItemsText}>Добавьте хотя бы одну категорию ниже</Text>
            ) : (
              <View style={styles.itemsList}>
                {items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemPercentText}>{item.percent}%</Text>
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Form to Add New Category */}
            <View style={styles.addFormCard}>
              <Text style={styles.formTitle}>Добавить категорию</Text>

              {/* Quick Category Chips */}
              <Text style={styles.inputLabel}>Выберите из частых:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChips}
              >
                {STANDARD_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => {
                        setSelectedCategory(cat.name);
                        setCustomCategory('');
                      }}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Custom Category Input */}
              <TextInput
                style={styles.input}
                placeholder="Или введите свою категорию (напр. 'Цветы')"
                placeholderTextColor="#64748B"
                value={customCategory}
                onChangeText={(text) => {
                  setCustomCategory(text);
                  setSelectedCategory('');
                }}
              />

              {/* Percent Selector */}
              <Text style={styles.inputLabel}>Процент кэшбэка:</Text>
              <View style={styles.percentRow}>
                {COMMON_PERCENTS.map((pct) => {
                  const isSelected = selectedPercent === pct && !customPercent;
                  return (
                    <TouchableOpacity
                      key={pct}
                      style={[styles.percentBtn, isSelected && styles.percentBtnActive]}
                      onPress={() => {
                        setSelectedPercent(pct);
                        setCustomPercent('');
                      }}
                    >
                      <Text
                        style={[
                          styles.percentBtnText,
                          isSelected && styles.percentBtnTextActive,
                        ]}
                      >
                        {pct}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Или свой % (напр. 25)"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={customPercent}
                onChangeText={setCustomPercent}
              />

              {/* Note / Condition */}
              <TextInput
                style={styles.input}
                placeholder="Примечание (напр. 'до 3000 ₽' или 'в Яндекс Еде')"
                placeholderTextColor="#64748B"
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity style={styles.addCategoryAction} onPress={handleAddItem}>
                <Plus size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.addCategoryActionText}>Добавить в список</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll}>
              <Check size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Сохранить кэшбэк на месяц</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  itemsList: {
    gap: 8,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  itemPercentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  itemNote: {
    fontSize: 11,
    color: '#94A3B8',
  },
  deleteBtn: {
    padding: 6,
  },
  addFormCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
    marginTop: 6,
  },
  categoryChips: {
    gap: 6,
    paddingBottom: 8,
  },
  chip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  chipText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  chipTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
    marginTop: 8,
  },
  percentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  percentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  percentBtnActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  percentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  percentBtnTextActive: {
    color: '#0F172A',
  },
  addCategoryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  addCategoryActionText: {
    fontSize: 14,
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
