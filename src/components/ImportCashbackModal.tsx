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
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Check,
  Download,
  Calendar,
  Sparkles,
  AlertCircle,
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
  const { colors } = useTheme();
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
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerLeft}>
              <Download size={20} color={colors.accentBlue} style={{ marginRight: 8 }} />
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Импорт кэшбэка
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Вставьте сообщение или код от другого пользователя
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Input Box */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Вставьте полученный текст или код CBHUB:
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Вставьте сюда сообщение из Telegram / WhatsApp..."
                placeholderTextColor={colors.textMuted}
                value={rawText}
                onChangeText={handleTextChange}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Parsing Status / Preview */}
            {parsedData ? (
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: colors.inputBackground, borderColor: colors.accentBlue },
                ]}
              >
                <View style={styles.previewHeader}>
                  <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                    {parsedData.type === 'single_bank'
                      ? `Найден кэшбэк: ${parsedData.bankName || 'Банк'}`
                      : `Найден сводный кэшбэк (${parsedData.allCashbacks?.length || 0} банков)`}
                  </Text>
                </View>

                {/* Target Month & Year selection */}
                <View style={styles.monthHeaderRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Импортировать на месяц:
                  </Text>
                  <View
                    style={[
                      styles.yearControl,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.yearBtn}
                      onPress={() => setTargetYear(targetYear - 1)}
                    >
                      <ChevronLeft size={16} color={colors.accentBlue} />
                    </TouchableOpacity>
                    <Text style={[styles.yearText, { color: colors.accentBlue }]}>
                      {targetYear}
                    </Text>
                    <TouchableOpacity
                      style={styles.yearBtn}
                      onPress={() => setTargetYear(targetYear + 1)}
                    >
                      <ChevronRight size={16} color={colors.accentBlue} />
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
                          { backgroundColor: colors.card, borderColor: colors.cardBorder },
                          isCurrent && [
                            styles.monthChipActive,
                            { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
                          ],
                        ]}
                        onPress={() => setTargetMonth(idx)}
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

                {/* Categories Preview */}
                <View
                  style={[
                    styles.categoriesBox,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  {parsedData.type === 'single_bank' && parsedData.items && (
                    parsedData.items.map((item, idx) => (
                      <View key={idx} style={styles.previewItemRow}>
                        <View
                          style={[
                            styles.percentBadge,
                            { backgroundColor: colors.badgeBackground, borderColor: colors.accentBlue },
                          ]}
                        >
                          <Text style={[styles.percentBadgeText, { color: colors.accentBlue }]}>
                            {item.percent}%
                          </Text>
                        </View>
                        <Text
                          style={[styles.categoryName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
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
                          <Text style={[styles.bankGroupName, { color: colors.accent }]}>
                            {bank?.name || cb.bankId}:
                          </Text>
                          {cb.items.map((item, cIdx) => (
                            <View key={cIdx} style={styles.previewItemRow}>
                              <View
                                style={[
                                  styles.percentBadge,
                                  { backgroundColor: colors.badgeBackground, borderColor: colors.accentBlue },
                                ]}
                              >
                                <Text style={[styles.percentBadgeText, { color: colors.accentBlue }]}>
                                  {item.percent}%
                                </Text>
                              </View>
                              <Text
                                style={[styles.categoryName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
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
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        mergeMode === 'replace' && [styles.modeBtnActive, { borderColor: colors.accent }],
                      ]}
                      onPress={() => setMergeMode('replace')}
                    >
                      <Text
                        style={[
                          styles.modeBtnText,
                          { color: colors.textSecondary },
                          mergeMode === 'replace' && [styles.modeBtnTextActive, { color: colors.accent }],
                        ]}
                      >
                        Заменить категории
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeBtn,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        mergeMode === 'merge' && [styles.modeBtnActive, { borderColor: colors.accent }],
                      ]}
                      onPress={() => setMergeMode('merge')}
                    >
                      <Text
                        style={[
                          styles.modeBtnText,
                          { color: colors.textSecondary },
                          mergeMode === 'merge' && [styles.modeBtnTextActive, { color: colors.accent }],
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
          <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={[
                styles.applyBtn,
                { backgroundColor: colors.accentBlue },
                !parsedData && [styles.applyBtnDisabled, { backgroundColor: colors.cardBorder }],
              ]}
              onPress={handleApplyImport}
              disabled={!parsedData}
            >
              <Check size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  previewCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
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
  },
  yearControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  yearBtn: {
    padding: 4,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '700',
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
    marginRight: 6,
  },
  monthChipActive: {},
  monthChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  categoriesBox: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  previewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  percentBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    borderWidth: 1,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  categoryName: {
    fontSize: 13,
    flex: 1,
  },
  bankGroupWrap: {
    marginBottom: 8,
  },
  bankGroupName: {
    fontSize: 13,
    fontWeight: '700',
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
    alignItems: 'center',
    borderWidth: 1,
  },
  modeBtnActive: {},
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modeBtnTextActive: {
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
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
