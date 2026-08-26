import React, { useState, useEffect } from 'react';
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
import { AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { GeminiVisionService } from '../services/gemini';
import { confirmDialog } from '../utils/alert';
import { Header } from '../components/Header';
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
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const { colors, theme, setTheme } = useTheme();
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      const s = await StorageService.getSettings();
      setSettings(s);
      setApiKey(s.geminiApiKey || '');
      setNotificationsEnabled(s.enableMonthlyReminders);
    };
    load();
  }, []);

  const handleSaveApiKey = async () => {
    const clean = GeminiVisionService.sanitizeApiKey(apiKey);
    await StorageService.saveSettings({ geminiApiKey: clean });
    Alert.alert('Сохранено', 'Gemini API ключ сохранен!');
  };

  const handleTestApiKey = async () => {
    const clean = GeminiVisionService.sanitizeApiKey(apiKey);
    if (!clean) {
      Alert.alert('Внимание', 'Сначала введите ваш Gemini API ключ');
      return;
    }

    setTestingKey(true);
    const res = await GeminiVisionService.testApiKeyAndGetModel(clean);
    setTestingKey(false);

    if (res.success) {
      await StorageService.saveSettings({ geminiApiKey: clean });
      Alert.alert('✅ Успешно!', res.message);
    } else {
      Alert.alert(
        '❌ Ошибка проверки ключа',
        `${res.message}\n\nУбедитесь, что вы создали бесплатный API Key именно в Google AI Studio (aistudio.google.com).`
      );
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await StorageService.saveSettings({ enableMonthlyReminders: val });
    if (val) {
      const granted = await NotificationService.requestPermissions();
      if (granted) {
        await NotificationService.scheduleMonthlyReminder();
      }
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
      Alert.alert('Резервная копия', 'Резервная копия сформирована в памяти.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Настройки" subtitle="Параметры темы, AI и уведомлений" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              Тема оформления
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Выберите светлую или темную тему приложения.
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
              Данные и конфиденциальность
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Все ваши карты, категории и скриншоты хранятся строго локально на вашем устройстве.
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
                Экспорт резервной копии
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
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeOptionBtnActive: {
    borderWidth: 2,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  apiInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 10,
  },
  eyeBtn: {
    padding: 6,
  },
  keyActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveKeyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveKeyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  testKeyBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
  },
  testKeyBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  apiKeyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  apiKeyHintText: {
    fontSize: 11,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  testNotificationBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  testNotificationBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  backupActions: {
    gap: 10,
    marginTop: 4,
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  backupBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  aboutCard: {
    borderColor: '#EC4899',
  },
  dedicationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
    marginBottom: 12,
  },
  dedicationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F472B6',
    flex: 1,
    lineHeight: 20,
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
