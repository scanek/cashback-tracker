import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { AppSettings, Bank, MonthlyCashback } from '../types';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { GeminiVisionService } from '../services/gemini';
import { ShareService } from '../services/share';
import { confirmDialog } from '../utils/alert';
import { Header } from '../components/Header';
import { ImportCashbackModal } from '../components/ImportCashbackModal';
import { MONTH_NAMES_RU } from '../constants/banks';
import { useTheme } from '../context/ThemeContext';
import {
  Key,
  Bell,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Heart,
  Info,
  Zap,
  Sun,
  Moon,
  Palette,
  LayoutGrid,
  Camera,
  Share2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { WidgetThemeMode } from '../widgets/CashbackWidget';
import { WidgetService } from '../services/widget';

interface SettingsScreenProps {
  onNavigateToScan?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigateToScan,
}) => {
  const { colors, theme, setTheme } = useTheme();
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [widgetTheme, setWidgetTheme] = useState<WidgetThemeMode>('dark');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Month state for sharing / export
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth());
  const [activeYear, setActiveYear] = useState<number>(new Date().getFullYear());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [monthCashbacks, setMonthCashbacks] = useState<MonthlyCashback[]>([]);
  const [isImportModalVisible, setIsImportModalVisible] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    const s = await StorageService.getSettings();
    setSettings(s);
    setApiKey(s.geminiApiKey || '');
    setNotificationsEnabled(s.enableMonthlyReminders);
    if (s.widgetTheme) {
      setWidgetTheme(s.widgetTheme as WidgetThemeMode);
    }

    const allBanks = await StorageService.getBanks();
    const cbs = await StorageService.getCashbacksForMonth(activeMonth, activeYear);
    setBanks(allBanks.filter((b) => b.isActive));
    setMonthCashbacks(cbs);
  }, [activeMonth, activeYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevMonth = () => {
    if (activeMonth === 0) {
      setActiveMonth(11);
      setActiveYear((y) => y - 1);
    } else {
      setActiveMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth === 11) {
      setActiveMonth(0);
      setActiveYear((y) => y + 1);
    } else {
      setActiveMonth((m) => m + 1);
    }
  };

  const handleSetWidgetTheme = async (mode: WidgetThemeMode) => {
    setWidgetTheme(mode);
    await StorageService.saveSettings({ widgetTheme: mode });
    WidgetService.updateWidget(mode);
  };

  const handleSaveApiKey = async () => {
    const clean = GeminiVisionService.sanitizeApiKey(apiKey);
    await StorageService.saveSettings({ geminiApiKey: clean });
    Alert.alert('Сохранено', 'Gemini API ключ сохранен!');
  };

  const handleTestApiKey = async () => {
    const clean = GeminiVisionService.sanitizeApiKey(apiKey);
    setTestingKey(true);
    const res = await GeminiVisionService.testApiKeyAndGetModel(clean);
    setTestingKey(false);
    if (res.success) {
      Alert.alert('Успешно!', `Ключ работает! Модель: ${res.modelName}`);
    } else {
      Alert.alert('Ошибка ключа', res.message);
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await StorageService.saveSettings({ enableMonthlyReminders: val });
    if (val) {
      await NotificationService.scheduleMonthlyReminder();
    } else {
      await NotificationService.cancelMonthlyReminder();
    }
  };

  const handleTestNotification = async () => {
    await NotificationService.sendTestNotification();
  };

  const handleResetSampleData = () => {
    confirmDialog(
      'Сброс данных',
      'Восстановить примеры категорий и банков по умолчанию?',
      async () => {
        await StorageService.resetToSampleData();
        await loadData();
        Alert.alert('Готово', 'Базовые данные восстановлены!');
      },
      'Сбросить'
    );
  };

  const handleExportBackup = async () => {
    const backupJson = await StorageService.exportBackup();
    if (Platform.OS === 'web') {
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cashback_hub_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } else {
      await ShareService.shareOrDownloadFile(
        `cashback_backup_${new Date().toISOString().slice(0, 10)}.json`,
        backupJson
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Настройки" subtitle="Параметры темы, AI, импорта и экспорта" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Operations & Sharing Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <Share2 size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Импорт, экспорт и сканирование
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Инструменты для обмена кэшбэком, сохранения файлов и AI-распознавания скриншотов.
          </Text>

          {/* Month selector for sharing/export */}
          <View
            style={[
              styles.monthSelectorBar,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
            ]}
          >
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrowBtn}>
              <ChevronLeft size={16} color={colors.accentBlue} />
            </TouchableOpacity>

            <Text style={[styles.monthSelectorText, { color: colors.textPrimary }]}>
              {MONTH_NAMES_RU[activeMonth]} {activeYear}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrowBtn}>
              <ChevronRight size={16} color={colors.accentBlue} />
            </TouchableOpacity>
          </View>

          {/* Action Buttons Grid */}
          <View style={styles.operationsGrid}>
            {onNavigateToScan && (
              <TouchableOpacity
                style={[
                  styles.operationBtn,
                  { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                onPress={onNavigateToScan}
                activeOpacity={0.8}
              >
                <Camera size={18} color="#0F172A" style={{ marginRight: 8 }} />
                <Text style={styles.primaryOperationBtnText}>
                  Распознать скриншот
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.operationBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
              onPress={() =>
                ShareService.shareMonthCashback(monthCashbacks, banks, activeMonth, activeYear)
              }
              activeOpacity={0.7}
            >
              <Share2 size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.operationBtnText, { color: colors.textPrimary }]}>
                Поделиться кодом месяца
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.operationBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
              onPress={() =>
                ShareService.exportMonthFile(monthCashbacks, activeMonth, activeYear)
              }
              activeOpacity={0.7}
            >
              <FileText size={16} color={colors.accentGreen} style={{ marginRight: 8 }} />
              <Text style={[styles.operationBtnText, { color: colors.textPrimary }]}>
                Скачать / Отправить файл .json
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.operationBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.accentBlue },
              ]}
              onPress={() => setIsImportModalVisible(true)}
              activeOpacity={0.7}
            >
              <Download size={16} color={colors.accentBlue} style={{ marginRight: 8 }} />
              <Text style={[styles.operationBtnText, { color: colors.accentBlue }]}>
                Импортировать кэшбэк (код или файл)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Switcher Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <Palette size={18} color={colors.accentBlue} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Тема оформления приложения
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Выберите светлую или темную тему интерфейса.
          </Text>

          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                theme === 'dark' && [styles.themeOptionBtnActive, { borderColor: colors.accent }],
              ]}
              onPress={() => setTheme('dark')}
              activeOpacity={0.7}
            >
              <Moon size={18} color={theme === 'dark' ? colors.accent : colors.textMuted} style={{ marginRight: 8 }} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: theme === 'dark' ? colors.accent : colors.textSecondary },
                ]}
              >
                Темная
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                theme === 'light' && [styles.themeOptionBtnActive, { borderColor: colors.accent }],
              ]}
              onPress={() => setTheme('light')}
              activeOpacity={0.7}
            >
              <Sun size={18} color={theme === 'light' ? colors.accent : colors.textMuted} style={{ marginRight: 8 }} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: theme === 'light' ? colors.accent : colors.textSecondary },
                ]}
              >
                Светлая
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Widget Theme Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <LayoutGrid size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Тема виджета на рабочем столе
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Выберите оформление виджета (также можно переключать нажатием на иконку темы на самом виджете).
          </Text>

          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                widgetTheme === 'dark' && [styles.themeOptionBtnActive, { borderColor: colors.accent }],
              ]}
              onPress={() => handleSetWidgetTheme('dark')}
              activeOpacity={0.7}
            >
              <Moon size={15} color={widgetTheme === 'dark' ? colors.accent : colors.textMuted} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: widgetTheme === 'dark' ? colors.accent : colors.textSecondary },
                ]}
              >
                Темная
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                widgetTheme === 'light' && [styles.themeOptionBtnActive, { borderColor: colors.accent }],
              ]}
              onPress={() => handleSetWidgetTheme('light')}
              activeOpacity={0.7}
            >
              <Sun size={15} color={widgetTheme === 'light' ? colors.accent : colors.textMuted} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: widgetTheme === 'light' ? colors.accent : colors.textSecondary },
                ]}
              >
                Светлая
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                widgetTheme === 'transparent' && [styles.themeOptionBtnActive, { borderColor: colors.accent }],
              ]}
              onPress={() => handleSetWidgetTheme('transparent')}
              activeOpacity={0.7}
            >
              <Sparkles size={15} color={widgetTheme === 'transparent' ? colors.accent : colors.textMuted} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: widgetTheme === 'transparent' ? colors.accent : colors.textSecondary },
                ]}
              >
                Стекло 💎
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gemini Vision API Key Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <Key size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Google Gemini API (AI Vision)
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Ключ используется для распознавания скриншотов банков. В проект уже встроен рабочий ключ по умолчанию.
          </Text>

          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
            ]}
          >
            <TextInput
              style={[styles.apiInput, { color: colors.textPrimary }]}
              placeholder="Вставьте ваш Gemini API Key..."
              placeholderTextColor={colors.textMuted}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff size={18} color={colors.textMuted} />
              ) : (
                <Eye size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.keyActionsRow}>
            <TouchableOpacity
              style={[styles.saveKeyBtn, { backgroundColor: colors.accent }]}
              onPress={handleSaveApiKey}
            >
              <Check size={16} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.saveKeyBtnText}>Сохранить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.testKeyBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.accentBlue },
              ]}
              onPress={handleTestApiKey}
              disabled={testingKey}
            >
              <Zap size={16} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.testKeyBtnText, { color: colors.accentBlue }]}>
                {testingKey ? 'Проверка...' : 'Проверить AI'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.apiKeyHint}>
            <Sparkles size={14} color={colors.accentBlue} style={{ marginRight: 6 }} />
            <Text style={[styles.apiKeyHintText, { color: colors.textSecondary }]}>
              Работает с моделью Gemini 3.6 Flash / 2.5 Flash Vision.
            </Text>
          </View>
        </View>

        {/* Notifications Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <Bell size={18} color={colors.accentBlue} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Напоминания о кэшбэке
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Приложение напомнит 1-го числа каждого месяца зайти в банковские приложения и выбрать кэшбэк.
          </Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
              Ежемесячные напоминания
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.cardBorder, true: colors.accentBlue }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.testNotificationBtn,
              { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
            ]}
            onPress={handleTestNotification}
          >
            <Text style={[styles.testNotificationBtnText, { color: colors.accentBlue }]}>
              🔔 Отправить тестовое напоминание
            </Text>
          </TouchableOpacity>
        </View>

        {/* Data & Backup Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <ShieldCheck size={18} color={colors.accentGreen} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Резервное копирование и сброс
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Все ваши карты, категории и настройки хранятся строго локально на вашем устройстве.
          </Text>

          <View style={styles.backupActions}>
            <TouchableOpacity
              style={[
                styles.backupBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
              onPress={handleExportBackup}
            >
              <Download size={16} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.backupBtnText, { color: colors.accentBlue }]}>
                Полный бэкап данных
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resetBtn,
                { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: colors.accentRed },
              ]}
              onPress={handleResetSampleData}
            >
              <RefreshCw size={16} color={colors.accentRed} style={{ marginRight: 6 }} />
              <Text style={[styles.resetBtnText, { color: colors.accentRed }]}>
                Сбросить к образцу
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About & Dedication Card */}
        <View
          style={[
            styles.card,
            styles.aboutCard,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.cardHeader}>
            <Info size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              О проекте «Мои Кэшбеки»
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Умный агрегатор кэшбэков со всех банковских карт на каждый месяц. Позволяет распознавать категории по скриншотам с помощью AI и мгновенно подсказывает самую выгодную карту перед любой покупкой.
          </Text>

          <View style={styles.dedicationBox}>
            <Heart size={20} color="#EC4899" fill="#EC4899" style={{ marginRight: 10 }} />
            <Text style={styles.dedicationText}>
              Автор: Александр Щеголев{'\n'}
              Сделано для своей любимой жены Светик ❤️
            </Text>
          </View>

          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            Версия 1.1.0 (Release Build) • Автор: Александр Щеголев
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Import Shared Cashback Modal */}
      <ImportCashbackModal
        visible={isImportModalVisible}
        banks={banks}
        onClose={() => setIsImportModalVisible(false)}
        onImportComplete={loadData}
      />
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
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  aboutCard: {
    borderColor: '#38BDF8',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  monthArrowBtn: {
    padding: 4,
  },
  monthSelectorText: {
    fontSize: 13,
    fontWeight: '700',
  },
  operationsGrid: {
    gap: 8,
  },
  operationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryOperationBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  operationBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeOptionBtnActive: {
    borderWidth: 2,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  apiInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
  },
  eyeBtn: {
    padding: 6,
  },
  keyActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  saveKeyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  saveKeyBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  testKeyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  testKeyBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  apiKeyHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  apiKeyHintText: {
    fontSize: 11,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  testNotificationBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  testNotificationBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 10,
  },
  backupBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  backupBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dedicationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  dedicationText: {
    fontSize: 12,
    color: '#EC4899',
    fontWeight: '700',
    lineHeight: 18,
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
