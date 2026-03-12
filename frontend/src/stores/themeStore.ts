import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const getSystemTheme = () => Appearance.getColorScheme() === 'dark';

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  isDark: getSystemTheme(),

  setMode: async (mode: ThemeMode) => {
    await AsyncStorage.setItem('theme_mode', mode);
    const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
    set({ mode, isDark });
  },

  loadTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem('theme_mode') as ThemeMode | null;
      const mode = savedMode || 'system';
      const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
      set({ mode, isDark });
    } catch (error) {
      console.error('Load theme error:', error);
    }
  },
}));

export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceVariant: '#E8E8E8',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  secondary: '#8B5CF6',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  card: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
};

export const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceVariant: '#334155',
  primary: '#818CF8',
  primaryLight: '#A5B4FC',
  secondary: '#A78BFA',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  border: '#374151',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  card: '#1E293B',
  overlay: 'rgba(0,0,0,0.7)',
};

export const getTheme = (isDark: boolean) => isDark ? darkTheme : lightTheme;
