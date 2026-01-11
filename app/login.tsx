import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { microknightText } from '@/constants/typography';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signInWithDiscord } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDiscordLogin = async () => {
    try {
      setLoading(true);
      await signInWithDiscord();
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Discord. Please try again.';
      Alert.alert(
        STRINGS.ERRORS.LOGIN_FAILED_TITLE,
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Title */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>{STRINGS.LOGIN.TITLE}</Text>
          <Text style={styles.subtitle}>{STRINGS.LOGIN.SUBTITLE}</Text>
        </View>

        {/* Discord Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.discordIcon}>🎮</Text>
        </View>

        {/* Login Button */}
        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed,
            loading && styles.loginButtonDisabled,
          ]}
          onPress={handleDiscordLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.loginButtonText}>{STRINGS.LOGIN.BUTTON}</Text>
            </>
          )}
        </Pressable>

        {/* Info Text */}
        <Text style={styles.infoText}>
          {STRINGS.LOGIN.INFO_TEXT}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {STRINGS.LOGIN.FOOTER_TEXT}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appTitle: {
    ...microknightText['3xl'],
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: 'freepixel',
    fontSize: 14,
    color: '#888',
    letterSpacing: 1,
  },
  logoContainer: {
    marginBottom: 48,
  },
  discordIcon: {
    fontSize: 80,
  },
  loginButton: {
    backgroundColor: '#5865F2', // Discord brand color
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 250,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#5865F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonPressed: {
    backgroundColor: '#4752C4',
    transform: [{ scale: 0.98 }],
  },
  loginButtonDisabled: {
    backgroundColor: '#4752C4',
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'freepixel',
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'freepixel',
    lineHeight: 18,
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 32,
  },
  footerText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'freepixel',
    lineHeight: 16,
  },
});
