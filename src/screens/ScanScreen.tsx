import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Bank, MonthlyCashback, ScanResult } from '../types';
import { StorageService } from '../services/storage';
import { GeminiVisionService } from '../services/gemini';
import { Header } from '../components/Header';
import { ScanReviewModal } from '../components/ScanReviewModal';
import { showCustomAlert } from '../utils/alert';
import { useTheme } from '../context/ThemeContext';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  Zap,
  Key,
} from 'lucide-react-native';

export const ScanScreen: React.FC = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>();
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    const loadBanksAndSettings = async () => {
      const data = await StorageService.getBanks();
      const settings = await StorageService.getSettings();
      setBanks(data);
      setHasApiKey(Boolean(settings.geminiApiKey && settings.geminiApiKey.trim()));
    };
    loadBanksAndSettings();

    // On Web: Listen for Ctrl+V / Cmd+V screenshot paste
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target?.result as string;
                if (base64) {
                  processImageBase64(base64, URL.createObjectURL(blob), blob.type);
                }
              };
              reader.readAsDataURL(blob);
            }
            break;
          }
        }
      };

      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
    }
  }, []);

  const processImageBase64 = async (base64: string, uri: string, mimeType?: string) => {
    const now = new Date();
    try {
      setLoading(true);
      setStatusMessage('Распознаем категории кэшбэка через Gemini Vision...');

      const settings = await StorageService.getSettings();
      const detectedMime = mimeType || (uri.endsWith('.png') ? 'image/png' : 'image/jpeg');

      const result = await GeminiVisionService.analyzeScreenshot(
        base64,
        detectedMime,
        settings.geminiApiKey,
        settings.geminiModel,
        now.getMonth(),
        now.getFullYear()
      );

      setSelectedImageUri(uri);
      setScanResult(result);
      setReviewModalVisible(true);
    } catch (error: any) {
      console.error('Scan error', error);
      const isMissingKey =
        error.message?.includes('API-ключ') ||
        error.message?.includes('API') ||
        error.message?.includes('ключ');

      showCustomAlert(
        isMissingKey ? 'Требуется API-ключ Gemini' : 'Не удалось распознать',
        error.message ||
          'Для автоматического распознавания категорий укажите бесплатный ключ Gemini в Настройках. Открываем редактор для ручного ввода.'
      );

      // Open editor with clean empty categories list so user can enter real cashback
      const fallbackResult: ScanResult = {
        bankName: 'Т-Банк',
        bankId: 'tbank',
        month: now.getMonth(),
        year: now.getFullYear(),
        items: [],
        confidence: 0,
        rawText: 'Ручной ввод категорий',
      };
      setSelectedImageUri(uri);
      setScanResult(fallbackResult);
      setReviewModalVisible(true);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showCustomAlert('Требуется разрешение', 'Разрешите доступ к галерее для выбора скриншотов.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      const asset = pickerResult.assets?.[0];
      if (!pickerResult.canceled && asset && typeof asset.base64 === 'string') {
        await processImageBase64(asset.base64, asset.uri, asset.mimeType ?? undefined);
      }
    } catch (e: any) {
      showCustomAlert('Ошибка', e.message || 'Не удалось загрузить фото');
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showCustomAlert('Требуется разрешение', 'Разрешите доступ к камере.');
        return;
      }

      const cameraResult = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      const asset = cameraResult.assets?.[0];
      if (!cameraResult.canceled && asset && typeof asset.base64 === 'string') {
        await processImageBase64(asset.base64, asset.uri, asset.mimeType ?? undefined);
      }
    } catch (e: any) {
      showCustomAlert('Ошибка', e.message || 'Не удалось сделать фото');
    }
  };

  const testDemoScan = async () => {
    setLoading(true);
    setStatusMessage('Запуск тестового демо-распознавания...');
    setTimeout(async () => {
      const demoResult = await GeminiVisionService.mockSmartRecognition();
      setScanResult(demoResult);
      setReviewModalVisible(true);
      setLoading(false);
      setStatusMessage('');
    }, 1000);
  };

  const handleConfirmSave = async (cashback: MonthlyCashback) => {
    await StorageService.saveMonthlyCashback(cashback);
    Alert.alert('Успешно!', 'Категории кэшбэка сохранены на выбранный месяц.');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="AI Сканер" subtitle="Распознавание скриншотов банков" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instruction Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.infoTitleRow}>
            <Sparkles size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Как это работает?</Text>
          </View>
          <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
            Сделайте скриншот экрана выбора кэшбэка в приложении любого банка (Т-Банк, Сбер, Альфа, ВТБ, Яндекс и др.).
            Искусственный интеллект автоматически извлечет список категорий и проценты.
          </Text>

          <View style={styles.supportedBanksRow}>
            <Text style={[styles.supportedBanksLabel, { color: colors.accentBlue }]}>
              Поддерживает любые банки РФ
            </Text>
          </View>
        </View>

        {/* Loading Indicator or Action Buttons */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>{statusMessage}</Text>
          </View>
        ) : (
          <View style={styles.actionButtonsWrap}>
            {!hasApiKey && (
              <View
                style={[
                  styles.webPasteHintCard,
                  { backgroundColor: 'rgba(234, 179, 8, 0.12)', borderColor: '#EAB308', marginBottom: 12 },
                ]}
              >
                <Key size={18} color="#EAB308" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={[styles.webPasteHintText, { color: colors.textPrimary }]}>
                  🔑 <Text style={{ fontWeight: '700' }}>AI-сканер:</Text> Для автоматического извлечения категорий и процентов со скриншота укажите бесплатный ключ Google Gemini в «Настройках» (получить можно бесплатно за 1 мин на aistudio.google.com). Без ключа доступен ручной ввод категорий.
                </Text>
              </View>
            )}

            {Platform.OS === 'web' && (
              <View
                style={[
                  styles.webPasteHintCard,
                  { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3B82F6' },
                ]}
              >
                <Sparkles size={18} color="#60A5FA" style={{ marginRight: 8 }} />
                <Text style={[styles.webPasteHintText, { color: colors.textPrimary }]}>
                  💡 Нажмите <Text style={{ fontWeight: '800', color: colors.accent }}>Ctrl+V (Cmd+V)</Text> прямо здесь, чтобы вставить скопированный скриншот из буфера!
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.galleryButton, { backgroundColor: colors.accent }]}
              onPress={pickImageFromGallery}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconWrap}>
                <ImageIcon size={24} color="#0F172A" />
              </View>
              <View style={styles.buttonTextWrap}>
                <Text style={styles.galleryButtonTitle}>Выбрать скриншот из галереи / файлов</Text>
                <Text style={styles.galleryButtonSubtitle}>Быстрое сканирование из фото</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cameraButton,
                { backgroundColor: colors.card, borderColor: colors.accentBlue },
              ]}
              onPress={takePhotoWithCamera}
              activeOpacity={0.8}
            >
              <Camera size={20} color={colors.accentBlue} style={{ marginRight: 10 }} />
              <Text style={[styles.cameraButtonText, { color: colors.accentBlue }]}>
                Сделать фото экрана / карты
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoButton,
                { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder },
              ]}
              onPress={testDemoScan}
              activeOpacity={0.8}
            >
              <Zap size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={[styles.demoButtonText, { color: colors.textSecondary }]}>
                Попробовать демо-распознавание
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips Section */}
        <View
          style={[
            styles.tipsCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>
            💡 Советы для лучшего распознавания:
          </Text>
          <View style={styles.tipItem}>
            <CheckCircle2 size={14} color={colors.accentGreen} style={{ marginRight: 6 }} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Убедитесь, что на скриншоте видны цифры процентов (например, 5%, 1%).
            </Text>
          </View>
          <View style={styles.tipItem}>
            <CheckCircle2 size={14} color={colors.accentGreen} style={{ marginRight: 6 }} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Если банк не определился автоматически, вы сможете выбрать его в окне подтверждения.
            </Text>
          </View>
          <View style={styles.tipItem}>
            <CheckCircle2 size={14} color={colors.accentGreen} style={{ marginRight: 6 }} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Вы всегда сможете подправить распознанные категории вручную перед сохранением.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Review & Save Modal */}
      <ScanReviewModal
        visible={reviewModalVisible}
        scanResult={scanResult}
        imageUri={selectedImageUri}
        banks={banks}
        onClose={() => setReviewModalVisible(false)}
        onConfirm={handleConfirmSave}
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
  infoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  supportedBanksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportedBanksLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 16,
    marginVertical: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  actionButtonsWrap: {
    gap: 12,
    marginBottom: 16,
  },
  webPasteHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  webPasteHintText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  buttonTextWrap: {
    flex: 1,
  },
  galleryButtonTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  galleryButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(15, 23, 42, 0.75)',
    marginTop: 2,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tipsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});
