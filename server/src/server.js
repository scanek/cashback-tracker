/**
 * Pure Node.js (v18+) High-Performance Zero-Dependency Sync & Vision Server
 * Provides REST API for Two-Way Cloud Synchronization and Gemini Vision OCR.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory Database with atomic persistence
let db = {
  users: {},
  syncKeyToUserId: {},
  banks: {},
  cashbacks: {},
  settings: {},
};

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error reading db.json, creating new database:', e);
      saveDb();
    }
  } else {
    saveDb();
  }
}

function saveDb() {
  try {
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('Failed to save db.json:', e);
  }
}

loadDb();

// Helper to hash passwords using standard PBKDF2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return check === hash;
}

function getOrCreateUser(syncKey) {
  const cleanKey = (syncKey || '').trim().toUpperCase();
  const userId = db.syncKeyToUserId[cleanKey];
  if (userId && db.users[userId]) {
    return db.users[userId];
  }

  const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const keyToUse = cleanKey || `CB-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const user = {
    id: newId,
    syncKey: keyToUse,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users[newId] = user;
  db.syncKeyToUserId[keyToUse] = newId;
  if (!db.banks[newId]) db.banks[newId] = [];
  if (!db.cashbacks[newId]) db.cashbacks[newId] = [];
  if (!db.settings[newId]) db.settings[newId] = {};
  saveDb();
  return user;
}

// System prompt for Gemini Vision OCR
function getVisionSystemPrompt(currentYear) {
  return `
Ты — интеллектуальный ассистент для распознавания категорий кэшбэка со скриншотов банковских приложений (Россия).
Твоя задача — внимательно проанализировать изображение скриншота экрана выбора кэшбэка в банковском приложении и извлечь структурированные данные.

Популярные банки РФ:
- Т-Банк / Тинькофф (желтый фон или логотип Т) -> id: tbank
- СберБанк / СберСпасибо (зеленый стиль, галочка или Сбер) -> id: sber
- Альфа-Банк (красный стиль, буква А) -> id: alfa
- ВТБ (синий стиль, полоски) -> id: vtb
- Яндекс Пэй (желто-красный стиль, Яндекс) -> id: yandex
- Ozon Банк (синий / розовый стиль) -> id: ozon
- Газпромбанк -> id: gpb
- Райффайзенбанк -> id: raiffeisen
- Совкомбанк -> id: sovcom

Правила извлечения:
1. Определи банк (название).
2. Определи месяц (число от 0 до 11, где 0 = Январь, 1 = Февраль, ..., 11 = Декабрь) и год.
ВНИМАНИЕ: Текущий реальный год — ${currentYear}. Если год на скриншоте явно не указан, ОБЯЗАТЕЛЬНО укажи year: ${currentYear}.
3. Извлеки все выбранные или доступные категории кэшбэка с их процентами (например, 5%, 1%, 10%, 20%).
4. Если есть примечания (например, "до 3000 ₽", "от 1000 ₽", "в партнерских магазинах"), запиши их в поле note.

Верни СТРОГО валидный JSON без лишнего текста и без markdown-блоков:
{
  "bankName": "Т-Банк",
  "bankId": "tbank",
  "month": 7,
  "year": ${currentYear},
  "items": [
    {
      "category": "Супермаркеты",
      "percent": 5,
      "note": "до 3000 ₽"
    },
    {
      "category": "1% на все покупки",
      "percent": 1
    }
  ]
}
`;
}

// Request Handler
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  // Parse Body
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    // Protect against huge payloads (> 50MB)
    if (body.length > 50 * 1024 * 1024) {
      req.socket.destroy();
    }
  });

  req.on('end', async () => {
    let parsedBody = {};
    if (body) {
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        return sendJson(400, { success: false, error: 'Invalid JSON payload' });
      }
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
      // 0. Root Welcome / Status
      if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
        return sendJson(200, {
          status: 'ok',
          message: '🚀 Cashback Hub Cloud Sync & Vision Server is running!',
          version: '2.0.0',
          totalUsers: Object.keys(db.users).length,
          webClientPort: 8085,
          endpoints: {
            health: '/api/health',
            syncPull: 'POST /api/sync/pull',
            syncPush: 'POST /api/sync/push',
            pairDevice: 'POST /api/auth/pair',
            visionScan: 'POST /api/scan/vision'
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 1. Health Check
      if (req.method === 'GET' && pathname === '/api/health') {
        return sendJson(200, {
          status: 'ok',
          service: 'Cashback Hub Cloud Sync & Vision Server',
          version: '2.0.0',
          totalUsers: Object.keys(db.users).length,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Auth Pair
      if (req.method === 'POST' && pathname === '/api/auth/pair') {
        const { syncKey } = parsedBody;
        const user = getOrCreateUser(syncKey);
        return sendJson(200, {
          success: true,
          syncKey: user.syncKey,
          userId: user.id,
        });
      }

      // 3. Auth Register
      if (req.method === 'POST' && pathname === '/api/auth/register') {
        const { email, password } = parsedBody;
        if (!email || !password) {
          return sendJson(400, { success: false, error: 'Email и пароль обязательны' });
        }
        const norm = email.toLowerCase().trim();
        for (const u of Object.values(db.users)) {
          if (u.email && u.email.toLowerCase() === norm) {
            return sendJson(400, { success: false, error: 'Пользователь с таким email уже существует' });
          }
        }
        const user = getOrCreateUser();
        user.email = norm;
        user.passwordHash = hashPassword(password);
        user.updatedAt = new Date().toISOString();
        saveDb();
        return sendJson(200, {
          success: true,
          syncKey: user.syncKey,
          userId: user.id,
          email: user.email,
        });
      }

      // 4. Auth Login
      if (req.method === 'POST' && pathname === '/api/auth/login') {
        const { email, password } = parsedBody;
        if (!email || !password) {
          return sendJson(400, { success: false, error: 'Email и пароль обязательны' });
        }
        const norm = email.toLowerCase().trim();
        let found = null;
        for (const u of Object.values(db.users)) {
          if (u.email && u.email.toLowerCase() === norm) {
            found = u;
            break;
          }
        }
        if (!found || !verifyPassword(password, found.passwordHash)) {
          return sendJson(401, { success: false, error: 'Неверный email или пароль' });
        }
        return sendJson(200, {
          success: true,
          syncKey: found.syncKey,
          userId: found.id,
          email: found.email,
        });
      }

      // 5. Sync Push
      if (req.method === 'POST' && pathname === '/api/sync/push') {
        const { syncKey, banks, cashbacks, settings } = parsedBody;
        if (!syncKey) {
          return sendJson(400, { success: false, error: 'syncKey is required' });
        }
        const user = getOrCreateUser(syncKey);

        if (banks && Array.isArray(banks)) {
          const currentBanks = db.banks[user.id] || [];
          const bMap = new Map();
          currentBanks.forEach(b => bMap.set(b.id, b));
          banks.forEach(b => {
            const existing = bMap.get(b.id);
            if (!existing || new Date(b.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
              bMap.set(b.id, { ...existing, ...b, userId: user.id, updatedAt: b.updatedAt || new Date().toISOString() });
            }
          });
          db.banks[user.id] = Array.from(bMap.values());
        }

        if (cashbacks && Array.isArray(cashbacks)) {
          const currentCbs = db.cashbacks[user.id] || [];
          const cbMap = new Map();
          currentCbs.forEach(c => cbMap.set(c.id, c));
          cashbacks.forEach(c => {
            const existing = cbMap.get(c.id);
            if (!existing || new Date(c.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
              cbMap.set(c.id, { ...existing, ...c, userId: user.id, updatedAt: c.updatedAt || new Date().toISOString() });
            }
          });
          db.cashbacks[user.id] = Array.from(cbMap.values());
        }

        if (settings && typeof settings === 'object') {
          db.settings[user.id] = {
            ...(db.settings[user.id] || {}),
            ...settings,
          };
        }

        saveDb();
        return sendJson(200, {
          success: true,
          serverTime: new Date().toISOString(),
        });
      }

      // 6. Sync Pull
      if (req.method === 'POST' && pathname === '/api/sync/pull') {
        const { syncKey, since } = parsedBody;
        if (!syncKey) {
          return sendJson(400, { success: false, error: 'syncKey is required' });
        }
        const user = getOrCreateUser(syncKey);
        const userBanks = db.banks[user.id] || [];
        const userCashbacks = db.cashbacks[user.id] || [];
        const userSettings = db.settings[user.id] || {};

        let filteredBanks = userBanks;
        let filteredCashbacks = userCashbacks;

        if (since) {
          const sinceTime = new Date(since).getTime();
          filteredBanks = userBanks.filter(b => new Date(b.updatedAt || 0).getTime() > sinceTime);
          filteredCashbacks = userCashbacks.filter(c => new Date(c.updatedAt || 0).getTime() > sinceTime);
        } else {
          filteredBanks = userBanks.filter(b => !b.deletedAt);
          filteredCashbacks = userCashbacks.filter(c => !c.deletedAt);
        }

        return sendJson(200, {
          success: true,
          banks: filteredBanks,
          cashbacks: filteredCashbacks,
          settings: userSettings,
          serverTime: new Date().toISOString(),
        });
      }

      // 7. Vision OCR Endpoint
      if (req.method === 'POST' && pathname === '/api/scan/vision') {
        const { base64Image, apiKey } = parsedBody;
        if (!base64Image) {
          return sendJson(400, { success: false, error: 'base64Image is required' });
        }

        const cleanKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();
        if (!cleanKey) {
          return sendJson(400, { success: false, error: 'API key is required' });
        }

        const currentYear = new Date().getFullYear();
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`;
        const reqPayload = {
          contents: [
            {
              parts: [
                { text: getVisionSystemPrompt(currentYear) },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        };

        let geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
        });

        if (!geminiRes.ok) {
          // Fallback to gemini-1.5-flash
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
          geminiRes = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqPayload),
          });
        }

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          return sendJson(500, { success: false, error: `Gemini API Error: ${errText}` });
        }

        const data = await geminiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanText);

        return sendJson(200, {
          success: true,
          scanResult: {
            bankName: parsed.bankName || 'Неизвестный банк',
            bankId: parsed.bankId,
            month: typeof parsed.month === 'number' ? parsed.month : new Date().getMonth(),
            year: typeof parsed.year === 'number' ? parsed.year : currentYear,
            items: Array.isArray(parsed.items) ? parsed.items : [],
          },
        });
      }

      // Not Found
      return sendJson(404, { success: false, error: 'Endpoint not found' });
    } catch (err) {
      console.error('Server error:', err);
      return sendJson(500, { success: false, error: err.message || 'Internal Server Error' });
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Cashback Hub Cloud Sync Server running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📁 Database: ${DB_FILE}`);
  console.log(`====================================================`);
});
