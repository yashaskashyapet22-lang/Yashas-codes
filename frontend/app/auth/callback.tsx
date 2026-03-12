import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import * as Linking from 'expo-linking';

export default function AuthCallback() {
  const router = useRouter();
  const { login } = useAuthStore();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        let sessionId: string | null = null;

        if (Platform.OS === 'web') {
          // On web, check the URL hash
          const hash = window.location.hash;
          if (hash && hash.includes('session_id=')) {
            sessionId = hash.split('session_id=')[1]?.split('&')[0];
          }
        } else {
          // On native, get from linking URL
          const url = await Linking.getInitialURL();
          if (url && url.includes('session_id=')) {
            sessionId = url.split('session_id=')[1]?.split('&')[0];
          }
        }

        if (sessionId) {
          await login(sessionId);
          router.replace('/(tabs)');
        } else {
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth/login');
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
