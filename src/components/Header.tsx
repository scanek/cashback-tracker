import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { SyncStatusBadge } from './SyncStatusBadge';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showThemeToggle?: boolean;
  showSyncBadge?: boolean;
  onSyncPress?: () => void;
  rightAction?: {
    icon: React.ReactNode;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showThemeToggle = false,
  showSyncBadge = true,
  onSyncPress,
  rightAction,
}) => {
  const { colors, theme, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Sparkles size={18} color={colors.accent} style={styles.sparkle} />
        </View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>

      <View style={styles.actionsGroup}>
        {showSyncBadge && (
          <SyncStatusBadge onPress={onSyncPress} compact={true} />
        )}

        {showThemeToggle && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            {theme === 'dark' ? (
              <Sun size={18} color="#FFDD2D" />
            ) : (
              <Moon size={18} color="#0284C7" />
            )}
          </TouchableOpacity>
        )}

        {rightAction && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={rightAction.onPress}
            activeOpacity={0.7}
          >
            {rightAction.icon}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sparkle: {
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
