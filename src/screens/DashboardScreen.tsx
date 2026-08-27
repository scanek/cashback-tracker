import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Bank, MonthlyCashback } from '../types';
import { StorageService } from '../services/storage';
import { Header } from '../components/Header';
import { MonthSelector } from '../components/MonthSelector';
import { BankCard } from '../components/BankCard';
import { AddCashbackModal } from '../components/AddCashbackModal';
import { ShareService } from '../services/share';
import { confirmDialog } from '../utils/alert';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles,
  TrendingUp,
  Layers,
  User,
  Heart,
  Users,
} from 'lucide-react-native';

interface DashboardScreenProps {
  onNavigateToScan?: () => void;
  onNavigateToAdvisor?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateToScan,
  onNavigateToAdvisor,
}) => {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [cashbacks, setCashbacks] = useState<MonthlyCashback[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [ownerFilter, setOwnerFilter] = useState<'my' | 'shared' | 'all'>('my');

  // Modal State for Manual Add/Edit
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [editingCashback, setEditingCashback] = useState<MonthlyCashback | undefined>(undefined);

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

  const handleOpenAdd = (bank: Bank, existingCb?: MonthlyCashback) => {
    setSelectedBank(bank);
    setEditingCashback(existingCb);
    setModalVisible(true);
  };

  const handleSaveCashback = async (cashback: MonthlyCashback) => {
    const isShared = ownerFilter === 'shared' || Boolean(editingCashback?.isShared);
    await StorageService.saveMonthlyCashback({
      ...cashback,
      isShared,
      sharedByName: isShared ? editingCashback?.sharedByName || 'Светик ❤️' : undefined,
    });
    await loadData();
  };

  const handleDeleteCashback = (bankId: string, isShared?: boolean) => {
    confirmDialog(
      'Удалить кэшбэк',
      'Вы уверены, что хотите удалить категории этого банка за выбранный месяц?',
      async () => {
        await StorageService.deleteMonthlyCashback(bankId, currentMonth, currentYear, isShared);
        await loadData();
      }
    );
  };

  // Filtered cashbacks based on tab
  const displayedCashbacks = cashbacks.filter((c) => {
    if (ownerFilter === 'my') return !c.isShared;
    if (ownerFilter === 'shared') return Boolean(c.isShared);
    return true; // 'all'
  });

  const myCashbacksCount = cashbacks.filter((c) => !c.isShared).length;
  const sharedCashbacksCount = cashbacks.filter((c) => c.isShared).length;

  // Stats calculation for the currently selected filter
  const totalCategories = displayedCashbacks.reduce(
    (acc, curr) => acc + (curr.items?.length || 0),
    0
  );
  const maxPercent = displayedCashbacks.reduce((max, curr) => {
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

      {/* Owner Tab Switcher (My Cards vs Shared Cards vs All) */}
      <View style={styles.tabSwitcherContainer}>
        <View
          style={[
            styles.tabSwitcher,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              ownerFilter === 'my' && [
                styles.tabBtnActive,
                { backgroundColor: colors.badgeBackground, borderColor: colors.accentBlue },
              ],
            ]}
            onPress={() => setOwnerFilter('my')}
            activeOpacity={0.7}
          >
            <User
              size={14}
              color={ownerFilter === 'my' ? colors.accentBlue : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: ownerFilter === 'my' ? colors.accentBlue : colors.textSecondary },
                ownerFilter === 'my' && styles.tabBtnTextActive,
              ]}
            >
              Мои карты ({myCashbacksCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              ownerFilter === 'shared' && [
                styles.tabBtnActive,
                { backgroundColor: 'rgba(236, 72, 153, 0.12)', borderColor: '#EC4899' },
              ],
            ]}
            onPress={() => setOwnerFilter('shared')}
            activeOpacity={0.7}
          >
            <Heart
              size={14}
              color={ownerFilter === 'shared' ? '#EC4899' : colors.textMuted}
              fill={ownerFilter === 'shared' ? '#EC4899' : 'transparent'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: ownerFilter === 'shared' ? '#EC4899' : colors.textSecondary },
                ownerFilter === 'shared' && styles.tabBtnTextActive,
              ]}
            >
              Светик ❤️ ({sharedCashbacksCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              ownerFilter === 'all' && [
                styles.tabBtnActive,
                { backgroundColor: colors.inputBackground, borderColor: colors.accent },
              ],
            ]}
            onPress={() => setOwnerFilter('all')}
            activeOpacity={0.7}
          >
            <Users
              size={14}
              color={ownerFilter === 'all' ? colors.accent : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: ownerFilter === 'all' ? colors.accent : colors.textSecondary },
                ownerFilter === 'all' && styles.tabBtnTextActive,
              ]}
            >
              Все ({cashbacks.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
              {displayedCashbacks.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Карт заполнено</Text>
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
          {ownerFilter === 'all' ? (
            /* All cards: list each bank & its personal and shared variants */
            cashbacks.length > 0 ? (
              cashbacks.map((cb) => {
                const bank = banks.find((b) => b.id === cb.bankId);
                if (!bank) return null;
                return (
                  <BankCard
                    key={`${cb.bankId}-${cb.isShared ? 'shared' : 'my'}`}
                    bank={bank}
                    cashback={cb}
                    onAdd={() => handleOpenAdd(bank, cb)}
                    onEdit={() => handleOpenAdd(bank, cb)}
                    onDelete={() => handleDeleteCashback(bank.id, cb.isShared)}
                    onShare={() => ShareService.shareBankCashback(bank, cb)}
                  />
                );
              })
            ) : (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.emptyStateText, { color: colors.textPrimary }]}>
                  На этот месяц кэшбэк пока не заполнен.
                </Text>
              </View>
            )
          ) : ownerFilter === 'shared' ? (
            /* Shared cards only */
            sharedCashbacksCount > 0 ? (
              cashbacks
                .filter((c) => c.isShared)
                .map((cb) => {
                  const bank = banks.find((b) => b.id === cb.bankId);
                  if (!bank) return null;
                  return (
                    <BankCard
                      key={`${cb.bankId}-shared`}
                      bank={bank}
                      cashback={cb}
                      onAdd={() => handleOpenAdd(bank, cb)}
                      onEdit={() => handleOpenAdd(bank, cb)}
                      onDelete={() => handleDeleteCashback(bank.id, true)}
                      onShare={() => ShareService.shareBankCashback(bank, cb)}
                    />
                  );
                })
            ) : (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Heart size={28} color="#EC4899" fill="rgba(236, 72, 153, 0.2)" style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyStateText, { color: colors.textPrimary }]}>
                  Пока нет импортированных карт Светика
                </Text>
                <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>
                  Нажмите «Импорт» в Настройках и вставьте код или .json файл, которым с вами поделились!
                </Text>
              </View>
            )
          ) : (
            /* My personal cards */
            banks.map((bank) => {
              const cb = cashbacks.find((c) => c.bankId === bank.id && !c.isShared);
              return (
                <BankCard
                  key={`${bank.id}-my`}
                  bank={bank}
                  cashback={cb}
                  onAdd={() => handleOpenAdd(bank)}
                  onEdit={() => handleOpenAdd(bank, cb)}
                  onDelete={cb ? () => handleDeleteCashback(bank.id, false) : undefined}
                  onShare={
                    cb && cb.items && cb.items.length > 0
                      ? () => ShareService.shareBankCashback(bank, cb)
                      : undefined
                  }
                />
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manual Add/Edit Modal */}
      <AddCashbackModal
        visible={modalVisible}
        bank={selectedBank}
        month={currentMonth}
        year={currentYear}
        initialCashback={editingCashback}
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
  tabSwitcherContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 3,
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
    marginTop: 4,
  },
  emptyStateCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});
