import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import LZString from 'lz-string';
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

// Compact binary schema for compression
interface CompactPayload {
  v: number;
  t: 1 | 2; // 1 = single_bank, 2 = full_month
  m: number; // month
  y: number; // year
  b?: string; // bankId
  n?: string; // bankName
  i?: [string, number, string?][]; // [category, percent, note?]
  c?: [string, [string, number, string?][]][]; // [bankId, [[category, percent, note?]]]
}

function serializeToCompact(payload: SharedPayload): CompactPayload {
  if (payload.type === 'single_bank') {
    return {
      v: 2,
      t: 1,
      m: payload.month,
      y: payload.year,
      b: payload.bankId,
      n: payload.bankName,
      i: (payload.items || []).map((it) => [it.category, it.percent, it.note || '']),
    };
  }

  return {
    v: 2,
    t: 2,
    m: payload.month,
    y: payload.year,
    c: (payload.allCashbacks || []).map((cb) => [
      cb.bankId,
      (cb.items || []).map((it) => [it.category, it.percent, it.note || '']),
    ]),
  };
}

function deserializeFromCompact(compact: CompactPayload): SharedPayload {
  if (compact.t === 1) {
    return {
      version: 2,
      type: 'single_bank',
      month: compact.m,
      year: compact.y,
      bankId: compact.b,
      bankName: compact.n,
      items: (compact.i || []).map(([category, percent, note], idx) => ({
        id: `item-${idx}-${Date.now()}`,
        category,
        percent,
        note: note ? note : undefined,
      })),
    };
  }

  return {
    version: 2,
    type: 'full_month',
    month: compact.m,
    year: compact.y,
    allCashbacks: (compact.c || []).map(([bankId, items], idx) => ({
      id: `${bankId}-${compact.m}-${compact.y}`,
      bankId,
      month: compact.m,
      year: compact.y,
      updatedAt: new Date().toISOString(),
      items: items.map(([category, percent, note], cIdx) => ({
        id: `cb-${idx}-${cIdx}-${Date.now()}`,
        category,
        percent,
        note: note ? note : undefined,
      })),
    })),
  };
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
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
    } catch {}
  }
  return false;
}

export class ShareService {
  /**
   * Generates an ultra-compact LZ-compressed code (only 100-200 characters)
   */
  static generateCode(payload: SharedPayload): string {
    try {
      const compact = serializeToCompact(payload);
      const json = JSON.stringify(compact);
      const compressed = LZString.compressToEncodedURIComponent(json);
      return `CBHUB2:${compressed}`;
    } catch {
      // Fallback to standard base64 if compression fails
      const jsonStr = JSON.stringify(payload);
      return `CBHUB:${btoa(unescape(encodeURIComponent(jsonStr)))}`;
    }
  }

  /**
   * Parses code, LZ-compressed code, or raw JSON text
   */
  static parseCode(text: string): SharedPayload | null {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // 1. Direct JSON file content
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.version && (parsed.type || parsed.items || parsed.allCashbacks)) {
          return parsed;
        }
        if (parsed.v && (parsed.t === 1 || parsed.t === 2)) {
          return deserializeFromCompact(parsed);
        }
      } catch {}
    }

    // 2. New ultra-compact LZString format: CBHUB2:...
    const match2 = trimmed.match(/CBHUB2:([A-Za-z0-9-_~%]+)/);
    if (match2 && match2[1]) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(match2[1]);
        if (decompressed) {
          const compact = JSON.parse(decompressed);
          return deserializeFromCompact(compact);
        }
      } catch (e) {
        console.warn('Failed to parse CBHUB2 code:', e);
      }
    }

    // 3. Legacy Base64 formats: CBHUB:...
    const match = trimmed.match(/CBHUB:([A-Za-z0-9+/=]+)/);
    const base64Data = match ? match[1].trim() : trimmed.replace(/^CBHUB:/, '').trim();

    if (base64Data) {
      try {
        const decoded = decodeURIComponent(
          Array.prototype.map
            .call(atob(base64Data), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(decoded);
      } catch {
        try {
          const fallbackDecoded = decodeURIComponent(escape(atob(base64Data)));
          return JSON.parse(fallbackDecoded);
        } catch {
          try {
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
          } catch {}
        }
      }
    }

    return null;
  }

  /**
   * Share / Copy code
   */
  static async shareCodeOnly(title: string, code: string, summary: string) {
    if (Platform.OS === 'web') {
      const copied = await copyToClipboard(code);
      if (copied) {
        showNotification(
          '📋 Код кэшбэка скопирован!',
          `Код для ${summary} скопирован в буфер обмена.\n\nОн стал супер-коротким и легко помещается в любое сообщение Telegram / WhatsApp!`
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
   * Share or Download an actual .JSON file (on Android opens native share sheet with file attachment!)
   */
  static async shareOrDownloadFile(filename: string, content: string) {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Файл сохранен', `Файл ${filename} успешно скачан в браузер.`);
      }
    } else {
      try {
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Поделиться файлом кэшбэка',
            UTI: 'public.json',
          });
        } else {
          await Share.share({
            message: content,
            title: filename,
          });
        }
      } catch (e: any) {
        console.warn('Mobile file share error:', e);
        await copyToClipboard(content);
        showNotification('JSON скопирован', 'Не удалось открыть файл, данные скопированы в буфер обмена.');
      }
    }
  }

  /**
   * Share single bank's cashback
   */
  static async shareBankCashback(bank: Bank, cashback: MonthlyCashback) {
    const monthName = MONTH_NAMES_RU[cashback.month] || 'Текущий месяц';

    const payload: SharedPayload = {
      version: 2,
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
   * Share all active cashbacks for the given month
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
      version: 2,
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
   * Export month cashbacks as a real .JSON file attachment / download
   */
  static async exportMonthFile(
    cashbacks: MonthlyCashback[],
    month: number,
    year: number
  ) {
    const activeCashbacks = cashbacks.filter((c) => c.items && c.items.length > 0);

    const payload: SharedPayload = {
      version: 2,
      type: 'full_month',
      month,
      year,
      allCashbacks: activeCashbacks,
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const fileName = `cashback_${month + 1}_${year}.json`;
    await this.shareOrDownloadFile(fileName, jsonStr);
  }
}
