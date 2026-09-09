import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { AppSettings, Bank, MonthlyCashback, AdvisorViewMode } from '../types';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { GeminiVisionService } from '../services/gemini';
import { ShareService } from '../services/share';
import { confirmDialog, showCustomAlert } from '../utils/alert';
import { Header } from '../components/Header';
import { ImportCashbackModal } from '../components/ImportCashbackModal';
import { PairDeviceModal } from '../components/PairDeviceModal';
import { SyncService } from '../services/sync';
import { PwaService } from '../services/pwa';
import { MONTH_NAMES_RU } from '../constants/banks';
import { useTheme } from '../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  UserCheck,
  Cloud,
  Smartphone,
  Copy,
  ArrowRight,
  List,
  Search,
  CreditCard,
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
  const [advisorViewMode, setAdvisorViewMode] = useState<AdvisorViewMode>('compact');
  const [partnerName, setPartnerName] = useState<string>('Партнер');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [syncKey, setSyncKey] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isPairModalVisible, setIsPairModalVisible] = useState<boolean>(false);
  const [syncingNow, setSyncingNow] = useState<boolean>(false);

  // Month state for sharing / export
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth());
  const [activeYear, setActiveYear] = useState<number>(new Date().getFullYear());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [monthCashbacks, setMonthCashbacks] = useState<MonthlyCashback[]>([]);
  const [isImportModalVisible, setIsImportModalVisible] = useState<boolean>(false);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    const s = await StorageService.getSettings();
    setSettings(s);
    setApiKey(s.geminiApiKey || '');
    setNotificationsEnabled(s.enableMonthlyReminders);
    setPartnerName(s.partnerName || 'Партнер');
    setAdvisorViewMode(s.advisorViewMode || 'compact');
    if (s.widgetTheme) {
      setWidgetTheme(s.widgetTheme as WidgetThemeMode);
    }

    const key = await SyncService.getSyncKey();
    const sUrl = await SyncService.getServerUrl();
    setSyncKey(key);
    setServerUrl(sUrl);

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

  const handleSetAdvisorViewMode = async (mode: AdvisorViewMode) => {
    setAdvisorViewMode(mode);
    await StorageService.saveSettings({ advisorViewMode: mode });
  };

  const handleSaveApiKey = async () => {
    const clean = GeminiVisionService.sanitizeApiKey(apiKey);
    await StorageService.saveSettings({ geminiApiKey: clean });
    showCustomAlert('Сохранено', 'Gemini API ключ сохранен!');
  };

  const handleSavePartnerName = async () => {
    const clean = partnerName.trim() || 'Партнер';
    setPartnerName(clean);
    await StorageService.saveSettings({ partnerName: clean });
    showCustomAlert('Сохранено', `Название партнера сохранено: «${clean}»`);
  };

  const handleTestApiKey = async () => {
    const clean = GeminiVisionService.sanitizeApiKey(apiKey);
    if (!clean) {
      showCustomAlert('Ошибка', 'Сначала введите API ключ в поле выше');
      return;
    }
    setTestingKey(true);
    const res = await GeminiVisionService.testApiKeyAndGetModel(clean);
    setTestingKey(false);
    if (res.success) {
      showCustomAlert('Успешно!', `Ключ работает! Модель: ${res.modelName}`);
    } else {
      showCustomAlert('Ошибка ключа', res.message);
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
        showCustomAlert('Готово', 'Базовые данные восстановлены!');
      },
      'Сбросить'
    );
  };

  const handleSaveServerUrl = async () => {
    const clean = serverUrl.trim();
    await StorageService.saveSettings({ syncServerUrl: clean });
    showCustomAlert('Сохранено', `Адрес сервера синхронизации сохранен: ${clean}`);
  };

  const handleManualSync = async () => {
    setSyncingNow(true);
    const success = await SyncService.performSync();
    setSyncingNow(false);
    if (success) {
      await loadData();
      showCustomAlert('Синхронизировано', 'Данные успешно обновлены из облака!');
    } else {
      showCustomAlert('Офлайн', 'Не удалось связаться с сервером. Проверьте адрес сервера и интернет.');
    }
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

  const handleImportBackup = async () => {
    if (Platform.OS === 'web') {
      backupFileInputRef.current?.click();
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
          processBackupJson(content);
        }
      }
    } catch (e: any) {
      showCustomAlert('Ошибка выбора файла', e.message || 'Не удалось открыть файл бэкапа');
    }
  };

  const handlePickBackupWeb = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processBackupJson(content);
      }
    };
    reader.readAsText(file);
  };

  const processBackupJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.banks || !Array.isArray(parsed.banks)) {
        showCustomAlert('Ошибка бэкапа', 'Файл не содержит корректных данных банков');
        return;
      }

      confirmDialog(
        'Восстановление из бэкапа',
        `Восстановить резервную копию? Будет загружено ${parsed.banks.length} банков и ${(
          parsed.cashbacks || []
        ).length} записей кэшбэка.`,
        async () => {
          const success = await StorageService.importBackup(jsonString);
          if (success) {
            await loadData();
            showCustomAlert('Готово!', 'Все данные успешно восстановлены из резервной копии!');
          } else {
            showCustomAlert('Ошибка', 'Не удалось восстановить данные из бэкапа');
          }
        },
        'Восстановить'
      );
    } catch (e) {
      showCustomAlert('Ошибка файла', 'Выбранный файл поврежден или не является валидным JSON');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Настройки" subtitle="Параметры темы, AI, импорта и экспорта" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cloud Sync Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: '#3B82F6', borderWidth: 1.5 },
          ]}
        >
          <View style={styles.cardHeader}>
            <Cloud size={18} color="#60A5FA" style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Облачная синхронизация (Web ↔ Телефон)
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Мгновенный обмен кэшбэками между браузером на компьютере и мобильным приложением.
          </Text>

          <View style={[styles.syncKeyBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Text style={[styles.syncKeyLabel, { color: colors.textSecondary }]}>
              Ваш синхро-код устройства:
            </Text>
            <Text style={[styles.syncKeyVal, { color: colors.accent }]}>
              {syncKey || 'Загрузка...'}
            </Text>
          </View>

          <View style={styles.syncBtnRow}>
            <TouchableOpacity
              style={[styles.pairDeviceBtn, { backgroundColor: colors.accent }]}
              onPress={() => setIsPairModalVisible(true)}
              activeOpacity={0.8}
            >
              <Smartphone size={16} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.pairDeviceBtnText}>Связать с другим устройством</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.manualSyncBtn, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              onPress={handleManualSync}
              disabled={syncingNow}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.manualSyncBtnText, { color: colors.accentBlue }]}>
                {syncingNow ? 'Синхронизация...' : 'Синхронизировать'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Server URL Config */}
          <View style={styles.serverUrlRow}>
            <TextInput
              style={[styles.serverUrlInput, { backgroundColor: colors.inputBackground, color: colors.textPrimary, borderColor: colors.inputBorder }]}
              placeholder="Адрес сервера: http://localhost:4000"
              placeholderTextColor={colors.textMuted}
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.serverUrlSaveBtn, { backgroundColor: colors.accentBlue }]}
              onPress={handleSaveServerUrl}
              activeOpacity={0.8}
            >
              <Text style={styles.serverUrlSaveBtnText}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mobile App & PWA Card (Compact) */}
        {!PwaService.isStandalone() && Platform.OS === 'web' && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingVertical: 12 },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 180 }}>
                <Smartphone size={18} color="#38BDF8" style={{ marginRight: 8 }} />
                <View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 13 }]}>
                    Установить приложение
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                    Быстрый запуск с домашнего экрана и работа офлайн (PWA)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#38BDF8',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => PwaService.promptInstall()}
                activeOpacity={0.8}
              >
                <Download size={14} color="#0F172A" style={{ marginRight: 5 }} />
                <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '800' }}>Установить</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrowBtn} activeOpacity={0.7}>
              <ChevronLeft size={18} color={colors.accentBlue} />
            </TouchableOpacity>

            <Text style={[styles.monthSelectorText, { color: colors.textPrimary }]}>
              {MONTH_NAMES_RU[activeMonth]} {activeYear}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrowBtn} activeOpacity={0.7}>
              <ChevronRight size={18} color={colors.accentBlue} />
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

        {/* Partner Name Customization Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: '#EC4899' },
          ]}
        >
          <View style={styles.cardHeader}>
            <Heart size={18} color="#EC4899" fill="#EC4899" style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Название вкладки партнера
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Задайте собственное имя для карт партнера (например: «Карты Саши», «Саша», «Светик», «Жена»).
          </Text>

          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
            ]}
          >
            <TextInput
              style={[styles.apiInput, { color: colors.textPrimary }]}
              placeholder="Например: Карты Саши или Светик"
              placeholderTextColor={colors.textMuted}
              value={partnerName}
              onChangeText={setPartnerName}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveKeyBtn, { backgroundColor: '#EC4899' }]}
            onPress={handleSavePartnerName}
            activeOpacity={0.8}
          >
            <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[styles.saveKeyBtnText, { color: '#FFFFFF' }]}>
              Сохранить название
            </Text>
          </TouchableOpacity>
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
              <Moon size={16} color={theme === 'dark' ? colors.accent : colors.textMuted} style={{ marginRight: 6 }} />
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
              <Sun size={16} color={theme === 'light' ? colors.accent : colors.textMuted} style={{ marginRight: 6 }} />
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

        {/* Advisor Style Mode Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <List size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Вид экрана «Чем платить»
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Выберите наиболее удобный стиль отображения кэшбэков советника.
          </Text>

          <View style={{ gap: 8, marginTop: 4 }}>
            {/* 1. Compact List */}
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: advisorViewMode === 'compact' ? colors.accent : colors.inputBorder,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  justifyContent: 'flex-start',
                },
                advisorViewMode === 'compact' && { borderWidth: 1.5 },
              ]}
              onPress={() => handleSetAdvisorViewMode('compact')}
              activeOpacity={0.7}
            >
              <List
                size={18}
                color={advisorViewMode === 'compact' ? colors.accent : colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: advisorViewMode === 'compact' ? '800' : '600',
                      color: advisorViewMode === 'compact' ? colors.accent : colors.textPrimary,
                    }}
                  >
                    Компактный список
                  </Text>
                  <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 6 }}>
                    <Text style={{ fontSize: 9, color: '#38BDF8', fontWeight: '800' }}>Хит</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  Плотные банковские строки, раскрытие на месте без модалок
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. Spotlight Search & Top % */}
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: advisorViewMode === 'spotlight' ? colors.accent : colors.inputBorder,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  justifyContent: 'flex-start',
                },
                advisorViewMode === 'spotlight' && { borderWidth: 1.5 },
              ]}
              onPress={() => handleSetAdvisorViewMode('spotlight')}
              activeOpacity={0.7}
            >
              <Search
                size={18}
                color={advisorViewMode === 'spotlight' ? colors.accent : colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: advisorViewMode === 'spotlight' ? '800' : '600',
                    color: advisorViewMode === 'spotlight' ? colors.accent : colors.textPrimary,
                  }}
                >
                  Умный поиск + Топ-%
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  Фокус на быстром поиске у кассы и рейтинге максимальных %
                </Text>
              </View>
            </TouchableOpacity>

            {/* 3. By Bank Tabs */}
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: advisorViewMode === 'by_bank' ? colors.accent : colors.inputBorder,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  justifyContent: 'flex-start',
                },
                advisorViewMode === 'by_bank' && { borderWidth: 1.5 },
              ]}
              onPress={() => handleSetAdvisorViewMode('by_bank')}
              activeOpacity={0.7}
            >
              <CreditCard
                size={18}
                color={advisorViewMode === 'by_bank' ? colors.accent : colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: advisorViewMode === 'by_bank' ? '800' : '600',
                    color: advisorViewMode === 'by_bank' ? colors.accent : colors.textPrimary,
                  }}
                >
                  По картам банков
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  Вкладки с переключением между вашими картами
                </Text>
              </View>
            </TouchableOpacity>

            {/* 4. Visual 2-Column Grid */}
            <TouchableOpacity
              style={[
                styles.themeOptionBtn,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: advisorViewMode === 'grid' ? colors.accent : colors.inputBorder,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  justifyContent: 'flex-start',
                },
                advisorViewMode === 'grid' && { borderWidth: 1.5 },
              ]}
              onPress={() => handleSetAdvisorViewMode('grid')}
              activeOpacity={0.7}
            >
              <LayoutGrid
                size={18}
                color={advisorViewMode === 'grid' ? colors.accent : colors.textMuted}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: advisorViewMode === 'grid' ? '800' : '600',
                    color: advisorViewMode === 'grid' ? colors.accent : colors.textPrimary,
                  }}
                >
                  Плитки с иконками
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  Цветная сетка категорий 2×2 с всплывающими деталями
                </Text>
              </View>
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
            Выберите стиль виджета (также переключается по нажатию иконки темы на самом виджете).
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
              <Moon size={15} color={widgetTheme === 'dark' ? colors.accent : colors.textMuted} style={{ marginRight: 4 }} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: widgetTheme === 'dark' ? colors.accent : colors.textSecondary },
                ]}
                numberOfLines={1}
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
              <Sun size={15} color={widgetTheme === 'light' ? colors.accent : colors.textMuted} style={{ marginRight: 4 }} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: widgetTheme === 'light' ? colors.accent : colors.textSecondary },
                ]}
                numberOfLines={1}
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
              <Sparkles size={15} color={widgetTheme === 'transparent' ? colors.accent : colors.textMuted} style={{ marginRight: 4 }} />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: widgetTheme === 'transparent' ? colors.accent : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                Стекло
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
              activeOpacity={0.8}
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
              activeOpacity={0.7}
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
            activeOpacity={0.7}
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

          {Platform.OS === 'web' && (
            <input
              type="file"
              ref={backupFileInputRef as any}
              style={{ display: 'none' }}
              accept=".json,application/json"
              onChange={handlePickBackupWeb}
            />
          )}

          <View style={styles.backupActions}>
            <TouchableOpacity
              style={[
                styles.backupBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
              onPress={handleExportBackup}
              activeOpacity={0.7}
            >
              <Download size={14} color={colors.accentBlue} style={{ marginRight: 4 }} />
              <Text style={[styles.backupBtnText, { color: colors.accentBlue }]} numberOfLines={1}>
                Создать бэкап
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.backupBtn,
                { backgroundColor: colors.inputBackground, borderColor: colors.accentGreen },
              ]}
              onPress={handleImportBackup}
              activeOpacity={0.7}
            >
              <Upload size={14} color={colors.accentGreen} style={{ marginRight: 4 }} />
              <Text style={[styles.backupBtnText, { color: colors.accentGreen }]} numberOfLines={1}>
                Восстановить
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resetBtn,
                { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: colors.accentRed },
              ]}
              onPress={handleResetSampleData}
              activeOpacity={0.7}
            >
              <RefreshCw size={13} color={colors.accentRed} style={{ marginRight: 4 }} />
              <Text style={[styles.resetBtnText, { color: colors.accentRed }]} numberOfLines={1}>
                Сброс
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
            Версия 1.4.0 (Release Build) • Автор: Александр Щеголев
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

      {/* Cloud Sync & Pair Device Modal */}
      <PairDeviceModal
        visible={isPairModalVisible}
        onClose={() => setIsPairModalVisible(false)}
        onSuccess={loadData}
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
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  monthArrowBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  operationsGrid: {
    gap: 8,
  },
  operationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryOperationBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    flexShrink: 1,
  },
  operationBtnText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
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
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeOptionBtnActive: {
    borderWidth: 2,
  },
  themeOptionText: {
    fontSize: 12,
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
    flex: 1,
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
    flex: 1,
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
    gap: 6,
  },
  backupBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  backupBtnText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  resetBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
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
    flex: 1,
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  syncKeyBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  syncKeyLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  syncKeyVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  syncBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pairDeviceBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  pairDeviceBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  manualSyncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  manualSyncBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  serverUrlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serverUrlInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  serverUrlSaveBtn: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverUrlSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBoxText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
});
