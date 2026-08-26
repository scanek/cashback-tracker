import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { CashbackWidget } from './CashbackWidget';
import { StorageService } from '../services/storage';
import { Bank, MonthlyCashback } from '../types';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  let banks: Bank[] = [];
  let cashbacks: MonthlyCashback[] = [];

  try {
    banks = await StorageService.getBanks();
    cashbacks = await StorageService.getCashbacksForMonth(currentMonth, currentYear);
  } catch (e) {
    console.warn('Error loading data in widget task handler:', e);
  }

  renderWidget(
    <CashbackWidget
      cashbacks={cashbacks}
      banks={banks}
      month={currentMonth}
      year={currentYear}
    />
  );
}
