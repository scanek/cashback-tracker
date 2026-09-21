import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { AuthService } from './services/auth';
import { SyncService } from './services/sync';
import { VisionService } from './services/vision';
import { Database } from './db/storage';

// Attempt to load .env from multiple locations
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const db = Database.getInstance();

// Enable CORS for all origins (PWA, mobile app, local network)
app.use(cors({ origin: '*' }));

// Generous JSON body limit for Base64 screenshot uploads (up to 30MB)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// Trust reverse proxy (Nginx) for correct client IP detection in rate limiting
app.set('trust proxy', 1);

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 pair attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Слишком много попыток сопряжения. Пожалуйста, подождите 15 минут.' },
});

const syncLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 180, // up to 180 sync requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Превышен лимит запросов синхронизации (HTTP 429).' },
});

const scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // up to 30 OCR requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Превышен лимит запросов распознавания (HTTP 429).' },
});

// Middleware for authenticating sync requests
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const syncKey = req.body?.syncKey || (req.query?.syncKey as string);

  const user = AuthService.authenticate(authHeader, syncKey);
  if (!user) {
    // If syncKey provided, safely create user if brand new or return error
    if (syncKey && typeof syncKey === 'string' && syncKey.trim()) {
      const created = db.getOrCreateUserBySyncKey(syncKey.trim());
      (req as any).user = created;
      return next();
    }
    return res.status(401).json({ success: false, error: 'Недействительный ключ синхронизации или сессионный токен' });
  }

  (req as any).user = user;
  next();
}

// 1. Root & Health Check
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: '🚀 Cashback Hub Cloud Sync & Vision Server is running!',
    version: '2.2.0',
    totalUsers: db.getTotalUsersCount(),
    webClientPort: 8085,
    endpoints: {
      health: '/api/health',
      syncPull: 'POST /api/sync/pull',
      syncPush: 'POST /api/sync/push',
      syncStatus: 'GET /api/sync/status',
      pairDevice: 'POST /api/auth/pair',
      testKey: 'POST /api/scan/test-key',
      visionScan: 'POST /api/scan/vision',
    },
    timestamp: new Date().toISOString(),
  });
};

app.get('/', healthHandler);
app.get('/api/health', healthHandler);

// 2. Auth: Device Pairing
app.post('/api/auth/pair', authLimiter, (req: Request, res: Response) => {
  try {
    const { syncKey } = req.body;
    const result = AuthService.registerAnonymous(syncKey);
    res.json({
      success: true,
      message: `Устройство успешно связано с аккаунтом ${result.user.syncKey}`,
      syncKey: result.user.syncKey,
      token: result.token,
      userId: result.user.id,
      user: result.user,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. Auth: Register / Login (Optional email accounts)
app.post('/api/auth/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, syncKey } = req.body;
    if (email && password) {
      const result = await AuthService.registerWithEmail(email, password);
      return res.json({ success: true, ...result });
    }
    const result = AuthService.registerAnonymous(syncKey);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
    }
    const result = await AuthService.loginWithEmail(email, password);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// 4. Sync Status
app.get('/api/sync/status', syncLimiter, (req: Request, res: Response) => {
  const syncKey = (req.query.syncKey as string) || '';
  if (!syncKey) {
    return res.status(400).json({ success: false, error: 'Параметр syncKey обязателен' });
  }
  const user = db.getUserBySyncKey(syncKey);
  if (!user) {
    return res.json({ success: false, error: 'Пользователь не найден' });
  }
  const banks = db.getUserBanks(user.id);
  const cashbacks = db.getUserCashbacks(user.id);
  res.json({
    success: true,
    syncKey: user.syncKey,
    banksCount: banks.length,
    cashbacksCount: cashbacks.length,
    lastUpdated: user.updatedAt,
  });
});

// 5. Sync Push
app.post('/api/sync/push', syncLimiter, requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { banks, cashbacks, settings } = req.body;
    const result = SyncService.handlePush(user.id, { banks, cashbacks, settings });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Sync Pull
app.post('/api/sync/pull', syncLimiter, requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { since } = req.body;
    const result = SyncService.handlePull(user.id, since);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Test Gemini API Key (Using secure headers)
app.post('/api/scan/test-key', scanLimiter, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    const keyToUse = (apiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!keyToUse) {
      return res.status(400).json({
        success: false,
        message: 'API-ключ Google Gemini не указан ни в запросе, ни на сервере (GEMINI_API_KEY)',
      });
    }

    const testResult = await VisionService.testApiKey(keyToUse);
    res.json(testResult);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Vision OCR Proxy
app.post('/api/scan/vision', scanLimiter, async (req: Request, res: Response) => {
  try {
    const { base64Image, apiKey, targetYear, targetMonth } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, error: 'base64Image is required' });
    }

    const keyToUse = (apiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!keyToUse) {
      return res.status(400).json({
        success: false,
        error: 'API-ключ Google Gemini не настроен. Укажите бесплатный ключ в настройках или в GEMINI_API_KEY на сервере.',
      });
    }

    console.log(`📸 [OCR] Распознавание скриншота (размер: ${base64Image.length} символов base64)`);
    const result = await VisionService.analyzeScreenshot(base64Image, keyToUse, targetYear, targetMonth);
    console.log(`🎉 [OCR] Успешно! Банк: ${result.scanResult.bankName}, категорий: ${result.scanResult.items.length}`);

    res.json({
      success: true,
      modelUsed: result.modelUsed,
      scanResult: result.scanResult,
    });
  } catch (error: any) {
    console.error('❌ [OCR] Ошибка:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Graceful shutdown
const handleExit = () => {
  console.log('🛑 [Server] Сохранение данных перед завершением работы...');
  db.persistSync();
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Cashback Hub Unified Sync Server running on http://localhost:${PORT}`);
});
