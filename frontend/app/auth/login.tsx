import React from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { ThemedView } from '../../src/components/ThemedView';
import { ThemedText } from '../../src/components/ThemedText';
import { Button } from '../../src/components/Button';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (Platform.OS === 'web') {
      const redirectUrl = window.location.origin + '/auth/callback';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      // For native apps, we'd use expo-auth-session or similar
      // For MVP, web login is primary
      const redirectUrl = 'https://ai-assistant-hub-165.preview.emergentagent.com/auth/callback';
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const Linking = require('expo-linking');
        Linking.openURL(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Ionicons name="people" size={48} color="#FFFFFF" />
          </View>
          <ThemedText size="2xl" weight="bold" style={styles.title}>
            Team Builder
          </ThemedText>
          <ThemedText variant="secondary" style={styles.subtitle}>
            Find teammates, build projects, succeed together
          </ThemedText>
        </View>

        <View style={styles.features}>
          <FeatureItem 
            icon="search" 
            title="Find Teammates" 
            description="Match with skilled collaborators" 
          />
          <FeatureItem 
            icon="bulb" 
            title="AI Matching" 
            description="Smart suggestions powered by AI" 
          />
          <FeatureItem 
            icon="rocket" 
            title="Launch Projects" 
            description="Create and manage team projects" 
          />
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            size="lg"
            icon={<Ionicons name="logo-google" size={20} color="#FFFFFF" />}
            style={styles.googleButton}
          />
          <ThemedText variant="tertiary" size="sm" style={styles.terms}>
            By continuing, you agree to our Terms & Privacy Policy
          </ThemedText>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);

  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: theme.surfaceVariant }]}>
        <Ionicons name={icon as any} size={24} color={theme.primary} />
      </View>
      <View style={styles.featureText}>
        <ThemedText weight="semibold">{title}</ThemedText>
        <ThemedText variant="secondary" size="sm">{description}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  features: {
    flex: 1,
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    gap: 16,
  },
  googleButton: {
    width: '100%',
  },
  terms: {
    textAlign: 'center',
  },
});
