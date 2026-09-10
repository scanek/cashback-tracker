/**
 * Cashback Hub Cloud Sync & Gemini Vision Server
 * Handles cross-device JSON sync, authentication, and Google Gemini Vision OCR.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
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

// Password hashing utility
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
  return `Ты — интеллектуальный ассистент для распознавания категорий кэшбэка со скриншотов банковских приложений РФ.
Твоя задача — внимательно определить банк, месяц (${new Date().getMonth()}), год (${currentYear}) и извлечь список категорий кэшбэка с их процентами.

Банки РФ и их bankId:
- СберБанк (СберСпасибо, зеленый стиль) -> bankName: "СберБанк", bankId: "sber"
- Альфа-Банк (красный стиль, буква А) -> bankName: "Альфа-Банк", bankId: "alfa"
- Т-Банк / Тинькофф (желтый фон, буква Т) -> bankName: "Т-Банк", bankId: "tbank"
- ВТБ (синий стиль, полоски) -> bankName: "ВТБ", bankId: "vtb"
- Ozon Банк (синий / розовый стиль) -> bankName: "Ozon Банк", bankId: "ozon"
- Яндекс Пэй (Яндекс, Плюс) -> bankName: "Яндекс Пэй", bankId: "yandex"
- Газпромбанк -> bankName: "Газпромбанк", bankId: "gpb"
- Райффайзенбанк -> bankName: "Райффайзенбанк", bankId: "raiffeisen"
- Совкомбанк (Халва) -> bankName: "Совкомбанк", bankId: "sovcom"

Верни СТРОГО чистый JSON:
{
  "bankName": "Название определенного банка",
  "bankId": "sber | alfa | tbank | vtb | ozon | yandex | gpb | raiffeisen | sovcom",
  "month": ${new Date().getMonth()},
  "year": ${currentYear},
  "items": [
    { "category": "Категория", "percent": 5, "note": "примечание если есть" }
  ]
}`;
}

// Helper to execute OCR against Google Gemini API with dynamic vision model discovery
async function executeGeminiOcr(apiKey, cleanBase64, currentYear) {
  // 1. Discover models available for this key
  let candidateModels = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-exp-1206',
  ];

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const available = (listData.models || [])
        .filter((m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''))
        // Strictly filter only ACTIVE Gemini Multimodal Vision models (exclude deprecated 2.5, TTS, audio, embeddings, text-only gemma)
        .filter((name) => {
          const lower = name.toLowerCase();
          return (
            lower.startsWith('gemini-') &&
            !lower.includes('2.5') &&
            !lower.includes('tts') &&
            !lower.includes('audio') &&
            !lower.includes('embed') &&
            !lower.includes('aqa') &&
            !lower.includes('imagen') &&
            !lower.includes('learnlm')
          );
        });

      if (available.length > 0) {
        const sorted = [];
        const PREFERRED_ORDER = [
          'gemini-2.0-flash',
          'gemini-2.0-flash-exp',
          'gemini-1.5-flash-latest',
          'gemini-1.5-flash',
          'gemini-1.5-flash-8b',
          'gemini-1.5-pro-latest',
          'gemini-1.5-pro',
        ];

        for (const pref of PREFERRED_ORDER) {
          const match = available.find((m) => m === pref || m.startsWith(pref));
          if (match && !sorted.includes(match)) sorted.push(match);
        }
        for (const m of available) {
          if (!sorted.includes(m)) sorted.push(m);
        }
        candidateModels = sorted;
        console.log(`🤖 [OCR] Выбраны активные модели для скриншота:`, candidateModels);
      }
    }
  } catch (e) {
    console.warn('Failed to query models list, using default candidate list:', e.message);
  }

  const reqPayload = {
    contents: [
      {
        parts: [
          { text: getVisionSystemPrompt(currentYear) },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Model ${model} returned ${res.status}: ${errText}`);
        console.warn(`Model ${model} failed, trying next: ${errText.slice(0, 100)}`);
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanText);

      return {
        modelUsed: model,
        scanResult: {
          bankName: parsed.bankName || 'Неизвестный банк',
          bankId: parsed.bankId,
          month: typeof parsed.month === 'number' ? parsed.month : new Date().getMonth(),
          year: typeof parsed.year === 'number' ? parsed.year : currentYear,
          items: Array.isArray(parsed.items) ? parsed.items : [],
        },
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Все доступные модели Gemini вернули ошибку при распознавании.');
}

// Rate limiter for brute-force prevention
const rateLimitMap = new Map(); // ip -> { count, firstAttempt, blockedUntil }

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) return { allowed: true };

  if (entry.blockedUntil && entry.blockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  // Reset window after 15 minutes of inactivity
  if (now - entry.firstAttempt > 15 * 60 * 1000) {
    rateLimitMap.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, firstAttempt: now };
  entry.count += 1;

  if (entry.count >= 10) {
    entry.blockedUntil = now + 30 * 60 * 1000; // 30 min block
  } else if (entry.count >= 5) {
    entry.blockedUntil = now + 15 * 60 * 1000; // 15 min block
  }

  rateLimitMap.set(ip, entry);
}

function recordSuccessAttempt(ip) {
  rateLimitMap.delete(ip);
}

// Request Handler
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const limitCheck = checkRateLimit(clientIp);

  if (!limitCheck.allowed) {
    res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: false,
      error: `Too Many Requests. IP временно заблокирован на ${limitCheck.remainingSeconds} сек. из-за частых неверных попыток.`,
    }));
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Utility to send JSON response
  const sendJson = (status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  // Collect request body
  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk;
    // Limit to 20MB for large mobile screenshot uploads
    if (rawBody.length > 20 * 1024 * 1024) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload Too Large (max 20MB)' }));
      req.destroy();
    }
  });

  req.on('end', async () => {
    let parsedBody = {};
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch (e) {
        return sendJson(400, { success: false, error: 'Invalid JSON payload' });
      }
    }

    try {
      // 1. Root / Health Status
      if (req.method === 'GET' && (pathname === '/' || pathname === '/api/health')) {
        return sendJson(200, {
          status: 'ok',
          message: '🚀 Cashback Hub Cloud Sync & Vision Server is running!',
          version: '2.1.0',
          totalUsers: Object.keys(db.users).length,
          webClientPort: 8085,
          endpoints: {
            health: '/api/health',
            syncPull: 'POST /api/sync/pull',
            syncPush: 'POST /api/sync/push',
            pairDevice: 'POST /api/auth/pair',
            testKey: 'POST /api/scan/test-key',
            visionScan: 'POST /api/scan/vision',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Auth: Register / Get Sync Key
      if (req.method === 'POST' && pathname === '/api/auth/register') {
        const { syncKey, email, password } = parsedBody;
        const user = getOrCreateUser(syncKey);
        if (email) user.email = email;
        if (password) user.passwordHash = hashPassword(password);
        user.updatedAt = new Date().toISOString();
        saveDb();
        return sendJson(200, { success: true, user });
      }

      // 3. Auth: Pair Device with existing Sync Key
      if (req.method === 'POST' && pathname === '/api/auth/pair') {
        const { syncKey } = parsedBody;
        if (!syncKey) {
          return sendJson(400, { success: false, error: 'syncKey is required' });
        }
        const user = getOrCreateUser(syncKey);
        return sendJson(200, {
          success: true,
          message: `Устройство успешно связано с аккаунтом ${user.syncKey}`,
          user,
        });
      }

      // 4. Sync Status Check
      if (req.method === 'GET' && pathname === '/api/sync/status') {
        const key = parsedUrl.query.syncKey;
        if (!key) {
          return sendJson(400, { success: false, error: 'syncKey parameter required' });
        }
        const user = getOrCreateUser(key);
        const banksCount = (db.banks[user.id] || []).length;
        const cashbacksCount = (db.cashbacks[user.id] || []).length;
        return sendJson(200, {
          success: true,
          syncKey: user.syncKey,
          banksCount,
          cashbacksCount,
          lastUpdated: user.updatedAt,
        });
      }

      // 5. Sync Push
      if (req.method === 'POST' && pathname === '/api/sync/push') {
        const { syncKey, banks, cashbacks, settings } = parsedBody;
        if (!syncKey) {
          return sendJson(400, { success: false, error: 'syncKey is required' });
        }
        const user = getOrCreateUser(syncKey);
        user.updatedAt = new Date().toISOString();

        if (Array.isArray(banks)) {
          const currentBanks = db.banks[user.id] || [];
          const bankMap = new Map(currentBanks.map(b => [b.id, b]));
          for (const b of banks) {
            const existing = bankMap.get(b.id);
            if (!existing || new Date(b.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
              bankMap.set(b.id, b);
            }
          }
          db.banks[user.id] = Array.from(bankMap.values());
        }

        if (Array.isArray(cashbacks)) {
          const currentCashbacks = db.cashbacks[user.id] || [];
          const cashbackMap = new Map(currentCashbacks.map(c => [c.id, c]));
          for (const c of cashbacks) {
            const existing = cashbackMap.get(c.id);
            if (!existing || new Date(c.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
              cashbackMap.set(c.id, c);
            }
          }
          db.cashbacks[user.id] = Array.from(cashbackMap.values());
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

      // 7. Test API Key Endpoint
      if (req.method === 'POST' && pathname === '/api/scan/test-key') {
        const { apiKey } = parsedBody;
        const cleanKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();
        if (!cleanKey) {
          return sendJson(400, { success: false, message: 'API ключ не передан' });
        }

        try {
          const testRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
          );
          if (!testRes.ok) {
            const errText = await testRes.text();
            return sendJson(200, { success: false, message: `Ошибка Google API (${testRes.status}): ${errText}` });
          }

          const data = await testRes.json();
          const models = data.models || [];
          const flash = models.find((m) => m.name && m.name.includes('gemini-2.5-flash')) ||
                        models.find((m) => m.name && m.name.includes('gemini-2.0-flash')) ||
                        models.find((m) => m.name && m.name.includes('gemini-1.5-flash')) ||
                        models[0];
          const modelName = flash ? flash.name.replace(/^models\//, '') : 'gemini-2.5-flash';

          return sendJson(200, {
            success: true,
            modelName,
            message: `Ключ проверен через сервер! Выбрана модель: ${modelName}`,
          });
        } catch (err) {
          return sendJson(500, { success: false, message: `Сетевая ошибка сервера: ${err.message}` });
        }
      }

      // 8. Vision OCR Endpoint
      if (req.method === 'POST' && pathname === '/api/scan/vision') {
        const { base64Image, apiKey } = parsedBody;
        if (!base64Image) {
          return sendJson(400, { success: false, error: 'base64Image is required' });
        }

        const DEFAULT_GEMINI_KEY = 'AQ.Ab8RN6KwvfUPXsMTFOkNICNX0tZo4FkhpI3h_PDtmkXKYGz9Ww';
        const cleanKey = (apiKey || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY).trim();
        const currentYear = new Date().getFullYear();
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

        console.log(`📸 [OCR] Получен запрос на распознавание скриншота (длина base64: ${cleanBase64.length})`);
        console.log(`🔑 [OCR] Используем ключ: ${cleanKey.slice(0, 10)}...`);

        try {
          const result = await executeGeminiOcr(cleanKey, cleanBase64, currentYear);
          console.log(`🎉 [OCR] УСПЕХ! Банк: ${result.scanResult.bankName} (id: ${result.scanResult.bankId}), категорий: ${result.scanResult.items.length}`);
          return sendJson(200, {
            success: true,
            modelUsed: result.modelUsed,
            scanResult: result.scanResult,
          });
        } catch (err) {
          console.error('❌ [OCR] Ошибка распознавания:', err.message);
          return sendJson(500, { success: false, error: `Gemini API Error: ${err.message}` });
        }
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
