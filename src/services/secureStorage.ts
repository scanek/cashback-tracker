import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_KEYS = {
  PIN_HASH: '@cashback_secure_pin_hash_v1',
  PIN_SALT: '@cashback_secure_pin_salt_v1',
  GEMINI_API_KEY: '@cashback_secure_gemini_key_v1',
};

/**
 * Isolated secure storage for sensitive credentials (PIN hash, salt, Gemini API key).
 * Keeps credentials separated from general app settings to prevent accidental leaks in backups.
 */
export class SecureStorage {
  static async getPinHash(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(SECURE_KEYS.PIN_HASH)) || '';
    } catch {
      return '';
    }
  }

  static async setPinHash(hash: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SECURE_KEYS.PIN_HASH, hash);
    } catch (e) {
      console.error('Failed to save secure PIN hash', e);
    }
  }

  static async getPinSalt(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(SECURE_KEYS.PIN_SALT)) || '';
    } catch {
      return '';
    }
  }

  static async setPinSalt(salt: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SECURE_KEYS.PIN_SALT, salt);
    } catch (e) {
      console.error('Failed to save secure PIN salt', e);
    }
  }

  static async clearPin(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([SECURE_KEYS.PIN_HASH, SECURE_KEYS.PIN_SALT]);
    } catch (e) {
      console.error('Failed to clear secure PIN', e);
    }
  }

  static async getApiKey(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(SECURE_KEYS.GEMINI_API_KEY)) || '';
    } catch {
      return '';
    }
  }

  static async setApiKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SECURE_KEYS.GEMINI_API_KEY, key.trim());
    } catch (e) {
      console.error('Failed to save secure API key', e);
    }
  }

  static async clearApiKey(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SECURE_KEYS.GEMINI_API_KEY);
    } catch (e) {
      console.error('Failed to clear secure API key', e);
    }
  }
}
