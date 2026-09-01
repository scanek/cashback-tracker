export interface User {
  id: string;
  email?: string;
  username?: string;
  passwordHash?: string;
  syncKey: string; // Unique pair key e.g. "CB-9482-1204"
  createdAt: string;
  updatedAt: string;
}

export interface CashbackItem {
  id: string;
  category: string;
  percent: number;
  note?: string;
  icon?: string;
}

export interface Bank {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  textColor: string;
  secondaryColor?: string;
  iconName: string;
  defaultMonthlyLimit?: number;
  isActive: boolean;
  userId?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface MonthlyCashback {
  id: string;
  userId: string;
  bankId: string;
  month: number; // 0-11
  year: number; // e.g. 2026
  items: CashbackItem[];
  spentLimit?: number;
  updatedAt: string;
  deletedAt?: string | null;
  isShared?: boolean;
  sharedByName?: string;
}

export interface AppSettings {
  geminiApiKey?: string;
  geminiModel?: string;
  enableMonthlyReminders?: boolean;
  activeTheme?: 'dark' | 'light' | 'system';
  widgetTheme?: 'dark' | 'light' | 'transparent';
  partnerName?: string;
  syncServerUrl?: string;
  syncKey?: string;
  lastSyncedAt?: string;
  autoSyncEnabled?: boolean;
}

export interface SyncPushPayload {
  syncKey: string;
  banks?: Bank[];
  cashbacks?: MonthlyCashback[];
  settings?: Partial<AppSettings>;
}

export interface SyncPullPayload {
  syncKey: string;
  since?: string; // ISO Date string
}

export interface SyncPullResponse {
  banks: Bank[];
  cashbacks: MonthlyCashback[];
  settings?: Partial<AppSettings>;
  serverTime: string;
}
