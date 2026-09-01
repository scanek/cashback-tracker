import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { PwaService } from '../services/pwa';
import { useTheme } from '../context/ThemeContext';
import { Download, X, Smartphone, Sparkles } from 'lucide-react-native';

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

  if (Platform.OS !== 'web' || dismissed || (!canInstall && PwaService.isStandalone())) {
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
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          borderColor: '#38BDF8',
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.iconWrap}>
          <Smartphone size={20} color="#38BDF8" />
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: '#F8FAFC' }]}>
            Установить как приложение
          </Text>
          <Text style={[styles.subtitle, { color: '#94A3B8' }]}>
            Работает 100% офлайн без интернета прямо с главного экрана телефона
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleInstall}
          activeOpacity={0.8}
          style={[styles.installBtn, { backgroundColor: '#38BDF8' }]}
        >
          <Download size={15} color="#0F172A" style={{ marginRight: 5 }} />
          <Text style={styles.installBtnText}>Установить</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <X size={16} color="#64748B" />
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
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
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
    marginTop: 1,
  },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 4,
  },
  installBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
});
