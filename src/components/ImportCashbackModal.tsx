import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Bank, MonthlyCashback, CashbackItem } from '../types';
import { MONTH_NAMES_RU } from '../constants/banks';
import { ShareService, SharedPayload } from '../services/share';
import { StorageService } from '../services/storage';
import { useTheme } from '../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  X,
  Check,
  Download,
  Calendar,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  Heart,
  User,
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
  const [importTarget, setImportTarget] = useState<'shared' | 'my'>('shared');
  const [mergeMode, setMergeMode] = useState<'replace' | 'merge'>('replace');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handlePickDocument = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const fileUri = result.assets[0].uri;
        const content = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (content) {
          handleTextChange(content);
        }
      }
    } catch (e: any) {
      Alert.alert('Ошибка выбора файла', e.message || 'Не удалось прочитать файл');
    }
  };

  const handlePickFileWeb = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = async () => {
    if (!parsedData) {
      Alert.alert('Ошибка', 'Вставьте корректный код (CBHUB:...) или загрузите .json файл');
      return;
    }

    const isShared = importTarget === 'shared';
    const sharedByName = isShared ? 'Партнер' : undefined;

    try {
      if (parsedData.type === 'single_bank' && parsedData.bankId && parsedData.items) {
        const bankId = parsedData.bankId;
        const currentCashbacks: MonthlyCashback[] = await StorageService.getCashbacksForMonth(
          targetMonth,
          targetYear
        );
        const existing = currentCashbacks.find(
          (c: MonthlyCashback) => c.bankId === bankId && Boolean(c.isShared) === isShared
        );

        let finalItems: CashbackItem[] = [];
        if (mergeMode === 'merge' && existing) {
          finalItems = [...existing.items];
          for (const newItem of parsedData.items) {
            if (
              !finalItems.some(
                (ei) => ei.category.toLowerCase() === newItem.category.toLowerCase()
              )
            ) {
              finalItems.push({
                ...newItem,
                id: newItem.id || Date.now().toString() + Math.random().toString().slice(2, 6),
              });
            }
          }
        } else {
          finalItems = parsedData.items.map((it, idx) => ({
            ...it,
            id: it.id || `import-${idx}-${Date.now()}`,
          }));
        }

        await StorageService.saveMonthlyCashback({
          id: `${bankId}-${targetMonth}-${targetYear}${isShared ? '-shared' : ''}`,
          bankId: bankId,
          month: targetMonth,
          year: targetYear,
          items: finalItems,
          isShared: isShared,
          sharedByName: sharedByName,
          updatedAt: new Date().toISOString(),
        });
      } else if (parsedData.type === 'full_month' && parsedData.allCashbacks) {
        for (const cb of parsedData.allCashbacks) {
          await StorageService.saveMonthlyCashback({
            ...cb,
            id: `${cb.bankId}-${targetMonth}-${targetYear}${isShared ? '-shared' : ''}`,
            month: targetMonth,
            year: targetYear,
            isShared: isShared,
            sharedByName: sharedByName,
            items: cb.items.map((it, idx) => ({
              ...it,
              id: it.id || `import-full-${idx}-${Date.now()}`,
            })),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      Alert.alert(
        'Успешно!',
        `Категории кэшбэка импортированы в ${
          isShared ? '«Карты партнера»' : '«Мои карты»'
        } на ${MONTH_NAMES_RU[targetMonth]} ${targetYear}!`
      );
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
                  Вставьте код CBHUB или загрузите .json файл
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Action Card: Upload File or Paste Code */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.inputHeaderRow}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                  Код кэшбэка (CBHUB:...):
                </Text>

                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    ref={fileInputRef as any}
                    style={{ display: 'none' }}
                    accept=".json,application/json"
                    onChange={handlePickFileWeb}
                  />
                )}
                <TouchableOpacity
                  style={[styles.uploadFileBtn, { borderColor: colors.accentBlue }]}
                  onPress={handlePickDocument}
                  activeOpacity={0.7}
                >
                  <Upload size={13} color={colors.accentBlue} style={{ marginRight: 4 }} />
                  <Text style={[styles.uploadFileBtnText, { color: colors.accentBlue }]}>
                    Выбрать .json файл
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Вставьте скопированный код CBHUB:..."
                placeholderTextColor={colors.textMuted}
                value={rawText}
                onChangeText={handleTextChange}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Target Destination: My vs Shared/Family */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                Куда сохранить импортированный кэшбэк:
              </Text>
              <View style={styles.targetToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.targetToggleBtn,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    importTarget === 'shared' && [
                      styles.targetToggleBtnActive,
                      { borderColor: '#EC4899', backgroundColor: 'rgba(236, 72, 153, 0.1)' },
                    ],
                  ]}
                  onPress={() => setImportTarget('shared')}
                  activeOpacity={0.7}
                >
                  <Heart
                    size={15}
                    color={importTarget === 'shared' ? '#EC4899' : colors.textMuted}
                    fill={importTarget === 'shared' ? '#EC4899' : 'transparent'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.targetToggleText,
                      { color: importTarget === 'shared' ? '#EC4899' : colors.textSecondary },
                    ]}
                  >
                    Карты партнера
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.targetToggleBtn,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    importTarget === 'my' && [
                      styles.targetToggleBtnActive,
                      { borderColor: colors.accentBlue, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
                    ],
                  ]}
                  onPress={() => setImportTarget('my')}
                  activeOpacity={0.7}
                >
                  <User
                    size={15}
                    color={importTarget === 'my' ? colors.accentBlue : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.targetToggleText,
                      { color: importTarget === 'my' ? colors.accentBlue : colors.textSecondary },
                    ]}
                  >
                    Мои карты
                  </Text>
                </TouchableOpacity>
              </View>
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
                  В тексте не найден корректный код (CBHUB:...). Вставьте скопированный код или выберите .json файл.
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
                  : 'Ожидание кода или файла...'}
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
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  targetToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  targetToggleBtnActive: {
    borderWidth: 1.5,
  },
  targetToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  uploadFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadFileBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
