import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeStore, getTheme } from '../stores/themeStore';
import { Ionicons } from '@expo/vector-icons';

interface SkillBadgeProps {
  name: string;
  level?: 'beginner' | 'intermediate' | 'expert';
  onRemove?: () => void;
  variant?: 'default' | 'outline';
}

export function SkillBadge({ name, level, onRemove, variant = 'default' }: SkillBadgeProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const levelColors = {
    beginner: theme.success,
    intermediate: theme.warning,
    expert: theme.primary,
  };

  return (
    <View
      style={[
        styles.badge,
        variant === 'default'
          ? { backgroundColor: theme.surfaceVariant }
          : { borderWidth: 1, borderColor: theme.border },
      ]}
    >
      {level && (
        <View style={[styles.levelDot, { backgroundColor: levelColors[level] }]} />
      )}
      <ThemedText size="sm">{name}</ThemedText>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
