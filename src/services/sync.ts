import { Bank, MonthlyCashback, AppSettings, SyncStatusState } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';

const STORAGE_KEYS = {
  BANKS: '@cashback_hub_banks_v1',
  CASHBACKS: '@cashback_hub_cashbacks_v1',
  SETTINGS: '@cashback_hub_settings_v1',
  LAST_SYNC: '@cashback_hub_last_sync_v1',
  AUTH_TOKEN: '@cashback_hub_auth_token_v1',
};

export const DEFAULT_SYNC_SERVER_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:4000'
  : 'http://localhost:4000';

type SyncListener = (status: SyncStatusState, lastSyncedAt?: string, errorMessage?: string) => void;

export class SyncService {
  private static status: SyncStatusState = 'idle';
  private static listeners: Set<SyncListener> = new Set();
  private static syncInterval: any = null;
  private static debounceTimer: any = null;
  private static appStateSub: any = null;
  private static isSyncRunning: boolean = false;
  private static lastKnownHash: string = '';

  public static addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private static notify(status: SyncStatusState, lastSyncedAt?: string, error?: string) {
    this.status = status;
    this.listeners.forEach((fn) => {
      try {
        fn(status, lastSyncedAt, error);
      } catch (e) {
        console.error('Error in sync listener:', e);
      }
    });
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
          // Upgrade http:// to https:// on HTTPS pages to avoid mixed content blocking
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

    // Auto-detect on Web: use same-origin on HTTPS or domain to route via Nginx proxy without CORS
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

  public static normalizeKey(rawKey: string): string {
    if (!rawKey) return '';
    let k = String(rawKey).trim().toLowerCase();

    // Transliterate Cyrillic lookalike characters
    const cyrillicMap: Record<string, string> = {
      'с': 'c', 'в': 'b', 'а': 'a', 'е': 'e', 'к': 'k',
      'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'т': 't',
      'х': 'x', 'у': 'y',
    };
    for (const [cyr, lat] of Object.entries(cyrillicMap)) {
      k = k.split(cyr).join(lat);
    }

    // Preserve new secure format: cb-xxxx-xxxx-xxxx-xxxx
    if (/^cb-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(k)) {
      return k;
    }

    // Preserve older 8 or 6 digits format
    const digits = k.replace(/[^0-9]/g, '');
    if (digits.length === 8) {
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    if (digits.length === 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    return k.replace(/^cb[\s\-_]*/i, '').trim();
  }

  /**
   * Generates a cryptographically strong 128-bit sync key (format: cb-xxxx-xxxx-xxxx-xxxx)
   */
  public static generateSecureSyncKey(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const segments: string[] = [];
    for (let s = 0; s < 4; s++) {
      let part = '';
      for (let i = 0; i < 4; i++) {
        part += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(part);
    }
    return `cb-${segments.join('-')}`;
  }

  public static async getSyncKey(): Promise<string> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.syncKey && parsed.syncKey.trim()) {
          return this.normalizeKey(parsed.syncKey.trim());
        }
      }
    } catch {}

    const randomKey = this.generateSecureSyncKey();

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = raw ? JSON.parse(raw) : {};
      settings.syncKey = randomKey;
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}

    return randomKey;
  }

  /**
   * Schedule sync with debouncing — avoids hammering the server during multi-item operations
   */
  public static scheduleSync(delayMs: number = 1500) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.performSync().catch(() => {});
    }, delayMs);
  }

  /**
   * Initialize event-driven sync: non-blocking startup sync, app foreground resume sync,
   * and a relaxed 5-minute fallback heartbeat (eliminates the wasteful 20-second interval).
   */
  public static async startAutoSync() {
    this.stopAutoSync();

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.autoSyncEnabled === false) {
          return; // Auto-sync disabled by user
        }
      }
    } catch {}

    // 1. Initial background sync shortly after launch
    setTimeout(() => {
      this.performSync().catch(() => {});
    }, 1200);

    // 2. Resume / Focus sync: pull latest data when user switches back to the app
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          this.scheduleSync(600);
        }
      };
      window.addEventListener('visibilitychange', handleVisibilityChange);
      this.appStateSub = () => window.removeEventListener('visibilitychange', handleVisibilityChange);
    } else {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          this.scheduleSync(600);
        }
      });
      this.appStateSub = () => subscription.remove();
    }

    // 3. Relaxed fallback heartbeat (every 5 minutes instead of 20 seconds)
    this.syncInterval = setInterval(() => {
      this.performSync().catch(() => {});
    }, 300000);
  }

  public static stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.appStateSub) {
      this.appStateSub();
      this.appStateSub = null;
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
   * Safe fetch with timeout and optional Authorization header
   */
  private static async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 6000
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Pair this device with a sync key from another device
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
      const cleanKey = this.normalizeKey(newSyncKey);

      const response = await this.fetchWithTimeout(
        `${serverUrl}/api/auth/pair`,
        {
          method: 'POST',
          body: JSON.stringify({ syncKey: cleanKey }),
        },
        7000
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const authData = await response.json().catch(() => ({}));
      if (authData.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
      }

      // Update local settings with new key
      const rawSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = rawSettings ? JSON.parse(rawSettings) : {};
      settings.syncKey = cleanKey;
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

      // Reset last sync to fetch entire cloud database
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
      this.lastKnownHash = '';

      // 1. First PULL everything from the paired account
      const pullRes = await this.fetchWithTimeout(
        `${serverUrl}/api/sync/pull`,
        {
          method: 'POST',
          body: JSON.stringify({ syncKey: cleanKey }),
        },
        7000
      );

      if (pullRes.ok) {
        const pullData = await pullRes.json();
        if (pullData.banks && pullData.banks.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(pullData.banks));
        }
        if (pullData.cashbacks && Array.isArray(pullData.cashbacks) && pullData.cashbacks.length > 0) {
          await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(pullData.cashbacks));
        }
        if (pullData.settings && Object.keys(pullData.settings).length > 0) {
          const currentSettings = rawSettings ? JSON.parse(rawSettings) : {};
          const mergedSettings = { ...currentSettings, ...pullData.settings, syncKey: cleanKey };
          await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings));
        }
        if (pullData.serverTime) {
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, pullData.serverTime);
        }
      }

      // 2. Perform full sync
      await this.performSync();
      return { success: true, message: `Успешно подключено к синхро-коду: ${cleanKey}! Все данные синхронизированы.` };
    } catch (e: any) {
      this.notify('error', undefined, e.message);
      return { success: false, message: `Ошибка подключения: ${e.message}` };
    }
  }

  /**
   * Main Two-Way Delta Sync Engine with dirty-checking to eliminate redundant re-renders
   */
  public static async performSync(): Promise<boolean> {
    if (this.isSyncRunning) return false;
    this.isSyncRunning = true;

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

      const currentDataHash = `${localBanks.length}_${localCashbacks.length}_${localBanks.map(b => b.id + b.updatedAt).join(',')}_${localCashbacks.map(c => c.id + c.updatedAt).join(',')}`;

      // 2. PUSH: Send local data to server
      const pushRes = await this.fetchWithTimeout(
        `${serverUrl}/api/sync/push`,
        {
          method: 'POST',
          body: JSON.stringify({
            syncKey,
            banks: localBanks,
            cashbacks: localCashbacks,
            settings: localSettings,
          }),
        },
        6000
      );

      if (!pushRes.ok) {
        throw new Error(`Push error ${pushRes.status}`);
      }

      // 3. PULL: Fetch server updates since lastSync
      const pullRes = await this.fetchWithTimeout(
        `${serverUrl}/api/sync/pull`,
        {
          method: 'POST',
          body: JSON.stringify({
            syncKey,
            since: lastSync,
          }),
        },
        6000
      );

      if (!pullRes.ok) {
        throw new Error(`Pull error ${pullRes.status}`);
      }

      const pullData = await pullRes.json();
      const serverBanks: Bank[] = pullData.banks || [];
      const serverCashbacks: MonthlyCashback[] = pullData.cashbacks || [];
      const serverTime: string = pullData.serverTime || new Date().toISOString();

      let hasLocalChanges = false;

      // 4. Merge server changes into local storage (Last-Write-Wins)
      let mergedBanks = [...localBanks];
      if (serverBanks.length > 0) {
        const bankMap = new Map<string, Bank>();
        mergedBanks.forEach((b) => bankMap.set(b.id, b));
        serverBanks.forEach((sb) => {
          const existing = bankMap.get(sb.id);
          if (!existing || new Date(sb.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
            bankMap.set(sb.id, sb);
            hasLocalChanges = true;
          }
        });
        if (hasLocalChanges) {
          mergedBanks = Array.from(bankMap.values());
          await AsyncStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(mergedBanks));
        }
      }

      let mergedCashbacks = [...localCashbacks];
      if (serverCashbacks.length > 0) {
        const cbMap = new Map<string, MonthlyCashback>();
        mergedCashbacks
          .filter((c) => !c.id.startsWith('sample-'))
          .forEach((c) => cbMap.set(c.id, c));
        let cbChanged = false;
        serverCashbacks.forEach((sc) => {
          const existing = cbMap.get(sc.id);
          if (!existing || new Date(sc.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
            cbMap.set(sc.id, sc);
            cbChanged = true;
          }
        });
        if (cbChanged) {
          hasLocalChanges = true;
          mergedCashbacks = Array.from(cbMap.values());
          await AsyncStorage.setItem(STORAGE_KEYS.CASHBACKS, JSON.stringify(mergedCashbacks));
        }
      }

      // 5. Update last sync time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, serverTime);

      // Only notify listeners to trigger UI re-renders if actual data changed
      // or if it was the initial sync after launch
      if (hasLocalChanges || this.lastKnownHash !== currentDataHash) {
        this.lastKnownHash = currentDataHash;
        this.notify('synced', serverTime);
      } else {
        this.status = 'synced';
      }

      return true;
    } catch (err: any) {
      this.notify('offline', undefined, err.message);
      return false;
    } finally {
      this.isSyncRunning = false;
    }
  }
}
