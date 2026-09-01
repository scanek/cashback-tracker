import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Bank, MonthlyCashback, SmartMatchResult } from '../types';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/sync';
import { CashbackMatcher } from '../services/matcher';
import { Header } from '../components/Header';
import { MonthSelector } from '../components/MonthSelector';
import { POPULAR_SEARCH_QUERIES } from '../constants/categories';
import { MONTH_NAMES_RU } from '../constants/banks';
import { useTheme } from '../context/ThemeContext';
import {
  Search,
  X,
  Trophy,
  Award,
  Sparkles,
  TrendingUp,
  Layers,
  Heart,
  User,
  Users,
} from 'lucide-react-native';

export const AdvisorScreen: React.FC = () => {
  const { colors } = useTheme();
  const [query, setQuery] = useState<string>('');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'my' | 'shared'>('all');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [cashbacks, setCashbacks] = useState<MonthlyCashback[]>([]);
  const [results, setResults] = useState<SmartMatchResult[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>('Партнер');

  const loadData = useCallback(async () => {
    const allBanks = await StorageService.getBanks();
    const currentCashbacks = await StorageService.getCashbacksForMonth(currentMonth, currentYear);
    const settings = await StorageService.getSettings();
    setBanks(allBanks);
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

  useEffect(() => {
    if (query.trim()) {
      const matches = CashbackMatcher.findBestCards(query, banks, cashbacks);
      setResults(matches);
    } else {
      setResults([]);
    }
  }, [query, banks, cashbacks]);

  // Aggregate ALL active offers for the selected month (no slicing)
  const allOffers = cashbacks
    .flatMap((cb) => {
      const bank = banks.find((b) => b.id === cb.bankId);
      if (!bank || !bank.isActive) return [];
      return (cb.items || []).map((item) => ({
        bank,
        item,
        isShared: Boolean(cb.isShared),
        sharedByName: cb.sharedByName,
      }));
    })
    .sort((a, b) => {
      if (b.item.percent !== a.item.percent) {
        return b.item.percent - a.item.percent;
      }
      return a.bank.name.localeCompare(b.bank.name);
    });

  // Filter offers by bank and owner
  const filteredOffers = allOffers.filter((o) => {
    const matchesBank = selectedBankFilter === 'all' || o.bank.id === selectedBankFilter;
    const matchesOwner =
      ownerFilter === 'all'
        ? true
        : ownerFilter === 'shared'
        ? o.isShared
        : !o.isShared;
    return matchesBank && matchesOwner;
  });

  const filteredResults = results.filter((r) => {
    if (ownerFilter === 'my') return !r.isShared;
    if (ownerFilter === 'shared') return Boolean(r.isShared);
    return true;
  });

  // Active banks that have cashbacks in this month
  const activeBanksWithCashback = banks.filter((b) =>
    cashbacks.some((c) => c.bankId === b.id && c.items && c.items.length > 0)
  );

  const sharedCount = allOffers.filter((o) => o.isShared).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Чем платить?"
        subtitle={`Все кэшбэки на ${MONTH_NAMES_RU[currentMonth]} ${currentYear}`}
      />

      <MonthSelector
        currentMonth={currentMonth}
        currentYear={currentYear}
        onSelectMonth={(m, y) => {
          setCurrentMonth(m);
          setCurrentYear(y);
        }}
      />

      {/* Owner Filter Row (All vs My vs Shared) */}
      <View style={styles.ownerFilterWrap}>
        <View
          style={[
            styles.ownerFilterContainer,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.ownerFilterBtn,
              ownerFilter === 'all' && [
                styles.ownerFilterBtnActive,
                { backgroundColor: colors.inputBackground, borderColor: colors.accent },
              ],
            ]}
            onPress={() => setOwnerFilter('all')}
            activeOpacity={0.7}
          >
            <Users
              size={13}
              color={ownerFilter === 'all' ? colors.accent : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.ownerFilterText,
                { color: ownerFilter === 'all' ? colors.accent : colors.textSecondary },
                ownerFilter === 'all' && styles.ownerFilterTextActive,
              ]}
            >
              Все ({allOffers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ownerFilterBtn,
              ownerFilter === 'my' && [
                styles.ownerFilterBtnActive,
                { backgroundColor: colors.badgeBackground, borderColor: colors.accentBlue },
              ],
            ]}
            onPress={() => setOwnerFilter('my')}
            activeOpacity={0.7}
          >
            <User
              size={13}
              color={ownerFilter === 'my' ? colors.accentBlue : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.ownerFilterText,
                { color: ownerFilter === 'my' ? colors.accentBlue : colors.textSecondary },
                ownerFilter === 'my' && styles.ownerFilterTextActive,
              ]}
            >
              Мои ({allOffers.filter((o) => !o.isShared).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ownerFilterBtn,
              ownerFilter === 'shared' && [
                styles.ownerFilterBtnActive,
                { backgroundColor: 'rgba(236, 72, 153, 0.12)', borderColor: '#EC4899' },
              ],
            ]}
            onPress={() => setOwnerFilter('shared')}
            activeOpacity={0.7}
          >
            <Heart
              size={13}
              color={ownerFilter === 'shared' ? '#EC4899' : colors.textMuted}
              fill={ownerFilter === 'shared' ? '#EC4899' : 'transparent'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.ownerFilterText,
                { color: ownerFilter === 'shared' ? '#EC4899' : colors.textSecondary },
                ownerFilter === 'shared' && styles.ownerFilterTextActive,
              ]}
            >
              {partnerName} ({sharedCount})
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
        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Поиск (Бензин, АЗС, Супермаркеты, Пятёрочка...)"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Search Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {POPULAR_SEARCH_QUERIES.map((item) => {
            const isSelected = query.toLowerCase() === item.toLowerCase();
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.chip,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  isSelected && {
                    backgroundColor: colors.accentBlue,
                    borderColor: colors.accentBlue,
                  },
                ]}
                onPress={() => setQuery(isSelected ? '' : item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search Results */}
        {query.trim().length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Результаты для «{query}» ({filteredResults.length})
            </Text>

            {filteredResults.length === 0 ? (
              <View
                style={[
                  styles.noResultsCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.noResultsText, { color: colors.textPrimary }]}>
                  Ни в одном банке не найдено повышенного кэшбэка на эту категорию.
                </Text>
                <Text style={[styles.noResultsSub, { color: colors.textSecondary }]}>
                  Рекомендуем использовать любую карту с базовым кэшбэком 1% на всё.
                </Text>
              </View>
            ) : (
              filteredResults.map((res, index) => {
                const isBest = index === 0;
                return (
                  <View
                    key={`${res.bank.id}-${res.item.id}-${res.isShared ? 'shared' : 'my'}-${index}`}
                    style={[
                      styles.matchCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      isBest && styles.bestMatchCard,
                    ]}
                  >
                    {isBest && (
                      <View style={styles.bestBadge}>
                        <Trophy size={14} color="#0F172A" style={{ marginRight: 4 }} />
                        <Text style={styles.bestBadgeText}>САМЫЙ ВЫГОДНЫЙ ВЫБОР</Text>
                      </View>
                    )}

                    <View style={styles.cardMain}>
                      <View
                        style={[
                          styles.rankCircle,
                          isBest ? styles.rankCircleGold : styles.rankCircleNormal,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankNumber,
                            isBest ? styles.rankNumberGold : styles.rankNumberNormal,
                          ]}
                        >
                          #{res.rank}
                        </Text>
                      </View>

                      <View style={styles.cardDetails}>
                        <View style={styles.bankRow}>
                          <View
                            style={[
                              styles.bankIndicator,
                              { backgroundColor: res.bank.primaryColor },
                            ]}
                          />
                          <Text style={[styles.bankTitle, { color: colors.textPrimary }]}>
                            {res.bank.name}
                          </Text>
                          {res.isShared && (
                            <View style={styles.sharedBadge}>
                              <Heart size={10} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
                              <Text style={styles.sharedBadgeText}>
                                {res.sharedByName || 'Партнер'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.matchReason, { color: colors.textSecondary }]}>
                          {res.matchReason}
                        </Text>
                        {res.item.note && (
                          <Text style={[styles.matchNote, { color: colors.textMuted }]}>
                            Условие: {res.item.note}
                          </Text>
                        )}
                      </View>

                      <View
                        style={[
                          styles.percentBox,
                          isBest ? styles.percentBoxGold : styles.percentBoxNormal,
                        ]}
                      >
                        <Text
                          style={[
                            styles.percentValue,
                            isBest ? styles.percentValueGold : styles.percentValueNormal,
                          ]}
                        >
                          {res.item.percent}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* Empty Search - Showcase ALL Cashbacks for the Month */
          <View style={styles.allOffersSection}>
            {/* Header with Total Count */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderTitleRow}>
                <TrendingUp size={18} color={colors.accentBlue} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Все активные кэшбэки на месяц ({filteredOffers.length})
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Отсортировано от самого высокого кэшбэка к базовому
              </Text>
            </View>

            {/* Bank Filter Pills */}
            {activeBanksWithCashback.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bankFilterScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.bankFilterPill,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    selectedBankFilter === 'all' && [
                      styles.bankFilterPillActive,
                      { borderColor: colors.accent },
                    ],
                  ]}
                  onPress={() => setSelectedBankFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.bankFilterPillText,
                      {
                        color:
                          selectedBankFilter === 'all'
                            ? colors.accent
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Все банки ({filteredOffers.length})
                  </Text>
                </TouchableOpacity>

                {activeBanksWithCashback.map((bank) => {
                  const count = filteredOffers.filter((o) => o.bank.id === bank.id).length;
                  const isSelected = selectedBankFilter === bank.id;
                  return (
                    <TouchableOpacity
                      key={bank.id}
                      style={[
                        styles.bankFilterPill,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        isSelected && [
                          styles.bankFilterPillActive,
                          { borderColor: bank.primaryColor },
                        ],
                      ]}
                      onPress={() => setSelectedBankFilter(isSelected ? 'all' : bank.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.bankIndicator,
                          { backgroundColor: bank.primaryColor, width: 7, height: 7 },
                        ]}
                      />
                      <Text
                        style={[
                          styles.bankFilterPillText,
                          {
                            color: isSelected ? colors.textPrimary : colors.textSecondary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {bank.shortName || bank.name} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Complete List of Cashbacks */}
            {filteredOffers.length > 0 ? (
              <View style={styles.offersList}>
                {filteredOffers.map((offer, idx) => {
                  const isHighPercent = offer.item.percent >= 10;
                  const isMediumPercent = offer.item.percent >= 5 && offer.item.percent < 10;

                  return (
                    <TouchableOpacity
                      key={`${offer.bank.id}-${offer.item.id}-${offer.isShared ? 'shared' : 'my'}-${idx}`}
                      style={[
                        styles.offerItemCard,
                        { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        isHighPercent && [
                          styles.highOfferCard,
                          { borderColor: colors.accent },
                        ],
                      ]}
                      onPress={() => setQuery(offer.item.category)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.offerItemLeft}>
                        {/* Bank Badge */}
                        <View
                          style={[
                            styles.bankBadge,
                            { backgroundColor: offer.bank.primaryColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.bankBadgeText,
                              { color: offer.bank.textColor },
                            ]}
                          >
                            {offer.bank.shortName || offer.bank.name}
                          </Text>
                        </View>

                        {/* Category and Condition Details */}
                        <View style={styles.offerDetails}>
                          <View style={styles.categoryTitleRow}>
                            <Text
                              style={[styles.offerCategoryName, { color: colors.textPrimary }]}
                            >
                              {offer.item.category}
                            </Text>
                            {offer.isShared && (
                              <View style={styles.sharedBadge}>
                                <Heart size={9} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 2 }} />
                                <Text style={styles.sharedBadgeText}>
                                  {offer.sharedByName || 'Партнер'}
                                </Text>
                              </View>
                            )}
                          </View>
                          {offer.item.note && (
                            <Text
                              style={[styles.offerNoteText, { color: colors.textMuted }]}
                              numberOfLines={1}
                            >
                              {offer.item.note}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Percentage Badge */}
                      <View
                        style={[
                          styles.offerPercentBox,
                          isHighPercent
                            ? [styles.offerPercentBoxHigh, { backgroundColor: colors.accent }]
                            : isMediumPercent
                            ? [
                                styles.offerPercentBoxMedium,
                                { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
                              ]
                            : [
                                styles.offerPercentBoxNormal,
                                { backgroundColor: colors.inputBackground },
                              ],
                        ]}
                      >
                        <Text
                          style={[
                            styles.offerPercentValue,
                            {
                              color: isHighPercent
                                ? '#0F172A'
                                : isMediumPercent
                                ? colors.accentBlue
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {offer.item.percent}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.noOffersCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.noOffersText, { color: colors.textPrimary }]}>
                  На {MONTH_NAMES_RU[currentMonth]} {currentYear} кэшбэк пока не заполнен.
                </Text>
                <Text style={[styles.noOffersSub, { color: colors.textSecondary }]}>
                  Добавьте кэшбэк в разделе «Кэшбэк» или отсканируйте скриншот через «Сканер».
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ownerFilterWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  ownerFilterContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    gap: 4,
  },
  ownerFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ownerFilterBtnActive: {
    borderWidth: 1,
  },
  ownerFilterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ownerFilterTextActive: {
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultsContainer: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  noResultsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  noResultsText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  noResultsSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  matchCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  bestMatchCard: {
    borderColor: '#FFDD2D',
    borderWidth: 1.5,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDD2D',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rankCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankCircleGold: {
    backgroundColor: '#FFDD2D',
  },
  rankCircleNormal: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '900',
  },
  rankNumberGold: {
    color: '#0F172A',
  },
  rankNumberNormal: {
    color: '#38BDF8',
  },
  cardDetails: {
    flex: 1,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  bankIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  bankTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 6,
  },
  sharedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  matchReason: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchNote: {
    fontSize: 11,
    marginTop: 2,
  },
  percentBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  percentBoxGold: {
    backgroundColor: '#FFDD2D',
  },
  percentBoxNormal: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  percentValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  percentValueGold: {
    color: '#0F172A',
  },
  percentValueNormal: {
    color: '#38BDF8',
  },
  allOffersSection: {
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankFilterScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  bankFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  bankFilterPillActive: {
    borderWidth: 1.5,
  },
  bankFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  offersList: {
    gap: 8,
  },
  offerItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  highOfferCard: {
    borderWidth: 1.5,
  },
  offerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  bankBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  offerDetails: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  offerCategoryName: {
    fontSize: 13,
    fontWeight: '600',
  },
  offerNoteText: {
    fontSize: 11,
    marginTop: 2,
  },
  offerPercentBox: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
  },
  offerPercentBoxHigh: {},
  offerPercentBoxMedium: {},
  offerPercentBoxNormal: {},
  offerPercentValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  noOffersCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  noOffersText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  noOffersSub: {
    fontSize: 11,
    textAlign: 'center',
  },
});
