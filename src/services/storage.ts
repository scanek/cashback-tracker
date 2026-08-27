import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bank, MonthlyCashback, AppSettings } from '../types';
import { PRESET_BANKS } from '../constants/banks';

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
        await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(PRESET_BANKS));
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
      return data ? JSON.parse(data) : PRESET_BANKS;
    } catch (e) {
      console.error('Error fetching banks', e);
      return PRESET_BANKS;
    }
  }

  static async saveBanks(banks: Bank[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(banks));
  }

  static async addCustomBank(bank: Bank): Promise<Bank[]> {
    const banks = await this.getBanks();
    const updated = [...banks, bank];
    await this.saveBanks(updated);
    return updated;
  }

  static async toggleBankActive(bankId: string): Promise<Bank[]> {
    const banks = await this.getBanks();
    const updated = banks.map(b => b.id === bankId ? { ...b, isActive: !b.isActive } : b);
    await this.saveBanks(updated);
    return updated;
  }

  static async getAllCashbacks(): Promise<MonthlyCashback[]> {
    try {
      await this.initializeDefaults();
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CASHBACKS);
      return data ? JSON.parse(data) : [];
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
    const all = await this.getAllCashbacks();
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
      month: targetMonth,
      year: targetYear,
      isShared: isShared,
      sharedByName: cashback.sharedByName || (isShared ? 'Партнер' : undefined),
      updatedAt: new Date().toISOString(),
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
    return updated;
  }

  static async deleteMonthlyCashback(
    bankId: string,
    month: number,
    year: number,
    isShared?: boolean
  ): Promise<void> {
    const all = await this.getAllCashbacks();
    const targetMonth = Number(month);
    const targetYear = Number(year);
    const targetIsShared = Boolean(isShared);

    const filtered = all.filter(
      (c) =>
        !(
          c.bankId === bankId &&
          Number(c.month) === targetMonth &&
          Number(c.year) === targetYear &&
          Boolean(c.isShared) === targetIsShared
        )
    );
    await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(filtered));
    try {
      const { WidgetService } = require('./widget');
      WidgetService.updateWidget();
    } catch {}
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
      settings: { ...settings, geminiApiKey: '' } // Do not export secret key
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
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  static async resetToSampleData(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(PRESET_BANKS));
    await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(SAMPLE_CASHBACKS));
  }
}
