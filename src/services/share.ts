import { Share, Platform } from 'react-native';
import { Bank, MonthlyCashback, CashbackItem } from '../types';
import { MONTH_NAMES_RU } from '../constants/banks';
import { showNotification } from '../utils/alert';

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

// Clean and robust UTF-8 Base64 encoding
function encodeUtf8Base64(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

function decodeUtf8Base64(base64: string): string {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return decodeURIComponent(escape(atob(base64)));
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (e) {
      console.warn('Clipboard fallback error:', e);
    }
  }
  return false;
}

export class ShareService {
  /**
   * Generates a compact payload code
   */
  static generateCode(payload: SharedPayload): string {
    const jsonStr = JSON.stringify(payload);
    return `CBHUB:${encodeUtf8Base64(jsonStr)}`;
  }

  /**
   * Parses code or raw text from clipboard / file
   */
  static parseCode(text: string): SharedPayload | null {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // Check if raw JSON file content
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.version && (parsed.type || parsed.items || parsed.allCashbacks)) {
          return parsed;
        }
      } catch {}
    }

    const match = trimmed.match(/CBHUB:([A-Za-z0-9+/=]+)/);
    const base64Data = match ? match[1].trim() : trimmed.replace(/^CBHUB:/, '').trim();

    if (!base64Data) return null;

    try {
      const decoded = decodeUtf8Base64(base64Data);
      return JSON.parse(decoded);
    } catch {
      try {
        // Fallback for legacy utf-16 format
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const codeUnits = new Uint16Array(bytes.buffer);
        let result = '';
        for (let i = 0; i < codeUnits.length; i++) {
          result += String.fromCharCode(codeUnits[i]);
        }
        return JSON.parse(result);
      } catch (e) {
        console.warn('Failed to parse share code:', e);
        return null;
      }
    }
  }

  /**
   * Universal share / copy handler for code
   */
  static async shareCodeOnly(title: string, code: string, summary: string) {
    if (Platform.OS === 'web') {
      const copied = await copyToClipboard(code);
      if (copied) {
        showNotification(
          '📋 Код кэшбэка скопирован!',
          `Код для ${summary} скопирован в буфер обмена.\n\nПросто отправьте его супруге — ей достаточно нажать «Импорт» в приложении!`
        );
      } else {
        showNotification('Код кэшбэка', code);
      }
    } else {
      try {
        await Share.share({
          message: code,
          title,
        });
      } catch (e: any) {
        console.warn('Mobile share error:', e);
      }
    }
  }

  /**
   * Download JSON file (Web & universal)
   */
  static downloadFile(filename: string, content: string) {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Файл сохранен', `Файл ${filename} успешно скачан.`);
    } else {
      copyToClipboard(content);
      showNotification('JSON сохранен', 'Данные скопированы в буфер обмена.');
    }
  }

  /**
   * Share single bank's cashback - OUTPUTS ONLY COMPACT CODE
   */
  static async shareBankCashback(bank: Bank, cashback: MonthlyCashback) {
    const monthName = MONTH_NAMES_RU[cashback.month] || 'Текущий месяц';

    const payload: SharedPayload = {
      version: 1,
      type: 'single_bank',
      month: cashback.month,
      year: cashback.year,
      bankId: bank.id,
      bankName: bank.name,
      items: cashback.items.map((it) => ({
        id: it.id,
        category: it.category,
        percent: it.percent,
        ...(it.note ? { note: it.note } : {}),
      })),
    };

    const code = this.generateCode(payload);
    await this.shareCodeOnly(
      `Кэшбэк ${bank.name}`,
      code,
      `банка ${bank.name} (${monthName} ${cashback.year})`
    );
  }

  /**
   * Share all active cashbacks for the given month - OUTPUTS ONLY COMPACT CODE
   */
  static async shareMonthCashback(
    cashbacks: MonthlyCashback[],
    banks: Bank[],
    month: number,
    year: number
  ) {
    const monthName = MONTH_NAMES_RU[month] || 'Текущий месяц';
    const activeCashbacks = cashbacks.filter((c) => c.items && c.items.length > 0);

    const payload: SharedPayload = {
      version: 1,
      type: 'full_month',
      month,
      year,
      allCashbacks: activeCashbacks.map((cb) => ({
        id: cb.id,
        bankId: cb.bankId,
        month: cb.month,
        year: cb.year,
        updatedAt: cb.updatedAt,
        items: cb.items.map((it) => ({
          id: it.id,
          category: it.category,
          percent: it.percent,
          ...(it.note ? { note: it.note } : {}),
        })),
      })),
    };

    const code = this.generateCode(payload);
    await this.shareCodeOnly(
      `Кэшбэк на ${monthName} ${year}`,
      code,
      `всех банков за ${monthName} ${year}`
    );
  }

  /**
   * Export month cashbacks as a downloadable JSON file
   */
  static exportMonthFile(
    cashbacks: MonthlyCashback[],
    month: number,
    year: number
  ) {
    const monthName = MONTH_NAMES_RU[month] || 'month';
    const activeCashbacks = cashbacks.filter((c) => c.items && c.items.length > 0);

    const payload: SharedPayload = {
      version: 1,
      type: 'full_month',
      month,
      year,
      allCashbacks: activeCashbacks,
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const fileName = `cashback_${month + 1}_${year}.json`;
    this.downloadFile(fileName, jsonStr);
  }
}
