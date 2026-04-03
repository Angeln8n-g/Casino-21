// Feature: react-native-game-migration
// Requirements: 6.2, 6.5, 13.5

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

const BG = '#0f0f1a';
const CARD = '#1a1a2e';
const BORDER = '#2a2a40';
const PURPLE = '#7c3aed';
const GOLD = '#f59e0b';

type AuthMode = 'login' | 'register';

export function AuthScreen(): React.JSX.Element {
  const { signIn, signUp, loading } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    setError(null);
    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError(authError);
    }
  }, [email, password, signIn]);

  const handleSignUp = useCallback(async () => {
    setError(null);
    const { error: authError } = await signUp(email, password);
    if (authError) {
      setError(authError);
    }
  }, [email, password, signUp]);

  const handleAction = mode === 'login' ? handleSignIn : handleSignUp;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Title */}
            <Text style={styles.title}>🃏 Casino 21</Text>
            <Text style={styles.subtitle}>El juego de cartas definitivo</Text>

            {/* Card container */}
            <View style={styles.card}>
              {/* Tab switcher */}
              <View style={styles.tabBar}>
                <Pressable
                  style={[styles.tab, mode === 'login' && styles.tabActive]}
                  onPress={() => { setMode('login'); setError(null); }}
                >
                  <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                    Iniciar Sesión
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, mode === 'register' && styles.tabActive]}
                  onPress={() => { setMode('register'); setError(null); }}
                >
                  <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                    Registrarse
                  </Text>
                </Pressable>
              </View>

              {/* Inputs */}
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="#6b7280"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!loading}
                testID="email-input"
              />

              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                testID="password-input"
              />

              {/* Error */}
              {error ? (
                <Text style={styles.errorText} testID="error-message">
                  ⚠️ {error}
                </Text>
              ) : null}

              {/* Action */}
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color={PURPLE}
                  style={styles.loader}
                  testID="loading-indicator"
                />
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    mode === 'login' ? styles.actionButtonLogin : styles.actionButtonRegister,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleAction}
                  testID={mode === 'login' ? 'sign-in-button' : 'sign-up-button'}
                >
                  <Text style={styles.actionButtonText}>
                    {mode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: GOLD,
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 36,
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BG,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: PURPLE,
  },
  tabText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#f9fafb',
    marginBottom: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  loader: {
    marginTop: 16,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  actionButtonLogin: {
    backgroundColor: PURPLE,
  },
  actionButtonRegister: {
    backgroundColor: GOLD,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  pressed: {
    opacity: 0.75,
  },
});

export default AuthScreen;
