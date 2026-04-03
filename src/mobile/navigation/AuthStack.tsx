import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { AuthScreen } from '../screens/AuthScreen';

// Feature: react-native-game-migration
// Requirements: 7.1

const Stack = createNativeStackNavigator<Pick<RootStackParamList, 'Auth'>>();

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}
