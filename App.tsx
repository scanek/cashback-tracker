import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { PwaService } from './src/services/pwa';
import { NotificationService } from './src/services/notifications';
import { SecurityService } from './src/services/security';
import { PinLockScreen } from './src/screens/PinLockScreen';
import {
  CreditCard,
  Sparkles,
  Camera,
  Wallet,
  Settings as SettingsIcon,
} from 'lucide-react-native';

type TabType = 'dashboard' | 'advisor' | 'scan' | 'cards' | 'settings';

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const { colors, theme } = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = width > 768;

  useEffect(() => {
    const bootstrap = async () => {
      await StorageService.initializeDefaults();

      // Check URL query parameters for instant 1-click pairing
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.search) {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const pairKey = urlParams.get('pair') || urlParams.get('syncKey');
          const serverUrl = urlParams.get('server') || urlParams.get('serverUrl');
          if (pairKey) {
            await SyncService.pairWithKey(pairKey, serverUrl || undefined);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch {}
      }

      // Check if PIN lock is active
      const requiresPin = await SecurityService.isPinRequired();
      setIsLocked(requiresPin);
      setIsReady(true);

      SyncService.startAutoSync();
      PwaService.init();
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

  if (!isReady) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}
      >
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
      </SafeAreaView>
    );
  }

  if (isLocked) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <PinLockScreen
          mode="unlock"
          onSuccess={() => setIsLocked(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Main Content Area - Full width responsive container */}
        <View style={[styles.screenContainer, isDesktop && styles.desktopContainer]}>
          {renderCurrentScreen()}
        </View>

        {/* Modern Navigation Bar */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.tabBarBackground,
              borderTopColor: colors.tabBarBorder,
            },
          ]}
        >
          <View style={[styles.tabBarInner, isDesktop && styles.desktopTabBarInner]}>
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
      </View>
    </SafeAreaView>
  );
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
  container: {
    flex: 1,
    width: '100%',
  },
  screenContainer: {
    flex: 1,
    width: '100%',
  },
  desktopContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  tabBar: {
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
    width: '100%',
    alignItems: 'center',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  desktopTabBarInner: {
    maxWidth: 900,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
});
