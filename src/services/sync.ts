import { Bank, MonthlyCashback, AppSettings, SyncStatusState } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  BANKS: '@cashback_hub_banks_v1',
  CASHBACKS: '@cashback_hub_cashbacks_v1',
  SETTINGS: '@cashback_hub_settings_v1',
  LAST_SYNC: '@cashback_hub_last_sync_v1',
};

export const DEFAULT_SYNC_SERVER_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:4000'
  : 'http://localhost:4000';

type SyncListener = (status: SyncStatusState, lastSyncedAt?: string, errorMessage?: string) => void;

export class SyncService {
  private static status: SyncStatusState = 'idle';
  private static listeners: Set<SyncListener> = new Set();
  private static syncInterval: any = null;

  public static addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private static notify(status: SyncStatusState, lastSyncedAt?: string, error?: string) {
    this.status = status;
    this.listeners.forEach((fn) => fn(status, lastSyncedAt, error));
  }

  public static getStatus(): SyncStatusState {
    return this.status;
  }

  public static async getServerUrl(): Promise<string> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.syncServerUrl && parsed.syncServerUrl.trim()) {
          let customUrl = parsed.syncServerUrl.trim();
          // If page is on HTTPS, upgrade custom http:// URL to https:// or same-origin to prevent Mixed Content blocking
          if (
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            window.location.protocol === 'https:' &&
            customUrl.startsWith('http://')
          ) {
            customUrl = customUrl.replace(/^http:\/\//i, 'https://');
          }
          return customUrl;
        }
      }
    } catch {}

    // Auto-detect on Web: use same-origin on HTTPS or domain to route via Nginx /api/ proxy without CORS/Mixed-Content issues
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (
        window.location.protocol === 'https:' ||
        (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
      ) {
        return window.location.origin;
      }
      return `http://${window.location.hostname}:4000`;
    }

    return DEFAULT_SYNC_SERVER_URL;
  }

  public static async getSyncKey(): Promise<string> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.syncKey && parsed.syncKey.trim()) {
          return parsed.syncKey.trim();
        }
      }
    } catch {}
    
    // Generate new unique default sync key if none exists
    const randomKey = `CB-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = raw ? JSON.parse(raw) : {};
      settings.syncKey = randomKey;
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
    
    return randomKey;
  }

  /**
   * Initialize automatic sync on startup and recurring intervals
   */
  public static async startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.autoSyncEnabled === false) {
          return; // User disabled auto-sync
        }
      }
    } catch {}
    
    // Initial sync in background (non-blocking)
    setTimeout(() => {
      this.performSync().catch(() => {});
    }, 1500);

    // Sync every 20 seconds
    this.syncInterval = setInterval(() => {
      this.performSync().catch(() => {});
    }, 20000);
  }

  public static stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public static async getPairingUrl(): Promise<string> {
    const key = await this.getSyncKey();
    const server = await this.getServerUrl();
    let baseUrl = 'http://localhost:8085';
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
      baseUrl = window.location.origin;
    }
    return `${baseUrl}/?pair=${encodeURIComponent(key)}&server=${encodeURIComponent(server)}`;
  }

  /**
   * Pair this device with a specific sync key from another device
   */
  public static async pairWithKey(
    newSyncKey: string,
    serverUrlOverride?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.notify('syncing');
      
      if (serverUrlOverride && serverUrlOverride.trim()) {
        const rawSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
        const settings = rawSettings ? JSON.parse(rawSettings) : {};
        settings.syncServerUrl = serverUrlOverride.trim();
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      }

      const serverUrl = await this.getServerUrl();
      const cleanKey = newSyncKey.trim().toUpperCase();

      const response = await fetch(`${serverUrl}/api/auth/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncKey: cleanKey }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Update local settings with new key
      const rawSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = rawSettings ? JSON.parse(rawSettings) : {};
      settings.syncKey = cleanKey;
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

      // Reset last sync to fetch entire cloud database
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC);

      // 1. First PULL everything from the paired device's cloud account
      const pullRes = await fetch(`${serverUrl}/api/sync/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncKey: cleanKey }),
      });

      if (pullRes.ok) {
        const pullData = await pullRes.json();
        if (pullData.banks && pullData.banks.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(pullData.banks));
        }
        if (pullData.cashbacks && pullData.cashbacks.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(pullData.cashbacks));
        }
        if (pullData.serverTime) {
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, pullData.serverTime);
        }
      }

      // 2. Perform full sync
      await this.performSync();
      return { success: true, message: `Успешно подключено к синхро-коду: ${cleanKey}! Все кэшбэки объединены.` };
    } catch (e: any) {
      this.notify('error', undefined, e.message);
      return { success: false, message: `Ошибка подключения: ${e.message}` };
    }
  }

  /**
   * Main Two-Way Delta Sync Engine
   */
  public static async performSync(): Promise<boolean> {
    const serverUrl = await this.getServerUrl();
    const syncKey = await this.getSyncKey();

    try {
      this.notify('syncing');

      // 1. Get local data
      const rawBanks = await AsyncStorage.getItem(STORAGE_KEYS.BANKS);
      const rawCashbacks = await AsyncStorage.getItem(STORAGE_KEYS.CASHBACKS);
      const rawSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const lastSync = (await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC)) || undefined;

      const localBanks: Bank[] = rawBanks ? JSON.parse(rawBanks) : [];
      const localCashbacks: MonthlyCashback[] = rawCashbacks ? JSON.parse(rawCashbacks) : [];
      const localSettings: Partial<AppSettings> = rawSettings ? JSON.parse(rawSettings) : {};

      // 2. PUSH: Send local changes to server
      const pushRes = await fetch(`${serverUrl}/api/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncKey,
          banks: localBanks,
          cashbacks: localCashbacks,
          settings: localSettings,
        }),
      });

      if (!pushRes.ok) {
        throw new Error(`Push error ${pushRes.status}`);
      }

      // 3. PULL: Fetch server updates
      const pullRes = await fetch(`${serverUrl}/api/sync/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncKey,
          since: lastSync,
        }),
      });

      if (!pullRes.ok) {
        throw new Error(`Pull error ${pullRes.status}`);
      }

      const pullData = await pullRes.json();
      const serverBanks: Bank[] = pullData.banks || [];
      const serverCashbacks: MonthlyCashback[] = pullData.cashbacks || [];
      const serverTime: string = pullData.serverTime || new Date().toISOString();

      // 4. Merge server changes into local storage (Conflict Resolution: Last-Write-Wins)
      let mergedBanks = [...localBanks];
      if (serverBanks.length > 0) {
        const bankMap = new Map<string, Bank>();
        mergedBanks.forEach((b) => bankMap.set(b.id, b));
        serverBanks.forEach((sb) => {
          const existing = bankMap.get(sb.id);
          if (!existing || new Date(sb.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
            bankMap.set(sb.id, sb);
          }
        });
        mergedBanks = Array.from(bankMap.values());
        await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(mergedBanks));
      }

      let mergedCashbacks = [...localCashbacks];
      if (serverCashbacks.length > 0) {
        const cbMap = new Map<string, MonthlyCashback>();
        mergedCashbacks.forEach((c) => cbMap.set(c.id, c));
        serverCashbacks.forEach((sc) => {
          const existing = cbMap.get(sc.id);
          if (!existing || existing.id.startsWith('sample-') || new Date(sc.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
            cbMap.set(sc.id, sc);
          }
        });
        mergedCashbacks = Array.from(cbMap.values());
        await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(mergedCashbacks));
      }

      // 5. Update last sync time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, serverTime);
      this.notify('synced', serverTime);
      return true;
    } catch (err: any) {
      // Offline fallback: keep local data untouched
      this.notify('offline', undefined, err.message);
      return false;
    }
  }
}
