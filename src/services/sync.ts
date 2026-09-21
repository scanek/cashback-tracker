import { SyncStatusState } from '../types';
import { Platform } from 'react-native';

type SyncListener = (status: SyncStatusState, lastSyncedAt?: string, errorMessage?: string) => void;

/**
 * Standalone Local-First SyncService
 * Completely autonomous, zero external server dependency.
 */
export class SyncService {
  private static status: SyncStatusState = 'idle';
  private static listeners: Set<SyncListener> = new Set();

  public static addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  public static getStatus(): SyncStatusState {
    return this.status;
  }

  public static async getServerUrl(): Promise<string> {
    return '';
  }

  public static normalizeKey(rawKey: string): string {
    if (!rawKey) return '';
    let k = String(rawKey).trim().toLowerCase();
    const cyrillicMap: Record<string, string> = {
      'с': 'c', 'в': 'b', 'а': 'a', 'е': 'e', 'к': 'k',
      'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'т': 't',
      'х': 'x', 'у': 'y',
    };
    for (const [cyr, lat] of Object.entries(cyrillicMap)) {
      k = k.split(cyr).join(lat);
    }
    return k.trim();
  }

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
    return '';
  }

  public static async getPairingUrl(): Promise<string> {
    return '';
  }

  public static scheduleSync(_debounceMs: number = 1000): void {
    // Local-only: update Android Home Screen Widget
    try {
      if (Platform.OS === 'android') {
        const { WidgetService } = require('./widget');
        WidgetService.updateWidget();
      }
    } catch {}
  }

  public static startAutoSync(): void {
    // No-op in standalone mode
  }

  public static stopAutoSync(): void {
    // No-op in standalone mode
  }

  public static async pairWithKey(_keyToUse: string, _customServerUrl?: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Автономный режим активен' };
  }

  public static async performSync(): Promise<boolean> {
    this.scheduleSync();
    return true;
  }
}
