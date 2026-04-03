import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useGame } from '../store/GameContext';
import { useAutoReconnect } from '../hooks/useAutoReconnect';

// Real screen components
import { MainMenu } from '../screens/MainMenu';
import GameScreen from '../screens/GameScreen';
import TournamentScreen from '../screens/TournamentScreen';
import SocialScreen from '../screens/SocialScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatsScreen from '../screens/StatsScreen';

// Feature: react-native-game-migration
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 9.3

type AppNavProp = NativeStackNavigationProp<Omit<RootStackParamList, 'Auth'>>;

/**
 * Invisible controller component that watches game state and triggers
 * automatic navigation based on the current game phase.
 *
 * Requirements: 7.4, 7.5, 7.6
 */
function NavigationController(): null {
  const navigation = useNavigation<AppNavProp>();
  const { state, dispatch } = useGame();
  const { gameState } = state;

  useEffect(() => {
    if (!gameState) return;

    const { phase } = gameState;

    if (phase === 'completed') {
      // Game finished — clear state and go back to main menu (Req 7.5, 7.6)
      dispatch({ type: 'SET_GAME_STATE', payload: null });
      navigation.navigate('MainMenu');
    } else {
      // Active game in progress (dealing | playing | scoring) — navigate to GameScreen (Req 7.4)
      navigation.navigate('Game', { roomId: gameState.id });
    }
  }, [gameState, navigation, dispatch]);

  return null;
}

const Stack = createNativeStackNavigator<Omit<RootStackParamList, 'Auth'>>();

// Platform-specific transition: slide_from_right on iOS, fade on Android (Req 7.7)
const screenAnimation = Platform.OS === 'ios' ? 'slide_from_right' : 'fade';

/**
 * Wrapper screen that mounts NavigationController alongside the actual MainMenu.
 * Also triggers auto-reconnect on app start (Req 9.3).
 */
function MainMenuWithController(): React.JSX.Element {
  // Auto-reconnect: if session + saved roomId exist, rejoin the room
  useAutoReconnect();

  return (
    <>
      <NavigationController />
      <MainMenu />
    </>
  );
}

export function AppStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: screenAnimation,
      }}
    >
      <Stack.Screen name="MainMenu" component={MainMenuWithController} />
      <Stack.Screen name="Game" component={GameScreen} />
      <Stack.Screen name="Tournament" component={TournamentScreen} />
      <Stack.Screen name="Social" component={SocialScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
    </Stack.Navigator>
  );
}
