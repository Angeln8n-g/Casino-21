import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { AuthProvider } from '../hooks/useAuth';
import { AudioProvider } from '../hooks/useAudio';
import { GameProvider, useGame } from '../hooks/useGame';
import { NotificationsProvider, useNotifications } from '../hooks/useNotifications';
import { GameInvitationModal } from '../components/notifications/GameInvitationModal';
import { NotificationToastBanner } from '../components/notifications/NotificationToastBanner';
import { NotificationsModal } from '../components/notifications/NotificationsModal';
import { appEvents } from '../utils/events';
import { loadThemes } from '../themes/themeRegistry';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

export { ErrorBoundary } from 'expo-router';

function RootContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { gameState } = useGame();
  const {
    activeGameInvitation,
    setActiveGameInvitation,
    handleGameInvite,
    toast,
    dismissToast,
    handleFriendRequest,
    appNotifications,
    unreadCount,
    pendingFriendRequests,
    markNotificationAsRead,
    markAllAsRead,
    deleteReadNotifications,
    deleteNotification,
    showNotificationsModal,
    setShowNotificationsModal,
  } = useNotifications();

  // Si una partida inicia (p. ej. tras aceptar un desafío desde Social o recibir confirmación del rival),
  // redirigir automáticamente a /game si aún no estamos allí.
  useEffect(() => {
    if (gameState && gameState.phase === 'playing' && pathname !== '/game') {
      router.push('/game');
    }
  }, [gameState?.phase, pathname, router]);

  // Navegar a /(tabs)/social cuando un toast o notificación emite 'open_social_tab'
  useEffect(() => {
    const handleOpenSocial = () => {
      if (!pathname.includes('social')) {
        router.push('/(tabs)/social');
      }
    };
    appEvents.on('open_social_tab', handleOpenSocial);
    return () => {
      appEvents.off('open_social_tab', handleOpenSocial);
    };
  }, [pathname, router]);

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="game" options={{ headerShown: false }} />
      </Stack>

      <NotificationToastBanner
        toast={toast}
        onDismiss={dismissToast}
        onFriendRequestAction={handleFriendRequest}
      />

      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        appNotifications={appNotifications}
        unreadCount={unreadCount}
        pendingFriendRequests={pendingFriendRequests}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDeleteRead={deleteReadNotifications}
        onDeleteNotification={deleteNotification}
        onChallengeClick={(invite) => setActiveGameInvitation(invite)}
      />

      <GameInvitationModal
        invite={activeGameInvitation}
        onAccept={async (invitationId, roomId) => {
          await handleGameInvite(invitationId, 'accepted', roomId);
          router.push('/game');
        }}
        onReject={async (invitationId) => {
          await handleGameInvite(invitationId, 'rejected', activeGameInvitation?.roomId);
        }}
        onClose={() => setActiveGameInvitation(null)}
      />
    </View>
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
              <NotificationsProvider>
                <RootContent />
              </NotificationsProvider>
            </GameProvider>
          </AudioProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
