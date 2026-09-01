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
  private static SYSTEM_PROMPT(currentYear: number) {
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

Верни СТРОГО валидный JSON в следующем формате без markdown блоков и пояснений:
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

  public static async analyzeScreenshot(base64Image: string, apiKey: string): Promise<VisionScanResult> {
    const currentYear = new Date().getFullYear();
    const cleanKey = apiKey.trim();

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: this.SYSTEM_PROMPT(currentYear) },
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

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Fallback to gemini-1.5-flash if 2.5 is not available
      const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
      const fallbackRes = await fetch(fallbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!fallbackRes.ok) {
        const errorText = await fallbackRes.text();
        throw new Error(`Gemini API Error (${fallbackRes.status}): ${errorText}`);
      }

      const fbData = await fallbackRes.json();
      return this.parseGeminiResponse(fbData, currentYear);
    }

    const data = await response.json();
    return this.parseGeminiResponse(data, currentYear);
  }

  private static parseGeminiResponse(data: any, currentYear: number): VisionScanResult {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(cleanText);
      return {
        bankName: parsed.bankName || 'Неизвестный банк',
        bankId: parsed.bankId,
        month: typeof parsed.month === 'number' ? parsed.month : new Date().getMonth(),
        year: typeof parsed.year === 'number' ? parsed.year : currentYear,
        items: Array.isArray(parsed.items)
          ? parsed.items.map((i: any) => ({
              category: String(i.category || ''),
              percent: Number(i.percent) || 1,
              note: i.note ? String(i.note) : undefined,
            }))
          : [],
        rawResponse: cleanText,
      };
    } catch (e) {
      throw new Error(`Failed to parse AI response: ${cleanText}`);
    }
  }
}
