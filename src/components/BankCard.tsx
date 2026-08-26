import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bank, MonthlyCashback, CashbackItem } from '../types';
import { Edit2, Plus, Trash2, CreditCard, Sparkles, AlertCircle, Share2 } from 'lucide-react-native';

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
  const hasItems = cashback && cashback.items && cashback.items.length > 0;

  return (
    <View style={styles.cardWrapper}>
      {/* Top Bank Header Banner */}
      <View style={[styles.headerBanner, { backgroundColor: bank.primaryColor }]}>
        <View style={styles.bankInfo}>
          <CreditCard size={20} color={bank.textColor} style={{ marginRight: 8 }} />
          <Text style={[styles.bankName, { color: bank.textColor }]}>{bank.name}</Text>
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
                            : 'rgba(56, 189, 248, 0.15)',
                          borderColor: isHighRate ? '#EF4444' : '#38BDF8',
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
                          { color: isHighRate ? '#F87171' : '#38BDF8' },
                        ]}
                      >
                        {item.percent}%
                      </Text>
                    </View>

                    <View style={styles.categoryDetails}>
                      <Text style={styles.categoryTitle}>{item.category}</Text>
                      {item.note ? <Text style={styles.categoryNote}>{item.note}</Text> : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyState} onPress={onAdd} activeOpacity={0.7}>
            <AlertCircle size={20} color="#64748B" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyText}>Категории на этот месяц не занесены</Text>
            <View style={styles.addCategoryBtn}>
              <Plus size={14} color="#38BDF8" style={{ marginRight: 4 }} />
              <Text style={styles.addCategoryBtnText}>Добавить кэшбэк</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    marginRight: 10,
    minWidth: 46,
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryDetails: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  categoryNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyState: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  addCategoryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
  },
});
