import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Database } from '../db/storage';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'cashback-hub-super-secret-key-2026';

export class AuthService {
  private static db = Database.getInstance();

  public static generateSyncKey(): string {
    // Format: "CB-XXXX-YYYY"
    const part1 = Math.floor(1000 + Math.random() * 9000).toString();
    const part2 = Math.floor(1000 + Math.random() * 9000).toString();
    return `CB-${part1}-${part2}`;
  }

  public static registerAnonymous(customSyncKey?: string): { user: User; token: string } {
    const syncKey = customSyncKey ? customSyncKey.trim().toUpperCase() : this.generateSyncKey();
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
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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
}
