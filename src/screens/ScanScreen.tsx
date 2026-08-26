import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Bank, MonthlyCashback, ScanResult } from '../types';
import { StorageService } from '../services/storage';
import { GeminiVisionService } from '../services/gemini';
import { Header } from '../components/Header';
import { ScanReviewModal } from '../components/ScanReviewModal';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Play,
  Zap,
} from 'lucide-react-native';

export const ScanScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>();
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);

  useEffect(() => {
    const loadBanks = async () => {
      const data = await StorageService.getBanks();
      setBanks(data);
    };
    loadBanks();
  }, []);

  const processImageBase64 = async (base64: string, uri: string, mimeType?: string) => {
    try {
      setLoading(true);
      setStatusMessage('Распознаем категории кэшбэка через Gemini Vision...');

      const settings = await StorageService.getSettings();
      const detectedMime = mimeType || (uri.endsWith('.png') ? 'image/png' : 'image/jpeg');

      const result = await GeminiVisionService.analyzeScreenshot(
        base64,
        detectedMime,
        settings.geminiApiKey,
        settings.geminiModel
      );

      setSelectedImageUri(uri);
      setScanResult(result);
      setReviewModalVisible(true);
    } catch (error: any) {
      console.error('Scan error', error);
      Alert.alert(
        'Ошибка распознавания',
        error.message || 'Не удалось распознать категории. Проверьте четкость скриншота.'
      );
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Требуется разрешение', 'Разрешите доступ к галерее для выбора скриншотов.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      const asset = pickerResult.assets?.[0];
      if (!pickerResult.canceled && asset && typeof asset.base64 === 'string') {
        await processImageBase64(asset.base64, asset.uri, asset.mimeType ?? undefined);
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось загрузить фото');
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Требуется разрешение', 'Разрешите доступ к камере.');
        return;
      }

      const cameraResult = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      const asset = cameraResult.assets?.[0];
      if (!cameraResult.canceled && asset && typeof asset.base64 === 'string') {
        await processImageBase64(asset.base64, asset.uri, asset.mimeType ?? undefined);
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось сделать фото');
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
    <View style={styles.container}>
      <Header title="AI Сканер" subtitle="Распознавание скриншотов банков" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instruction Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            <Sparkles size={18} color="#FFDD2D" style={{ marginRight: 8 }} />
            <Text style={styles.infoTitle}>Как это работает?</Text>
          </View>
          <Text style={styles.infoDescription}>
            Сделайте скриншот экрана выбора кэшбэка в приложении любого банка (Т-Банк, Сбер, Альфа, ВТБ, Яндекс и др.).
            Искусственный интеллект автоматически извлечет список категорий и проценты.
          </Text>

          <View style={styles.supportedBanksRow}>
            <Text style={styles.supportedBanksLabel}>Поддерживает любые банки РФ</Text>
          </View>
        </View>

        {/* Loading Indicator or Action Buttons */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFDD2D" />
            <Text style={styles.loadingText}>{statusMessage}</Text>
          </View>
        ) : (
          <View style={styles.actionButtonsWrap}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickImageFromGallery}
              activeOpacity={0.8}
            >
              <View style={styles.buttonIconWrap}>
                <ImageIcon size={24} color="#0F172A" />
              </View>
              <View style={styles.buttonTextWrap}>
                <Text style={styles.galleryButtonTitle}>Выбрать скриншот из галереи</Text>
                <Text style={styles.galleryButtonSubtitle}>Быстрое сканирование из фото</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraButton}
              onPress={takePhotoWithCamera}
              activeOpacity={0.8}
            >
              <Camera size={20} color="#38BDF8" style={{ marginRight: 10 }} />
              <Text style={styles.cameraButtonText}>Сделать фото экрана / карты</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={testDemoScan}
              activeOpacity={0.8}
            >
              <Zap size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.demoButtonText}>Попробовать демо-распознавание</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Советы для лучшего распознавания:</Text>
          <View style={styles.tipItem}>
            <CheckCircle2 size={14} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.tipText}>
              Убедитесь, что на скриншоте видны цифры процентов (например, 5%, 1%).
            </Text>
          </View>
          <View style={styles.tipItem}>
            <CheckCircle2 size={14} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.tipText}>
              Если банк не определился автоматически, вы сможете выбрать его в окне подтверждения.
            </Text>
          </View>
          <View style={styles.tipItem}>
            <CheckCircle2 size={14} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.tipText}>
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
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  infoDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  supportedBanksRow: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  supportedBanksLabel: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  actionButtonsWrap: {
    gap: 12,
    marginBottom: 24,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDD2D',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#FFDD2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
    color: '#334155',
    marginTop: 2,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  loadingContainer: {
    backgroundColor: '#1E293B',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadingText: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '600',
    marginTop: 14,
    textAlign: 'center',
  },
  tipsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 16,
  },
});
