import { ScanResult } from '../types';
import { PRESET_BANKS } from '../constants/banks';
import { SyncService } from './sync';
import { ImageBankDetector } from '../utils/imageAnalyzer';

const SYSTEM_PROMPT = `Ты — эксперт по распознаванию кэшбэка со скриншотов банковских приложений РФ.
Определи банк, месяц (0-11, где 0=Янв, 11=Дек), год (${new Date().getFullYear()}) и список категорий кэшбэка с их процентами.

Формат JSON:
{
  "bankName": "Т-Банк",
  "month": ${new Date().getMonth()},
  "year": ${new Date().getFullYear()},
  "items": [
    { "category": "Супермаркеты", "percent": 5, "note": "до 3000 ₽" },
    { "category": "1% на все покупки", "percent": 1 }
  ]
}`;

export class GeminiVisionService {
  private static cachedWorkingModel: string = 'gemini-2.0-flash';

  /**
   * Clean and normalize API key string
   */
  static sanitizeApiKey(key: string): string {
    return key
      .replace(/^Bearer\s+/i, '')
      .replace(/["'\r\n\t\s]/g, '')
      .trim();
  }

  /**
   * Test API key and find working model from user's account
   */
  static async testApiKeyAndGetModel(
    apiKey: string
  ): Promise<{ success: boolean; modelName?: string; message: string }> {
    const cleanKey = this.sanitizeApiKey(apiKey);
    if (!cleanKey) {
      return { success: false, message: 'API ключ не введен' };
    }

    // 1. Try Direct Google API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const models: any[] = data.models || [];
        const visionModels = models.filter(
          (m: any) =>
            m.supportedGenerationMethods &&
            m.supportedGenerationMethods.includes('generateContent')
        );

        if (visionModels.length > 0) {
          const preferred =
            visionModels.find((m) => m.name.includes('gemini-2.0-flash')) ||
            visionModels.find((m) => m.name.includes('gemini-1.5-flash')) ||
            visionModels[0];
          const modelId = preferred.name.replace(/^models\//, '');
          this.cachedWorkingModel = modelId;
          return {
            success: true,
            modelName: modelId,
            message: `Ключ работает отлично! Выбрана модель: ${modelId}`,
          };
        }
      } else {
        const errorText = await response.text();
        return { success: false, message: `Ошибка Google (${response.status}): ${errorText}` };
      }
    } catch (directErr: any) {
      console.warn('Direct key test failed or geo-blocked, trying server proxy:', directErr);
    }

    // 2. Try Server Proxy if Direct Fetch was blocked
    try {
      const serverUrl = await SyncService.getServerUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const serverRes = await fetch(`${serverUrl}/api/scan/test-key`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      clearTimeout(timeoutId);

      if (serverRes.ok) {
        const resData = await serverRes.json();
        return resData;
      }
    } catch (serverErr) {
      console.warn('Server test-key proxy failed:', serverErr);
    }

    return {
      success: false,
      message: 'Не удалось связаться с Google AI Studio (возможна сетевая блокировка в вашем регионе). Проверьте ключ и подключение.',
    };
  }

  /**
   * Fast High-Performance Screenshot OCR with Server Proxy & Graceful Fallback
   */
  static async analyzeScreenshot(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    apiKey?: string,
    preferredModel?: string
  ): Promise<ScanResult> {
    const cleanKey = this.sanitizeApiKey(apiKey || '');

    // 1. If key is provided, try direct Google AI Studio first
    if (cleanKey) {
      try {
        const directResult = await this.tryModel(
          preferredModel || this.cachedWorkingModel || 'gemini-2.0-flash',
          base64Image,
          mimeType,
          cleanKey
        );
        if (directResult) return directResult;
      } catch (directErr: any) {
        console.warn('Direct Gemini API call failed, trying backup model or server proxy:', directErr.message);
        
        // Try fallback model
        try {
          const fallbackResult = await this.tryModel('gemini-1.5-flash', base64Image, mimeType, cleanKey);
          if (fallbackResult) return fallbackResult;
        } catch {}
      }
    }

    // 2. Try Server Proxy (/api/scan/vision)
    try {
      const serverUrl = await SyncService.getServerUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${serverUrl}/api/scan/vision`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image,
          apiKey: cleanKey,
        }),
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.scanResult) {
          return {
            bankName: data.scanResult.bankName || 'Банк',
            bankId: data.scanResult.bankId,
            month: data.scanResult.month ?? new Date().getMonth(),
            year: data.scanResult.year ?? new Date().getFullYear(),
            items: data.scanResult.items || [],
            confidence: 0.95,
            rawText: JSON.stringify(data.scanResult),
          };
        }
      }
    } catch (serverErr) {
      console.warn('Server proxy scan failed or offline:', serverErr);
    }

    // 3. Graceful Fallback: Detect bank by screenshot color and signature!
    return ImageBankDetector.detectFromBase64(base64Image);
  }

  private static async tryModel(
    model: string,
    base64Image: string,
    mimeType: string,
    apiKey: string
  ): Promise<ScanResult> {
    const cleanModel = model.replace(/^models\//, '');
    const cleanBase64 = base64Image
      .replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, '')
      .replace(/[\r\n\s]/g, '');
    const cleanMime = mimeType.replace(/;.*$/, '').trim() || 'image/jpeg';
    const currentYear = new Date().getFullYear();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout max

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SYSTEM_PROMPT,
                },
                {
                  inlineData: {
                    mimeType: cleanMime,
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
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API (${cleanModel}) ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const matchedBank = PRESET_BANKS.find(
        (b) =>
          parsed.bankName &&
          (b.name.toLowerCase().includes(parsed.bankName.toLowerCase()) ||
            b.shortName.toLowerCase().includes(parsed.bankName.toLowerCase()) ||
            parsed.bankName.toLowerCase().includes(b.shortName.toLowerCase()))
      );

      const items = (parsed.items || []).map((item: any) => ({
        category: String(item.category || '').trim(),
        percent: Number(item.percent) || 0,
        note: item.note ? String(item.note).trim() : undefined,
      }));

      return {
        bankName: parsed.bankName || 'Неизвестный банк',
        bankId: matchedBank?.id,
        month: typeof parsed.month === 'number' ? parsed.month : new Date().getMonth(),
        year: typeof parsed.year === 'number' ? parsed.year : currentYear,
        items,
        confidence: 0.95,
        rawText,
      };
    } catch (e: any) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  public static mockSmartRecognition(): ScanResult {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return {
      bankName: 'Т-Банк',
      bankId: 'tbank',
      month: currentMonth,
      year: currentYear,
      items: [
        { category: 'Супермаркеты', percent: 5 },
        { category: 'Рестораны и кафе', percent: 5 },
        { category: 'Аптеки', percent: 5 },
        { category: '1% на все покупки', percent: 1 },
      ],
      confidence: 1.0,
      rawText: 'Режим редактирования скриншота',
    };
  }
}
