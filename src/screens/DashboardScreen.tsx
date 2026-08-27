import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Bank, MonthlyCashback } from '../types';
import { StorageService } from '../services/storage';
import { ShareService } from '../services/share';
import { confirmDialog } from '../utils/alert';
import { Header } from '../components/Header';
import { MonthSelector } from '../components/MonthSelector';
import { BankCard } from '../components/BankCard';
import { AddCashbackModal } from '../components/AddCashbackModal';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles,
  TrendingUp,
  Layers,
} from 'lucide-react-native';

interface DashboardScreenProps {
  onNavigateToScan?: () => void;
  onNavigateToAdvisor?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateToAdvisor,
}) => {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [cashbacks, setCashbacks] = useState<MonthlyCashback[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal State for Manual Add/Edit
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const loadData = useCallback(async () => {
    const allBanks = await StorageService.getBanks();
    const activeBanks = allBanks.filter((b) => b.isActive);
    const monthCashbacks = await StorageService.getCashbacksForMonth(currentMonth, currentYear);
    setBanks(activeBanks);
    setCashbacks(monthCashbacks);
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenAdd = (bank: Bank) => {
    setSelectedBank(bank);
    setModalVisible(true);
  };

  const handleSaveCashback = async (cashback: MonthlyCashback) => {
    await StorageService.saveMonthlyCashback(cashback);
    await loadData();
  };

  const handleDeleteCashback = (bankId: string) => {
    confirmDialog(
      'Удалить кэшбэк',
      'Вы уверены, что хотите удалить категории этого банка за выбранный месяц?',
      async () => {
        await StorageService.deleteMonthlyCashback(bankId, currentMonth, currentYear);
        await loadData();
      }
    );
  };

  // Stats calculation
  const totalCategories = cashbacks.reduce((acc, curr) => acc + (curr.items?.length || 0), 0);
  const maxPercent = cashbacks.reduce((max, curr) => {
    const highestInBank = curr.items?.reduce((m, i) => Math.max(m, i.percent), 0) || 0;
    return Math.max(max, highestInBank);
  }, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Мои Кэшбеки"
        subtitle="Все кэшбэки в одном месте"
        showThemeToggle={true}
        rightAction={
          onNavigateToAdvisor
            ? {
                icon: <Sparkles size={18} color={colors.accent} />,
                onPress: onNavigateToAdvisor,
              }
            : undefined
        }
      />

      <MonthSelector
        currentMonth={currentMonth}
        currentYear={currentYear}
        onSelectMonth={(m, y) => {
          setCurrentMonth(m);
          setCurrentYear(y);
        }}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentBlue} />
        }
      >
        {/* Quick Stats Banner */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: colors.badgeBackground }]}>
              <Layers size={16} color={colors.accentBlue} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {cashbacks.length} / {banks.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Банков заполнено</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <TrendingUp size={16} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>до {maxPercent}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Макс. кэшбэк</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Sparkles size={16} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{totalCategories}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Категорий активно</Text>
          </View>
        </View>

        {/* Bank Cards List */}
        <View style={styles.banksList}>
          {banks.map((bank) => {
            const cb = cashbacks.find((c) => c.bankId === bank.id);
            return (
              <BankCard
                key={bank.id}
                bank={bank}
                cashback={cb}
                onAdd={() => handleOpenAdd(bank)}
                onEdit={() => handleOpenAdd(bank)}
                onDelete={cb ? () => handleDeleteCashback(bank.id) : undefined}
                onShare={
                  cb && cb.items && cb.items.length > 0
                    ? () => ShareService.shareBankCashback(bank, cb)
                    : undefined
                }
              />
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manual Add/Edit Modal */}
      <AddCashbackModal
        visible={modalVisible}
        bank={selectedBank}
        month={currentMonth}
        year={currentYear}
        initialCashback={
          selectedBank
            ? cashbacks.find((c) => c.bankId === selectedBank.id)
            : undefined
        }
        onClose={() => setModalVisible(false)}
        onSave={handleSaveCashback}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  banksList: {
    marginBottom: 16,
  },
});
