import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles } from 'lucide-react-native';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon: React.ReactNode;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, rightAction }) => {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <Sparkles size={18} color="#FFDD2D" style={styles.sparkle} />
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightAction && (
        <TouchableOpacity style={styles.actionButton} onPress={rightAction.onPress} activeOpacity={0.7}>
          {rightAction.icon}
        </TouchableOpacity>
      )}
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
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
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
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  sparkle: {
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
