import { Database } from '../db/storage';
import { SyncPushPayload, SyncPullPayload, SyncPullResponse } from '../types';

export class SyncService {
  private static db = Database.getInstance();

  public static handlePush(payload: SyncPushPayload): { success: boolean; serverTime: string } {
    const user = this.db.getOrCreateUserBySyncKey(payload.syncKey);

    if (payload.banks && payload.banks.length > 0) {
      this.db.upsertBanks(user.id, payload.banks);
    }

    if (payload.cashbacks && payload.cashbacks.length > 0) {
      this.db.upsertCashbacks(user.id, payload.cashbacks);
    }

    if (payload.settings) {
      this.db.updateSettings(user.id, payload.settings);
    }

    return {
      success: true,
      serverTime: new Date().toISOString(),
    };
  }

  public static handlePull(payload: SyncPullPayload): SyncPullResponse {
    const user = this.db.getOrCreateUserBySyncKey(payload.syncKey);
    const banks = this.db.getBanks(user.id, payload.since);
    const cashbacks = this.db.getCashbacks(user.id, payload.since);
    const settings = this.db.getSettings(user.id);

    return {
      banks,
      cashbacks,
      settings,
      serverTime: new Date().toISOString(),
    };
  }
}
