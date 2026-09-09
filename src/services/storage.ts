import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bank, MonthlyCashback, AppSettings } from '../types';
import { PRESET_BANKS } from '../constants/banks';
import { SyncService } from './sync';

const STORAGE_KEYS = {
  BANKS: '@cashback_hub_banks_v1',
  CASHBACKS: '@cashback_hub_cashbacks_v1',
  SETTINGS: '@cashback_hub_settings_v1',
  INITIALIZED: '@cashback_hub_initialized_v1',
};

export const EMBEDDED_GEMINI_API_KEY = 'AQ.Ab8RN6IKuwWRuIhU9Lq4B9rhyvDp63yg8hgSANZPwEoL05dF4g';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: EMBEDDED_GEMINI_API_KEY,
  geminiModel: 'gemini-3.6-flash',
  enableMonthlyReminders: true,
  activeTheme: 'dark',
  widgetTheme: 'dark',
  partnerName: 'Партнер',
  autoSyncEnabled: true,
};

const SAMPLE_CASHBACKS: MonthlyCashback[] = [
  {
    id: 'sample-tbank-current',
    bankId: 'tbank',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    updatedAt: new Date().toISOString(),
    items: [
      { id: '1', category: '1% на все покупки', percent: 1 },
      { id: '2', category: 'Супермаркеты и продукты', percent: 5, note: 'до 3000 ₽' },
      { id: '3', category: 'Кафе и рестораны', percent: 6 },
      { id: '4', category: 'Аптеки и здоровье', percent: 7 },
      { id: '5', category: 'Топливо (Яндекс Заправки)', percent: 10, note: 'первая заправка' }
    ]
  },
  {
    id: 'sample-alfa-current',
    bankId: 'alfa',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    updatedAt: new Date().toISOString(),
    items: [
      { id: '1', category: '1% на все покупки', percent: 1 },
      { id: '2', category: 'АЗС и топливо', percent: 7 },
      { id: '3', category: 'Одежда и обувь', percent: 5 },
      { id: '4', category: 'Техника и электроника', percent: 5, note: 'в М.Видео и DNS' },
      { id: '5', category: 'Суперкэшбэк: Кино и афиша', percent: 20 }
    ]
  },
  {
    id: 'sample-sber-current',
    bankId: 'sber',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    updatedAt: new Date().toISOString(),
    items: [
      { id: '1', category: 'Супермаркеты (СберМаркет / Купер)', percent: 5 },
      { id: '2', category: 'Такси и транспорт', percent: 10 },
      { id: '3', category: 'Аптеки (ЕАптека)', percent: 8 },
      { id: '4', category: 'Рестораны и фастфуд', percent: 5 }
    ]
  },
  {
    id: 'sample-yandex-current',
    bankId: 'yandex',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    updatedAt: new Date().toISOString(),
    items: [
      { id: '1', category: 'Яндекс Такси (Yandex Go)', percent: 10 },
      { id: '2', category: 'Яндекс Еда и Лавка', percent: 7 },
      { id: '3', category: 'Яндекс Маркет', percent: 5 },
      { id: '4', category: 'Яндекс Заправки', percent: 5 }
    ]
  }
];

export class StorageService {
  static async initializeDefaults(): Promise<void> {
    try {
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        const banksWithTime = PRESET_BANKS.map(b => ({ ...b, updatedAt: new Date().toISOString() }));
        await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(banksWithTime));
        await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(SAMPLE_CASHBACKS));
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      }
    } catch (e) {
      console.error('Failed to init defaults', e);
    }
  }

  static async getBanks(): Promise<Bank[]> {
    try {
      await this.initializeDefaults();
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BANKS);
      if (!data) return PRESET_BANKS;
      const banks: Bank[] = JSON.parse(data);
      return banks.filter(b => !b.deletedAt);
    } catch (e) {
      console.error('Error fetching banks', e);
      return PRESET_BANKS;
    }
  }

  static async saveBanks(banks: Bank[]): Promise<void> {
    const updated = banks.map(b => ({
      ...b,
      updatedAt: new Date().toISOString(),
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(updated));
    SyncService.performSync().catch(() => {});
  }

  static async addCustomBank(bank: Bank): Promise<Bank[]> {
    const banks = await this.getBanks();
    const newBank = {
      ...bank,
      updatedAt: new Date().toISOString(),
    };
    const updated = [...banks, newBank];
    await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(updated));
    SyncService.performSync().catch(() => {});
    return updated;
  }

  static async toggleBankActive(bankId: string): Promise<Bank[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BANKS);
    const banks: Bank[] = raw ? JSON.parse(raw) : PRESET_BANKS;
    const updated = banks.map(b => b.id === bankId ? { ...b, isActive: !b.isActive, updatedAt: new Date().toISOString() } : b);
    await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(updated));
    SyncService.performSync().catch(() => {});
    return updated.filter(b => !b.deletedAt);
  }

  static async deleteBank(bankId: string): Promise<Bank[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BANKS);
    const banks: Bank[] = raw ? JSON.parse(raw) : PRESET_BANKS;
    const updated = banks.map(b =>
      b.id === bankId
        ? { ...b, deletedAt: new Date().toISOString(), isActive: false, updatedAt: new Date().toISOString() }
        : b
    );
    await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(updated));
    SyncService.performSync().catch(() => {});
    return updated.filter(b => !b.deletedAt);
  }

  static async restoreDefaultBanks(): Promise<Bank[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BANKS);
    const currentBanks: Bank[] = raw ? JSON.parse(raw) : [];
    
    const merged = [...currentBanks];
    for (const preset of PRESET_BANKS) {
      const idx = merged.findIndex(b => b.id === preset.id);
      if (idx >= 0) {
        merged[idx] = {
          ...merged[idx],
          ...preset,
          deletedAt: undefined,
          isActive: true,
          updatedAt: new Date().toISOString(),
        };
      } else {
        merged.push({
          ...preset,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(merged));
    SyncService.performSync().catch(() => {});
    return merged.filter(b => !b.deletedAt);
  }

  static async getAllCashbacks(): Promise<MonthlyCashback[]> {
    try {
      await this.initializeDefaults();
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CASHBACKS);
      if (!data) return [];
      const list: MonthlyCashback[] = JSON.parse(data);
      return list.filter(c => !c.deletedAt);
    } catch (e) {
      console.error('Error fetching cashbacks', e);
      return [];
    }
  }

  static async getCashbacksForMonth(month: number, year: number): Promise<MonthlyCashback[]> {
    const all = await this.getAllCashbacks();
    return all.filter(
      (c) => Number(c.month) === Number(month) && Number(c.year) === Number(year)
    );
  }

  static async saveMonthlyCashback(cashback: MonthlyCashback): Promise<MonthlyCashback[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CASHBACKS);
    const all: MonthlyCashback[] = raw ? JSON.parse(raw) : [];

    const targetMonth = Number(cashback.month);
    const targetYear = Number(cashback.year);
    const isShared = Boolean(cashback.isShared);

    const index = all.findIndex(
      (c) =>
        c.bankId === cashback.bankId &&
        Number(c.month) === targetMonth &&
        Number(c.year) === targetYear &&
        Boolean(c.isShared) === isShared
    );

    let updated: MonthlyCashback[];
    const normalized: MonthlyCashback = {
      ...cashback,
      id: cashback.id || `cb_${cashback.bankId}_${targetYear}_${targetMonth}_${isShared ? 'shared' : 'my'}`,
      month: targetMonth,
      year: targetYear,
      isShared: isShared,
      sharedByName: cashback.sharedByName || (isShared ? 'Партнер' : undefined),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    if (index >= 0) {
      updated = [...all];
      updated[index] = normalized;
    } else {
      updated = [...all, normalized];
    }

    await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(updated));
    try {
      const { WidgetService } = require('./widget');
      WidgetService.updateWidget();
    } catch {}
    
    // Auto-trigger background sync
    SyncService.performSync().catch(() => {});
    return updated.filter(c => !c.deletedAt);
  }

  static async deleteMonthlyCashback(
    bankId: string,
    month: number,
    year: number,
    isShared?: boolean
  ): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CASHBACKS);
    const all: MonthlyCashback[] = raw ? JSON.parse(raw) : [];

    const targetMonth = Number(month);
    const targetYear = Number(year);
    const targetIsShared = Boolean(isShared);

    const updated = all.map((c) => {
      if (
        c.bankId === bankId &&
        Number(c.month) === targetMonth &&
        Number(c.year) === targetYear &&
        Boolean(c.isShared) === targetIsShared
      ) {
        return { ...c, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }
      return c;
    });

    await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(updated));
    try {
      const { WidgetService } = require('./widget');
      WidgetService.updateWidget();
    } catch {}

    SyncService.performSync().catch(() => {});
  }

  static async getSettings(): Promise<AppSettings> {
    try {
      await this.initializeDefaults();
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        geminiApiKey:
          parsed.geminiApiKey && parsed.geminiApiKey.trim()
            ? parsed.geminiApiKey
            : EMBEDDED_GEMINI_API_KEY,
      };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    SyncService.performSync().catch(() => {});
    return updated;
  }

  static async exportBackup(): Promise<string> {
    const banks = await this.getBanks();
    const cashbacks = await this.getAllCashbacks();
    const settings = await this.getSettings();
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      banks,
      cashbacks,
      settings: { ...settings, geminiApiKey: '' }
    }, null, 2);
  }

  static async importBackup(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (data.banks && Array.isArray(data.banks)) {
        await this.saveBanks(data.banks);
      }
      if (data.cashbacks && Array.isArray(data.cashbacks)) {
        await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(data.cashbacks));
      }
      if (data.settings && typeof data.settings === 'object') {
        const current = await this.getSettings();
        await this.saveSettings({
          ...data.settings,
          geminiApiKey: current.geminiApiKey || data.settings.geminiApiKey || EMBEDDED_GEMINI_API_KEY,
        });
      }
      try {
        const { WidgetService } = require('./widget');
        WidgetService.updateWidget();
      } catch {}
      SyncService.performSync().catch(() => {});
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  static async resetToSampleData(): Promise<void> {
    const banksWithTime = PRESET_BANKS.map(b => ({ ...b, updatedAt: new Date().toISOString() }));
    await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(banksWithTime));
    await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(SAMPLE_CASHBACKS));
    SyncService.performSync().catch(() => {});
  }
}
