import fs from 'fs';
import path from 'path';
import { User, Bank, MonthlyCashback, AppSettings } from '../types';

interface DatabaseSchema {
  users: Record<string, User>; // key: userId
  syncKeyToUserId: Record<string, string>; // key: syncKey -> userId
  banks: Record<string, Bank[]>; // key: userId -> Bank[]
  cashbacks: Record<string, MonthlyCashback[]>; // key: userId -> MonthlyCashback[]
  settings: Record<string, Partial<AppSettings>>; // key: userId -> AppSettings
}

const DATA_DIR = path.join(__dirname, '../../data');
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
      } catch (err) {
        console.error('Error loading db.json, creating new database', err);
        this.persist();
      }
    } else {
      this.persist();
    }
  }

  private persist() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write db file:', err);
    }
  }

  // User management
  public getUserBySyncKey(syncKey: string): User | null {
    const userId = this.data.syncKeyToUserId[syncKey];
    if (!userId) return null;
    return this.data.users[userId] || null;
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
    this.persist();
    return user;
  }

  public getOrCreateUserBySyncKey(syncKey: string): User {
    const existing = this.getUserBySyncKey(syncKey);
    if (existing) return existing;

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      syncKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.createUser(newUser);
  }

  // Banks Sync
  public getBanks(userId: string, since?: string): Bank[] {
    const userBanks = this.data.banks[userId] || [];
    if (!since) return userBanks.filter((b) => !b.deletedAt);
    const sinceTime = new Date(since).getTime();
    return userBanks.filter((b) => {
      const updatedTime = new Date(b.updatedAt || '1970-01-01').getTime();
      return updatedTime > sinceTime;
    });
  }

  public upsertBanks(userId: string, incomingBanks: Bank[]): Bank[] {
    const current = this.data.banks[userId] || [];
    const bankMap = new Map<string, Bank>();
    current.forEach((b) => bankMap.set(b.id, b));

    for (const incoming of incomingBanks) {
      const existing = bankMap.get(incoming.id);
      if (!existing) {
        bankMap.set(incoming.id, {
          ...incoming,
          userId,
          updatedAt: incoming.updatedAt || new Date().toISOString(),
        });
      } else {
        const existingUpdated = new Date(existing.updatedAt || '1970-01-01').getTime();
        const incomingUpdated = new Date(incoming.updatedAt || '1970-01-01').getTime();
        if (incomingUpdated >= existingUpdated) {
          bankMap.set(incoming.id, {
            ...existing,
            ...incoming,
            userId,
            updatedAt: incoming.updatedAt || new Date().toISOString(),
          });
        }
      }
    }

    this.data.banks[userId] = Array.from(bankMap.values());
    this.persist();
    return this.data.banks[userId];
  }

  // Monthly Cashbacks Sync
  public getCashbacks(userId: string, since?: string): MonthlyCashback[] {
    const userCashbacks = this.data.cashbacks[userId] || [];
    if (!since) return userCashbacks.filter((c) => !c.deletedAt);
    const sinceTime = new Date(since).getTime();
    return userCashbacks.filter((c) => {
      const updatedTime = new Date(c.updatedAt || '1970-01-01').getTime();
      return updatedTime > sinceTime;
    });
  }

  public upsertCashbacks(userId: string, incomingCashbacks: MonthlyCashback[]): MonthlyCashback[] {
    const current = this.data.cashbacks[userId] || [];
    const cbMap = new Map<string, MonthlyCashback>();
    current.forEach((c) => cbMap.set(c.id, c));

    for (const incoming of incomingCashbacks) {
      const existing = cbMap.get(incoming.id);
      if (!existing) {
        cbMap.set(incoming.id, {
          ...incoming,
          userId,
          updatedAt: incoming.updatedAt || new Date().toISOString(),
        });
      } else {
        const existingUpdated = new Date(existing.updatedAt || '1970-01-01').getTime();
        const incomingUpdated = new Date(incoming.updatedAt || '1970-01-01').getTime();
        if (incomingUpdated >= existingUpdated) {
          cbMap.set(incoming.id, {
            ...existing,
            ...incoming,
            userId,
            updatedAt: incoming.updatedAt || new Date().toISOString(),
          });
        }
      }
    }

    this.data.cashbacks[userId] = Array.from(cbMap.values());
    this.persist();
    return this.data.cashbacks[userId];
  }

  // Settings
  public getSettings(userId: string): Partial<AppSettings> {
    return this.data.settings[userId] || {};
  }

  public updateSettings(userId: string, incomingSettings: Partial<AppSettings>): Partial<AppSettings> {
    const current = this.data.settings[userId] || {};
    this.data.settings[userId] = {
      ...current,
      ...incomingSettings,
    };
    this.persist();
    return this.data.settings[userId];
  }
}
