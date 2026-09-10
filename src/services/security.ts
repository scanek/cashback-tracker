import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';

const STORAGE_KEYS = {
  PIN_ATTEMPTS: '@cashback_hub_pin_attempts_v1',
  PIN_LOCKOUT_UNTIL: '@cashback_hub_pin_lockout_v1',
  PIN_SESSION_UNLOCKED: '@cashback_hub_session_unlocked_v1',
};

// Simple yet robust client-side hashing (SHA-256 equivalent via Web Crypto or polyfill)
async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin.trim()}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple numeric hash
  let hash = 0;
  const str = `${salt}:${pin.trim()}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

function generateSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 10);
}

export class SecurityService {
  /**
   * Check if PIN lock is currently enabled
   */
  public static async isPinRequired(): Promise<boolean> {
    try {
      const settings = await StorageService.getSettings();
      if (!settings.isPinEnabled || !settings.pinCodeHash) {
        return false;
      }
      const isUnlocked = await AsyncStorage.getItem(STORAGE_KEYS.PIN_SESSION_UNLOCKED);
      return isUnlocked !== 'true';
    } catch {
      return false;
    }
  }

  /**
   * Has a PIN been configured by user?
   */
  public static async hasConfiguredPin(): Promise<boolean> {
    try {
      const settings = await StorageService.getSettings();
      return Boolean(settings.isPinEnabled && settings.pinCodeHash);
    } catch {
      return false;
    }
  }

  /**
   * Set or update PIN code
   */
  public static async setPin(newPin: string): Promise<boolean> {
    const cleanPin = newPin.trim();
    if (cleanPin.length < 4) {
      throw new Error('PIN-код должен состоять минимум из 4 цифр');
    }
    const salt = generateSalt();
    const hash = await hashPin(cleanPin, salt);
    await StorageService.saveSettings({
      isPinEnabled: true,
      pinCodeHash: hash,
      pinSalt: salt,
    });
    // Mark current device session as unlocked
    await AsyncStorage.setItem(STORAGE_KEYS.PIN_SESSION_UNLOCKED, 'true');
    await this.resetAttempts();
    return true;
  }

  /**
   * Remove PIN lock
   */
  public static async removePin(): Promise<boolean> {
    await StorageService.saveSettings({
      isPinEnabled: false,
      pinCodeHash: '',
      pinSalt: '',
    });
    await AsyncStorage.removeItem(STORAGE_KEYS.PIN_SESSION_UNLOCKED);
    await this.resetAttempts();
    return true;
  }

  /**
   * Check remaining lockout seconds if user is temporarily blocked
   */
  public static async getLockoutRemainingSeconds(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PIN_LOCKOUT_UNTIL);
      if (!raw) return 0;
      const lockoutUntil = parseInt(raw, 10);
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Verify entered PIN code with brute-force rate-limiting
   */
  public static async verifyPin(enteredPin: string): Promise<{
    success: boolean;
    lockoutSeconds?: number;
    remainingAttempts?: number;
    errorMessage?: string;
  }> {
    // 1. Check if locked out
    const remainingSeconds = await this.getLockoutRemainingSeconds();
    if (remainingSeconds > 0) {
      return {
        success: false,
        lockoutSeconds: remainingSeconds,
        errorMessage: `Слишком много неверных попыток. Подождите ${remainingSeconds} сек.`,
      };
    }

    const settings = await StorageService.getSettings();
    if (!settings.isPinEnabled || !settings.pinCodeHash) {
      return { success: true };
    }

    const salt = settings.pinSalt || 'default_salt';
    const computedHash = await hashPin(enteredPin, salt);

    if (computedHash === settings.pinCodeHash) {
      // Successful authentication
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_SESSION_UNLOCKED, 'true');
      await this.resetAttempts();
      return { success: true };
    }

    // Failed attempt: increment counter
    const currentAttempts = await this.incrementAttempts();

    let lockoutDuration = 0;
    let maxAttemptsAllowed = 3;

    if (currentAttempts >= 10) {
      lockoutDuration = 1800; // 30 minutes lockout
    } else if (currentAttempts >= 5) {
      lockoutDuration = 300; // 5 minutes lockout
    } else if (currentAttempts >= 3) {
      lockoutDuration = 30; // 30 seconds lockout
    }

    if (lockoutDuration > 0) {
      const lockoutUntil = Date.now() + lockoutDuration * 1000;
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_LOCKOUT_UNTIL, lockoutUntil.toString());
      return {
        success: false,
        lockoutSeconds: lockoutDuration,
        errorMessage: `Неверный PIN-код. Ввод заблокирован на ${lockoutDuration >= 60 ? Math.ceil(lockoutDuration / 60) + ' мин.' : lockoutDuration + ' сек.'}`,
      };
    }

    const remaining = Math.max(1, maxAttemptsAllowed - currentAttempts);
    return {
      success: false,
      remainingAttempts: remaining,
      errorMessage: `Неверный PIN-код. Осталось попыток до блокировки: ${remaining}`,
    };
  }

  /**
   * Lock application manually (logout)
   */
  public static async lockApp(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.PIN_SESSION_UNLOCKED);
  }

  private static async incrementAttempts(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PIN_ATTEMPTS);
      const count = (raw ? parseInt(raw, 10) : 0) + 1;
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_ATTEMPTS, count.toString());
      return count;
    } catch {
      return 1;
    }
  }

  private static async resetAttempts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PIN_ATTEMPTS);
      await AsyncStorage.removeItem(STORAGE_KEYS.PIN_LOCKOUT_UNTIL);
    } catch {}
  }
}
