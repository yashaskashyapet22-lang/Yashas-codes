import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useThemeStore, getTheme } from '../stores/themeStore';

interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'surface' | 'card';
}

export function ThemedView({ style, variant = 'background', ...props }: ThemedViewProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const backgroundColor = {
    background: theme.background,
    surface: theme.surface,
    card: theme.card,
  }[variant];

  return <View style={[{ backgroundColor }, style]} {...props} />;
}
