import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AuthService } from './services/auth';
import { SyncService } from './services/sync';
import { VisionService } from './services/vision';
import { Database } from './db/storage';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all clients (Web app on any port / mobile app)
app.use(cors({ origin: '*' }));

// High JSON body limit for Base64 screenshots
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Cashback Hub Sync Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Auth / Device Pairing
app.post('/api/auth/pair', (req: Request, res: Response) => {
  try {
    const { syncKey } = req.body;
    const result = AuthService.registerAnonymous(syncKey);
    res.json({
      success: true,
      syncKey: result.user.syncKey,
      token: result.token,
      userId: result.user.id,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
    }
    const result = await AuthService.registerWithEmail(email, password);
    res.json({
      success: true,
      syncKey: result.user.syncKey,
      token: result.token,
      userId: result.user.id,
      email: result.user.email,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
    }
    const result = await AuthService.loginWithEmail(email, password);
    res.json({
      success: true,
      syncKey: result.user.syncKey,
      token: result.token,
      userId: result.user.id,
      email: result.user.email,
    });
  } catch (error: any) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// Sync Endpoints
app.post('/api/sync/pull', (req: Request, res: Response) => {
  try {
    const { syncKey, since } = req.body;
    if (!syncKey) {
      return res.status(400).json({ success: false, error: 'syncKey is required' });
    }
    const data = SyncService.handlePull({ syncKey, since });
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sync/push', (req: Request, res: Response) => {
  try {
    const { syncKey, banks, cashbacks, settings } = req.body;
    if (!syncKey) {
      return res.status(400).json({ success: false, error: 'syncKey is required' });
    }
    const result = SyncService.handlePush({ syncKey, banks, cashbacks, settings });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vision OCR proxy endpoint
app.post('/api/scan/vision', async (req: Request, res: Response) => {
  try {
    const { base64Image, apiKey } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, error: 'base64Image is required' });
    }
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      return res.status(400).json({ success: false, error: 'Gemini API Key is required' });
    }

    const scanResult = await VisionService.analyzeScreenshot(base64Image, keyToUse);
    res.json({ success: true, scanResult });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Cashback Hub Sync Server running on http://localhost:${PORT}`);
});
