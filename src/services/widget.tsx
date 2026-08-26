import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { CashbackWidget } from '../widgets/CashbackWidget';
import { StorageService } from './storage';

export class WidgetService {
  /**
   * Request Android Home Screen widget to re-render with fresh data
   */
  static async updateWidget(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const banks = await StorageService.getBanks();
      const cashbacks = await StorageService.getCashbacksForMonth(currentMonth, currentYear);

      requestWidgetUpdate({
        widgetName: 'CashbackWidget',
        renderWidget: () => (
          <CashbackWidget
            cashbacks={cashbacks}
            banks={banks}
            month={currentMonth}
            year={currentYear}
          />
        ),
      });
    } catch (e) {
      console.warn('Widget update error:', e);
    }
  }
}
