import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { Header } from '../components/Header';
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
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
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
    await StorageService.saveSettings({ geminiApiKey: apiKey.trim() });
    Alert.alert('Сохранено', 'Gemini API ключ успешно обновлен!');
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
    Alert.alert(
      'Сброс данных',
      'Восстановить примеры категорий и банков по умолчанию?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            await StorageService.resetToSampleData();
            Alert.alert('Готово', 'Базовые данные восстановлены!');
          },
        },
      ]
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
    <View style={styles.container}>
      <Header title="Настройки" subtitle="Параметры AI и уведомлений" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gemini Vision API Key Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Key size={18} color="#FFDD2D" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Google Gemini API (AI Vision)</Text>
          </View>
          <Text style={styles.cardDescription}>
            Ключ используется для распознавания скриншотов банков. Бесплатный ключ можно получить в Google AI Studio.
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.apiInput}
              placeholder="Вставьте ваш Gemini API Key (AIzaSy...)"
              placeholderTextColor="#64748B"
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
                <EyeOff size={18} color="#94A3B8" />
              ) : (
                <Eye size={18} color="#94A3B8" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveKeyBtn} onPress={handleSaveApiKey}>
            <Check size={16} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={styles.saveKeyBtnText}>Сохранить ключ</Text>
          </TouchableOpacity>

          <View style={styles.apiKeyHint}>
            <Sparkles size={14} color="#38BDF8" style={{ marginRight: 6 }} />
            <Text style={styles.apiKeyHintText}>
              Без ключа доступно тестовое демо-распознавание для проверки работы.
            </Text>
          </View>
        </View>

        {/* Notifications Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell size={18} color="#38BDF8" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Напоминания о кэшбэке</Text>
          </View>
          <Text style={styles.cardDescription}>
            Приложение напомнит 1-го числа каждого месяца зайти в банковские приложения и выбрать кэшбэк.
          </Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Ежемесячные напоминания</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#334155', true: '#38BDF8' }}
              thumbColor={notificationsEnabled ? '#0F172A' : '#94A3B8'}
            />
          </View>

          <TouchableOpacity
            style={styles.testNotificationBtn}
            onPress={handleTestNotification}
          >
            <Text style={styles.testNotificationBtnText}>
              🔔 Отправить тестовое напоминание
            </Text>
          </TouchableOpacity>
        </View>

        {/* Data & Backup Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={18} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Данные и конфиденциальность</Text>
          </View>
          <Text style={styles.cardDescription}>
            Все ваши карты, категории и скриншоты хранятся строго локально на вашем устройстве.
          </Text>

          <View style={styles.backupActions}>
            <TouchableOpacity style={styles.backupBtn} onPress={handleExportBackup}>
              <Download size={16} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.backupBtnText}>Экспорт резервной копии</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleResetSampleData}
            >
              <RefreshCw size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.resetBtnText}>Сбросить к образцу</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About & Dedication Card */}
        <View style={[styles.card, styles.aboutCard]}>
          <View style={styles.cardHeader}>
            <Info size={18} color="#FFDD2D" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>О проекте Cashback Hub</Text>
          </View>
          <Text style={styles.cardDescription}>
            Умный агрегатор кэшбэков со всех банковских карт на каждый месяц. Позволяет распознавать категории по скриншотам с помощью AI и мгновенно подсказывает самую выгодную карту перед любой покупкой.
          </Text>

          <View style={styles.dedicationBox}>
            <Heart size={20} color="#EC4899" fill="#EC4899" style={{ marginRight: 10 }} />
            <Text style={styles.dedicationText}>
              Сделано Александром Щеголевым для своей любимой жены Светик ❤️
            </Text>
          </View>

          <Text style={styles.versionText}>Версия 1.0.0 (Release Build)</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#F8FAFC',
  },
  cardDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  apiInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 10,
  },
  eyeBtn: {
    padding: 6,
  },
  saveKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFDD2D',
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveKeyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  apiKeyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  apiKeyHintText: {
    fontSize: 11,
    color: '#94A3B8',
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
    color: '#F8FAFC',
  },
  testNotificationBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  testNotificationBtnText: {
    fontSize: 13,
    color: '#38BDF8',
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
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backupBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  aboutCard: {
    borderColor: '#EC4899',
    backgroundColor: '#1E293B',
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
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});
