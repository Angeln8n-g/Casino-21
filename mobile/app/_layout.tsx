import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { socketService } from '../services/socket';
import { AudioProvider } from '../hooks/useAudio';
import { MusicSettingsProvider } from '../hooks/useMusicSettings';
import { GameProvider, useGame } from '../hooks/useGame';
import { NotificationsProvider, useNotifications } from '../hooks/useNotifications';
import { GameInvitationModal } from '../components/notifications/GameInvitationModal';
import { NotificationToastBanner } from '../components/notifications/NotificationToastBanner';
import { NotificationsModal } from '../components/notifications/NotificationsModal';
import { AudioSettingsModal } from '../components/settings/AudioSettingsModal';
import { ReferralModal } from '../components/social/ReferralModal';
import { PrivateChatModal, PrivateChatFriend } from '../components/chat/PrivateChatModal';
import { appEvents } from '../utils/events';
import { loadThemes } from '../themes/themeRegistry';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

export { ErrorBoundary } from 'expo-router';

function RootContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const { gameState } = useGame();
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [quickReplyFriend, setQuickReplyFriend] = useState<PrivateChatFriend | null>(null);
  const pathnameRef = useRef(pathname);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
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
    if (
      gameState &&
      (gameState.phase === 'playing' || gameState.phase === 'scoring') &&
      pathname !== '/game'
    ) {
      router.push('/game');
    }
  }, [gameState?.phase, pathname, router]);

  // Escuchar eventos globales: espectar/unirse a sala e invitaciones de referidos
  useEffect(() => {
    const handleJoinGameFromInvite = async (payload?: {
      roomId?: string;
      isTournament?: boolean;
      isSpectator?: boolean;
    }) => {
      if (!payload?.roomId) return;
      try {
        const socket = await socketService.connect();
        socket.emit('join_room', {
          roomId: payload.roomId.toUpperCase(),
          playerName: profile?.username || 'Jugador',
          isTournament: payload.isTournament,
          isSpectator: payload.isSpectator,
        });
      } catch (err) {
        console.warn('Error uniéndose a sala desde invitación/espectador:', err);
      }
    };

    const handleOpenReferral = () => {
      setIsReferralModalOpen(true);
    };

    appEvents.on('join_game_from_invite', handleJoinGameFromInvite);
    appEvents.on('open_referral_modal', handleOpenReferral);
    return () => {
      appEvents.off('join_game_from_invite', handleJoinGameFromInvite);
      appEvents.off('open_referral_modal', handleOpenReferral);
    };
  }, [profile?.username]);

  // Navegar a /(tabs)/social cuando un toast o notificación emite 'open_social_tab',
  // o abrir PrivateChatModal sobre la mesa si el jugador está dentro de una partida activa.
  useEffect(() => {
    const handleOpenSocial = () => {
      setQuickReplyFriend(null);
      if (!pathnameRef.current.includes('social')) {
        router.push('/(tabs)/social');
      }
    };

    const handleOpenPrivateChat = (payload?: { friend?: PrivateChatFriend }) => {
      const friend = payload?.friend;
      if (!friend?.id) return;

      const phase = gameStateRef.current?.phase as string | undefined;
      const inActiveGame =
        pathnameRef.current === '/game' || phase === 'playing' || phase === 'scoring';

      if (inActiveGame) {
        setQuickReplyFriend(friend);
      } else {
        setQuickReplyFriend(null);
        appEvents.emit('open_social_tab', {
          tab: 'chat',
          friendId: friend.id,
          friendProfile: friend,
        });
      }
    };

    appEvents.on('open_social_tab', handleOpenSocial);
    appEvents.on('open_private_chat', handleOpenPrivateChat);
    return () => {
      appEvents.off('open_social_tab', handleOpenSocial);
      appEvents.off('open_private_chat', handleOpenPrivateChat);
    };
  }, [router]);

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

      <AudioSettingsModal />

      <ReferralModal
        visible={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
      />

      <PrivateChatModal
        visible={Boolean(quickReplyFriend)}
        friend={quickReplyFriend}
        onClose={() => setQuickReplyFriend(null)}
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
            <MusicSettingsProvider>
              <GameProvider>
                <NotificationsProvider>
                  <RootContent />
                </NotificationsProvider>
              </GameProvider>
            </MusicSettingsProvider>
          </AudioProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
