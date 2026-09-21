export interface VisionItem {
  category: string;
  percent: number;
  note?: string;
}

export interface VisionScanResult {
  bankName: string;
  bankId?: string;
  month: number;
  year: number;
  items: VisionItem[];
  rawResponse?: string;
}

export class VisionService {
  private static SYSTEM_PROMPT(currentYear: number, currentMonth: number) {
    return `Ты — профессиональный OCR-ассистент для распознавания категорий кэшбэка со скриншотов банковских приложений (Россия).
Твоя задача — извлечь банк, месяц и все категории кэшбэка с их процентами.

ТЕКУЩАЯ ДАТА: Месяц (0=Январь, ..., 11=Декабрь): ${currentMonth}, Год: ${currentYear}.
Если на скриншоте не указан месяц/год явно, используй текущие значения.

ИДЕНТИФИКАЦИЯ БАНКОВ (bankName и bankId):
- Т-Банк / Тинькофф -> bankName: "Т-Банк", bankId: "tbank"
- СберБанк / Сбер -> bankName: "СберБанк", bankId: "sber"
- Альфа-Банк -> bankName: "Альфа-Банк", bankId: "alfa"
- ВТБ -> bankName: "ВТБ", bankId: "vtb"
- Яндекс Пэй -> bankName: "Яндекс Пэй", bankId: "yandex"
- Ozon Банк / Озон -> bankName: "Ozon Банк", bankId: "ozon"
- Газпромбанк -> bankName: "Газпромбанк", bankId: "gpb"
- Райффайзенбанк -> bankName: "Райффайзенбанк", bankId: "raiffeisen"
- Совкомбанк (Халва) -> bankName: "Совкомбанк", bankId: "sovcom"

ПРАВИЛА ИЗВЛЕЧЕНИЯ:
1. Извлекай реальные категории, видимые на скриншоте (например: "1% На все покупки", "5% Супермаркеты", "7% Аптеки", "10% Рестораны", "АЗС", "Такси", "Цветы" и т.д.).
2. В поле percent должно быть ТОЛЬКО число (например: 5, а не "5%").
3. В поле note укажи любые лимиты (например: "до 3000 ₽", "с подпиской Pro").
4. СТРОЖАЙШЕ ЗАПРЕЩЕНО выдумывать категории! Если на скриншоте категорий нет или он не читается, верни пустой список items: [].

Верни СТРОГО чистый JSON без markdown-блоков:
{
  "bankName": "Т-Банк",
  "bankId": "tbank",
  "month": ${currentMonth},
  "year": ${currentYear},
  "items": [
    { "category": "Супермаркеты", "percent": 5, "note": "до 3000 ₽" },
    { "category": "Рестораны и кафе", "percent": 5 },
    { "category": "1% на все покупки", "percent": 1 }
  ]
}`;
  }

  /**
   * Safely test Gemini API Key using headers (never leaks in URL query params)
   */
  public static async testApiKey(apiKey: string): Promise<{ success: boolean; modelName?: string; message: string }> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { success: false, message: 'API-ключ пуст' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: {
          'x-goog-api-key': cleanKey,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        const models: any[] = data.models || [];
        const visionModels = models.filter(
          (m: any) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
        );

        const preferred =
          visionModels.find((m: any) => m.name.includes('gemini-2.0-flash')) ||
          visionModels.find((m: any) => m.name.includes('gemini-1.5-flash')) ||
          visionModels[0];

        const modelName = preferred ? preferred.name.replace(/^models\//, '') : 'gemini-2.0-flash';
        return {
          success: true,
          modelName,
          message: `Ключ проверен через сервер! Выбрана модель: ${modelName}`,
        };
      } else {
        const errText = await response.text();
        return { success: false, message: `Ошибка Google (${response.status}): ${errText}` };
      }
    } catch (err: any) {
      return { success: false, message: `Сетевая ошибка сервера: ${err.message}` };
    }
  }

  /**
   * Run multimodal Vision OCR with dynamic model discovery and fallback
   */
  public static async analyzeScreenshot(
    base64Image: string,
    apiKey: string,
    targetYear?: number,
    targetMonth?: number
  ): Promise<{ scanResult: VisionScanResult; modelUsed: string }> {
    const currentYear = targetYear || new Date().getFullYear();
    const currentMonth = targetMonth !== undefined ? targetMonth : new Date().getMonth();
    const cleanKey = apiKey.trim();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    // 1. Discover models available for this key
    let candidateModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
    ];

    try {
      const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': cleanKey },
      });
      if (listRes.ok) {
        const listData: any = await listRes.json();
        const available: string[] = (listData.models || [])
          .filter((m: any) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''))
          .filter((name: string) => {
            const lower = name.toLowerCase();
            return !lower.includes('tts') && !lower.includes('audio') && !lower.includes('embedding') && !lower.includes('gemma');
          });

        if (available.length > 0) {
          const PREFERRED_ORDER = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
          const sorted: string[] = [];
          for (const pref of PREFERRED_ORDER) {
            const match = available.find((m) => m === pref || m.startsWith(pref));
            if (match && !sorted.includes(match)) sorted.push(match);
          }
          for (const m of available) {
            if (!sorted.includes(m)) sorted.push(m);
          }
          candidateModels = sorted;
        }
      }
    } catch {
      // Use default candidate list if discovery fails
    }

    const reqPayload = {
      contents: [
        {
          parts: [
            { text: this.SYSTEM_PROMPT(currentYear, currentMonth) },
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
      },
    };

    let lastError = '';
    for (const model of candidateModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': cleanKey,
          },
          body: JSON.stringify(reqPayload),
        });

        if (res.ok) {
          const data: any = await res.json();
          const parsed = this.parseGeminiResponse(data, currentYear, currentMonth);
          return { scanResult: parsed, modelUsed: model };
        } else {
          lastError = `${res.status} ${await res.text()}`;
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    throw new Error(`Все модели Gemini отклонили запрос OCR. Последняя ошибка: ${lastError}`);
  }

  private static parseGeminiResponse(data: any, currentYear: number, currentMonth: number): VisionScanResult {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(cleanText);
      return {
        bankName: parsed.bankName || 'Неизвестный банк',
        bankId: parsed.bankId || 'custom',
        month: typeof parsed.month === 'number' ? parsed.month : currentMonth,
        year: typeof parsed.year === 'number' ? parsed.year : currentYear,
        items: Array.isArray(parsed.items)
          ? parsed.items.map((it: any) => ({
              category: String(it.category || 'Без названия').trim(),
              percent: typeof it.percent === 'number' ? it.percent : parseFloat(it.percent) || 1,
              note: it.note ? String(it.note).trim() : undefined,
            }))
          : [],
        rawResponse: cleanText,
      };
    } catch {
      throw new Error(`Не удалось распарсить JSON ответа модели: ${cleanText}`);
    }
  }
}
