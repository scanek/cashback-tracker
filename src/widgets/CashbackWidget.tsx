import React from 'react';
import {
  FlexWidget,
  TextWidget,
} from 'react-native-android-widget';
import { Bank, MonthlyCashback } from '../types';
import { MONTH_NAMES_RU } from '../constants/banks';

interface CashbackWidgetProps {
  cashbacks: MonthlyCashback[];
  banks: Bank[];
  month: number;
  year: number;
}

export function CashbackWidget({
  cashbacks = [],
  banks = [],
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
}: CashbackWidgetProps) {
  const monthName = MONTH_NAMES_RU[month] || 'Месяц';

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
        backgroundColor: '#0F172A',
        borderRadius: 24,
        padding: 12,
        justifyContent: 'space-between',
      }}
    >
      {/* Interactive Header with Month Selector */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginBottom: 6,
          paddingBottom: 6,
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
        }}
      >
        {/* Left: App Title (Click to open app) */}
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
              color: '#F8FAFC',
            }}
          />
        </FlexWidget>

        {/* Right: Interactive Month Stepper (< Месяц Год >) */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1E293B',
            borderRadius: 14,
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          {/* Previous Month Button */}
          <FlexWidget
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
            clickAction="CHANGE_MONTH"
            clickActionData={{ delta: -1, month, year }}
          >
            <TextWidget
              text="◀"
              style={{
                fontSize: 11,
                color: '#38BDF8',
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
                color: '#FFDD2D',
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
            clickActionData={{ delta: 1, month, year }}
          >
            <TextWidget
              text="▶"
              style={{
                fontSize: 11,
                color: '#38BDF8',
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
            // Join all categories of this bank: e.g. "6% Топливо • 5% Аптеки • 1% Все..."
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
                      color: '#E2E8F0',
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
                color: '#94A3B8',
                textAlign: 'center',
              }}
            />
            <TextWidget
              text="Нажмите здесь для добавления кэшбэка ➔"
              style={{
                fontSize: 11,
                color: '#38BDF8',
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
