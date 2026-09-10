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
import { SyncService } from '../services/sync';
import { ShareService } from '../services/share';
import { Header } from '../components/Header';
import { MonthSelector } from '../components/MonthSelector';
import { BankCard } from '../components/BankCard';
import { AddCashbackModal } from '../components/AddCashbackModal';
import { PairDeviceModal } from '../components/PairDeviceModal';
import { InstallPwaBanner } from '../components/InstallPwaBanner';
import { confirmDialog } from '../utils/alert';
import { useTheme } from '../context/ThemeContext';
import {
  Percent,
  CheckCircle2,
  Sparkles,
  CreditCard,
  User,
  Heart,
  Users,
} from 'lucide-react-native';

interface DashboardScreenProps {
  onNavigateToAdvisor?: () => void;
  onNavigateToScan?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateToAdvisor,
  onNavigateToScan,
}) => {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [cashbacks, setCashbacks] = useState<MonthlyCashback[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>('Партнер');

  // Tab filter: 'my' = my cards, 'shared' = partner cards, 'all' = combined
  const [ownerFilter, setOwnerFilter] = useState<'my' | 'shared' | 'all'>('my');

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [pairModalVisible, setPairModalVisible] = useState<boolean>(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [editingCashback, setEditingCashback] = useState<MonthlyCashback | null>(null);

  const loadData = useCallback(async () => {
    const activeBanks = await StorageService.getBanks();
    const currentCashbacks = await StorageService.getCashbacksForMonth(currentMonth, currentYear);
    const settings = await StorageService.getSettings();
    setBanks(activeBanks.filter((b) => b.isActive));
    setCashbacks(currentCashbacks);
    setPartnerName(settings.partnerName || 'Партнер');
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadData();
    const unsubscribe = SyncService.addListener((status) => {
      if (status === 'synced') {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenAdd = (bank: Bank, existingCb?: MonthlyCashback) => {
    setSelectedBank(bank);
    setEditingCashback(existingCb || null);
    setModalVisible(true);
  };

  const handleSaveCashback = async (cashback: MonthlyCashback) => {
    const isShared = ownerFilter === 'shared' || Boolean(editingCashback?.isShared);
    await StorageService.saveMonthlyCashback({
      ...cashback,
      isShared,
      sharedByName: isShared ? editingCashback?.sharedByName || partnerName : undefined,
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
        showSyncBadge={true}
        onSyncPress={() => setPairModalVisible(true)}
        rightAction={
          onNavigateToAdvisor
            ? {
                icon: <Sparkles size={18} color={colors.accent} />,
                onPress: onNavigateToAdvisor,
              }
            : undefined
        }
      />

      <InstallPwaBanner />

      <MonthSelector
        currentMonth={currentMonth}
        currentYear={currentYear}
        onSelectMonth={(m, y) => {
          setCurrentMonth(m);
          setCurrentYear(y);
        }}
      />

      {/* Owner Tab Switcher (Show only if partner is active or has shared cards) */}
      {(sharedCashbacksCount > 0 || (partnerName && partnerName !== 'Партнер')) && (
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
                size={12}
                color={ownerFilter === 'my' ? colors.accentBlue : colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: ownerFilter === 'my' ? colors.accentBlue : colors.textSecondary },
                  ownerFilter === 'my' && styles.tabBtnTextActive,
                ]}
                numberOfLines={1}
              >
                Мои ({myCashbacksCount})
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
                size={12}
                color={ownerFilter === 'shared' ? '#EC4899' : colors.textMuted}
                fill={ownerFilter === 'shared' ? '#EC4899' : 'transparent'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: ownerFilter === 'shared' ? '#EC4899' : colors.textSecondary },
                  ownerFilter === 'shared' && styles.tabBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {partnerName} ({sharedCashbacksCount})
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
                size={12}
                color={ownerFilter === 'all' ? colors.accent : colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: ownerFilter === 'all' ? colors.accent : colors.textSecondary },
                  ownerFilter === 'all' && styles.tabBtnTextActive,
                ]}
                numberOfLines={1}
              >
                Все ({cashbacks.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentBlue} />
        }
      >
        {/* Compact 1-line Summary */}
        {displayedCashbacks.length > 0 && (
          <View style={styles.summaryContainer}>
            <View
              style={[
                styles.summaryBadge,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Sparkles size={13} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {displayedCashbacks.length}
                </Text>{' '}
                {displayedCashbacks.length === 1 ? 'карта' : displayedCashbacks.length < 5 ? 'карты' : 'карт'} •{' '}
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {totalCategories}
                </Text>{' '}
                {totalCategories === 1 ? 'категория' : totalCategories < 5 ? 'категории' : 'категорий'} • макс.{' '}
                <Text style={{ color: colors.accent, fontWeight: '800' }}>{maxPercent}%</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Bank List based on Filter */}
        <View style={styles.bankList}>
          {ownerFilter === 'my' ? (
            /* My personal cards: show all active banks */
            banks.map((bank) => {
              const myCb = cashbacks.find(
                (c) => c.bankId === bank.id && !c.isShared
              );
              return (
                <BankCard
                  key={`${bank.id}-my`}
                  bank={bank}
                  cashback={myCb}
                  onAdd={() => handleOpenAdd(bank, myCb)}
                  onEdit={() => handleOpenAdd(bank, myCb)}
                  onDelete={myCb ? () => handleDeleteCashback(bank.id, false) : undefined}
                  onShare={myCb ? () => ShareService.shareBankCashback(bank, myCb) : undefined}
                />
              );
            })
          ) : ownerFilter === 'all' ? (
            /* Combined view: show all cashbacks present in month */
            displayedCashbacks.length > 0 ? (
              displayedCashbacks.map((cb) => {
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
          ) : (
            /* Partner cards only */
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
                <Heart size={26} color="#EC4899" fill="rgba(236, 72, 153, 0.2)" style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyStateText, { color: colors.textPrimary }]}>
                  Пока нет карт ({partnerName})
                </Text>
                <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>
                  Нажмите «Импорт» в Настройках, чтобы добавить категории партнера, или делитесь своими картами!
                </Text>
              </View>
            )
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add / Edit Cashback Modal */}
      {selectedBank && (
        <AddCashbackModal
          visible={modalVisible}
          bank={selectedBank}
          month={currentMonth}
          year={currentYear}
          initialCashback={editingCashback || undefined}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveCashback}
          onDelete={
            editingCashback
              ? () => handleDeleteCashback(selectedBank.id, editingCashback.isShared)
              : undefined
          }
        />
      )}

      {/* Cloud Sync & Pair Device Modal */}
      <PairDeviceModal
        visible={pairModalVisible}
        onClose={() => setPairModalVisible(false)}
        onSuccess={() => loadData()}
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
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    gap: 2,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnActive: {
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabBtnTextActive: {
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summaryContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bankList: {
    marginTop: 4,
  },
  emptyStateCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
