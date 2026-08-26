import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentBlue: string;
  accentGreen: string;
  accentRed: string;
  inputBackground: string;
  inputBorder: string;
  tabBarBackground: string;
  tabBarBorder: string;
  badgeBackground: string;
  isDark: boolean;
}

export const DARK_THEME: ThemeColors = {
  background: '#0F172A',
  card: '#1E293B',
  cardBorder: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#FFDD2D',
  accentBlue: '#38BDF8',
  accentGreen: '#10B981',
  accentRed: '#EF4444',
  inputBackground: '#0F172A',
  inputBorder: '#334155',
  tabBarBackground: '#0F172A',
  tabBarBorder: '#1E293B',
  badgeBackground: 'rgba(56, 189, 248, 0.15)',
  isDark: true,
};

export const LIGHT_THEME: ThemeColors = {
  background: '#F1F5F9',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#EAB308',
  accentBlue: '#0284C7',
  accentGreen: '#059669',
  accentRed: '#DC2626',
  inputBackground: '#F8FAFC',
  inputBorder: '#CBD5E1',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  badgeBackground: 'rgba(2, 132, 199, 0.12)',
  isDark: false,
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: DARK_THEME,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      const settings = await StorageService.getSettings();
      if (settings.activeTheme === 'light' || settings.activeTheme === 'dark') {
        setThemeState(settings.activeTheme);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    await StorageService.saveSettings({ activeTheme: mode });
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
