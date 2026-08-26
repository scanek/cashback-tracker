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
    <View style={styles.container}>
      <Header
        title="Чем платить?"
        subtitle={`Выгодные карты на ${MONTH_NAMES_RU[currentMonth]} ${currentYear}`}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Категория или магазин (АЗС, Кафе, Пятёрочка...)"
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <X size={16} color="#94A3B8" />
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
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setQuery(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search Results */}
        {query.trim().length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>
              Результаты для «{query}» ({results.length})
            </Text>

            {results.length === 0 ? (
              <View style={styles.noResultsCard}>
                <Text style={styles.noResultsText}>
                  Ни в одном банке не найдено повышенного кэшбэка на эту категорию.
                </Text>
                <Text style={styles.noResultsSub}>
                  Рекомендуем использовать любую карту с базовым кэшбэком 1% на всё.
                </Text>
              </View>
            ) : (
              results.map((res, index) => {
                const isBest = index === 0;
                return (
                  <View
                    key={`${res.bank.id}-${res.item.id}`}
                    style={[styles.matchCard, isBest && styles.bestMatchCard]}
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
                          <Text style={styles.bankTitle}>{res.bank.name}</Text>
                        </View>
                        <Text style={styles.matchReason}>{res.matchReason}</Text>
                        {res.item.note && (
                          <Text style={styles.matchNote}>Условие: {res.item.note}</Text>
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
              <TrendingUp size={18} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>
                Топ повышенных кэшбэков в этом месяце
              </Text>
            </View>

            <View style={styles.topOffersGrid}>
              {allTopOffers.map((offer, idx) => (
                <TouchableOpacity
                  key={`${offer.bank.id}-${offer.item.id}-${idx}`}
                  style={styles.topOfferCard}
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
                    <Text style={styles.topOfferCategory} numberOfLines={1}>
                      {offer.item.category}
                    </Text>
                  </View>

                  <View style={styles.topOfferRight}>
                    <Text style={styles.topOfferPercent}>{offer.item.percent}%</Text>
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
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipSelected: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  resultsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  noResultsCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noResultsText: {
    fontSize: 14,
    color: '#F8FAFC',
    marginBottom: 6,
  },
  noResultsSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  matchCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bestMatchCard: {
    borderColor: '#FFDD2D',
    backgroundColor: '#1E293B',
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDD2D',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 10,
  },
  bestBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 221, 45, 0.2)',
    borderWidth: 1,
    borderColor: '#FFDD2D',
  },
  rankCircleNormal: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  rankNumberGold: {
    color: '#FFDD2D',
  },
  rankNumberNormal: {
    color: '#94A3B8',
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
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  bankTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  matchReason: {
    fontSize: 12,
    color: '#38BDF8',
    marginTop: 2,
  },
  matchNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  percentBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 54,
    alignItems: 'center',
  },
  percentBoxGold: {
    backgroundColor: '#FFDD2D',
  },
  percentBoxNormal: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  percentValue: {
    fontSize: 18,
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
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
    marginRight: 10,
  },
  bankMiniTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topOfferCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
  },
  topOfferRight: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topOfferPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
  },
});
