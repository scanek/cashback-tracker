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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

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
        return <SettingsScreen />;
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
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.container}>
          {/* Main Active Screen */}
          <View style={styles.screenContainer}>{renderCurrentScreen()}</View>

          {/* Modern Bottom Navigation Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('dashboard')}
              activeOpacity={0.7}
            >
              <CreditCard
                size={22}
                color={activeTab === 'dashboard' ? '#FFDD2D' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'dashboard' && styles.tabLabelActiveYellow,
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
                color={activeTab === 'advisor' ? '#38BDF8' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'advisor' && styles.tabLabelActiveCyan,
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
              <View style={styles.scanButtonCircle}>
                <Camera size={22} color="#0F172A" />
              </View>
              <Text style={styles.scanTabLabel}>Сканер</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('cards')}
              activeOpacity={0.7}
            >
              <Wallet
                size={22}
                color={activeTab === 'cards' ? '#38BDF8' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'cards' && styles.tabLabelActiveCyan,
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
                color={activeTab === 'settings' ? '#38BDF8' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'settings' && styles.tabLabelActiveCyan,
                ]}
              >
                Настройки
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#090D16',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  tabLabelActiveYellow: {
    color: '#FFDD2D',
    fontWeight: '700',
  },
  tabLabelActiveCyan: {
    color: '#38BDF8',
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
    backgroundColor: '#FFDD2D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFDD2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  scanTabLabel: {
    fontSize: 11,
    color: '#FFDD2D',
    marginTop: 2,
    fontWeight: '700',
  },
});
