import { Bank, MonthlyCashback, SmartMatchResult } from '../types';
import { STANDARD_CATEGORIES } from '../constants/categories';

export class CashbackMatcher {
  /**
   * Find the best cards for a given search query (e.g. "Пятерочка", "Аптека", "Бензин", "Топливо в Городе", "Яндекс Еда")
   */
  static findBestCards(
    query: string,
    banks: Bank[],
    cashbacks: MonthlyCashback[]
  ): SmartMatchResult[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const activeBankMap = new Map<string, Bank>();
    banks.filter((b) => b.isActive).forEach((b) => activeBankMap.set(b.id, b));

    // 1. Identify which standard predefined categories match the search query
    const matchedCategories = STANDARD_CATEGORIES.filter((cat) => {
      const catNameLower = cat.name.toLowerCase();
      if (catNameLower.includes(cleanQuery) || cleanQuery.includes(catNameLower)) return true;
      return cat.keywords.some(
        (kw) => cleanQuery.includes(kw) || kw.includes(cleanQuery)
      );
    });

    const matches: SmartMatchResult[] = [];

    // Check every bank's cashback items
    for (const cb of cashbacks) {
      const bank = activeBankMap.get(cb.bankId);
      if (!bank) continue;

      for (const item of cb.items || []) {
        const itemCatLower = item.category.toLowerCase();
        let matchScore = 0;
        let reason = '';

        // Exact or direct substring inclusion in category name
        if (itemCatLower.includes(cleanQuery) || cleanQuery.includes(itemCatLower)) {
          matchScore = 100;
          reason = `Прямое совпадение с категорией «${item.category}»`;
        }
        // Match through category synonyms & keywords
        else {
          for (const cat of matchedCategories) {
            const catNameLower = cat.name.toLowerCase();
            const matchesCat =
              itemCatLower.includes(catNameLower) ||
              cat.keywords.some((kw) => itemCatLower.includes(kw));

            if (matchesCat) {
              matchScore = 80;
              reason = `Подходит под категорию «${cat.name}» («${item.category}»)`;
              break;
            }
          }
        }

        if (matchScore > 0) {
          matches.push({
            bank,
            item,
            rank: 0,
            matchReason: reason,
            isShared: Boolean(cb.isShared),
            sharedByName: cb.sharedByName,
          });
        }
      }
    }

    // If no direct category matched, add default "1% на все" cards
    if (matches.length === 0) {
      for (const cb of cashbacks) {
        const bank = activeBankMap.get(cb.bankId);
        if (!bank) continue;

        const allPurchasesItem = (cb.items || []).find(
          (i) =>
            i.category.toLowerCase().includes('все покупки') ||
            i.category.toLowerCase().includes('на все') ||
            i.category.toLowerCase().includes('на всё')
        );

        if (allPurchasesItem) {
          matches.push({
            bank,
            item: allPurchasesItem,
            rank: 0,
            matchReason: `Базовый кэшбэк на любые покупки: ${allPurchasesItem.percent}%`,
            isShared: Boolean(cb.isShared),
            sharedByName: cb.sharedByName,
          });
        }
      }
    }

    // Sort by percent descending, then bank name
    matches.sort((a, b) => {
      if (b.item.percent !== a.item.percent) {
        return b.item.percent - a.item.percent;
      }
      return a.bank.name.localeCompare(b.bank.name);
    });

    // Assign rank 1, 2, 3...
    return matches.map((m, idx) => ({
      ...m,
      rank: idx + 1,
    }));
  }
}
