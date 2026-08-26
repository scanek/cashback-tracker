import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import { Bank, MonthlyCashback } from '../types';
import { MONTH_NAMES_RU } from '../constants/banks';

export type WidgetThemeMode = 'dark' | 'light' | 'transparent';

interface CashbackWidgetProps {
  cashbacks: MonthlyCashback[];
  banks: Bank[];
  month: number;
  year: number;
  theme?: WidgetThemeMode;
}

export function CashbackWidget({
  cashbacks = [],
  banks = [],
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
  theme = 'dark',
}: CashbackWidgetProps) {
  const monthName = MONTH_NAMES_RU[month] || 'Месяц';

  // Theme palettes
  const themeStyles = {
    dark: {
      backgroundColor: '#0F172A' as const,
      borderWidth: 1,
      borderColor: '#1E293B' as const,
      headerBg: '#1E293B' as const,
      headerBorder: '#334155' as const,
      textPrimary: '#F8FAFC' as const,
      textSecondary: '#94A3B8' as const,
      textMuted: '#64748B' as const,
      accentText: '#FFDD2D' as const,
      accentBlue: '#38BDF8' as const,
      categoriesColor: '#E2E8F0' as const,
      themeIcon: '🌙',
    },
    light: {
      backgroundColor: '#FFFFFF' as const,
      borderWidth: 1,
      borderColor: '#E2E8F0' as const,
      headerBg: '#F1F5F9' as const,
      headerBorder: '#CBD5E1' as const,
      textPrimary: '#0F172A' as const,
      textSecondary: '#475569' as const,
      textMuted: '#94A3B8' as const,
      accentText: '#D97706' as const,
      accentBlue: '#0284C7' as const,
      categoriesColor: '#1E293B' as const,
      themeIcon: '☀️',
    },
    transparent: {
      backgroundColor: 'rgba(15, 23, 42, 0.65)' as const,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.25)' as const,
      headerBg: 'rgba(255, 255, 255, 0.15)' as const,
      headerBorder: 'rgba(255, 255, 255, 0.25)' as const,
      textPrimary: '#FFFFFF' as const,
      textSecondary: '#E2E8F0' as const,
      textMuted: '#CBD5E1' as const,
      accentText: '#FFDD2D' as const,
      accentBlue: '#38BDF8' as const,
      categoriesColor: '#FFFFFF' as const,
      themeIcon: '💎',
    },
  }[theme] || {
    backgroundColor: '#0F172A' as const,
    borderWidth: 1,
    borderColor: '#1E293B' as const,
    headerBg: '#1E293B' as const,
    headerBorder: '#334155' as const,
    textPrimary: '#F8FAFC' as const,
    textSecondary: '#94A3B8' as const,
    textMuted: '#64748B' as const,
    accentText: '#FFDD2D' as const,
    accentBlue: '#38BDF8' as const,
    categoriesColor: '#E2E8F0' as const,
    themeIcon: '🌙',
  };

  // Group active cashbacks by bank
  const activeBankGroups = cashbacks
    .filter((cb) => cb.items && cb.items.length > 0)
    .map((cb) => {
      const bank = banks.find((b) => b.id === cb.bankId);
      return {
        bankId: cb.bankId,
        bankName: bank?.shortName || bank?.name || cb.bankId,
        bankColor: bank?.primaryColor || '#38BDF8',
        textColor: bank?.textColor || '#FFFFFF',
        items: cb.items,
      };
    });

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: themeStyles.backgroundColor,
        borderRadius: 24,
        padding: 12,
        justifyContent: 'space-between',
        borderWidth: themeStyles.borderWidth,
        borderColor: themeStyles.borderColor,
      }}
    >
      {/* Interactive Header with Month Selector and Theme Switcher */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginBottom: 6,
          paddingBottom: 6,
          borderBottomWidth: 1,
          borderBottomColor: themeStyles.headerBorder,
        }}
      >
        {/* Left: App Title and Theme Cycle Button */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            style={{ flexDirection: 'row', alignItems: 'center' }}
            clickAction="OPEN_APP"
          >
            <TextWidget
              text="💳"
              style={{
                fontSize: 15,
                marginRight: 4,
              }}
            />
            <TextWidget
              text="Мои Кэшбеки"
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: themeStyles.textPrimary,
                marginRight: 6,
              }}
            />
          </FlexWidget>

          {/* Theme Quick Cycle Button (Dark -> Light -> Transparent) */}
          <FlexWidget
            style={{
              backgroundColor: themeStyles.headerBg,
              borderRadius: 10,
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: themeStyles.headerBorder,
            }}
            clickAction="CYCLE_THEME"
            clickActionData={{ currentTheme: theme, month, year }}
          >
            <TextWidget
              text={themeStyles.themeIcon}
              style={{
                fontSize: 11,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Right: Interactive Month Stepper (< Месяц Год >) */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeStyles.headerBg,
            borderRadius: 14,
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: themeStyles.headerBorder,
          }}
        >
          {/* Previous Month Button */}
          <FlexWidget
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
            clickAction="CHANGE_MONTH"
            clickActionData={{ delta: -1, month, year, theme }}
          >
            <TextWidget
              text="◀"
              style={{
                fontSize: 11,
                color: themeStyles.accentBlue,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>

          {/* Current Month & Year Label */}
          <FlexWidget
            style={{
              paddingHorizontal: 6,
            }}
            clickAction="OPEN_APP"
          >
            <TextWidget
              text={`${monthName} ${year}`}
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: themeStyles.accentText,
              }}
            />
          </FlexWidget>

          {/* Next Month Button */}
          <FlexWidget
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
            clickAction="CHANGE_MONTH"
            clickActionData={{ delta: 1, month, year, theme }}
          >
            <TextWidget
              text="▶"
              style={{
                fontSize: 11,
                color: themeStyles.accentBlue,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* Full Monthly Cashbacks Body */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          justifyContent: 'space-around',
        }}
        clickAction="OPEN_APP"
      >
        {activeBankGroups.length > 0 ? (
          activeBankGroups.map((group, gIdx) => {
            const categoriesSummary = group.items
              .map((item) => `${item.percent}% ${item.category}`)
              .join('  •  ');

            return (
              <FlexWidget
                key={gIdx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: 'match_parent',
                  marginVertical: 2,
                }}
              >
                {/* Bank Tag */}
                <FlexWidget
                  style={{
                    backgroundColor: group.bankColor as any,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginRight: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TextWidget
                    text={group.bankName}
                    style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: group.textColor as any,
                    }}
                  />
                </FlexWidget>

                {/* Categories Line */}
                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget
                    text={categoriesSummary}
                    style={{
                      fontSize: 11,
                      color: themeStyles.categoriesColor,
                    }}
                    maxLines={1}
                  />
                </FlexWidget>
              </FlexWidget>
            );
          })
        ) : (
          <FlexWidget
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 'match_parent',
              flex: 1,
            }}
          >
            <TextWidget
              text={`На ${monthName} ${year} категории не занесены`}
              style={{
                fontSize: 12,
                color: themeStyles.textSecondary,
                textAlign: 'center',
              }}
            />
            <TextWidget
              text="Нажмите здесь для добавления кэшбэка ➔"
              style={{
                fontSize: 11,
                color: themeStyles.accentBlue,
                marginTop: 4,
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
