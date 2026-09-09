import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { Bank } from '../types';
import { StorageService } from '../services/storage';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { confirmDialog, showCustomAlert } from '../utils/alert';
import { Plus, CreditCard, X, Check, Trash2, RotateCcw } from 'lucide-react-native';

const PRESET_COLORS = [
  '#FFDD2D', // Yellow
  '#21A038', // Green
  '#EF3124', // Red
  '#002882', // Blue
  '#FC3F1D', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#475569', // Slate
];

export const CardsManagementScreen: React.FC = () => {
  const { colors } = useTheme();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [newBankName, setNewBankName] = useState<string>('');
  const [newBankShort, setNewBankShort] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);

  const loadBanks = async () => {
    const data = await StorageService.getBanks();
    setBanks(data);
  };

  useEffect(() => {
    loadBanks();
  }, []);

  const handleToggle = async (bankId: string) => {
    const updated = await StorageService.toggleBankActive(bankId);
    setBanks(updated);
  };

  const handleDeleteBank = (bank: Bank) => {
    confirmDialog(
      'Удалить банк',
      `Удалить банк "${bank.name}" из списка? Вы сможете восстановить его в любой момент.`,
      async () => {
        const updated = await StorageService.deleteBank(bank.id);
        setBanks(updated);
      }
    );
  };

  const handleRestoreDefaults = () => {
    confirmDialog(
      'Восстановить банки',
      'Вернуть все стандартные российские банки в список?',
      async () => {
        const updated = await StorageService.restoreDefaultBanks();
        setBanks(updated);
        showCustomAlert('Успех', 'Стандартные банки восстановлены!');
      }
    );
  };

  const handleAddCustomBank = async () => {
    if (!newBankName.trim()) {
      showCustomAlert('Ошибка', 'Введите название банка');
      return;
    }

    const newBank: Bank = {
      id: `custom-${Date.now()}`,
      name: newBankName.trim(),
      shortName: newBankShort.trim() || newBankName.trim().slice(0, 8),
      primaryColor: selectedColor,
      textColor: selectedColor === '#FFDD2D' ? '#1A1A1A' : '#FFFFFF',
      iconName: 'CreditCard',
      isActive: true,
    };

    const updated = await StorageService.addCustomBank(newBank);
    setBanks(updated);
    setModalVisible(false);
    setNewBankName('');
    setNewBankShort('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Мои банки и карты"
        subtitle="Настройте список используемых банков"
        rightAction={{
          icon: <Plus size={20} color={colors.accentBlue} />,
          onPress: () => setModalVisible(true),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Активные банки ({banks.filter((b) => b.isActive).length})
        </Text>

        <View style={styles.banksList}>
          {banks.map((bank) => (
            <View
              key={bank.id}
              style={[
                styles.bankRow,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.bankLeft}>
                <View
                  style={[styles.bankColorDot, { backgroundColor: bank.primaryColor }]}
                />
                <View style={styles.bankTextWrap}>
                  <Text style={[styles.bankName, { color: colors.textPrimary }]}>
                    {bank.name}
                  </Text>
                  <Text style={[styles.bankShortName, { color: colors.textSecondary }]}>
                    Короткое: {bank.shortName}
                  </Text>
                </View>
              </View>

              <View style={styles.bankActions}>
                <Switch
                  value={bank.isActive}
                  onValueChange={() => handleToggle(bank.id)}
                  trackColor={{ false: colors.cardBorder, true: colors.accentBlue }}
                  thumbColor={bank.isActive ? '#FFFFFF' : colors.textMuted}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteBank(bank)}
                  style={[styles.deleteBtn, { borderColor: colors.cardBorder }]}
                  activeOpacity={0.7}
                >
                  <Trash2 size={15} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.addBankBtn,
            { backgroundColor: colors.card, borderColor: colors.accentBlue },
          ]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color={colors.accentBlue} style={{ marginRight: 8 }} />
          <Text style={[styles.addBankBtnText, { color: colors.accentBlue }]}>
            Добавить свой банк / карту
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.restoreBtn,
            { borderColor: colors.cardBorder, backgroundColor: colors.card },
          ]}
          onPress={handleRestoreDefaults}
          activeOpacity={0.8}
        >
          <RotateCcw size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.restoreBtnText, { color: colors.textSecondary }]}>
            Восстановить банки по умолчанию
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Custom Bank Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Новый банк или карта
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Полное название банка:
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Например: Промсвязьбанк"
                placeholderTextColor={colors.textMuted}
                value={newBankName}
                onChangeText={setNewBankName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Краткое имя (для бейджей):
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Например: ПСБ"
                placeholderTextColor={colors.textMuted}
                value={newBankShort}
                onChangeText={setNewBankShort}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Цвет карты/бренда:
              </Text>
              <View style={styles.colorPalette}>
                {PRESET_COLORS.map((color) => {
                  const isSelected = selectedColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        isSelected && styles.colorCircleSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {isSelected && (
                        <Check
                          size={14}
                          color={color === '#FFDD2D' ? '#000' : '#FFF'}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBankBtn, { backgroundColor: colors.accentBlue }]}
              onPress={handleAddCustomBank}
            >
              <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveBankBtnText}>Сохранить банк</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  banksList: {
    gap: 10,
    marginBottom: 20,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  bankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  bankTextWrap: {
    flex: 1,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '700',
  },
  bankShortName: {
    fontSize: 12,
    marginTop: 2,
  },
  addBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  addBankBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  saveBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  saveBankBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bankActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
