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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Cloud size={22} color="#60A5FA" />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Облачная синхронизация</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Мгновенная двусторонняя синхронизация между веб-версией на компьютере и мобильным приложением.
          </Text>

          {/* Current Device Code */}
          <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Синхро-код этого устройства:
            </Text>
            <View style={styles.keyRow}>
              <Text style={[styles.keyText, { color: colors.accent }]}>{currentKey || 'Загрузка...'}</Text>
              <TouchableOpacity
                onPress={handleCopyKey}
                style={[styles.copyBtn, { backgroundColor: copied ? '#10B981' : colors.card, borderColor: colors.cardBorder }]}
              >
                {copied ? <Check size={16} color="#FFFFFF" /> : <Copy size={16} color={colors.textPrimary} />}
                <Text style={[styles.copyBtnText, { color: copied ? '#FFFFFF' : colors.textPrimary }]}>
                  {copied ? 'Скопировано' : 'Копировать'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Connect to Another Device */}
          <View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Подключиться к другому устройству:
            </Text>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Введите код с вашего телефона или браузера, чтобы объединить данные.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBackground, color: colors.textPrimary, borderColor: colors.inputBorder },
                ]}
                placeholder="Например: CB-4821-9921"
                placeholderTextColor={colors.textMuted}
                value={inputKey}
                onChangeText={setInputKey}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                onPress={handlePair}
                disabled={loading}
                style={[styles.pairBtn, { backgroundColor: colors.accent }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <>
                    <Text style={styles.pairBtnText}>Связать</Text>
                    <ArrowRight size={16} color="#0F172A" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleManualSyncNow}
              disabled={loading}
              style={[styles.syncNowBtn, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
            >
              <RefreshCw size={16} color={colors.accentBlue} />
              <Text style={[styles.syncNowBtnText, { color: colors.textPrimary }]}>
                Синхронизировать сейчас
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  pairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 12,
    gap: 6,
  },
  pairBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    marginTop: 8,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  syncNowBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
