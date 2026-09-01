import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SyncService } from '../services/sync';
import { SyncStatusState } from '../types';
import { useTheme } from '../context/ThemeContext';
import { RefreshCw, CloudCheck, CloudOff, AlertCircle } from 'lucide-react-native';

interface SyncStatusBadgeProps {
  onPress?: () => void;
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ onPress, compact = false }) => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<SyncStatusState>(SyncService.getStatus());
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>();
  const [syncKey, setSyncKey] = useState<string>('');

  useEffect(() => {
    SyncService.getSyncKey().then(setSyncKey);
    const unsubscribe = SyncService.addListener((newStatus, lastSync) => {
      setStatus(newStatus);
      if (lastSync) setLastSyncTime(lastSync);
    });
    return () => unsubscribe();
  }, []);

  const handlePress = async () => {
    if (onPress) {
      onPress();
    } else {
      await SyncService.performSync();
    }
  };

  const formatLastSync = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: <ActivityIndicator size={12} color="#60A5FA" />,
          text: 'Синхронизация...',
          color: '#60A5FA',
          bg: 'rgba(96, 165, 250, 0.12)',
        };
      case 'synced':
        return {
          icon: <CloudCheck size={14} color="#34D399" />,
          text: compact ? (lastSyncTime ? formatLastSync(lastSyncTime) : 'Облако') : `Облако • ${formatLastSync(lastSyncTime) || 'Синхронизировано'}`,
          color: '#34D399',
          bg: 'rgba(52, 211, 153, 0.12)',
        };
      case 'error':
        return {
          icon: <AlertCircle size={14} color="#F87171" />,
          text: 'Ошибка связи',
          color: '#F87171',
          bg: 'rgba(248, 113, 113, 0.12)',
        };
      case 'offline':
      default:
        return {
          icon: <CloudOff size={14} color="#9CA3AF" />,
          text: 'Локально',
          color: '#9CA3AF',
          bg: 'rgba(156, 163, 175, 0.12)',
        };
    }
  };

  const current = getStatusContent();

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.badge,
        { backgroundColor: current.bg, borderColor: `${current.color}40` },
      ]}
    >
      {current.icon}
      <Text style={[styles.text, { color: current.color }]}>
        {current.text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
