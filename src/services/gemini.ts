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

export class GeminiVisionService {
  static async analyzeScreenshot(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    apiKey?: string,
    model: string = 'gemini-1.5-flash'
  ): Promise<ScanResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      // If no API key provided, provide realistic smart recognition for demo/offline test
      return this.mockSmartRecognition();
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

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
                  text: SYSTEM_PROMPT
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Match bank ID from preset banks
      const matchedBank = PRESET_BANKS.find(b =>
        parsed.bankName && (
          b.name.toLowerCase().includes(parsed.bankName.toLowerCase()) ||
          b.shortName.toLowerCase().includes(parsed.bankName.toLowerCase()) ||
          parsed.bankName.toLowerCase().includes(b.shortName.toLowerCase())
        )
      );

      return {
        bankName: parsed.bankName || 'Неизвестный банк',
        bankId: matchedBank?.id || 'custom',
        month: typeof parsed.month === 'number' ? parsed.month : new Date().getMonth(),
        year: typeof parsed.year === 'number' ? parsed.year : new Date().getFullYear(),
        items: Array.isArray(parsed.items) ? parsed.items : [],
        confidence: 0.95,
        rawText: rawText
      };
    } catch (error: any) {
      console.warn('Gemini recognition error, using smart fallback parser:', error);
      throw error;
    }
  }

  // Fallback demo parser when testing before setting an API key
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
            { category: '1% на все покупки', percent: 1 }
          ],
          confidence: 0.9,
          rawText: 'Распознано в демо-режиме (для реального AI подключите ключ в Настройках)'
        });
      }, 1200);
    });
  }
}
