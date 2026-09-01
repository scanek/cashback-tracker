import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Clipboard,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SyncService } from '../services/sync';
import { showCustomAlert } from '../utils/alert';
import { Copy, Check, ArrowRight, X, Cloud, RefreshCw } from 'lucide-react-native';

interface PairDeviceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PairDeviceModal: React.FC<PairDeviceModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [currentKey, setCurrentKey] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      SyncService.getSyncKey().then(setCurrentKey);
      SyncService.getServerUrl().then(setServerUrl);
      setInputKey('');
      setCopied(false);
    }
  }, [visible]);

  const handleCopyKey = () => {
    if (currentKey) {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(currentKey);
      } else {
        Clipboard.setString(currentKey);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePair = async () => {
    if (!inputKey.trim()) {
      showCustomAlert('Ошибка', 'Введите синхро-код другого устройства');
      return;
    }

    setLoading(true);
    const res = await SyncService.pairWithKey(inputKey.trim());
    setLoading(false);

    if (res.success) {
      showCustomAlert('Успех', res.message);
      setCurrentKey(inputKey.trim().toUpperCase());
      if (onSuccess) onSuccess();
      onClose();
    } else {
      showCustomAlert('Ошибка синхронизации', res.message);
    }
  };

  const handleManualSyncNow = async () => {
    setLoading(true);
    const success = await SyncService.performSync();
    setLoading(false);
    if (success) {
      showCustomAlert('Синхронизировано', 'Все данные успешно обновлены из облака!');
      if (onSuccess) onSuccess();
    } else {
      showCustomAlert('Офлайн', 'Не удалось связаться с сервером. Проверьте адрес сервера в настройках.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Cloud size={22} color="#38BDF8" />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Облачная синхронизация</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Мгновенный обмен кэшбэками между браузером на компьютере и телефоном.
            </Text>

            {/* Current Device Code Card */}
            <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Синхро-код этого устройства:
              </Text>
              <View style={styles.keyRow}>
                <Text style={[styles.keyText, { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>
                  {currentKey || 'Загрузка...'}
                </Text>
                <TouchableOpacity
                  onPress={handleCopyKey}
                  style={[
                    styles.copyBtn,
                    {
                      backgroundColor: copied ? '#10B981' : colors.card,
                      borderColor: copied ? '#10B981' : colors.cardBorder,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {copied ? <Check size={14} color="#FFFFFF" /> : <Copy size={14} color={colors.textPrimary} />}
                  <Text style={[styles.copyBtnText, { color: copied ? '#FFFFFF' : colors.textPrimary }]}>
                    {copied ? 'Скопировано' : 'Копировать'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Connect to Another Device Card */}
            <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Подключиться к другому устройству:
              </Text>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                Введите код с экрана вашего ПК или второго телефона:
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.textPrimary,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                  placeholder="CB-XXXX-XXXX"
                  placeholderTextColor={colors.textMuted}
                  value={inputKey}
                  onChangeText={setInputKey}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={handlePair}
                  disabled={loading}
                  style={[styles.pairBtn, { backgroundColor: colors.accent }]}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <>
                      <Text style={styles.pairBtnText}>Связать</Text>
                      <ArrowRight size={15} color="#0F172A" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Manual Sync Now button */}
            <TouchableOpacity
              onPress={handleManualSyncNow}
              disabled={loading}
              style={[
                styles.syncNowBtn,
                { borderColor: colors.cardBorder, backgroundColor: colors.background },
              ]}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color={colors.accentBlue} style={{ marginRight: 8 }} />
              <Text style={[styles.syncNowBtnText, { color: colors.textPrimary }]}>
                {loading ? 'Синхронизация...' : 'Синхронизировать сейчас'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  section: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'nowrap',
  },
  keyText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  pairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    gap: 4,
  },
  pairBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  syncNowBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
