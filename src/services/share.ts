import { Share, Platform } from 'react-native';
import { Bank, MonthlyCashback, CashbackItem } from '../types';
import { MONTH_NAMES_RU } from '../constants/banks';

export interface SharedPayload {
  version: number;
  type: 'single_bank' | 'full_month';
  month: number;
  year: number;
  bankId?: string;
  bankName?: string;
  items?: CashbackItem[];
  allCashbacks?: MonthlyCashback[];
}

// UTF-8 safe base64 encoding and decoding for Russian text
function encodeUnicodeBase64(str: string): string {
  const codeUnits = new Uint16Array(str.length);
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = str.charCodeAt(i);
  }
  const charList = new Uint8Array(codeUnits.buffer);
  let binary = '';
  for (let i = 0; i < charList.byteLength; i++) {
    binary += String.fromCharCode(charList[i]);
  }
  return btoa(binary);
}

function decodeUnicodeBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const codeUnits = new Uint16Array(bytes.buffer);
  let result = '';
  for (let i = 0; i < codeUnits.length; i++) {
    result += String.fromCharCode(codeUnits[i]);
  }
  return result;
}

export class ShareService {
  /**
   * Generates a compact payload code
   */
  static generateCode(payload: SharedPayload): string {
    const jsonStr = JSON.stringify(payload);
    try {
      return `CBHUB:${encodeUnicodeBase64(jsonStr)}`;
    } catch {
      // Fallback
      return `CBHUB:${btoa(unescape(encodeURIComponent(jsonStr)))}`;
    }
  }

  /**
   * Parses code or text from clipboard / message
   */
  static parseCode(text: string): SharedPayload | null {
    if (!text || typeof text !== 'string') return null;

    const match = text.match(/CBHUB:([A-Za-z0-9+/=]+)/);
    if (!match || !match[1]) return null;

    const base64Data = match[1].trim();

    try {
      const decoded = decodeUnicodeBase64(base64Data);
      return JSON.parse(decoded);
    } catch {
      try {
        const fallbackDecoded = decodeURIComponent(escape(atob(base64Data)));
        return JSON.parse(fallbackDecoded);
      } catch (e) {
        console.warn('Failed to parse share code:', e);
        return null;
      }
    }
  }

  /**
   * Share single bank's cashback for the month
   */
  static async shareBankCashback(bank: Bank, cashback: MonthlyCashback) {
    const monthName = MONTH_NAMES_RU[cashback.month] || 'Текущий месяц';
    const itemsText = cashback.items.length > 0
      ? cashback.items
          .map((item) => `• ${item.percent}% — ${item.category}${item.note ? ` (${item.note})` : ''}`)
          .join('\n')
      : '• Нет выбранных категорий';

    const payload: SharedPayload = {
      version: 1,
      type: 'single_bank',
      month: cashback.month,
      year: cashback.year,
      bankId: bank.id,
      bankName: bank.name,
      items: cashback.items,
    };

    const code = this.generateCode(payload);

    const message = [
      `💳 Мой кэшбэк в ${bank.name} на ${monthName} ${cashback.year}:`,
      itemsText,
      '',
      '📲 Чтобы добавить эти категории к себе в Cashback Hub, скопируйте это сообщение и нажмите «Импорт» в приложении:',
      code,
    ].join('\n');

    try {
      await Share.share({
        message,
        title: `Кэшбэк ${bank.name} (${monthName} ${cashback.year})`,
      });
    } catch (e: any) {
      console.warn('Share error:', e);
    }
  }

  /**
   * Share all active cashbacks for the given month
   */
  static async shareMonthCashback(
    cashbacks: MonthlyCashback[],
    banks: Bank[],
    month: number,
    year: number
  ) {
    const monthName = MONTH_NAMES_RU[month] || 'Текущий месяц';
    const lines: string[] = [`🎁 Мой кэшбэк на ${monthName} ${year}:`, ''];

    const activeCashbacks = cashbacks.filter((c) => c.items && c.items.length > 0);

    if (activeCashbacks.length === 0) {
      lines.push('Пока нет добавленных категорий.');
    } else {
      for (const cb of activeCashbacks) {
        const bank = banks.find((b) => b.id === cb.bankId);
        const bName = bank?.name || 'Банк';
        lines.push(`🏦 ${bName}:`);
        for (const item of cb.items) {
          lines.push(`  • ${item.percent}% — ${item.category}${item.note ? ` (${item.note})` : ''}`);
        }
        lines.push('');
      }
    }

    const payload: SharedPayload = {
      version: 1,
      type: 'full_month',
      month,
      year,
      allCashbacks: activeCashbacks,
    };

    const code = this.generateCode(payload);

    lines.push(
      '📲 Чтобы добавить эти категории в свой Cashback Hub, скопируйте это сообщение и нажмите «Импорт» в приложении:'
    );
    lines.push(code);

    const message = lines.join('\n');

    try {
      await Share.share({
        message,
        title: `Кэшбэк на ${monthName} ${year}`,
      });
    } catch (e: any) {
      console.warn('Share error:', e);
    }
  }
}
