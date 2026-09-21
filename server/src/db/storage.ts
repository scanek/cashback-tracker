import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Bank, MonthlyCashback, AppSettings } from '../types';

interface DatabaseSchema {
  users: Record<string, User>; // key: userId
  syncKeyToUserId: Record<string, string>; // key: syncKey -> userId
  banks: Record<string, Bank[]>; // key: userId -> Bank[]
  cashbacks: Record<string, MonthlyCashback[]>; // key: userId -> MonthlyCashback[]
  settings: Record<string, Partial<AppSettings>>; // key: userId -> AppSettings
}

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export class Database {
  private static instance: Database;
  private data: DatabaseSchema = {
    users: {},
    syncKeyToUserId: {},
    banks: {},
    cashbacks: {},
    settings: {},
  };

  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.init();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = {};
        if (!this.data.syncKeyToUserId) this.data.syncKeyToUserId = {};
        if (!this.data.banks) this.data.banks = {};
        if (!this.data.cashbacks) this.data.cashbacks = {};
        if (!this.data.settings) this.data.settings = {};
        console.log(`📦 [Database] Загружено пользователей: ${Object.keys(this.data.users).length}`);
      } catch (err) {
        console.error('Error loading db.json, creating new database', err);
        this.persistSync();
      }
    } else {
      this.persistSync();
    }
  }

  /**
   * Debounced asynchronous persistence to prevent heavy synchronous disk I/O
   */
  public schedulePersist() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.persistSync();
    }, 1200);
  }

  public persistSync() {
    try {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write db file:', err);
    }
  }

  public getTotalUsersCount(): number {
    return Object.keys(this.data.users).length;
  }

  // Safe user lookup by syncKey using timing-safe comparison
  public getUserBySyncKey(syncKey: string): User | null {
    const cleanKey = (syncKey || '').trim();
    if (!cleanKey) return null;

    // Direct index lookup first
    const directUserId = this.data.syncKeyToUserId[cleanKey];
    if (directUserId && this.data.users[directUserId]) {
      return this.data.users[directUserId];
    }

    // Constant-time check across keys if direct map missed due to case/formatting
    const targetBuffer = Buffer.from(cleanKey.toLowerCase());
    for (const [key, userId] of Object.entries(this.data.syncKeyToUserId)) {
      const candidateBuffer = Buffer.from(key.toLowerCase());
      if (candidateBuffer.length === targetBuffer.length && crypto.timingSafeEqual(candidateBuffer, targetBuffer)) {
        return this.data.users[userId] || null;
      }
    }

    return null;
  }

  public getUserByEmail(email: string): User | null {
    const norm = email.toLowerCase().trim();
    for (const u of Object.values(this.data.users)) {
      if (u.email && u.email.toLowerCase() === norm) {
        return u;
      }
    }
    return null;
  }

  public createUser(user: User): User {
    this.data.users[user.id] = user;
    this.data.syncKeyToUserId[user.syncKey] = user.id;
    if (!this.data.banks[user.id]) this.data.banks[user.id] = [];
    if (!this.data.cashbacks[user.id]) this.data.cashbacks[user.id] = [];
    if (!this.data.settings[user.id]) this.data.settings[user.id] = {};
    this.schedulePersist();
    return user;
  }

  public getOrCreateUserBySyncKey(syncKey: string): User {
    const cleanKey = syncKey.trim();
    const existing = this.getUserBySyncKey(cleanKey);
    if (existing) return existing;

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      syncKey: cleanKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.createUser(newUser);
  }

  // Banks data
  public getUserBanks(userId: string): Bank[] {
    return this.data.banks[userId] || [];
  }

  public saveUserBanks(userId: string, newBanks: Bank[]): Bank[] {
    const currentBanks = this.data.banks[userId] || [];
    const bankMap = new Map(currentBanks.map((b) => [b.id, b]));

    for (const b of newBanks) {
      const existing = bankMap.get(b.id);
      if (!existing || new Date(b.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
        bankMap.set(b.id, {
          ...b,
          userId,
          updatedAt: b.updatedAt || new Date().toISOString(),
        });
      }
    }

    const merged = Array.from(bankMap.values());
    this.data.banks[userId] = merged;
    this.touchUser(userId);
    this.schedulePersist();
    return merged;
  }

  // Cashbacks data
  public getUserCashbacks(userId: string): MonthlyCashback[] {
    return this.data.cashbacks[userId] || [];
  }

  public saveUserCashbacks(userId: string, newCashbacks: MonthlyCashback[]): MonthlyCashback[] {
    const currentCashbacks = this.data.cashbacks[userId] || [];
    const hasRealInCloud = currentCashbacks.some((c) => !c.id.startsWith('sample-'));
    const cashbackMap = new Map(currentCashbacks.map((c) => [c.id, c]));

    for (const c of newCashbacks) {
      // Never let sample-* cashbacks overwrite real user data in cloud
      if (hasRealInCloud && c.id && c.id.startsWith('sample-')) {
        continue;
      }
      const existing = cashbackMap.get(c.id);
      if (!existing || new Date(c.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
        cashbackMap.set(c.id, {
          ...c,
          userId,
          updatedAt: c.updatedAt || new Date().toISOString(),
        });
      }
    }

    const merged = Array.from(cashbackMap.values());
    this.data.cashbacks[userId] = merged;
    this.touchUser(userId);
    this.schedulePersist();
    return merged;
  }

  // Settings
  public getUserSettings(userId: string): Partial<AppSettings> {
    return this.data.settings[userId] || {};
  }

  public saveUserSettings(userId: string, settings: Partial<AppSettings>): Partial<AppSettings> {
    // Strip sensitive local fields before persisting in cloud settings
    const cleanSettings = {
      ...settings,
      geminiApiKey: '',
    };
    const current = this.data.settings[userId] || {};
    const updated = { ...current, ...cleanSettings };
    this.data.settings[userId] = updated;
    this.touchUser(userId);
    this.schedulePersist();
    return updated;
  }

  private touchUser(userId: string) {
    if (this.data.users[userId]) {
      this.data.users[userId].updatedAt = new Date().toISOString();
    }
  }
}
