import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Bank, MonthlyCashback, CashbackItem } from '../types';
import { MONTH_NAMES_RU } from '../constants/banks';
import { ShareService, SharedPayload } from '../services/share';
import { StorageService } from '../services/storage';
import {
  X,
  Check,
  Download,
  Clipboard,
  Calendar,
  Sparkles,
  AlertCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

interface ImportCashbackModalProps {
  visible: boolean;
  banks: Bank[];
  onClose: () => void;
  onImportComplete: () => void;
}

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

export const ImportCashbackModal: React.FC<ImportCashbackModalProps> = ({
  visible,
  banks,
  onClose,
  onImportComplete,
}) => {
  const [rawText, setRawText] = useState<string>('');
  const [parsedData, setParsedData] = useState<SharedPayload | null>(null);
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth());
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [mergeMode, setMergeMode] = useState<'replace' | 'merge'>('replace');

  useEffect(() => {
    if (!visible) {
      setRawText('');
      setParsedData(null);
    }
  }, [visible]);

  const handleTextChange = (text: string) => {
    setRawText(text);
    const parsed = ShareService.parseCode(text);
    if (parsed) {
      setParsedData(parsed);
      setTargetMonth(parsed.month);
      setTargetYear(parsed.year);
    } else {
      setParsedData(null);
    }
  };

  const handleApplyImport = async () => {
    if (!parsedData) {
      Alert.alert('Ошибка', 'Вставьте корректный код или сообщение с кэшбэком (начинается с CBHUB:...)');
      return;
    }

    try {
      if (parsedData.type === 'single_bank' && parsedData.bankId && parsedData.items) {
        const bankId = parsedData.bankId;
        const currentCashbacks: MonthlyCashback[] = await StorageService.getCashbacksForMonth(targetMonth, targetYear);
        const existing = currentCashbacks.find((c: MonthlyCashback) => c.bankId === bankId);

        let finalItems: CashbackItem[] = [];
        if (mergeMode === 'merge' && existing) {
          // Merge avoiding duplicates
          finalItems = [...existing.items];
          for (const newItem of parsedData.items) {
            if (!finalItems.some((ei) => ei.category.toLowerCase() === newItem.category.toLowerCase())) {
              finalItems.push(newItem);
            }
          }
        } else {
          finalItems = parsedData.items;
        }

        await StorageService.saveMonthlyCashback({
          id: `${bankId}-${targetMonth}-${targetYear}`,
          bankId: bankId,
          month: targetMonth,
          year: targetYear,
          items: finalItems,
          updatedAt: new Date().toISOString(),
        });
      } else if (parsedData.type === 'full_month' && parsedData.allCashbacks) {
        for (const cb of parsedData.allCashbacks) {
          await StorageService.saveMonthlyCashback({
            ...cb,
            id: `${cb.bankId}-${targetMonth}-${targetYear}`,
            month: targetMonth,
            year: targetYear,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      Alert.alert('Успешно!', `Категории кэшбэка импортированы на ${MONTH_NAMES_RU[targetMonth]} ${targetYear}!`);
      onImportComplete();
      onClose();
    } catch (e: any) {
      Alert.alert('Ошибка импорта', e.message || 'Не удалось сохранить импортированные категории');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Download size={20} color="#38BDF8" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.title}>Импорт кэшбэка</Text>
                <Text style={styles.subtitle}>Вставьте сообщение или код от другого пользователя</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Input Box */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Вставьте полученный текст или код CBHUB:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Вставьте сюда сообщение из Telegram / WhatsApp..."
                placeholderTextColor="#64748B"
                value={rawText}
                onChangeText={handleTextChange}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Parsing Status / Preview */}
            {parsedData ? (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Sparkles size={16} color="#FFDD2D" style={{ marginRight: 6 }} />
                  <Text style={styles.previewTitle}>
                    {parsedData.type === 'single_bank'
                      ? `Найден кэшбэк: ${parsedData.bankName || 'Банк'}`
                      : `Найден сводный кэшбэк (${parsedData.allCashbacks?.length || 0} банков)`}
                  </Text>
                </View>

                {/* Target Month & Year selection */}
                <View style={styles.monthHeaderRow}>
                  <Text style={styles.label}>Импортировать на месяц:</Text>
                  <View style={styles.yearControl}>
                    <TouchableOpacity
                      style={styles.yearBtn}
                      onPress={() => setTargetYear(targetYear - 1)}
                    >
                      <ChevronLeft size={16} color="#38BDF8" />
                    </TouchableOpacity>
                    <Text style={styles.yearText}>{targetYear}</Text>
                    <TouchableOpacity
                      style={styles.yearBtn}
                      onPress={() => setTargetYear(targetYear + 1)}
                    >
                      <ChevronRight size={16} color="#38BDF8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.monthPicker}
                >
                  {SHORT_MONTHS_RU.map((mName, idx) => {
                    const isCurrent = idx === targetMonth;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.monthChip,
                          isCurrent && styles.monthChipActive,
                        ]}
                        onPress={() => setTargetMonth(idx)}
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

                {/* Categories Preview */}
                <View style={styles.categoriesBox}>
                  {parsedData.type === 'single_bank' && parsedData.items && (
                    parsedData.items.map((item, idx) => (
                      <View key={idx} style={styles.previewItemRow}>
                        <View style={styles.percentBadge}>
                          <Text style={styles.percentBadgeText}>{item.percent}%</Text>
                        </View>
                        <Text style={styles.categoryName} numberOfLines={1}>
                          {item.category}
                        </Text>
                      </View>
                    ))
                  )}

                  {parsedData.type === 'full_month' && parsedData.allCashbacks && (
                    parsedData.allCashbacks.map((cb, idx) => {
                      const bank = banks.find((b) => b.id === cb.bankId);
                      return (
                        <View key={idx} style={styles.bankGroupWrap}>
                          <Text style={styles.bankGroupName}>{bank?.name || cb.bankId}:</Text>
                          {cb.items.map((item, cIdx) => (
                            <View key={cIdx} style={styles.previewItemRow}>
                              <View style={styles.percentBadge}>
                                <Text style={styles.percentBadgeText}>{item.percent}%</Text>
                              </View>
                              <Text style={styles.categoryName} numberOfLines={1}>
                                {item.category}
                              </Text>
                            </View>
                          ))}
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Merge mode selector for single bank */}
                {parsedData.type === 'single_bank' && (
                  <View style={styles.modeRow}>
                    <TouchableOpacity
                      style={[
                        styles.modeBtn,
                        mergeMode === 'replace' && styles.modeBtnActive,
                      ]}
                      onPress={() => setMergeMode('replace')}
                    >
                      <Text
                        style={[
                          styles.modeBtnText,
                          mergeMode === 'replace' && styles.modeBtnTextActive,
                        ]}
                      >
                        Заменить категории
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeBtn,
                        mergeMode === 'merge' && styles.modeBtnActive,
                      ]}
                      onPress={() => setMergeMode('merge')}
                    >
                      <Text
                        style={[
                          styles.modeBtnText,
                          mergeMode === 'merge' && styles.modeBtnTextActive,
                        ]}
                      >
                        Объединить
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : rawText.trim().length > 0 ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorBoxText}>
                  В тексте не найден код кэшбэка (CBHUB:...). Убедитесь, что скопировали всё сообщение целиком.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.applyBtn, !parsedData && styles.applyBtnDisabled]}
              onPress={handleApplyImport}
              disabled={!parsedData}
            >
              <Check size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.applyBtnText}>
                {parsedData
                  ? `Импортировать в ${MONTH_NAMES_RU[targetMonth]}`
                  : 'Ожидание кода...'}
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
    maxHeight: '85%',
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 13,
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#334155',
    textAlignVertical: 'top',
  },
  previewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
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
    marginBottom: 12,
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
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
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
  categoriesBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  previewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  percentBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  categoryName: {
    fontSize: 13,
    color: '#F8FAFC',
    flex: 1,
  },
  bankGroupWrap: {
    marginBottom: 8,
  },
  bankGroupName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFDD2D',
    marginBottom: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeBtnActive: {
    backgroundColor: '#1E293B',
    borderColor: '#FFDD2D',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modeBtnTextActive: {
    color: '#FFDD2D',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBoxText: {
    fontSize: 12,
    color: '#FCA5A5',
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
