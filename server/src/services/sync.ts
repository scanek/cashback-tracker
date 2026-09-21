import { Database } from '../db/storage';
import { Bank, MonthlyCashback, AppSettings } from '../types';

export class SyncService {
  private static db = Database.getInstance();

  public static handlePush(
    userId: string,
    payload: {
      banks?: Bank[];
      cashbacks?: MonthlyCashback[];
      settings?: Partial<AppSettings>;
    }
  ): { success: boolean; serverTime: string } {
    if (payload.banks && Array.isArray(payload.banks)) {
      this.db.saveUserBanks(userId, payload.banks);
    }

    if (payload.cashbacks && Array.isArray(payload.cashbacks)) {
      this.db.saveUserCashbacks(userId, payload.cashbacks);
    }

    if (payload.settings && typeof payload.settings === 'object') {
      this.db.saveUserSettings(userId, payload.settings);
    }

    return {
      success: true,
      serverTime: new Date().toISOString(),
    };
  }

  public static handlePull(
    userId: string,
    since?: string
  ): {
    banks: Bank[];
    cashbacks: MonthlyCashback[];
    settings: Partial<AppSettings>;
    serverTime: string;
  } {
    const allBanks = this.db.getUserBanks(userId);
    const allCashbacks = this.db.getUserCashbacks(userId);
    const settings = this.db.getUserSettings(userId);
    const serverTime = new Date().toISOString();

    if (!since) {
      return {
        banks: allBanks,
        cashbacks: allCashbacks,
        settings,
        serverTime,
      };
    }

    const sinceDate = new Date(since).getTime();
    if (isNaN(sinceDate)) {
      return {
        banks: allBanks,
        cashbacks: allCashbacks,
        settings,
        serverTime,
      };
    }

    const filteredBanks = allBanks.filter((b) => new Date(b.updatedAt || 0).getTime() >= sinceDate);
    const filteredCashbacks = allCashbacks.filter((c) => new Date(c.updatedAt || 0).getTime() >= sinceDate);

    return {
      banks: filteredBanks,
      cashbacks: filteredCashbacks,
      settings,
      serverTime,
    };
  }
}
