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

  // Aggregate top active categories
  const activeOffers = cashbacks
    .flatMap((cb) => {
      const bank = banks.find((b) => b.id === cb.bankId);
      if (!bank || !bank.isActive) return [];
      return cb.items.map((item) => ({
        bankName: bank.shortName || bank.name,
        bankColor: bank.primaryColor || '#38BDF8',
        textColor: bank.textColor || '#FFFFFF',
        category: item.category,
        percent: item.percent,
      }));
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0F172A',
        borderRadius: 24,
        padding: 14,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginBottom: 8,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="💳"
            style={{
              fontSize: 16,
              marginRight: 6,
            }}
          />
          <TextWidget
            text="Мои Кэшбеки"
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: '#F8FAFC',
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#1E293B',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <TextWidget
            text={`${monthName}`}
            style={{
              fontSize: 11,
              fontWeight: 'bold',
              color: '#FFDD2D',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Categories List */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          justifyContent: 'space-around',
        }}
      >
        {activeOffers.length > 0 ? (
          activeOffers.map((offer, idx) => (
            <FlexWidget
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: 'match_parent',
                marginVertical: 2,
              }}
            >
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <FlexWidget
                  style={{
                    backgroundColor: offer.bankColor as any,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    marginRight: 8,
                  }}
                >
                  <TextWidget
                    text={offer.bankName}
                    style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: offer.textColor as any,
                    }}
                  />
                </FlexWidget>

                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget
                    text={offer.category}
                    style={{
                      fontSize: 12,
                      color: '#E2E8F0',
                    }}
                    maxLines={1}
                  />
                </FlexWidget>
              </FlexWidget>

              <FlexWidget
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  marginLeft: 6,
                }}
              >
                <TextWidget
                  text={`${offer.percent}%`}
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#38BDF8',
                  }}
                />
              </FlexWidget>
            </FlexWidget>
          ))
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
              text="Категории на этот месяц не занесены"
              style={{
                fontSize: 12,
                color: '#94A3B8',
                textAlign: 'center',
              }}
            />
            <TextWidget
              text="Нажмите для добавления кэшбэка"
              style={{
                fontSize: 11,
                color: '#38BDF8',
                marginTop: 4,
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
