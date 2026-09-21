import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Database } from '../db/storage';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'cashback-hub-super-secret-key-2026';

export class AuthService {
  private static db = Database.getInstance();

  /**
   * Generates a 128-bit cryptographically secure sync key formatted as:
   * "cb-xxxx-xxxx-xxxx-xxxx"
   */
  public static generateSyncKey(): string {
    const bytes = crypto.randomBytes(8).toString('hex').toLowerCase();
    return `cb-${bytes.slice(0, 4)}-${bytes.slice(4, 8)}-${bytes.slice(8, 12)}-${bytes.slice(12, 16)}`;
  }

  public static registerAnonymous(customSyncKey?: string): { user: User; token: string } {
    const rawKey = (customSyncKey || '').trim();
    const syncKey = rawKey ? rawKey.toLowerCase() : this.generateSyncKey();
    const user = this.db.getOrCreateUserBySyncKey(syncKey);
    const token = jwt.sign({ userId: user.id, syncKey: user.syncKey }, JWT_SECRET, { expiresIn: '365d' });
    return { user, token };
  }

  public static async registerWithEmail(email: string, password: string): Promise<{ user: User; token: string }> {
    const existing = this.db.getUserByEmail(email);
    if (existing) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const syncKey = this.generateSyncKey();
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      email,
      passwordHash,
      syncKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const user = this.db.createUser(newUser);
    const token = jwt.sign({ userId: user.id, syncKey: user.syncKey }, JWT_SECRET, { expiresIn: '365d' });
    return { user, token };
  }

  public static async loginWithEmail(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = this.db.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      throw new Error('Неверный email или пароль');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Неверный email или пароль');
    }

    const token = jwt.sign({ userId: user.id, syncKey: user.syncKey }, JWT_SECRET, { expiresIn: '365d' });
    return { user, token };
  }

  public static verifyToken(token: string): { userId: string; syncKey: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; syncKey: string };
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Helper to verify user from Authorization Bearer or syncKey
   */
  public static authenticate(authHeader?: string, syncKey?: string): User | null {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const payload = this.verifyToken(token);
      if (payload && payload.syncKey) {
        return this.db.getUserBySyncKey(payload.syncKey);
      }
    }
    if (syncKey && syncKey.trim()) {
      return this.db.getUserBySyncKey(syncKey.trim());
    }
    return null;
  }
}
