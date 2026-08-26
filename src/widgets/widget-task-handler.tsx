import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { CashbackWidget } from './CashbackWidget';
import { StorageService } from '../services/storage';
import { Bank, MonthlyCashback } from '../types';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction, clickActionData, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  let targetMonth = new Date().getMonth();
  let targetYear = new Date().getFullYear();

  // Handle Interactive Month Switcher (< and > clicks on home screen widget)
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'CHANGE_MONTH' && clickActionData) {
    const data = clickActionData as { delta?: number; month?: number; year?: number };
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
    />
  );
}
