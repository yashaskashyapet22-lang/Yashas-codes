import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeStore, getTheme } from '../stores/themeStore';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16 },
    md: { paddingVertical: 12, paddingHorizontal: 20 },
    lg: { paddingVertical: 16, paddingHorizontal: 24 },
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: theme.primary },
    secondary: { backgroundColor: theme.secondary },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.primary },
    ghost: { backgroundColor: 'transparent' },
  };

  const textColors: Record<string, string> = {
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    outline: theme.primary,
    ghost: theme.primary,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles[size],
        variantStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <>
          {icon}
          <ThemedText 
            style={[{ color: textColors[variant] }, textStyle]} 
            weight="semibold"
          >
            {title}
          </ThemedText>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
