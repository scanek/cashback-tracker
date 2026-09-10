import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { Bank, MonthlyCashback, SmartMatchResult, CashbackItem, AdvisorViewMode } from '../types';
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
  ShoppingCart,
  Utensils,
  Fuel,
  HeartPulse,
  Car,
  Shirt,
  Package,
  Tv,
  Home,
  Film,
  Coins,
  Dog,
  Plane,
  ShoppingBag,
  List,
  CreditCard,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

interface CategoryVisual {
  Icon: any;
  color: string;
  bg: string;
}

function getCategoryVisual(categoryName: string): CategoryVisual {
  const lower = categoryName.toLowerCase();

  if (
    lower.includes('супермаркет') ||
    lower.includes('продукт') ||
    lower.includes('еда') ||
    lower.includes('пятерочк') ||
    lower.includes('магнит') ||
    lower.includes('перекрест') ||
    lower.includes('лент') ||
    lower.includes('ашан') ||
    lower.includes('вкусвилл') ||
    lower.includes('самокат')
  ) {
    return { Icon: ShoppingCart, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
  }
  if (
    lower.includes('ресторан') ||
    lower.includes('кафе') ||
    lower.includes('фастфуд') ||
    lower.includes('кофе') ||
    lower.includes('додо') ||
    lower.includes('бургер') ||
    lower.includes('пицц') ||
    lower.includes('суши')
  ) {
    return { Icon: Utensils, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
  }
  if (
    lower.includes('азс') ||
    lower.includes('топлив') ||
    lower.includes('бензин') ||
    lower.includes('заправк') ||
    lower.includes('лукойл') ||
    lower.includes('газпром') ||
    lower.includes('роснефт') ||
    lower.includes('teboil')
  ) {
    return { Icon: Fuel, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
  }
  if (
    lower.includes('аптек') ||
    lower.includes('лекарств') ||
    lower.includes('здоровь') ||
    lower.includes('медицин') ||
    lower.includes('клиник') ||
    lower.includes('еаптек')
  ) {
    return { Icon: HeartPulse, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' };
  }
  if (
    lower.includes('такси') ||
    lower.includes('транспорт') ||
    lower.includes('каршеринг') ||
    lower.includes('яндекс го') ||
    lower.includes('uber') ||
    lower.includes('автобус') ||
    lower.includes('метро')
  ) {
    return { Icon: Car, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
  }
  if (
    lower.includes('одежд') ||
    lower.includes('обув') ||
    lower.includes('вещ') ||
    lower.includes('lamoda') ||
    lower.includes('спортмастер') ||
    lower.includes('zara')
  ) {
    return { Icon: Shirt, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' };
  }
  if (
    lower.includes('маркетплейс') ||
    lower.includes('озон') ||
    lower.includes('ozon') ||
    lower.includes('wildberries') ||
    lower.includes('вайлдберриз') ||
    lower.includes('wb') ||
    lower.includes('мегамаркет') ||
    lower.includes('яндекс маркет')
  ) {
    return { Icon: Package, color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' };
  }
  if (
    lower.includes('техник') ||
    lower.includes('электроник') ||
    lower.includes('мвидео') ||
    lower.includes('днс') ||
    lower.includes('dns') ||
    lower.includes('эльдорадо') ||
    lower.includes('компьютер')
  ) {
    return { Icon: Tv, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' };
  }
  if (
    lower.includes('дом') ||
    lower.includes('ремонт') ||
    lower.includes('мебель') ||
    lower.includes('леруа') ||
    lower.includes('лемана') ||
    lower.includes('петрович') ||
    lower.includes('ikea') ||
    lower.includes('хофф')
  ) {
    return { Icon: Home, color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' };
  }
  if (
    lower.includes('кино') ||
    lower.includes('развлечен') ||
    lower.includes('билет') ||
    lower.includes('театр') ||
    lower.includes('концерт') ||
    lower.includes('афиш')
  ) {
    return { Icon: Film, color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.12)' };
  }
  if (
    lower.includes('косметик') ||
    lower.includes('красот') ||
    lower.includes('парфюм') ||
    lower.includes('золотое яблоко') ||
    lower.includes('лэтуаль') ||
    lower.includes('рив гош')
  ) {
    return { Icon: Sparkles, color: '#F472B6', bg: 'rgba(244, 114, 182, 0.12)' };
  }
  if (
    lower.includes('все покупк') ||
    lower.includes('на все') ||
    lower.includes('на всё') ||
    lower.includes('базов') ||
    lower.includes('любые покупк')
  ) {
    return { Icon: Coins, color: '#EAB308', bg: 'rgba(234, 179, 8, 0.12)' };
  }
  if (
    lower.includes('животн') ||
    lower.includes('зоо') ||
    lower.includes('корм') ||
    lower.includes('вет')
  ) {
    return { Icon: Dog, color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.12)' };
  }
  if (
    lower.includes('путешеств') ||
    lower.includes('отел') ||
    lower.includes('авиа') ||
    lower.includes('ржд') ||
    lower.includes('билет') ||
    lower.includes('тур')
  ) {
    return { Icon: Plane, color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)' };
  }

  return { Icon: ShoppingBag, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
}

const MANDATORY_CATEGORIES = [
  {
    name: 'Супермаркеты и продукты',
    shortName: 'Супермаркеты',
    keywords: ['супермаркет', 'продукт', 'еда', 'пятерочк', 'магнит', 'перекрест', 'лент', 'ашан', 'вкусвилл', 'самокат', 'чижик'],
  },
  {
    name: 'Аптеки и здоровье',
    shortName: 'Аптеки',
    keywords: ['аптек', 'лекарств', 'здоровь', 'медицин', 'клиник', 'еаптек', 'горздрав', 'ригла', 'вита'],
  },
  {
    name: 'АЗС и топливо',
    shortName: 'АЗС (Топливо)',
    keywords: ['азс', 'топлив', 'бензин', 'заправк', 'лукойл', 'газпром', 'роснефт', 'teboil', 'татнефть'],
  },
];

function getCategoryPriority(categoryName: string): number {
  const lower = categoryName.toLowerCase();
  if (
    lower.includes('супермаркет') ||
    lower.includes('продукт') ||
    lower.includes('еда') ||
    lower.includes('пятерочк') ||
    lower.includes('магнит') ||
    lower.includes('перекрест') ||
    lower.includes('лент') ||
    lower.includes('ашан')
  ) {
    return 1; // 🛒 #1 Супермаркеты
  }
  if (
    lower.includes('аптек') ||
    lower.includes('лекарств') ||
    lower.includes('здоровь') ||
    lower.includes('медицин') ||
    lower.includes('еаптек')
  ) {
    return 2; // 💊 #2 Аптеки
  }
  if (
    lower.includes('азс') ||
    lower.includes('топлив') ||
    lower.includes('бензин') ||
    lower.includes('заправк') ||
    lower.includes('лукойл') ||
    lower.includes('газпром') ||
    lower.includes('роснефт') ||
    lower.includes('teboil')
  ) {
    return 3; // ⛽ #3 АЗС и Топливо
  }
  return 99; // Все остальные категории
}

interface GroupedCategory {
  category: string;
  maxPercent: number;
  offers: Array<{
    bank: Bank;
    item: CashbackItem;
    isShared: boolean;
    sharedByName?: string;
  }>;
}

export const AdvisorScreen: React.FC = () => {
  const { colors } = useTheme();
  const [query, setQuery] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'my' | 'shared'>('all');
  const [viewMode, setViewMode] = useState<AdvisorViewMode>('compact');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [cashbacks, setCashbacks] = useState<MonthlyCashback[]>([]);
  const [results, setResults] = useState<SmartMatchResult[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>('Партнер');
  const [selectedCategory, setSelectedCategory] = useState<GroupedCategory | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const allBanks = await StorageService.getBanks();
    const currentCashbacks = await StorageService.getCashbacksForMonth(currentMonth, currentYear);
    const settings = await StorageService.getSettings();
    setBanks(allBanks);
    setCashbacks(currentCashbacks);
    setPartnerName(settings.partnerName || 'Партнер');
    if (settings.advisorViewMode) {
      setViewMode(settings.advisorViewMode);
    }
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

  const handleSelectViewMode = async (mode: AdvisorViewMode) => {
    setViewMode(mode);
    await StorageService.saveSettings({ advisorViewMode: mode });
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
    (bankId: string): Bank | null => {
      const found = banks.find((b) => b.id === bankId && b.isActive && !b.deletedAt);
      if (found) return found;
      return null;
    },
    [banks]
  );

  const allOffers = useMemo(() => {
    const activeBankMap = new Map(
      banks.filter((b) => b.isActive && !b.deletedAt).map((b) => [b.id, b])
    );

    return cashbacks
      .filter((cb) => !cb.deletedAt && activeBankMap.has(cb.bankId))
      .flatMap((cb) => {
        const bank = activeBankMap.get(cb.bankId)!;
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
  }, [cashbacks, banks]);

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

  // Best fallback card for all purchases (1% base) - ONLY from banks the user actually has active offers for
  const defaultFallbackOffers = useMemo(() => {
    const allPurchases = filteredOffers.filter((o) => {
      const lower = o.item.category.toLowerCase();
      return (
        lower.includes('все покупк') ||
        lower.includes('на все') ||
        lower.includes('на всё') ||
        lower.includes('любые покупк') ||
        lower.includes('базов')
      );
    });

    if (allPurchases.length > 0) {
      return allPurchases;
    }

    // Only use banks that the user actually has in this month's active offers
    const banksInUse = Array.from(
      new Map(filteredOffers.map((o) => [o.bank.id, o.bank])).values()
    );

    if (banksInUse.length > 0) {
      return banksInUse.map((b) => ({
        bank: b,
        item: {
          id: `fallback-all-${b.id}`,
          category: '1% на все покупки',
          percent: 1,
          note: 'Базовый кэшбэк на всё',
        },
        isShared: false,
        sharedByName: undefined as string | undefined,
      }));
    }

    return [];
  }, [filteredOffers]);

  const groupedCategories: GroupedCategory[] = useMemo(() => {
    const map = new Map<string, GroupedCategory>();

    // 1. Add all explicit scanned / added offers
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

    // 2. Only add mandatory categories fallback if user has active banks with offers
    if (defaultFallbackOffers.length > 0) {
      MANDATORY_CATEGORIES.forEach((mandatory) => {
        const hasCategory = Array.from(map.keys()).some((catKey) => {
          const lower = catKey.toLowerCase();
          return mandatory.keywords.some((kw) => lower.includes(kw));
        });

        if (!hasCategory) {
          map.set(mandatory.name, {
            category: mandatory.name,
            maxPercent: defaultFallbackOffers[0]?.item.percent || 1,
            offers: defaultFallbackOffers.map((d) => ({
              bank: d.bank,
              item: {
                id: `mandatory-${d.bank.id}-${mandatory.name}`,
                category: mandatory.name,
                percent: d.item.percent || 1,
                note: '1% базовый кэшбэк',
              },
              isShared: d.isShared,
              sharedByName: d.sharedByName,
            })),
          });
        }
      });
    }

    // 3. SORT: Supermarkets (#1), Pharmacies (#2), Fuel (#3) FIRST, then by highest %
    return Array.from(map.values())
      .map((group) => ({
        ...group,
        offers: group.offers.sort((a, b) => b.item.percent - a.item.percent),
      }))
      .sort((a, b) => {
        const prioA = getCategoryPriority(a.category);
        const prioB = getCategoryPriority(b.category);
        if (prioA !== prioB) {
          return prioA - prioB; // 1 (Supermarkets), 2 (Pharmacies), 3 (Fuel), then 99
        }
        return b.maxPercent - a.maxPercent; // highest % first within other categories
      });
  }, [filteredOffers, defaultFallbackOffers]);

  const dynamicSuggestions = useMemo(() => {
    const list: Array<{ category: string; maxPercent: number }> = [];
    groupedCategories.forEach((group) => {
      list.push({
        category: group.category,
        maxPercent: group.maxPercent,
      });
    });

    if (list.length === 0) {
      return POPULAR_SEARCH_QUERIES.map((q) => ({ category: q, maxPercent: 0 }));
    }
    return list;
  }, [groupedCategories]);

  const spotlightOffers = useMemo(() => {
    const all = groupedCategories.flatMap((g) => g.offers);
    return all.sort((a, b) => {
      const prioA = getCategoryPriority(a.item.category);
      const prioB = getCategoryPriority(b.item.category);
      if (prioA !== prioB) {
        return prioA - prioB;
      }
      return b.item.percent - a.item.percent;
    });
  }, [groupedCategories]);

  const activeMonthBanks = useMemo(() => {
    const map = new Map<string, { bank: Bank; count: number; maxPercent: number }>();
    filteredOffers.forEach((o) => {
      const existing = map.get(o.bank.id);
      if (existing) {
        existing.count += 1;
        existing.maxPercent = Math.max(existing.maxPercent, o.item.percent);
      } else {
        map.set(o.bank.id, { bank: o.bank, count: 1, maxPercent: o.item.percent });
      }
    });
    return Array.from(map.values());
  }, [filteredOffers]);

  useEffect(() => {
    if (activeMonthBanks.length > 0) {
      if (!selectedBankId || !activeMonthBanks.some((b) => b.bank.id === selectedBankId)) {
        setSelectedBankId(activeMonthBanks[0].bank.id);
      }
    } else {
      setSelectedBankId(null);
    }
  }, [activeMonthBanks, selectedBankId]);

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

      <View style={styles.topControlsWrap}>
        <View
          style={[
            styles.viewModeSwitcher,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              viewMode === 'compact' && [
                styles.viewModeBtnActive,
                { backgroundColor: colors.inputBackground, borderColor: colors.accent },
              ],
            ]}
            onPress={() => handleSelectViewMode('compact')}
            activeOpacity={0.7}
          >
            <List
              size={13}
              color={viewMode === 'compact' ? colors.accent : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.viewModeBtnText,
                { color: viewMode === 'compact' ? colors.accent : colors.textSecondary },
                viewMode === 'compact' && styles.viewModeBtnTextActive,
              ]}
            >
              Список
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              viewMode === 'spotlight' && [
                styles.viewModeBtnActive,
                { backgroundColor: colors.inputBackground, borderColor: colors.accent },
              ],
            ]}
            onPress={() => handleSelectViewMode('spotlight')}
            activeOpacity={0.7}
          >
            <Search
              size={13}
              color={viewMode === 'spotlight' ? colors.accent : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.viewModeBtnText,
                { color: viewMode === 'spotlight' ? colors.accent : colors.textSecondary },
                viewMode === 'spotlight' && styles.viewModeBtnTextActive,
              ]}
            >
              Топ-%
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              viewMode === 'by_bank' && [
                styles.viewModeBtnActive,
                { backgroundColor: colors.inputBackground, borderColor: colors.accent },
              ],
            ]}
            onPress={() => handleSelectViewMode('by_bank')}
            activeOpacity={0.7}
          >
            <CreditCard
              size={13}
              color={viewMode === 'by_bank' ? colors.accent : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.viewModeBtnText,
                { color: viewMode === 'by_bank' ? colors.accent : colors.textSecondary },
                viewMode === 'by_bank' && styles.viewModeBtnTextActive,
              ]}
            >
              Банки
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              viewMode === 'grid' && [
                styles.viewModeBtnActive,
                { backgroundColor: colors.inputBackground, borderColor: colors.accent },
              ],
            ]}
            onPress={() => handleSelectViewMode('grid')}
            activeOpacity={0.7}
          >
            <LayoutGrid
              size={13}
              color={viewMode === 'grid' ? colors.accent : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.viewModeBtnText,
                { color: viewMode === 'grid' ? colors.accent : colors.textSecondary },
                viewMode === 'grid' && styles.viewModeBtnTextActive,
              ]}
            >
              Плитки
            </Text>
          </TouchableOpacity>
        </View>

        {(sharedCount > 0 || (partnerName && partnerName !== 'Партнер')) && (
          <View
            style={[
              styles.ownerFilterContainer,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 4 },
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
                size={11}
                color={ownerFilter === 'all' ? colors.accent : colors.textMuted}
                style={{ marginRight: 3 }}
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
                size={11}
                color={ownerFilter === 'my' ? colors.accentBlue : colors.textMuted}
                style={{ marginRight: 3 }}
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
                size={11}
                color={ownerFilter === 'shared' ? '#EC4899' : colors.textMuted}
                fill={ownerFilter === 'shared' ? '#EC4899' : 'transparent'}
                style={{ marginRight: 3 }}
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
        )}
      </View>

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
            placeholder="Поиск магазина или категории (напр. Пятерочка, АЗС)..."
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
          {dynamicSuggestions.slice(0, 8).map((item) => {
            const isSelected = query.toLowerCase() === item.category.toLowerCase();
            const visual = getCategoryVisual(item.category);
            const VisualIcon = visual.Icon;
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
                <VisualIcon
                  size={12}
                  color={isSelected ? '#FFFFFF' : visual.color}
                  style={{ marginRight: 4 }}
                />
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
                {item.maxPercent > 0 && (
                  <Text
                    style={[
                      styles.chipPercentText,
                      { color: isSelected ? '#FFFFFF' : colors.accent },
                    ]}
                  >
                    {item.maxPercent}%
                  </Text>
                )}
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
                  Используйте карту с базовым кэшбэком 1% на все покупки.
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
        ) : groupedCategories.length === 0 ? (
          <View
            style={[
              styles.noOffersCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Sparkles size={28} color={colors.accent} style={{ marginBottom: 8 }} />
            <Text style={[styles.noOffersText, { color: colors.textPrimary }]}>
              Нет категорий на этот месяц
            </Text>
            <Text style={[styles.noOffersSub, { color: colors.textSecondary }]}>
              Отсканируйте скриншоты банков в разделе «Кэшбэк».
            </Text>
          </View>
        ) : viewMode === 'compact' ? (
          <View style={styles.compactSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={15} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Кэшбэк по категориям ({groupedCategories.length})
              </Text>
            </View>

            <View style={styles.compactList}>
              {groupedCategories.map((group) => {
                const isExpanded = expandedCategory === group.category;
                const visual = getCategoryVisual(group.category);
                const VisualIcon = visual.Icon;
                const leader = group.offers[0];
                const hasMultiple = group.offers.length > 1;

                return (
                  <View
                    key={group.category}
                    style={[
                      styles.compactCardWrapper,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      isExpanded && { borderColor: colors.accent, borderWidth: 1.5 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.compactRow}
                      onPress={() =>
                        setExpandedCategory(isExpanded ? null : group.category)
                      }
                      activeOpacity={0.7}
                    >
                      <View style={[styles.compactIconCircle, { backgroundColor: visual.bg }]}>
                        <VisualIcon size={16} color={visual.color} />
                      </View>

                      <View style={styles.compactTitleWrap}>
                        <Text
                          style={[styles.compactCategoryName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {group.category}
                        </Text>
                      </View>

                      <View style={styles.compactRightWrap}>
                        <View
                          style={[
                            styles.compactBankDot,
                            { backgroundColor: leader?.bank.primaryColor || '#38BDF8' },
                          ]}
                        />
                        <Text
                          style={[styles.compactBankName, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {leader?.bank.shortName || leader?.bank.name}
                        </Text>

                        <View
                          style={[
                            styles.compactPercentBadge,
                            {
                              backgroundColor:
                                group.maxPercent >= 10
                                  ? colors.accent
                                  : 'rgba(56, 189, 248, 0.15)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.compactPercentText,
                              {
                                color: group.maxPercent >= 10 ? '#0F172A' : '#38BDF8',
                              },
                            ]}
                          >
                            {group.maxPercent}%
                          </Text>
                        </View>

                        {hasMultiple && (
                          <View style={{ marginLeft: 4 }}>
                            {isExpanded ? (
                              <ChevronUp size={14} color={colors.accent} />
                            ) : (
                              <ChevronDown size={14} color={colors.textMuted} />
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View
                        style={[
                          styles.accordionContent,
                          { backgroundColor: colors.inputBackground, borderTopColor: colors.cardBorder },
                        ]}
                      >
                        {group.offers.map((offer, oIdx) => {
                          const isLeader = oIdx === 0;
                          return (
                            <View
                              key={`${offer.bank.id}-${oIdx}`}
                              style={[
                                styles.accordionRow,
                                oIdx < group.offers.length - 1 && {
                                  borderBottomWidth: 1,
                                  borderBottomColor: 'rgba(148, 163, 184, 0.1)',
                                },
                              ]}
                            >
                              <View style={styles.accordionLeft}>
                                <View
                                  style={[
                                    styles.bankDot,
                                    { backgroundColor: offer.bank.primaryColor },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.accordionBankTitle,
                                    {
                                      color: colors.textPrimary,
                                      fontWeight: isLeader ? '800' : '600',
                                    },
                                  ]}
                                >
                                  {offer.bank.name}
                                </Text>
                                {isLeader && (
                                  <View style={styles.leaderMiniBadge}>
                                    <Text style={styles.leaderMiniBadgeText}>ЛИДЕР</Text>
                                  </View>
                                )}
                                {offer.isShared && (
                                  <View style={styles.sharedMiniTag}>
                                    <Text style={styles.sharedMiniTagText}>
                                      {offer.sharedByName || partnerName}
                                    </Text>
                                  </View>
                                )}
                                {offer.item.note && (
                                  <Text
                                    style={[styles.accordionNote, { color: colors.textMuted }]}
                                    numberOfLines={1}
                                  >
                                    ({offer.item.note})
                                  </Text>
                                )}
                              </View>

                              <Text
                                style={[
                                  styles.accordionPercent,
                                  {
                                    color: isLeader ? colors.accent : colors.accentBlue,
                                  },
                                ]}
                              >
                                {offer.item.percent}%
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : viewMode === 'spotlight' ? (
          <View style={styles.spotlightSection}>
            <View style={styles.sectionHeader}>
              <Trophy size={16} color="#FFDD2D" style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                🔥 Золотой рейтинг месяца
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              {spotlightOffers.map((offer, idx) => {
                const isTop3 = idx < 3;
                const visual = getCategoryVisual(offer.item.category);
                const VisualIcon = visual.Icon;

                return (
                  <View
                    key={`${offer.bank.id}-${offer.item.id}-${idx}`}
                    style={[
                      styles.matchCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      idx === 0 && styles.bestMatchCard,
                    ]}
                  >
                    <View style={styles.cardMain}>
                      <View
                        style={[
                          styles.rankCircle,
                          idx === 0
                            ? styles.rankCircleGold
                            : isTop3
                            ? { backgroundColor: 'rgba(255, 221, 45, 0.15)' }
                            : styles.rankCircleNormal,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankNumber,
                            idx === 0 ? styles.rankNumberGold : styles.rankNumberNormal,
                          ]}
                        >
                          #{idx + 1}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <VisualIcon size={14} color={visual.color} style={{ marginRight: 5 }} />
                          <Text
                            style={[
                              styles.spotlightCategoryTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {offer.item.category}
                          </Text>
                        </View>

                        <View style={[styles.bankRow, { marginTop: 2 }]}>
                          <View
                            style={[
                              styles.bankIndicator,
                              { backgroundColor: offer.bank.primaryColor },
                            ]}
                          />
                          <Text style={[styles.bankTitle, { color: colors.textSecondary }]}>
                            {offer.bank.name}
                          </Text>
                          {offer.isShared && (
                            <View style={styles.sharedBadge}>
                              <Heart size={8} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 2 }} />
                              <Text style={styles.sharedBadgeText}>
                                {offer.sharedByName || partnerName}
                              </Text>
                            </View>
                          )}
                          {offer.item.note && (
                            <Text style={[styles.matchNote, { color: colors.textMuted, marginLeft: 6 }]}>
                              {offer.item.note}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View
                        style={[
                          styles.percentBox,
                          idx === 0
                            ? styles.percentBoxGold
                            : { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.percentValue,
                            idx === 0 ? styles.percentValueGold : styles.percentValueNormal,
                          ]}
                        >
                          {offer.item.percent}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : viewMode === 'by_bank' ? (
          <View style={styles.byBankSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankTabsScroll}
            >
              {activeMonthBanks.map(({ bank, count, maxPercent }) => {
                const isSelected = selectedBankId === bank.id;
                return (
                  <TouchableOpacity
                    key={bank.id}
                    style={[
                      styles.bankSelectTab,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      isSelected && {
                        borderColor: bank.primaryColor,
                        borderWidth: 1.5,
                        backgroundColor: colors.inputBackground,
                      },
                    ]}
                    onPress={() => setSelectedBankId(bank.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.bankDot, { backgroundColor: bank.primaryColor }]} />
                    <Text
                      style={[
                        styles.bankSelectTabText,
                        { color: isSelected ? colors.textPrimary : colors.textSecondary },
                        isSelected && { fontWeight: '800' },
                      ]}
                    >
                      {bank.shortName || bank.name}
                    </Text>
                    <View
                      style={[
                        styles.bankTabBadge,
                        { backgroundColor: isSelected ? bank.primaryColor : colors.badgeBackground },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bankTabBadgeText,
                          { color: isSelected ? '#0F172A' : colors.textMuted },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {(() => {
              const currentBankOffers = filteredOffers.filter(
                (o) => o.bank.id === selectedBankId
              );
              const currentBank = banks.find((b) => b.id === selectedBankId);

              return (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <View
                    style={[
                      styles.selectedBankBanner,
                      {
                        backgroundColor: colors.card,
                        borderColor: currentBank?.primaryColor || colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={[
                          styles.bankIndicator,
                          {
                            backgroundColor: currentBank?.primaryColor || '#38BDF8',
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                          },
                        ]}
                      />
                      <Text style={[styles.selectedBankTitle, { color: colors.textPrimary }]}>
                        {currentBank?.name}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {currentBankOffers.length} категорий
                    </Text>
                  </View>

                  {currentBankOffers.map((offer, idx) => {
                    const visual = getCategoryVisual(offer.item.category);
                    const VisualIcon = visual.Icon;

                    return (
                      <View
                        key={`${offer.item.id}-${idx}`}
                        style={[
                          styles.compactCardWrapper,
                          { backgroundColor: colors.card, borderColor: colors.cardBorder },
                        ]}
                      >
                        <View style={styles.compactRow}>
                          <View style={[styles.compactIconCircle, { backgroundColor: visual.bg }]}>
                            <VisualIcon size={16} color={visual.color} />
                          </View>
                          <View style={styles.compactTitleWrap}>
                            <Text
                              style={[styles.compactCategoryName, { color: colors.textPrimary }]}
                            >
                              {offer.item.category}
                            </Text>
                            {offer.item.note && (
                              <Text style={[styles.accordionNote, { color: colors.textMuted }]}>
                                {offer.item.note}
                              </Text>
                            )}
                          </View>
                          <View
                            style={[
                              styles.compactPercentBadge,
                              {
                                backgroundColor:
                                  offer.item.percent >= 10
                                    ? colors.accent
                                    : 'rgba(56, 189, 248, 0.15)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.compactPercentText,
                                {
                                  color: offer.item.percent >= 10 ? '#0F172A' : '#38BDF8',
                                },
                              ]}
                            >
                              {offer.item.percent}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        ) : (
          <View style={styles.gridSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={15} color={colors.accentBlue} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Категории месяца ({groupedCategories.length})
              </Text>
            </View>

            <View style={styles.gridContainer}>
              {groupedCategories.map((group) => {
                const visual = getCategoryVisual(group.category);
                const VisualIcon = visual.Icon;
                const leader = group.offers[0];
                const hasMultiple = group.offers.length > 1;

                return (
                  <TouchableOpacity
                    key={group.category}
                    style={[
                      styles.gridTile,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                    onPress={() => setSelectedCategory(group)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tileTopRow}>
                      <View style={[styles.tileIconCircle, { backgroundColor: visual.bg }]}>
                        <VisualIcon size={18} color={visual.color} />
                      </View>
                      <View
                        style={[
                          styles.tilePercentBadge,
                          {
                            backgroundColor:
                              group.maxPercent >= 10
                                ? colors.accent
                                : 'rgba(56, 189, 248, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tilePercentText,
                            {
                              color: group.maxPercent >= 10 ? '#0F172A' : '#38BDF8',
                            },
                          ]}
                        >
                          {group.maxPercent}%
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[styles.tileCategoryTitle, { color: colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {group.category}
                    </Text>

                    <View style={styles.tileBottomRow}>
                      <View style={styles.tileLeaderWrap}>
                        <View
                          style={[
                            styles.tileBankDot,
                            { backgroundColor: leader?.bank.primaryColor || '#38BDF8' },
                          ]}
                        />
                        <Text
                          style={[styles.tileBankName, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {leader?.bank.shortName || leader?.bank.name}
                        </Text>
                      </View>

                      {hasMultiple && (
                        <View
                          style={[
                            styles.tileExtraBadge,
                            { backgroundColor: colors.inputBackground },
                          ]}
                        >
                          <Text
                            style={[styles.tileExtraText, { color: colors.textMuted }]}
                          >
                            +{group.offers.length - 1}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {selectedCategory && (
        <Modal
          visible={Boolean(selectedCategory)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedCategory(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {(() => {
                    const visual = getCategoryVisual(selectedCategory.category);
                    const VisualIcon = visual.Icon;
                    return (
                      <View style={[styles.tileIconCircle, { backgroundColor: visual.bg, marginRight: 10 }]}>
                        <VisualIcon size={20} color={visual.color} />
                      </View>
                    );
                  })()}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                      {selectedCategory.category}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      {selectedCategory.offers.length} {selectedCategory.offers.length === 1 ? 'карта' : 'карты'} с кэшбэком
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedCategory(null)}
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {selectedCategory.offers.map((offer, idx) => {
                  const isLeader = idx === 0;
                  return (
                    <View
                      key={`${offer.bank.id}-${idx}`}
                      style={[
                        styles.modalOfferRow,
                        {
                          backgroundColor: isLeader ? colors.inputBackground : 'transparent',
                          borderColor: isLeader ? colors.accent : colors.cardBorder,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View
                          style={[
                            styles.bankIndicator,
                            { backgroundColor: offer.bank.primaryColor, width: 10, height: 10, borderRadius: 5 },
                          ]}
                        />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text
                              style={[
                                styles.bankTitle,
                                {
                                  color: colors.textPrimary,
                                  fontWeight: isLeader ? '800' : '600',
                                },
                              ]}
                            >
                              {offer.bank.name}
                            </Text>
                            {isLeader && (
                              <View style={styles.leaderMiniBadge}>
                                <Text style={styles.leaderMiniBadgeText}>ЛИДЕР</Text>
                              </View>
                            )}
                            {offer.isShared && (
                              <View style={styles.sharedBadge}>
                                <Heart size={8} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 2 }} />
                                <Text style={styles.sharedBadgeText}>
                                  {offer.sharedByName || partnerName}
                                </Text>
                              </View>
                            )}
                          </View>
                          {offer.item.note && (
                            <Text style={[styles.matchNote, { color: colors.textMuted, marginTop: 2 }]}>
                              {offer.item.note}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View
                        style={[
                          styles.percentBox,
                          isLeader ? styles.percentBoxGold : styles.percentBoxNormal,
                        ]}
                      >
                        <Text
                          style={[
                            styles.percentValue,
                            isLeader ? styles.percentValueGold : styles.percentValueNormal,
                          ]}
                        >
                          {offer.item.percent}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[styles.modalBottomCloseBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => setSelectedCategory(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBottomCloseBtnText, { color: colors.textPrimary }]}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  topControlsWrap: {
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  viewModeBtnActive: {},
  viewModeBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewModeBtnTextActive: {
    fontWeight: '800',
  },
  ownerFilterContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  ownerFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ownerFilterBtnActive: {},
  ownerFilterText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ownerFilterTextActive: {
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginTop: 4,
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
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextSelected: {
    fontWeight: '700',
  },
  chipPercentText: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },
  compactSection: {
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
  compactList: {
    gap: 6,
  },
  compactCardWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  compactIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  compactTitleWrap: {
    flex: 1,
    marginRight: 6,
  },
  compactCategoryName: {
    fontSize: 13,
    fontWeight: '700',
  },
  compactRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactBankDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  compactBankName: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 6,
    maxWidth: 80,
  },
  compactPercentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compactPercentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  accordionContent: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accordionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  accordionBankTitle: {
    fontSize: 12,
  },
  accordionNote: {
    fontSize: 10,
    marginLeft: 4,
    flexShrink: 1,
  },
  accordionPercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  spotlightSection: {
    marginTop: 2,
  },
  spotlightCategoryTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  byBankSection: {
    marginTop: 2,
  },
  bankTabsScroll: {
    gap: 6,
    paddingBottom: 4,
  },
  bankSelectTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  bankSelectTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bankTabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  bankTabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  selectedBankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedBankTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },
  gridSection: {
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  gridTile: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  tileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePercentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tilePercentText: {
    fontSize: 12,
    fontWeight: '900',
  },
  tileCategoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 8,
  },
  tileBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileLeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  tileBankDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  tileBankName: {
    fontSize: 11,
    fontWeight: '600',
  },
  tileExtraBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tileExtraText: {
    fontSize: 9,
    fontWeight: '700',
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
  bankDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  leaderMiniBadge: {
    backgroundColor: '#FFDD2D',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  leaderMiniBadgeText: {
    color: '#0F172A',
    fontSize: 8,
    fontWeight: '900',
  },
  modalBottomCloseBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBottomCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
