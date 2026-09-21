import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { PwaService } from '../services/pwa';
import { useTheme } from '../context/ThemeContext';
import { Download, X, Smartphone } from 'lucide-react-native';

export const InstallPwaBanner: React.FC = () => {
  const { colors } = useTheme();
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (PwaService.isStandalone()) return;

    const unsubscribe = PwaService.addInstallListener((available) => {
      setCanInstall(available);
    });

    return () => unsubscribe();
  }, []);

  if (Platform.OS !== 'web' || dismissed || PwaService.isStandalone() || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    await PwaService.promptInstall();
  };

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.card,
          borderColor: colors.accentBlue,
        },
      ]}
      accessibilityLabel="Баннер установки веб-приложения"
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.badgeBackground }]}>
          <Smartphone size={20} color={colors.accentBlue} />
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Установить как приложение
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Работает офлайн без интернета прямо с главного экрана
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleInstall}
          activeOpacity={0.8}
          style={[styles.installBtn, { backgroundColor: colors.accentBlue }]}
          accessibilityRole="button"
          accessibilityLabel="Установить приложение на главный экран"
        >
          <Download size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
          <Text style={styles.installBtnText}>Установить</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.closeBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Закрыть баннер"
        >
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 14,
    marginVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
    paddingRight: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: 10,
    marginRight: 6,
  },
  installBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
