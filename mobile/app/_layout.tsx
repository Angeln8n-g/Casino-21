import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { AuthProvider } from '../hooks/useAuth';
import { AudioProvider } from '../hooks/useAudio';
import { GameProvider } from '../hooks/useGame';
import { useNotifications } from '../hooks/useNotifications';
import { GameInvitationModal } from '../components/notifications/GameInvitationModal';
import { loadThemes } from '../themes/themeRegistry';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

export { ErrorBoundary } from 'expo-router';

function RootContent() {
  const router = useRouter();
  const { activeGameInvitation, setActiveGameInvitation, handleGameInvite } = useNotifications();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="game" options={{ headerShown: false }} />
      </Stack>

      <GameInvitationModal
        invite={activeGameInvitation}
        onAccept={async (invitationId, roomId) => {
          await handleGameInvite(invitationId, 'accepted', roomId);
          router.push('/game');
        }}
        onReject={async (invitationId) => {
          await handleGameInvite(invitationId, 'rejected');
        }}
        onClose={() => setActiveGameInvitation(null)}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    RussoOne_400Regular,
    ChakraPetch_700Bold,
    Cinzel_700Bold,
    Orbitron_700Bold,
  });

  useEffect(() => {
    loadThemes();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AudioProvider>
            <GameProvider>
              <RootContent />
            </GameProvider>
          </AudioProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
