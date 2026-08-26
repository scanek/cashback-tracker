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
  Alert,
} from 'react-native';
import { Bank } from '../types';
import { StorageService } from '../services/storage';
import { Header } from '../components/Header';
import { Plus, CreditCard, X, Check } from 'lucide-react-native';

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

  const handleAddCustomBank = async () => {
    if (!newBankName.trim()) {
      Alert.alert('Ошибка', 'Введите название банка');
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
    <View style={styles.container}>
      <Header
        title="Мои банки и карты"
        subtitle="Настройте список используемых банков"
        rightAction={{
          icon: <Plus size={20} color="#38BDF8" />,
          onPress: () => setModalVisible(true),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          Активные банки ({banks.filter((b) => b.isActive).length})
        </Text>

        <View style={styles.banksList}>
          {banks.map((bank) => (
            <View key={bank.id} style={styles.bankRow}>
              <View style={styles.bankLeft}>
                <View
                  style={[styles.bankColorDot, { backgroundColor: bank.primaryColor }]}
                />
                <View style={styles.bankTextWrap}>
                  <Text style={styles.bankName}>{bank.name}</Text>
                  <Text style={styles.bankShortName}>Короткое: {bank.shortName}</Text>
                </View>
              </View>

              <Switch
                value={bank.isActive}
                onValueChange={() => handleToggle(bank.id)}
                trackColor={{ false: '#334155', true: '#38BDF8' }}
                thumbColor={bank.isActive ? '#0F172A' : '#94A3B8'}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addBankBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#38BDF8" style={{ marginRight: 8 }} />
          <Text style={styles.addBankBtnText}>Добавить свой банк / карту</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Custom Bank Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новый банк или карта</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Полное название банка:</Text>
              <TextInput
                style={styles.input}
                placeholder="Например: Промсвязьбанк"
                placeholderTextColor="#64748B"
                value={newBankName}
                onChangeText={setNewBankName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Краткое имя (для бейджей):</Text>
              <TextInput
                style={styles.input}
                placeholder="Например: ПСБ"
                placeholderTextColor="#64748B"
                value={newBankShort}
                onChangeText={setNewBankShort}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Цвет карты/бренда:</Text>
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

            <TouchableOpacity style={styles.saveBankBtn} onPress={handleAddCustomBank}>
              <Check size={18} color="#0F172A" style={{ marginRight: 6 }} />
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
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
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
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#F8FAFC',
  },
  bankShortName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  addBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  addBankBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#F8FAFC',
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
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
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  saveBankBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
