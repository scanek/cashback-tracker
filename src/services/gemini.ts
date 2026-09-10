import { ScanResult } from '../types';
import { PRESET_BANKS } from '../constants/banks';
import { SyncService } from './sync';
import { ImageBankDetector } from '../utils/imageAnalyzer';

export function resolveBankId(bankName?: string, bankIdHint?: string): { id: string; name: string } {
  if (bankIdHint) {
    const hintClean = bankIdHint.toLowerCase().trim();
    const found = PRESET_BANKS.find((b) => b.id === hintClean);
    if (found) return { id: found.id, name: found.shortName };
  }

  const s = (bankName || '').toLowerCase().trim();
  if (s.includes('сбер') || s.includes('sber') || s.includes('спасибо')) {
    return { id: 'sber', name: 'СберБанк' };
  }
  if (s.includes('альфа') || s.includes('alfa') || s.includes('а-банк')) {
    return { id: 'alfa', name: 'Альфа-Банк' };
  }
  if (
    s.includes('тиньк') ||
    s.includes('т-банк') ||
    s.includes('тбанк') ||
    s.includes('т банк') ||
    s.includes('tinkoff') ||
    s.includes('t-bank') ||
    s.includes('tbank')
  ) {
    return { id: 'tbank', name: 'Т-Банк' };
  }
  if (s.includes('втб') || s.includes('vtb') || s.includes('мультибонус')) {
    return { id: 'vtb', name: 'ВТБ' };
  }
  if (s.includes('озон') || s.includes('ozon')) {
    return { id: 'ozon', name: 'Ozon Банк' };
  }
  if (s.includes('яндекс') || s.includes('yandex') || s.includes('пэй') || s.includes('плюс')) {
    return { id: 'yandex', name: 'Яндекс Пэй' };
  }
  if (s.includes('газпром') || s.includes('гпб') || s.includes('gazprom')) {
    return { id: 'gpb', name: 'Газпромбанк' };
  }
  if (s.includes('райф') || s.includes('raiff')) {
    return { id: 'raiffeisen', name: 'Райффайзенбанк' };
  }
  if (s.includes('совком') || s.includes('халва')) {
    return { id: 'sovcom', name: 'Совкомбанк' };
  }

  const matched = PRESET_BANKS.find(
    (b) => s.includes(b.shortName.toLowerCase()) || b.name.toLowerCase().includes(s)
  );
  if (matched) {
    return { id: matched.id, name: matched.shortName };
  }

  return { id: 'sber', name: bankName || 'СберБанк' };
}

function getSystemPrompt(targetMonth?: number, targetYear?: number): string {
  const now = new Date();
  const month = targetMonth !== undefined ? targetMonth : now.getMonth();
  const year = targetYear !== undefined ? targetYear : now.getFullYear();

  return `Ты — эксперт по распознаванию кэшбэка со скриншотов мобильных приложений банков РФ.
Внимательно посмотри на скриншот и определи:
1. Какой банк отображен на скриншоте (bankName и bankId: 'sber' | 'alfa' | 'tbank' | 'vtb' | 'ozon' | 'yandex' | 'gpb' | 'raiffeisen' | 'sovcom').
2. Месяц (0 = Январь, 1 = Февраль, ..., 11 = Декабрь) и год (${year}). Если в тексте скриншота указан месяц (например, "на октябрь", "сентябрь"), используй его номер (0-11). Если нет явного указания, по умолчанию считай ${month} (месяц) и ${year} (год).
3. Список всех выбранных или доступных категорий кэшбэка с точным процентом (percent: число) и примечаниями (note).

Верни СТРОГО чистый JSON:
{
  "bankName": "Альфа-Банк",
  "bankId": "alfa",
  "month": ${month},
  "year": ${year},
  "items": [
    { "category": "Продукты", "percent": 5, "note": "до 5000 ₽" },
    { "category": "АЗС", "percent": 5 },
    { "category": "1% на всё", "percent": 1 }
  ]
}`;
}

export class GeminiVisionService {
  private static cachedWorkingModel: string = 'gemini-2.0-flash';

  static sanitizeApiKey(key: string): string {
    return key
      .replace(/^Bearer\s+/i, '')
      .replace(/["'\r\n\t\s]/g, '')
      .trim();
  }

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
      const timeoutId = setTimeout(() => controller.abort(), 8000);

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
      console.warn('Direct key test failed, trying server proxy:', directErr);
    }

    // 2. Try Server Proxy if Direct Fetch was blocked
    try {
      const serverUrl = await SyncService.getServerUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

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
      message: 'Не удалось связаться с Google AI Studio. Проверьте ключ и интернет.',
    };
  }

  /**
   * Fast High-Performance Screenshot OCR with Robust AI Parsing
   */
  static async analyzeScreenshot(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    apiKey?: string,
    preferredModel?: string,
    targetMonth?: number,
    targetYear?: number
  ): Promise<ScanResult> {
    const cleanKey = this.sanitizeApiKey(apiKey || '');
    const currentMonth = targetMonth !== undefined ? targetMonth : new Date().getMonth();
    const currentYear = targetYear || new Date().getFullYear();

    // 1. Try Server Proxy first (/api/scan/vision) — Bypasses client-side Geo-blocking & CORS
    try {
      const serverUrl = await SyncService.getServerUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${serverUrl}/api/scan/vision`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image,
          apiKey: cleanKey,
          targetMonth: currentMonth,
          targetYear: currentYear,
        }),
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.scanResult) {
          const resolved = resolveBankId(data.scanResult.bankName, data.scanResult.bankId);
          return {
            bankName: resolved.name,
            bankId: resolved.id,
            month: data.scanResult.month ?? currentMonth,
            year: data.scanResult.year ?? currentYear,
            items: data.scanResult.items || [],
            confidence: 0.95,
            rawText: JSON.stringify(data.scanResult),
          };
        }
      }
    } catch (serverErr) {
      console.warn('Server proxy scan failed or offline, trying direct Google API:', serverErr);
    }

    // 2. Direct Google AI Studio fallback (if client has VPN or non-blocked IP)
    if (cleanKey) {
      try {
        const directResult = await this.tryModel(
          preferredModel || this.cachedWorkingModel || 'gemini-2.0-flash',
          base64Image,
          mimeType,
          cleanKey,
          currentMonth,
          currentYear
        );
        if (directResult) return directResult;
      } catch (directErr: any) {
        console.warn('Direct Gemini API call failed:', directErr.message);
        try {
          const fallbackResult = await this.tryModel(
            'gemini-1.5-flash',
            base64Image,
            mimeType,
            cleanKey,
            currentMonth,
            currentYear
          );
          if (fallbackResult) return fallbackResult;
        } catch (fbErr) {
          console.warn('Fallback model failed too:', fbErr);
        }
      }
    }

    // 3. Graceful Fallback: Detect bank by screenshot color and signature!
    return ImageBankDetector.detectFromBase64(base64Image);
  }

  private static async tryModel(
    model: string,
    base64Image: string,
    mimeType: string,
    apiKey: string,
    targetMonth?: number,
    targetYear?: number
  ): Promise<ScanResult> {
    const cleanModel = model.replace(/^models\//, '');
    const cleanBase64 = base64Image
      .replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/i, '')
      .replace(/[\r\n\s]/g, '');
    const cleanMime = mimeType.replace(/;.*$/, '').trim() || 'image/jpeg';
    const currentYear = targetYear || new Date().getFullYear();
    const currentMonth = targetMonth !== undefined ? targetMonth : new Date().getMonth();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout for mobile uploads

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
                  text: getSystemPrompt(currentMonth, currentYear),
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API (${cleanModel}) ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const resolved = resolveBankId(parsed.bankName, parsed.bankId);

      const items = (parsed.items || []).map((item: any) => ({
        category: String(item.category || '').trim(),
        percent: Number(item.percent) || 0,
        note: item.note ? String(item.note).trim() : undefined,
      }));

      return {
        bankName: resolved.name,
        bankId: resolved.id,
        month: typeof parsed.month === 'number' ? parsed.month : currentMonth,
        year: typeof parsed.year === 'number' ? parsed.year : currentYear,
        items,
        confidence: 0.95,
        rawText: cleaned,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public static mockSmartRecognition(): ScanResult {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return {
      bankName: 'СберБанк',
      bankId: 'sber',
      month: currentMonth,
      year: currentYear,
      items: [
        { category: 'Кафе и рестораны', percent: 5 },
        { category: 'Такси', percent: 5 },
        { category: 'Аптеки', percent: 5 },
        { category: '0.5% на все покупки', percent: 0.5 },
      ],
      confidence: 1.0,
      rawText: 'Режим редактирования скриншота',
    };
  }
}
