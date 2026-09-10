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
import { useTheme } from '../context/ThemeContext';
import { X, Plus, Trash2, Check, Sparkles } from 'lucide-react-native';

interface AddCashbackModalProps {
  visible: boolean;
  bank: Bank | null;
  month: number;
  year: number;
  initialCashback?: MonthlyCashback;
  onClose: () => void;
  onSave: (cashback: MonthlyCashback) => void;
  onDelete?: () => void;
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
  onDelete,
}) => {
  const { colors } = useTheme();
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
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Top Bar */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{bank.name}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Кэшбэк на {MONTH_NAMES_RU[month]} {year}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.inputBackground }]}
              onPress={onClose}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Current Added Items */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Категории кэшбэка ({items.length})
            </Text>
            {items.length === 0 ? (
              <Text style={[styles.emptyItemsText, { color: colors.textMuted }]}>
                Добавьте хотя бы одну категорию ниже
              </Text>
            ) : (
              <View style={styles.itemsList}>
                {items.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
                    ]}
                  >
                    <View
                      style={[
                        styles.itemBadge,
                        { backgroundColor: colors.badgeBackground, borderColor: colors.accentBlue },
                      ]}
                    >
                      <Text style={[styles.itemPercentText, { color: colors.accentBlue }]}>
                        {item.percent}%
                      </Text>
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={[styles.itemCategory, { color: colors.textPrimary }]}>
                        {item.category}
                      </Text>
                      {item.note ? (
                        <Text style={[styles.itemNote, { color: colors.textSecondary }]}>
                          {item.note}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteItemBtn}
                      onPress={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 size={16} color={colors.accentRed} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Form to Add New Category */}
            <View
              style={[
                styles.addFormCard,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                Добавить категорию
              </Text>

              {/* Quick Category Chips */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Выберите из частых:
              </Text>
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
                      style={[
                        styles.chip,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        isSelected && [
                          styles.chipActive,
                          { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
                        ],
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat.name);
                        setCustomCategory('');
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: colors.textSecondary },
                          isSelected && styles.chipTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Custom Category Input */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Или введите свою категорию (напр. 'Цветы')"
                placeholderTextColor={colors.textMuted}
                value={customCategory}
                onChangeText={(text) => {
                  setCustomCategory(text);
                  setSelectedCategory('');
                }}
              />

              {/* Percent Selector */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Процент кэшбэка:
              </Text>
              <View style={styles.percentRow}>
                {COMMON_PERCENTS.map((pct) => {
                  const isSelected = selectedPercent === pct && !customPercent;
                  return (
                    <TouchableOpacity
                      key={pct}
                      style={[
                        styles.percentBtn,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        isSelected && [
                          styles.percentBtnActive,
                          { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
                        ],
                      ]}
                      onPress={() => {
                        setSelectedPercent(pct);
                        setCustomPercent('');
                      }}
                    >
                      <Text
                        style={[
                          styles.percentBtnText,
                          { color: colors.textSecondary },
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
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                    marginTop: 8,
                  },
                ]}
                placeholder="Или свой % (напр. 25)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={customPercent}
                onChangeText={setCustomPercent}
              />

              {/* Note / Condition */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Примечание (напр. 'до 3000 ₽' или 'в Яндекс Еде')"
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity
                style={[styles.addCategoryAction, { backgroundColor: colors.accent }]}
                onPress={handleAddItem}
              >
                <Plus size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.addCategoryActionText}>Добавить в список</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Save & Delete Buttons */}
          <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
            {onDelete && initialCashback && (
              <TouchableOpacity
                style={[
                  styles.clearAllBtn,
                  {
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                  },
                ]}
                onPress={() => {
                  onDelete();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.clearAllBtnText}>Очистить</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accent, flex: 1 }]}
              onPress={handleSaveAll}
              activeOpacity={0.8}
            >
              <Check size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Сохранить</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyItemsText: {
    fontSize: 13,
    marginBottom: 12,
  },
  itemsList: {
    gap: 8,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 1,
  },
  itemPercentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemNote: {
    fontSize: 11,
  },
  deleteItemBtn: {
    padding: 6,
  },
  addFormCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryChips: {
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {},
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  percentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  percentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 42,
    alignItems: 'center',
  },
  percentBtnActive: {},
  percentBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  percentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  addCategoryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  addCategoryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  clearAllBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
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
