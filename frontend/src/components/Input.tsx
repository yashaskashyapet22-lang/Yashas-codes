import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeStore, getTheme } from '../stores/themeStore';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText variant="secondary" size="sm" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.error : theme.border,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.textTertiary}
        {...props}
      />
      {error && (
        <ThemedText style={{ color: theme.error }} size="sm">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
});
