import { ScanResult } from '../types';
import { PRESET_BANKS } from '../constants/banks';

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

export const EMBEDDED_GEMINI_API_KEY = 'AQ.Ab8RN6KLsZuKmY8EAtHjsWIDDBG0vAQvNtTPaChwQyNFPjbpKg';

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
    const cleanKey = this.sanitizeApiKey(apiKey) || EMBEDDED_GEMINI_API_KEY;
    if (!cleanKey) {
      return { success: false, message: 'API ключ не введен' };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
      );
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, message: `Ошибка ключа (${response.status}): ${errorText}` };
      }

      const data = await response.json();
      const models: any[] = data.models || [];

      const visionModels = models.filter(
        (m: any) =>
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes('generateContent')
      );

      if (visionModels.length === 0) {
        return {
          success: false,
          message: 'Для этого ключа не найдено доступных моделей в Google AI Studio.',
        };
      }

      // Prioritize fastest flash models
      const preferred =
        visionModels.find((m) => m.name.includes('gemini-2.0-flash')) ||
        visionModels.find((m) => m.name.includes('gemini-1.5-flash')) ||
        visionModels.find((m) => m.name.includes('gemini-2.0-flash-lite')) ||
        visionModels.find((m) => m.name.includes('gemini-1.5-pro')) ||
        visionModels[0];

      const modelId = preferred.name.replace(/^models\//, '');
      this.cachedWorkingModel = modelId;

      return {
        success: true,
        modelName: modelId,
        message: `Ключ работает отлично! Выбрана сверхбыстрая модель: ${modelId}`,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Сетевая ошибка при проверке ключа' };
    }
  }

  /**
   * Fast High-Performance Screenshot OCR
   */
  static async analyzeScreenshot(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    apiKey?: string,
    preferredModel?: string
  ): Promise<ScanResult> {
    const cleanKey = this.sanitizeApiKey(apiKey || '') || EMBEDDED_GEMINI_API_KEY;
    if (!cleanKey) {
      return this.mockSmartRecognition();
    }

    // Direct, ultra-fast model priority list (no fake model names that cause 404 delays)
    const modelsToTry = [
      preferredModel ? preferredModel.replace(/^models\//, '') : undefined,
      this.cachedWorkingModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
    ].filter(Boolean) as string[];

    const uniqueModels = Array.from(new Set(modelsToTry));
    let lastError: any = null;

    for (const model of uniqueModels) {
      try {
        const result = await this.tryModel(model, base64Image, mimeType, cleanKey);
        if (result) {
          this.cachedWorkingModel = model;
          return result;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next fallback:`, err.message);
        // If model not found (404), try next immediately
        if (
          err.message &&
          (err.message.includes('404') ||
            err.message.includes('not found') ||
            err.message.includes('NOT_FOUND') ||
            err.message.includes('503'))
        ) {
          continue;
        }
        // If invalid key or quota, don't retry same key
        if (err.message && (err.message.includes('400') || err.message.includes('403'))) {
          throw err;
        }
      }
    }

    throw (
      lastError ||
      new Error('Не удалось распознать скриншот. Проверьте четкость скриншота или API ключ.')
    );
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
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout max per try

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
      rawText: 'Демо-распознавание без внешнего ключа API',
    };
  }
}
