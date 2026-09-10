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
  Share,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SyncService } from '../services/sync';
import { showCustomAlert } from '../utils/alert';
import { QRCodeView } from './QRCodeView';
import {
  Copy,
  Check,
  ArrowRight,
  X,
  Cloud,
  RefreshCw,
  QrCode,
  Share2,
  ClipboardList,
} from 'lucide-react-native';

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
  const [pairingUrl, setPairingUrl] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      SyncService.getSyncKey().then(setCurrentKey);
      SyncService.getPairingUrl().then(setPairingUrl);
      setInputKey('');
      setCopiedKey(false);
      setCopiedLink(false);
    }
  }, [visible]);

  const handleCopyKey = () => {
    if (currentKey) {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(currentKey);
      } else {
        Clipboard.setString(currentKey);
      }
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleCopyLink = async () => {
    if (pairingUrl) {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(pairingUrl);
      } else {
        Clipboard.setString(pairingUrl);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareLink = async () => {
    if (!pairingUrl) return;
    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({
          title: 'Мои Кэшбеки — Подключение устройства',
          text: `Подключись к моим кэшбэкам: ${pairingUrl}`,
          url: pairingUrl,
        });
      } else if (Platform.OS !== 'web') {
        await Share.share({
          message: `Мои Кэшбеки — открой ссылку для мгновенной синхронизации: ${pairingUrl}`,
        });
      } else {
        handleCopyLink();
      }
    } catch {
      handleCopyLink();
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      let text = '';
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        text = await navigator.clipboard.readText();
      } else {
        text = await Clipboard.getString();
      }
      if (text) {
        // Extract key if URL was pasted
        if (text.includes('pair=')) {
          const match = text.match(/pair=([^&]+)/);
          if (match && match[1]) {
            setInputKey(decodeURIComponent(match[1]));
            return;
          }
        }
        setInputKey(text.trim());
      }
    } catch {}
  };

  const handlePair = async () => {
    if (!inputKey.trim()) {
      showCustomAlert('Ошибка', 'Введите синхро-код или вставьте ссылку другого устройства');
      return;
    }

    setLoading(true);
    let keyToUse = inputKey.trim();
    let serverOverride: string | undefined = undefined;

    if (keyToUse.includes('pair=')) {
      const pairMatch = keyToUse.match(/pair=([^&]+)/);
      const serverMatch = keyToUse.match(/server=([^&]+)/);
      if (pairMatch && pairMatch[1]) keyToUse = decodeURIComponent(pairMatch[1]);
      if (serverMatch && serverMatch[1]) serverOverride = decodeURIComponent(serverMatch[1]);
    }

    const res = await SyncService.pairWithKey(keyToUse, serverOverride);
    setLoading(false);

    if (res.success) {
      showCustomAlert('Успех', res.message);
      setCurrentKey(keyToUse.toUpperCase());
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
      showCustomAlert('Офлайн', 'Не удалось связаться с сервером.');
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
              <Cloud size={20} color="#38BDF8" />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Синхронизация в 1 клик</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* QR Code Section */}
            <View style={[styles.qrSection, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              <Text style={[styles.qrTitle, { color: colors.textPrimary }]}>
                Отсканируйте камерой телефона
              </Text>
              <Text style={[styles.qrSubtitle, { color: colors.textSecondary }]}>
                Откройте камеру на смартфоне и наведите на этот код:
              </Text>

              <View style={styles.qrWrapper}>
                <QRCodeView value={pairingUrl || currentKey || 'CASHBACK_HUB'} size={150} />
              </View>

              {/* Action Buttons: Share & Copy Link */}
              <View style={styles.shareButtonsRow}>
                <TouchableOpacity
                  onPress={handleShareLink}
                  style={[styles.shareBtn, { backgroundColor: colors.accent }]}
                  activeOpacity={0.8}
                >
                  <Share2 size={14} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>Отправить ссылку</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCopyLink}
                  style={[
                    styles.copyLinkBtn,
                    {
                      backgroundColor: copiedLink ? '#10B981' : colors.card,
                      borderColor: copiedLink ? '#10B981' : colors.cardBorder,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {copiedLink ? <Check size={14} color="#FFFFFF" /> : <Copy size={14} color={colors.textPrimary} />}
                  <Text style={[styles.copyLinkBtnText, { color: copiedLink ? '#FFFFFF' : colors.textPrimary }]}>
                    {copiedLink ? 'Скопировано' : 'Копировать ссылку'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Code Info */}
            <View style={[styles.codeRow, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Цифровой код устройства: </Text>
              <Text style={[styles.codeValue, { color: colors.accent }]}>{SyncService.normalizeKey(currentKey) || currentKey}</Text>
              <TouchableOpacity onPress={handleCopyKey} style={styles.miniCopy} activeOpacity={0.7}>
                {copiedKey ? <Check size={13} color="#10B981" /> : <Copy size={13} color={colors.textSecondary} />}
              </TouchableOpacity>
            </View>

            {/* Manual input toggle */}
            {!showManualInput ? (
              <TouchableOpacity
                onPress={() => setShowManualInput(true)}
                style={styles.toggleManualBtn}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleManualText, { color: colors.accentBlue }]}>
                  Ввести код вручную / подключиться к другому устройству
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.manualSection, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <Text style={[styles.manualLabel, { color: colors.textPrimary }]}>
                  Подключение к другому устройству:
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
                    placeholder="2688-5999 (или ссылка)"
                    placeholderTextColor={colors.textMuted}
                    value={inputKey}
                    onChangeText={(val) => {
                      // If user pastes a link, keep the link; otherwise transliterate
                      if (val.includes('http') || val.includes('pair=')) {
                        setInputKey(val);
                      } else {
                        setInputKey(SyncService.normalizeKey(val) || val);
                      }
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={handlePasteFromClipboard}
                    style={[styles.pasteBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    activeOpacity={0.7}
                  >
                    <ClipboardList size={14} color={colors.accentBlue} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePair}
                    disabled={loading}
                    style={[styles.pairBtn, { backgroundColor: colors.accent }]}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#0F172A" />
                    ) : (
                      <ArrowRight size={16} color="#0F172A" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
              <RefreshCw size={14} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.syncNowBtnText, { color: colors.textPrimary }]}>
                {loading ? 'Синхронизация...' : 'Обновить данные сейчас'}
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
    padding: 14,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
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
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  qrSection: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
  },
  qrWrapper: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  copyLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  copyLinkBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  codeLabel: {
    fontSize: 12,
  },
  codeValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  miniCopy: {
    marginLeft: 6,
    padding: 3,
  },
  toggleManualBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  toggleManualText: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  manualSection: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  input: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  pasteBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  syncNowBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
