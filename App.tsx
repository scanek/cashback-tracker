import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AdvisorScreen } from './src/screens/AdvisorScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { CardsManagementScreen } from './src/screens/CardsManagementScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StorageService } from './src/services/storage';
import { NotificationService } from './src/services/notifications';
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
  const { colors, theme } = useTheme();

  useEffect(() => {
    const bootstrap = async () => {
      await StorageService.initializeDefaults();
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
});
