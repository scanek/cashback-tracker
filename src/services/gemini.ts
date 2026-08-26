import { ScanResult } from '../types';
import { PRESET_BANKS } from '../constants/banks';

const SYSTEM_PROMPT = `
Ты — интеллектуальный ассистент для распознавания категорий кэшбэка со скриншотов банковских приложений (Россия).
Твоя задача — внимательно проанализировать изображение скриншота экрана выбора кэшбэка в банковском приложении и извлечь структурированные данные.

Популярные банки РФ:
- Т-Банк / Тинькофф (желтый фон или логотип Т)
- СберБанк / СберСпасибо (зеленый стиль, галочка или Сбер)
- Альфа-Банк (красный стиль, буква А)
- ВТБ (синий стиль, полоски)
- Яндекс Пэй (желто-красный стиль, Яндекс)
- Ozon Банк (синий / розовый стиль)
- Газпромбанк, Райффайзенбанк, Совкомбанк и другие.

Правила извлечения:
1. Определи банк (название).
2. Определи месяц (число от 0 до 11, где 0 = Январь, 1 = Февраль, ..., 11 = Декабрь) и год. Если месяц на скриншоте не указан явно, укажи текущий месяц.
3. Извлеки все выбранные или доступные категории кэшбэка с их процентами (например, 5%, 1%, 10%, 20%).
4. Если есть примечания (например, "до 3000 ₽", "от 1000 ₽", "в партнерских магазинах"), запиши их в поле note.

Верни СТРОГО валидный JSON в следующем формате без лишнего текста и без markdown-блоков (только чистый JSON):
{
  "bankName": "Т-Банк",
  "month": 7,
  "year": 2026,
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

export const EMBEDDED_GEMINI_API_KEY = 'AQ.Ab8RN6KLsZuKmY8EAtHjsWIDDBG0vAQvNtTPaChwQyNFPjbpKg';

export class GeminiVisionService {
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
  static async testApiKeyAndGetModel(apiKey: string): Promise<{ success: boolean; modelName?: string; message: string }> {
    const cleanKey = this.sanitizeApiKey(apiKey) || EMBEDDED_GEMINI_API_KEY;
    if (!cleanKey) {
      return { success: false, message: 'API ключ не введен' };
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, message: `Ошибка ключа (${response.status}): ${errorText}` };
      }

      const data = await response.json();
      const models: any[] = data.models || [];
      
      const visionModels = models.filter((m: any) =>
        m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
      );

      if (visionModels.length === 0) {
        return { success: false, message: 'Для этого ключа не найдено доступных моделей в Google AI Studio.' };
      }

      // Pick preferred model with priority for modern Gemini 3.x / 2.5 / 2.0
      const preferred =
        visionModels.find((m) => m.name.includes('gemini-3.6-flash')) ||
        visionModels.find((m) => m.name.includes('gemini-3')) ||
        visionModels.find((m) => m.name.includes('gemini-2.5-flash')) ||
        visionModels.find((m) => m.name.includes('gemini-2.0-flash')) ||
        visionModels.find((m) => m.name.includes('gemini-1.5-flash')) ||
        visionModels.find((m) => m.name.includes('gemini')) ||
        visionModels[0];

      const modelId = preferred.name.replace(/^models\//, '');
      return {
        success: true,
        modelName: modelId,
        message: `Ключ работает отлично! Выбрана модель: ${modelId}`
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Сетевая ошибка при проверке ключа' };
    }
  }

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

    // 1. Determine the best available model for this API key
    let targetModel = preferredModel ? preferredModel.replace(/^models\//, '') : undefined;
    try {
      const check = await this.testApiKeyAndGetModel(cleanKey);
      if (check.success && check.modelName) {
        targetModel = check.modelName.replace(/^models\//, '');
      }
    } catch (e) {
      console.warn('Model discovery warning:', e);
    }

    const modelsToTry = [
      targetModel,
      'gemini-3.6-flash',
      'gemini-3.0-flash',
      'gemini-3-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
    ].filter(Boolean) as string[];

    const uniqueModels = Array.from(new Set(modelsToTry.map(m => m.replace(/^models\//, ''))));
    let lastError: any = null;

    for (const model of uniqueModels) {
      try {
        const result = await this.tryModel(model, base64Image, mimeType, cleanKey);
        if (result) return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next:`, err.message);
        if (err.message && (err.message.includes('404') || err.message.includes('not found') || err.message.includes('NOT_FOUND'))) {
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Не удалось распознать скриншот. Проверьте четкость скриншота.');
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
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
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
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

    let jsMonth = new Date().getMonth();
    if (typeof parsed.month === 'number') {
      if (parsed.month >= 1 && parsed.month <= 12) {
        jsMonth = parsed.month - 1;
      } else if (parsed.month >= 0 && parsed.month <= 11) {
        jsMonth = parsed.month;
      }
    } else if (typeof parsed.month === 'string') {
      const mLower = parsed.month.toLowerCase();
      const ruMonths = ['янв', 'фев', 'мар', 'апр', 'ма', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      const foundIdx = ruMonths.findIndex((rm) => mLower.includes(rm));
      if (foundIdx >= 0) jsMonth = foundIdx;
    }

    return {
      bankName: parsed.bankName || 'Неизвестный банк',
      bankId: matchedBank?.id || 'custom',
      month: jsMonth,
      year: typeof parsed.year === 'number' && parsed.year >= 2020 ? parsed.year : new Date().getFullYear(),
      items: Array.isArray(parsed.items) ? parsed.items : [],
      confidence: 0.95,
      rawText: rawText,
    };
  }

  static mockSmartRecognition(): Promise<ScanResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          bankName: 'Т-Банк (Тинькофф)',
          bankId: 'tbank',
          month: new Date().getMonth(),
          year: new Date().getFullYear(),
          items: [
            { category: 'Супермаркеты и продукты', percent: 5, note: 'до 3000 ₽' },
            { category: 'Кафе и рестораны', percent: 7 },
            { category: 'Аптеки и здоровье', percent: 10 },
            { category: 'Такси', percent: 5 },
            { category: '1% на все покупки', percent: 1 },
          ],
          confidence: 0.9,
          rawText: 'Распознано в демо-режиме (для реального AI подключите ключ в Настройках)',
        });
      }, 1200);
    });
  }
}
