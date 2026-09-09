/**
 * Test script for Cashback Hub Server Vision OCR
 * Usage:
 *   node test-ocr.js [API_KEY] [IMAGE_PATH_OR_BASE64]
 */
const fs = require('fs');
const path = require('path');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY || '';
const IMAGE_FILE = process.argv[3];

async function runTest() {
  console.log(`====================================================`);
  console.log(`🔍 Тестирование распознавания на сервере: ${SERVER_URL}`);
  console.log(`====================================================`);

  // 1. Check Server Health
  try {
    const res = await fetch(`${SERVER_URL}/`);
    const data = await res.json();
    console.log(`✅ Сервер доступен:`, data);
  } catch (e) {
    console.error(`❌ Сервер не отвечает по адресу ${SERVER_URL}. Убедитесь, что сервер запущен.`);
    return;
  }

  // 2. Check API Key
  if (!API_KEY) {
    console.warn(`⚠️ API ключ не указан. Запустите: node test-ocr.js ВАШ_КЛЮЧ_GEMINI [путь_к_картинке]`);
    return;
  }

  console.log(`\n🔑 2. Проверка API ключа через /api/scan/test-key...`);
  try {
    const testKeyRes = await fetch(`${SERVER_URL}/api/scan/test-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: API_KEY }),
    });
    const keyData = await testKeyRes.json();
    console.log(`Результат проверки ключа:`, keyData);
    if (!keyData.success) {
      console.error(`❌ Ошибка проверки ключа!`);
      return;
    }
  } catch (e) {
    console.error(`❌ Ошибка запроса проверки ключа:`, e.message);
    return;
  }

  // 3. Test OCR
  console.log(`\n🖼️ 3. Тестирование распознавания скриншота...`);
  let base64Image = '';

  if (IMAGE_FILE && fs.existsSync(IMAGE_FILE)) {
    console.log(`Загрузка изображения из файла: ${IMAGE_FILE}`);
    base64Image = fs.readFileSync(IMAGE_FILE).toString('base64');
  } else {
    // 1x1 transparent PNG sample or dummy sample
    console.log(`Файл изображения не указан, создаем тестовый образец...`);
    base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  }

  try {
    const visionRes = await fetch(`${SERVER_URL}/api/scan/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Image,
        apiKey: API_KEY,
      }),
    });

    const visionData = await visionRes.json();
    console.log(`\n📊 Ответ сервера:`);
    console.log(JSON.stringify(visionData, null, 2));

    if (visionData.success && visionData.scanResult) {
      console.log(`\n🎉 УСПЕХ! Банк: ${visionData.scanResult.bankName} (id: ${visionData.scanResult.bankId})`);
      console.log(`Категорий найдено: ${visionData.scanResult.items.length}`);
    } else {
      console.log(`\n⚠️ Сервер вернул ошибку или пустой результат.`);
    }
  } catch (e) {
    console.error(`❌ Ошибка при отправке на распознавание:`, e.message);
  }
}

runTest();
