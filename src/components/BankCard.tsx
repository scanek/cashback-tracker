import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bank, MonthlyCashback, CashbackItem } from '../types';
import { Edit2, Plus, Trash2, CreditCard, Sparkles, AlertCircle, Share2, Heart } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface BankCardProps {
  bank: Bank;
  cashback?: MonthlyCashback;
  onEdit: () => void;
  onAdd: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

export const BankCard: React.FC<BankCardProps> = ({
  bank,
  cashback,
  onEdit,
  onAdd,
  onDelete,
  onShare,
}) => {
  const { colors, theme } = useTheme();
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
          <CreditCard size={20} color={bank.textColor} style={{ marginRight: 8 }} />
          <Text style={[styles.bankName, { color: bank.textColor }]}>{bank.name}</Text>
          {isShared && (
            <View style={styles.sharedTag}>
              <Heart size={10} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.sharedTagText}>
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
                  <Share2 size={14} color={bank.textColor} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.miniButton, { backgroundColor: 'rgba(0,0,0,0.18)', marginLeft: 6 }]}
                onPress={onEdit}
                activeOpacity={0.7}
              >
                <Edit2 size={14} color={bank.textColor} />
              </TouchableOpacity>
              {onDelete && (
                <TouchableOpacity
                  style={[styles.miniButton, { backgroundColor: 'rgba(0,0,0,0.18)', marginLeft: 6 }]}
                  onPress={onDelete}
                  activeOpacity={0.7}
                >
                  <Trash2 size={14} color={bank.textColor} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={[styles.miniButton, { backgroundColor: 'rgba(0,0,0,0.18)' }]}
              onPress={onAdd}
              activeOpacity={0.7}
            >
              <Plus size={16} color={bank.textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Body */}
      <View style={styles.body}>
        {hasItems ? (
          <View style={styles.categoriesGrid}>
            {cashback.items.map((item: CashbackItem, index: number) => {
              const isHighRate = item.percent >= 10;
              return (
                <View key={item.id || index.toString()} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.percentBadge,
                        {
                          backgroundColor: isHighRate
                            ? 'rgba(239, 68, 68, 0.15)'
                            : colors.badgeBackground,
                          borderColor: isHighRate ? '#EF4444' : colors.accentBlue,
                        },
                      ]}
                    >
                      {isHighRate && (
                        <Sparkles
                          size={10}
                          color="#EF4444"
                          style={{ marginRight: 2 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.percentText,
                          { color: isHighRate ? '#EF4444' : colors.accentBlue },
                        ]}
                      >
                        {item.percent}%
                      </Text>
                    </View>

                    <View style={styles.categoryDetails}>
                      <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>
                        {item.category}
                      </Text>
                      {item.note ? (
                        <Text style={[styles.categoryNote, { color: colors.textSecondary }]}>
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
          <TouchableOpacity style={styles.emptyState} onPress={onAdd} activeOpacity={0.7}>
            <AlertCircle size={20} color={colors.textMuted} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Категории на этот месяц не занесены
            </Text>
            <View style={[styles.addCategoryBtn, { borderColor: colors.accentBlue }]}>
              <Plus size={14} color={colors.accentBlue} style={{ marginRight: 4 }} />
              <Text style={[styles.addCategoryBtnText, { color: colors.accentBlue }]}>
                Добавить кэшбэк
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 14,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 46,
    justifyContent: 'center',
    marginRight: 10,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoryDetails: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryNote: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 13,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  sharedTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
