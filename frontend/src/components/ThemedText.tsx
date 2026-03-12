import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useThemeStore, getTheme } from '../stores/themeStore';

interface ThemedTextProps extends TextProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

const sizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
};

const weights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export function ThemedText({ 
  style, 
  variant = 'primary', 
  size = 'md',
  weight = 'normal',
  ...props 
}: ThemedTextProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const color = {
    primary: theme.text,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
  }[variant];

  return (
    <Text 
      style={[
        { 
          color, 
          fontSize: sizes[size],
          fontWeight: weights[weight],
        }, 
        style
      ]} 
      {...props} 
    />
  );
}
