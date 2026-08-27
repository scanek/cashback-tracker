import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bank, MonthlyCashback, CashbackItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Share2,
  Heart,
} from 'lucide-react-native';

interface BankCardProps {
  bank: Bank;
  cashback?: MonthlyCashback;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

export const BankCard: React.FC<BankCardProps> = ({
  bank,
  cashback,
  onAdd,
  onEdit,
  onDelete,
  onShare,
}) => {
  const { colors } = useTheme();
  const hasItems = cashback && cashback.items && cashback.items.length > 0;
  const isShared = Boolean(cashback?.isShared);

  return (
    <View
      style={[
        styles.cardWrapper,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      {/* Top Bank Header Banner */}
      <View style={[styles.headerBanner, { backgroundColor: bank.primaryColor }]}>
        <View style={styles.bankInfo}>
          <CreditCard size={18} color={bank.textColor} style={{ marginRight: 6 }} />
          <Text style={[styles.bankName, { color: bank.textColor }]} numberOfLines={1}>
            {bank.name}
          </Text>
          {isShared && (
            <View style={styles.sharedTag}>
              <Heart size={9} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.sharedTagText} numberOfLines={1}>
                {cashback?.sharedByName || 'Партнер'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {hasItems ? (
            <>
              {onShare && (
                <TouchableOpacity
                  style={[styles.miniButton, { backgroundColor: 'rgba(0,0,0,0.18)' }]}
                  onPress={onShare}
                  activeOpacity={0.7}
                >
                  <Share2 size={13} color={bank.textColor} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.miniButton, { backgroundColor: 'rgba(0,0,0,0.18)', marginLeft: 5 }]}
                onPress={onEdit}
                activeOpacity={0.7}
              >
                <Edit2 size={13} color={bank.textColor} />
              </TouchableOpacity>
              {onDelete && (
                <TouchableOpacity
                  style={[styles.miniButton, { backgroundColor: 'rgba(0,0,0,0.18)', marginLeft: 5 }]}
                  onPress={onDelete}
                  activeOpacity={0.7}
                >
                  <Trash2 size={13} color={bank.textColor} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={[styles.miniButton, { backgroundColor: 'rgba(0,0,0,0.18)' }]}
              onPress={onAdd}
              activeOpacity={0.7}
            >
              <Plus size={15} color={bank.textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Body */}
      <View style={styles.body}>
        {hasItems ? (
          <View style={styles.categoriesGrid}>
            {cashback.items.map((item: CashbackItem, index: number) => {
              const isHigh = item.percent >= 10;
              const isMedium = item.percent >= 5 && item.percent < 10;

              return (
                <View key={item.id || index} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.percentBadge,
                        {
                          backgroundColor: isHigh
                            ? colors.accent
                            : isMedium
                            ? 'rgba(56, 189, 248, 0.12)'
                            : colors.inputBackground,
                          borderColor: isHigh
                            ? colors.accent
                            : isMedium
                            ? 'rgba(56, 189, 248, 0.3)'
                            : colors.inputBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.percentText,
                          {
                            color: isHigh
                              ? '#0F172A'
                              : isMedium
                              ? colors.accentBlue
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {item.percent}%
                      </Text>
                    </View>

                    <View style={styles.categoryDetails}>
                      <Text
                        style={[styles.categoryTitle, { color: colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {item.category}
                      </Text>
                      {item.note ? (
                        <Text
                          style={[styles.categoryNote, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {item.note}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Категории на этот месяц не выбраны
            </Text>
            {onAdd && (
              <TouchableOpacity
                style={[
                  styles.addCategoryBtn,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={onAdd}
                activeOpacity={0.7}
              >
                <Plus size={14} color={colors.accentBlue} style={{ marginRight: 4 }} />
                <Text style={[styles.addCategoryBtnText, { color: colors.accentBlue }]}>
                  Выбрать кэшбэк
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 6,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  miniButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 12,
  },
  categoriesGrid: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  percentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 44,
    justifyContent: 'center',
    marginRight: 9,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  categoryDetails: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryNote: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyText: {
    fontSize: 12,
    marginBottom: 8,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  addCategoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sharedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 5,
    flexShrink: 0,
  },
  sharedTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
