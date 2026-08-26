import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { CashbackWidget, WidgetThemeMode } from './CashbackWidget';
import { StorageService } from '../services/storage';
import { Bank, MonthlyCashback } from '../types';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction, clickActionData, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  let targetMonth = new Date().getMonth();
  let targetYear = new Date().getFullYear();

  let settings = await StorageService.getSettings().catch(() => null);
  let currentWidgetTheme: WidgetThemeMode = (settings?.widgetTheme as WidgetThemeMode) || 'dark';

  // Handle Theme Switching (🌙 -> ☀️ -> 💎 -> 🌙)
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'CYCLE_THEME' && clickActionData) {
    const data = clickActionData as { currentTheme?: WidgetThemeMode; month?: number; year?: number };
    const prevTheme = data.currentTheme || currentWidgetTheme;
    const nextTheme: WidgetThemeMode =
      prevTheme === 'dark' ? 'light' : prevTheme === 'light' ? 'transparent' : 'dark';

    currentWidgetTheme = nextTheme;
    await StorageService.saveSettings({ widgetTheme: nextTheme }).catch(() => {});

    if (typeof data.month === 'number') targetMonth = data.month;
    if (typeof data.year === 'number') targetYear = data.year;
  }

  // Handle Month Stepper
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'CHANGE_MONTH' && clickActionData) {
    const data = clickActionData as { delta?: number; month?: number; year?: number; theme?: WidgetThemeMode };
    const delta = typeof data.delta === 'number' ? data.delta : 0;
    const baseMonth = typeof data.month === 'number' ? data.month : targetMonth;
    const baseYear = typeof data.year === 'number' ? data.year : targetYear;

    let newMonth = baseMonth + delta;
    let newYear = baseYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    targetMonth = newMonth;
    targetYear = newYear;
    if (data.theme) currentWidgetTheme = data.theme;
  }

  let banks: Bank[] = [];
  let cashbacks: MonthlyCashback[] = [];

  try {
    banks = await StorageService.getBanks();
    cashbacks = await StorageService.getCashbacksForMonth(targetMonth, targetYear);
  } catch (e) {
    console.warn('Error loading data in widget task handler:', e);
  }

  renderWidget(
    <CashbackWidget
      cashbacks={cashbacks}
      banks={banks}
      month={targetMonth}
      year={targetYear}
      theme={currentWidgetTheme}
    />
  );
}
