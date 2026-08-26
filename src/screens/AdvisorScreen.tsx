import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Bank, MonthlyCashback, SmartMatchResult } from '../types';
import { StorageService } from '../services/storage';
import { CashbackMatcher } from '../services/matcher';
import { Header } from '../components/Header';
import { POPULAR_SEARCH_QUERIES } from '../constants/categories';
import { MONTH_NAMES_RU } from '../constants/banks';
import { useTheme } from '../context/ThemeContext';
import {
  Search,
  X,
  Trophy,
  Award,
  CreditCard,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';

export const AdvisorScreen: React.FC = () => {
  const { colors } = useTheme();
  const [query, setQuery] = useState<string>('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [cashbacks, setCashbacks] = useState<MonthlyCashback[]>([]);
  const [results, setResults] = useState<SmartMatchResult[]>([]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const load = async () => {
      const allBanks = await StorageService.getBanks();
      const currentCashbacks = await StorageService.getCashbacksForMonth(currentMonth, currentYear);
      setBanks(allBanks);
      setCashbacks(currentCashbacks);
    };
    load();
  }, []);

  useEffect(() => {
    if (query.trim()) {
      const matches = CashbackMatcher.findBestCards(query, banks, cashbacks);
      setResults(matches);
    } else {
      setResults([]);
    }
  }, [query, banks, cashbacks]);

  // Aggregate top offers for the month when query is empty
  const allTopOffers = cashbacks
    .flatMap((cb) => {
      const bank = banks.find((b) => b.id === cb.bankId);
      if (!bank || !bank.isActive) return [];
      return cb.items.map((item) => ({
        bank,
        item,
      }));
    })
    .sort((a, b) => b.item.percent - a.item.percent)
    .slice(0, 8);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Чем платить?"
        subtitle={`Выгодные карты на ${MONTH_NAMES_RU[currentMonth]} ${currentYear}`}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            placeholder="Категория или магазин (АЗС, Кафе, Пятёрочка...)"
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
                onPress={() => setQuery(item)}
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
              Результаты для «{query}» ({results.length})
            </Text>

            {results.length === 0 ? (
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
              results.map((res, index) => {
                const isBest = index === 0;
                return (
                  <View
                    key={`${res.bank.id}-${res.item.id}`}
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
          /* Empty Search - Showcase Top Offers for the Month */
          <View style={styles.topOffersSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Топ повышенных кэшбэков в этом месяце
              </Text>
            </View>

            <View style={styles.topOffersGrid}>
              {allTopOffers.map((offer, idx) => (
                <TouchableOpacity
                  key={`${offer.bank.id}-${offer.item.id}-${idx}`}
                  style={[
                    styles.topOfferCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                  onPress={() => setQuery(offer.item.category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.topOfferLeft}>
                    <View
                      style={[
                        styles.bankMiniTag,
                        { backgroundColor: offer.bank.primaryColor },
                      ]}
                    >
                      <Text style={[styles.bankMiniTagText, { color: offer.bank.textColor }]}>
                        {offer.bank.shortName}
                      </Text>
                    </View>
                    <Text
                      style={[styles.topOfferCategory, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {offer.item.category}
                    </Text>
                  </View>

                  <View style={styles.topOfferRight}>
                    <Text style={[styles.topOfferPercent, { color: colors.accentBlue }]}>
                      {offer.item.percent}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
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
    paddingBottom: 16,
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
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  noResultsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
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
    marginBottom: 12,
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
    padding: 14,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankCircleGold: {
    backgroundColor: '#FFDD2D',
  },
  rankCircleNormal: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  rankNumber: {
    fontSize: 13,
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
  },
  bankIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchReason: {
    fontSize: 13,
    fontWeight: '600',
  },
  matchNote: {
    fontSize: 11,
    marginTop: 2,
  },
  percentBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
  },
  percentBoxGold: {
    backgroundColor: '#FFDD2D',
  },
  percentBoxNormal: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  percentValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  percentValueGold: {
    color: '#0F172A',
  },
  percentValueNormal: {
    color: '#38BDF8',
  },
  topOffersSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topOffersGrid: {
    gap: 8,
  },
  topOfferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  topOfferLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankMiniTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  bankMiniTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topOfferCategory: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  topOfferRight: {
    marginLeft: 8,
  },
  topOfferPercent: {
    fontSize: 14,
    fontWeight: '800',
  },
});
