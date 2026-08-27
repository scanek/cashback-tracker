export interface CashbackItem {
  id: string;
  category: string;
  percent: number;
  note?: string; // e.g. "до 3000 ₽", "от 1000 ₽", "только онлайн"
  icon?: string;
}

export interface Bank {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  textColor: string;
  secondaryColor?: string;
  iconName: string; // Lucide icon name
  defaultMonthlyLimit?: number; // e.g. 3000 / 5000 RUB
  isActive: boolean;
}

export interface MonthlyCashback {
  id: string;
  bankId: string;
  month: number; // 0-11 (Jan-Dec)
  year: number; // e.g. 2026
  items: CashbackItem[];
  spentLimit?: number;
  updatedAt: string;
  isShared?: boolean;
  sharedByName?: string;
}

export interface PredefinedCategory {
  id: string;
  name: string;
  icon: string;
  keywords: string[]; // for smart matching (e.g. "пятерочка", "яндекс маркет", "лукойл")
}

export interface SmartMatchResult {
  bank: Bank;
  item: CashbackItem;
  rank: number;
  matchReason: string;
  isShared?: boolean;
  sharedByName?: string;
}

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  enableMonthlyReminders: boolean;
  activeTheme: 'dark' | 'light' | 'system';
  widgetTheme?: 'dark' | 'light' | 'transparent';
  partnerName?: string;
}

export interface ScanResult {
  bankName: string;
  bankId?: string;
  month?: number;
  year?: number;
  items: {
    category: string;
    percent: number;
    note?: string;
  }[];
  confidence: number;
  rawText?: string;
}
