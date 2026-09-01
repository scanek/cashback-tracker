import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AdvisorScreen } from './src/screens/AdvisorScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { CardsManagementScreen } from './src/screens/CardsManagementScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StorageService } from './src/services/storage';
import { SyncService } from './src/services/sync';
import { NotificationService } from './src/services/notifications';
import {
  CreditCard,
  Sparkles,
  Camera,
  Wallet,
  Settings as SettingsIcon,
  Smartphone,
  Sun,
  Moon,
} from 'lucide-react-native';

type TabType = 'dashboard' | 'advisor' | 'scan' | 'cards' | 'settings';

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { colors, theme, setTheme } = useTheme();
  const { width, height } = useWindowDimensions();

  const isWebDesktop = Platform.OS === 'web' && width > 560;

  useEffect(() => {
    const bootstrap = async () => {
      await StorageService.initializeDefaults();
      SyncService.startAutoSync();
      const settings = await StorageService.getSettings();
      if (settings.enableMonthlyReminders) {
        await NotificationService.scheduleMonthlyReminder();
      }
    };
    bootstrap();
  }, []);

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigateToScan={() => setActiveTab('scan')}
            onNavigateToAdvisor={() => setActiveTab('advisor')}
          />
        );
      case 'advisor':
        return <AdvisorScreen />;
      case 'scan':
        return <ScanScreen />;
      case 'cards':
        return <CardsManagementScreen />;
      case 'settings':
        return <SettingsScreen onNavigateToScan={() => setActiveTab('scan')} />;
      default:
        return (
          <DashboardScreen
            onNavigateToScan={() => setActiveTab('scan')}
            onNavigateToAdvisor={() => setActiveTab('advisor')}
          />
        );
    }
  };

  const appContent = (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
        isWebDesktop && styles.webCanvasSafeArea,
      ]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Simulated Mobile Status Notch for Web Desktop */}
      {isWebDesktop && (
        <View
          style={[
            styles.webTopStatusBar,
            { backgroundColor: colors.background, borderBottomColor: colors.cardBorder },
          ]}
        >
          <View style={styles.webSpeakerPill} />
        </View>
      )}

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Main Active Screen */}
        <View style={styles.screenContainer}>{renderCurrentScreen()}</View>

        {/* Modern Bottom Navigation Bar */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.tabBarBackground,
              borderTopColor: colors.tabBarBorder,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}
          >
            <CreditCard
              size={22}
              color={activeTab === 'dashboard' ? colors.accent : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'dashboard' ? colors.accent : colors.textMuted },
                activeTab === 'dashboard' && styles.tabLabelActive,
              ]}
            >
              Кэшбэк
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('advisor')}
            activeOpacity={0.7}
          >
            <Sparkles
              size={22}
              color={activeTab === 'advisor' ? colors.accentBlue : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'advisor' ? colors.accentBlue : colors.textMuted },
                activeTab === 'advisor' && styles.tabLabelActive,
              ]}
            >
              Чем платить
            </Text>
          </TouchableOpacity>

          {/* Center Scan Tab Button */}
          <TouchableOpacity
            style={styles.centerScanTab}
            onPress={() => setActiveTab('scan')}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.scanButtonCircle,
                {
                  backgroundColor: colors.accent,
                  shadowColor: colors.accent,
                },
              ]}
            >
              <Camera size={22} color="#0F172A" />
            </View>
            <Text style={[styles.scanTabLabel, { color: colors.accent }]}>Сканер</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('cards')}
            activeOpacity={0.7}
          >
            <Wallet
              size={22}
              color={activeTab === 'cards' ? colors.accentBlue : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'cards' ? colors.accentBlue : colors.textMuted },
                activeTab === 'cards' && styles.tabLabelActive,
              ]}
            >
              Банки
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.7}
          >
            <SettingsIcon
              size={22}
              color={activeTab === 'settings' ? colors.accentBlue : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'settings' ? colors.accentBlue : colors.textMuted },
                activeTab === 'settings' && styles.tabLabelActive,
              ]}
            >
              Настройки
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  // When viewed on wide web screens (Desktop / Tablet), display in a gorgeous smartphone frame
  if (isWebDesktop) {
    const desktopBg = theme === 'dark' ? '#070B14' : '#E2E8F0';
    const canvasWidth = Math.min(460, width - 32);
    const canvasHeight = Math.min(940, height - 36);

    return (
      <View style={[styles.webDesktopOuter, { backgroundColor: desktopBg }]}>
        {/* Top Desktop Web Bar */}
        <View style={styles.webHeaderBar}>
          <View style={styles.webBrandRow}>
            <Smartphone size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.webBrandText, { color: colors.textPrimary }]}>
              Мои Кэшбеки • Mobile Web
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.webThemeToggleBtn,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            activeOpacity={0.7}
          >
            {theme === 'dark' ? (
              <Sun size={15} color={colors.accent} />
            ) : (
              <Moon size={15} color={colors.accentBlue} />
            )}
          </TouchableOpacity>
        </View>

        {/* Center Mobile Phone Canvas */}
        <View
          style={[
            styles.webMobileCanvas,
            {
              width: canvasWidth,
              height: canvasHeight,
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
              backgroundColor: colors.background,
            },
          ]}
        >
          {appContent}
        </View>
      </View>
    );
  }

  // Native mobile app / mobile browser: full screen
  return appContent;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainAppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  webCanvasSafeArea: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  centerScanTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -14,
  },
  scanButtonCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  scanTabLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  // Web Desktop Frame Styles
  webDesktopOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  webHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 460,
    maxWidth: '100%',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  webBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webBrandText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  webThemeToggleBtn: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMobileCanvas: {
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  webTopStatusBar: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webSpeakerPill: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
  },
});
