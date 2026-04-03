import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { GameProvider } from '../store/GameContext';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';

// Feature: react-native-game-migration
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7

export function RootNavigator(): React.JSX.Element {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#f0c040" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? (
        <GameProvider>
          <AppStack />
        </GameProvider>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
