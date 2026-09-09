import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Bank, MonthlyCashback, SmartMatchResult, CashbackItem } from '../types';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/sync';
import { CashbackMatcher } from '../services/matcher';
import { Header } from '../components/Header';
import { MonthSelector } from '../components/MonthSelector';
import { POPULAR_SEARCH_QUERIES } from '../constants/categories';
import { MONTH_NAMES_RU, PRESET_BANKS } from '../constants/banks';
import { useTheme } from '../context/ThemeContext';
import {
  Search,
  X,
  Trophy,
  Sparkles,
  TrendingUp,
  Heart,
  User,
  Users,
} from 'lucide-react-native';

export const AdvisorScreen: React.FC = () => {
  const { colors } = useTheme();
  const [query, setQuery] = useState<string>('');
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

  const resolveBank = useCallback(
    (bankId: string): Bank => {
      const found = banks.find((b) => b.id === bankId) || PRESET_BANKS.find((p) => p.id === bankId);
      if (found) return found;
      return {
        id: bankId,
        name: bankId,
        shortName: bankId,
        primaryColor: '#38BDF8',
        textColor: '#FFFFFF',
        iconName: 'CreditCard',
        isActive: true,
      };
    },
    [banks]
  );

  const allOffers = useMemo(() => {
    return cashbacks
      .flatMap((cb) => {
        const bank = resolveBank(cb.bankId);
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
  }, [cashbacks, resolveBank]);

  const filteredOffers = useMemo(() => {
    return allOffers.filter((o) => {
      if (ownerFilter === 'my') return !o.isShared;
      if (ownerFilter === 'shared') return o.isShared;
      return true;
    });
  }, [allOffers, ownerFilter]);

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (ownerFilter === 'my') return !r.isShared;
      if (ownerFilter === 'shared') return Boolean(r.isShared);
      return true;
    });
  }, [results, ownerFilter]);

  const sharedCount = allOffers.filter((o) => o.isShared).length;

  const dynamicSuggestions = useMemo(() => {
    const categoryMap = new Map<string, { category: string; maxPercent: number }>();
    filteredOffers.forEach((offer) => {
      const cat = offer.item.category.trim();
      if (!cat) return;
      const existing = categoryMap.get(cat);
      if (existing) {
        existing.maxPercent = Math.max(existing.maxPercent, offer.item.percent);
      } else {
        categoryMap.set(cat, {
          category: cat,
          maxPercent: offer.item.percent,
        });
      }
    });
    const list = Array.from(categoryMap.values()).sort((a, b) => b.maxPercent - a.maxPercent);
    if (list.length === 0) {
      return POPULAR_SEARCH_QUERIES.map((q) => ({ category: q, maxPercent: 0 }));
    }
    return list;
  }, [filteredOffers]);

  const groupedCategories = useMemo(() => {
    const map = new Map<
      string,
      {
        category: string;
        maxPercent: number;
        offers: Array<{
          bank: Bank;
          item: CashbackItem;
          isShared: boolean;
          sharedByName?: string;
        }>;
      }
    >();

    filteredOffers.forEach((offer) => {
      const cat = offer.item.category.trim();
      if (!cat) return;
      const existing = map.get(cat);
      if (existing) {
        existing.offers.push(offer);
        existing.maxPercent = Math.max(existing.maxPercent, offer.item.percent);
      } else {
        map.set(cat, {
          category: cat,
          maxPercent: offer.item.percent,
          offers: [offer],
        });
      }
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        offers: group.offers.sort((a, b) => b.item.percent - a.item.percent),
      }))
      .sort((a, b) => b.maxPercent - a.maxPercent);
  }, [filteredOffers]);

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

      {(sharedCount > 0 || (partnerName && partnerName !== 'Партнер')) && (
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
                size={12}
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
                size={12}
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
                size={12}
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
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentBlue} />
        }
      >
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Поиск (такси, аптеки, кафе, супермаркет...)"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} activeOpacity={0.7}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.quickTagsWrap}>
          {dynamicSuggestions.slice(0, 10).map((item) => {
            const isSelected = query.toLowerCase() === item.category.toLowerCase();
            return (
              <TouchableOpacity
                key={item.category}
                style={[
                  styles.chip,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  isSelected && { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
                ]}
                onPress={() => setQuery(isSelected ? '' : item.category)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    isSelected && styles.chipTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {item.category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {query.trim().length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Найдено ({filteredResults.length})
            </Text>

            {filteredResults.length === 0 ? (
              <View
                style={[
                  styles.noResultsCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.noResultsText, { color: colors.textPrimary }]}>
                  Повышенного кэшбэка не найдено
                </Text>
                <Text style={[styles.noResultsSub, { color: colors.textSecondary }]}>
                  Используйте карту с базовым кэшбэком 1% на всё.
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
                        <Trophy size={13} color="#0F172A" style={{ marginRight: 4 }} />
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

                      <View style={{ flex: 1 }}>
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
                              <Heart size={9} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 2 }} />
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
                            {res.item.note}
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
          <View style={styles.groupedSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={15} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Кэшбэк по категориям ({groupedCategories.length})
              </Text>
            </View>

            {groupedCategories.length > 0 ? (
              <View style={styles.categoriesList}>
                {groupedCategories.map((group) => (
                  <View
                    key={group.category}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                  >
                    <View style={styles.categoryCardHeader}>
                      <Text style={[styles.categoryCardTitle, { color: colors.textPrimary }]}>
                        {group.category}
                      </Text>
                      <View
                        style={[
                          styles.bestPercentBadge,
                          {
                            backgroundColor:
                              group.maxPercent >= 10 ? colors.accent : colors.badgeBackground,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bestPercentText,
                            {
                              color: group.maxPercent >= 10 ? '#0F172A' : colors.accentBlue,
                            },
                          ]}
                        >
                          до {group.maxPercent}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.categoryBanksList}>
                      {group.offers.map((offer, oIdx) => {
                        const isLeader = oIdx === 0;
                        return (
                          <TouchableOpacity
                            key={`${offer.bank.id}-${offer.item.id}-${oIdx}`}
                            style={[
                              styles.bankPillRow,
                              { backgroundColor: colors.background, borderColor: colors.cardBorder },
                              isLeader && [
                                styles.bankLeaderRow,
                                { borderColor: offer.bank.primaryColor },
                              ],
                            ]}
                            onPress={() => setQuery(offer.item.category)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.bankPillLeft}>
                              <View
                                style={[
                                  styles.bankDot,
                                  { backgroundColor: offer.bank.primaryColor },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.bankNameText,
                                  { color: colors.textPrimary },
                                  isLeader && styles.bankLeaderText,
                                ]}
                                numberOfLines={1}
                              >
                                {offer.bank.shortName || offer.bank.name}
                              </Text>
                              {offer.isShared && (
                                <View style={styles.sharedMiniTag}>
                                  <Heart size={8} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 2 }} />
                                  <Text style={styles.sharedMiniTagText}>
                                    {offer.sharedByName || 'Партнер'}
                                  </Text>
                                </View>
                              )}
                              {offer.item.note && (
                                <Text
                                  style={[styles.bankNoteText, { color: colors.textMuted }]}
                                  numberOfLines={1}
                                >
                                  ({offer.item.note})
                                </Text>
                              )}
                            </View>

                            <Text
                              style={[
                                styles.bankPercentText,
                                {
                                  color: isLeader
                                    ? group.maxPercent >= 10
                                      ? colors.accent
                                      : colors.accentBlue
                                    : colors.textSecondary,
                                },
                              ]}
                            >
                              {offer.item.percent}%
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={[
                  styles.noOffersCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Sparkles size={24} color={colors.accent} style={{ marginBottom: 6 }} />
                <Text style={[styles.noOffersText, { color: colors.textPrimary }]}>
                  Нет категорий на этот месяц
                </Text>
                <Text style={[styles.noOffersSub, { color: colors.textSecondary }]}>
                  Заполните кэшбэк на главном экране или отсканируйте скриншот.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
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
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    gap: 2,
  },
  ownerFilterBtn: {
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  quickTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextSelected: {
    fontWeight: '700',
  },
  groupedSection: {
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoriesList: {
    gap: 8,
  },
  categoryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  bestPercentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestPercentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryBanksList: {
    gap: 5,
  },
  bankPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bankLeaderRow: {
    borderWidth: 1.5,
  },
  bankPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  bankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  bankNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bankLeaderText: {
    fontWeight: '800',
  },
  bankNoteText: {
    fontSize: 10,
    marginLeft: 4,
    flexShrink: 1,
  },
  bankPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sharedMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  sharedMiniTagText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  resultsContainer: {
    marginTop: 4,
  },
  noResultsCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 6,
  },
  noResultsText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  noResultsSub: {
    fontSize: 11,
  },
  matchCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  bestMatchCard: {
    borderWidth: 1.5,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDD2D',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  rankCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankCircleGold: {
    backgroundColor: '#FFDD2D',
  },
  rankCircleNormal: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  rankNumber: {
    fontSize: 11,
    fontWeight: '900',
  },
  rankNumberGold: {
    color: '#0F172A',
  },
  rankNumberNormal: {
    color: '#38BDF8',
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  bankIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  bankTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  sharedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  matchReason: {
    fontSize: 11,
    fontWeight: '500',
  },
  matchNote: {
    fontSize: 10,
    marginTop: 1,
  },
  percentBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  percentBoxGold: {
    backgroundColor: '#FFDD2D',
  },
  percentBoxNormal: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  percentValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  percentValueGold: {
    color: '#0F172A',
  },
  percentValueNormal: {
    color: '#38BDF8',
  },
  noOffersCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
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
