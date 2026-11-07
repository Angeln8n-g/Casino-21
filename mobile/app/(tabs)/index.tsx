import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useAudio } from '../../hooks/useAudio';
import { useMusicSettings } from '../../hooks/useMusicSettings';
import { useGame } from '../../hooks/useGame';
import { useNotifications } from '../../hooks/useNotifications';
import { socketService } from '../../services/socket';
import { CreateRoomModal } from '../../components/CreateRoomModal';
import { WaitingRoomModal } from '../../components/WaitingRoomModal';
import { DailyQuestsView } from '../../components/lobby/DailyQuestsView';
import { RecentAchievementsView } from '../../components/lobby/RecentAchievementsView';
import { TournamentLobbyBannerView } from '../../components/lobby/TournamentLobbyBannerView';
import { TopRankingsView } from '../../components/lobby/TopRankingsView';
import { Bot, Swords, Users, PlusCircle, LogIn, Trophy, XCircle, Coins, Bell, Settings } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const { user, profile } = useAuth();
  const { playSfx, musicEnabled, musicMuted } = useAudio();
  const { openSettingsModal, isLobbyPlaying, style: musicStyle } = useMusicSettings();
  const { gameState } = useGame();
  const { unreadCount, totalPending, setShowNotificationsModal } = useNotifications();
  const totalBadgeCount = unreadCount + totalPending;

  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('expert');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Matchmaking
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingSeconds, setMatchmakingSeconds] = useState(0);

  // Modales de Salas Privadas
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomMode, setRoomMode] = useState<'1v1' | '2v2'>('1v1');
  const [roomBetAmount, setRoomBetAmount] = useState<number>(0);
  const [playersInRoomData, setPlayersInRoomData] = useState<Array<{ name: string; id?: string; avatar?: string | null; team?: 1 | 2 }>>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const playerName = (profile?.username?.trim() || 'Jugador K21').slice(0, 30);
  const hasRequestedStateRef = useRef(false);
  const showWaitingModalRef = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    showWaitingModalRef.current = showWaitingModal;
  }, [showWaitingModal]);

  useEffect(() => {
    if (profile) {
      console.log('Lobby profile loaded from API:', {
        id: profile.id,
        username: profile.username,
        elo: profile.elo,
        coins: profile.coins,
      });
    }
  }, [profile]);

  // Limpiar estados de espera del Lobby cuando arranca una partida (la navegación a /game la gestiona _layout.tsx)
  useEffect(() => {
    if (gameState && (gameState.phase === 'playing' || gameState.phase === 'scoring')) {
      setShowWaitingModal(false);
      setShowCreateModal(false);
      setIsMatchmaking(false);
      setLoading(false);
      setLoadingAction(null);
    }
  }, [gameState?.phase]);

  // Temporizador de Matchmaking
  useEffect(() => {
    if (!isMatchmaking) {
      setMatchmakingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setMatchmakingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMatchmaking]);

  // Suscripción a eventos de socket para el Lobby
  useEffect(() => {
    if (!user) return;
    let socket: any;

    const setupSocket = async () => {
      try {
        socket = await socketService.connect();

        socket.on('room_created', ({ roomId, mode, betAmount }: any) => {
          setLoading(false);
          setLoadingAction(null);
          // Solo abrir WaitingRoomModal si la sala fue creada desde Inicio (/), no desde un desafío en /social
          if (pathnameRef.current === '/') {
            setCurrentRoomId(roomId);
            if (mode) setRoomMode(mode);
            if (betAmount !== undefined) setRoomBetAmount(betAmount);
            setPlayersInRoomData([{ name: playerName, avatar: profile?.avatar_url }]);
            setShowWaitingModal(true);
          }
        });

        socket.on('room_joined', ({ roomId, mode, betAmount }: any) => {
          setLoading(false);
          setLoadingAction(null);
          if (pathnameRef.current === '/') {
            setCurrentRoomId(roomId);
            if (mode) setRoomMode(mode);
            if (betAmount !== undefined) setRoomBetAmount(betAmount);
            setShowWaitingModal(true);
          }
        });

        socket.on('player_joined', ({ playersData }: any) => {
          if (playersData && Array.isArray(playersData)) {
            setPlayersInRoomData(playersData);
            playSfx('cardDeal');
          }
        });

        socket.on('match_found', ({ roomId }: any) => {
          setIsMatchmaking(false);
          playSfx('matchFound');
        });

        socket.on('room_closed', () => {
          const wasWaitingInLobby = showWaitingModalRef.current;
          setShowWaitingModal(false);
          setCurrentRoomId(null);
          setPlayersInRoomData([]);
          setCountdown(null);
          if (wasWaitingInLobby) {
            Alert.alert('Sala cerrada', 'La sala ha sido cerrada.');
          }
        });

        socket.on('error', (msg: string) => {
          setLoading(false);
          setLoadingAction(null);
          setIsMatchmaking(false);
          if (pathnameRef.current === '/') {
            Alert.alert('Aviso', msg || 'Ocurrió un error en la sala');
          }
        });
      } catch (err) {
        console.warn('Error conectando socket en lobby:', err);
      }
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.off('room_created');
        socket.off('room_joined');
        socket.off('player_joined');
        socket.off('match_found');
        socket.off('room_closed');
        socket.off('error');
      }
    };
  }, [user, playerName, profile?.avatar_url, playSfx]);

  // Cuenta regresiva 3..2..1 cuando la sala privada se llena
  useEffect(() => {
    if (!showWaitingModal || gameState || !currentRoomId) return;

    const expectedPlayers = roomMode === '1v1' ? 2 : 4;
    if (playersInRoomData.length !== expectedPlayers) {
      setCountdown(null);
      hasRequestedStateRef.current = false;
      return;
    }

    if (hasRequestedStateRef.current) return;

    if (countdown === null) {
      setCountdown(3);
      playSfx('turnChange');
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => (c !== null ? c - 1 : null));
        playSfx('turnChange');
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      hasRequestedStateRef.current = true;
      try {
        const socket = socketService.getSocket();
        socket.emit('request_game_state', { roomId: currentRoomId });
      } catch {}
    }
  }, [showWaitingModal, gameState, currentRoomId, roomMode, playersInRoomData.length, countdown, playSfx]);

  // 1. Jugar vs Bot
  const handlePlayVsBot = async () => {
    try {
      setLoading(true);
      setLoadingAction('bot');
      const socket = await socketService.connect();
      socket.emit('create_bot_room', { playerName, difficulty });
    } catch (err) {
      setLoading(false);
      setLoadingAction(null);
      Alert.alert('Error', 'No se pudo iniciar la partida con Bot.');
    }
  };

  // 2. Buscar Partida (Matchmaking 1v1)
  const handleJoinMatchmaking = async () => {
    try {
      setLoading(true);
      setLoadingAction('matchmaking');
      const socket = await socketService.connect();
      socket.emit('join_matchmaking', {
        playerName,
        elo: profile?.elo || 1000,
        mode: '1v1',
      });
      setIsMatchmaking(true);
      setLoading(false);
      setLoadingAction(null);
    } catch (err) {
      setLoading(false);
      setLoadingAction(null);
      Alert.alert('Error', 'No se pudo buscar partida multijugador.');
    }
  };

  const handleCancelMatchmaking = async () => {
    try {
      const socket = socketService.getSocket();
      socket.emit('leave_matchmaking');
    } catch {}
    setIsMatchmaking(false);
  };

  // 3. Confirmar Creación de Sala Privada
  const handleCreateRoomConfirm = async (mode: '1v1' | '2v2', betAmount: number) => {
    try {
      setShowCreateModal(false);
      setLoading(true);
      setLoadingAction('create');
      const socket = await socketService.connect();
      socket.emit('create_room', { playerName, mode, betAmount });
    } catch (err) {
      setLoading(false);
      setLoadingAction(null);
      Alert.alert('Error', 'No se pudo crear la sala.');
    }
  };

  // 4. Cancelar Sala Privada
  const handleCancelRoom = async () => {
    try {
      if (currentRoomId) {
        const socket = socketService.getSocket();
        socket.emit('cancel_room', { roomId: currentRoomId });
      }
    } catch {}
    setShowWaitingModal(false);
    setCurrentRoomId(null);
    setCountdown(null);
  };

  // 5. Unirse por Código
  const handleJoinRoom = async () => {
    if (!roomIdInput.trim()) {
      Alert.alert('Código requerido', 'Ingresa un código de sala válido.');
      return;
    }
    try {
      setLoading(true);
      setLoadingAction('join');
      const socket = await socketService.connect();
      socket.emit('join_room', { roomId: roomIdInput.trim().toUpperCase(), playerName });
    } catch (err) {
      setLoading(false);
      setLoadingAction(null);
      Alert.alert('Error', 'No se pudo unir a la sala especificada.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 px-4 pt-12">
      {/* Header / Banner de Bienvenida */}
      <View className="bg-slate-900/90 rounded-3xl p-5 mb-5 border border-slate-800 flex-row justify-between items-center">
        <View className="flex-1 mr-3">
          <Text className="text-amber-400 font-bold text-2xl">KASINO 21</Text>
          <Text className="text-slate-200 font-bold text-base mt-0.5" numberOfLines={1}>
            ¡Hola, {playerName}!
          </Text>
          <View className="flex-row items-center mt-1">
            <Coins color="#fbbf24" size={14} />
            <Text className="text-amber-400 font-mono font-bold text-xs ml-1 mr-3">
              {(profile?.coins || 0).toLocaleString()} 🪙
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Botón de Configuraciones (Audio y Pistas) */}
          <Pressable
            onPress={() => {
              playSfx('cardPlay');
              openSettingsModal();
            }}
            accessibilityLabel="Abrir configuraciones de audio"
            className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700 items-center justify-center relative active:bg-slate-800"
          >
            <Settings
              color={
                isLobbyPlaying && musicEnabled && !musicMuted
                  ? musicStyle === 'classic'
                    ? '#fbbf24'
                    : '#22d3ee'
                  : '#94a3b8'
              }
              size={20}
            />
            {isLobbyPlaying && musicEnabled && !musicMuted ? (
              <View
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                  musicStyle === 'classic' ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
              />
            ) : null}
          </Pressable>

          {/* Botón de Campana de Notificaciones */}
          <Pressable
            onPress={() => {
              playSfx('cardPlay');
              setShowNotificationsModal(true);
            }}
            className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700 items-center justify-center relative active:bg-slate-800"
          >
            <Bell color={totalBadgeCount > 0 ? '#fbbf24' : '#94a3b8'} size={20} />
            {totalBadgeCount > 0 ? (
              <View className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full min-w-[20px] h-5 px-1 items-center justify-center border-2 border-slate-950">
                <Text className="text-white text-[10px] font-black">{totalBadgeCount}</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Insignia de ELO */}
          <View className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/30 items-center justify-center">
            <Trophy color="#fbbf24" size={22} />
            <Text className="text-amber-400 font-bold text-[11px] mt-0.5">{profile?.elo || 1000} ELO</Text>
          </View>
        </View>
      </View>

      {/* BANNER DINÁMICO DE TORNEO / PARTIDO LISTO */}
      <TournamentLobbyBannerView />

      {/* MULTIJUGADOR RANKED 1v1 */}
      <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800">
        <View className="flex-row items-center mb-3">
          <View className="bg-amber-500/10 p-2.5 rounded-xl mr-3 border border-amber-500/30">
            <Swords color="#fbbf24" size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Buscar Partida 1v1 (Ranked)</Text>
            <Text className="text-slate-400 text-xs">Matchmaking automático por nivel ELO</Text>
          </View>
        </View>

        {isMatchmaking ? (
          <View className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 items-center">
            <ActivityIndicator size="small" color="#fbbf24" className="mb-2" />
            <Text className="text-white font-bold text-sm mb-1">Buscando oponente competitivo...</Text>
            <Text className="text-amber-400 font-mono text-xs mb-3">{matchmakingSeconds}s transcurridos</Text>
            <Pressable
              onPress={handleCancelMatchmaking}
              className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex-row items-center"
            >
              <XCircle color="#ef4444" size={16} className="mr-1.5" />
              <Text className="text-red-400 font-bold text-xs uppercase">Cancelar Búsqueda</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={loading}
            onPress={handleJoinMatchmaking}
            className="bg-amber-500 active:bg-amber-600 p-3.5 rounded-2xl items-center flex-row justify-center"
          >
            {loading && loadingAction === 'matchmaking' ? (
              <ActivityIndicator size="small" color="#020617" />
            ) : (
              <>
                <Swords color="#020617" size={20} className="mr-2" />
                <Text className="text-slate-950 font-bold text-base">BUSCAR JUGADOR (1v1)</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* JUGAR VS BOTS (IA) */}
      <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800">
        <View className="flex-row items-center mb-3">
          <View className="bg-cyan-500/10 p-2.5 rounded-xl mr-3 border border-cyan-500/30">
            <Bot color="#06b6d4" size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Práctica vs Bot (IA)</Text>
            <Text className="text-slate-400 text-xs">Entrena solo y perfecciona tu estrategia</Text>
          </View>
        </View>

        {/* Selección de Dificultad */}
        <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Dificultad de la IA</Text>
        <View className="flex-row mb-4">
          {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => (
            <Pressable
              key={diff}
              onPress={() => setDifficulty(diff)}
              className={`flex-1 py-2 rounded-xl mr-1.5 items-center border ${
                difficulty === diff ? 'bg-cyan-500 border-cyan-400' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Text
                className={`font-bold capitalize text-[11px] ${
                  difficulty === diff ? 'text-slate-950' : 'text-slate-400'
                }`}
              >
                {diff === 'easy'
                  ? 'Fácil'
                  : diff === 'medium'
                  ? 'Normal'
                  : diff === 'hard'
                  ? 'Difícil'
                  : 'Experto ⚜️'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={loading}
          onPress={handlePlayVsBot}
          className="bg-cyan-500 active:bg-cyan-600 p-3.5 rounded-2xl items-center flex-row justify-center"
        >
          {loading && loadingAction === 'bot' ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <>
              <Bot color="#020617" size={20} className="mr-2" />
              <Text className="text-slate-950 font-bold text-base">JUGAR CONTRA BOT</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* SALAS PRIVADAS */}
      <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800">
        <View className="flex-row items-center mb-4">
          <View className="bg-purple-500/10 p-2.5 rounded-xl mr-3 border border-purple-500/30">
            <Users color="#c084fc" size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Salas Privadas</Text>
            <Text className="text-slate-400 text-xs">Crea una sala o únete con un código</Text>
          </View>
        </View>

        {/* Abrir Modal de Crear Sala */}
        <Pressable
          disabled={loading}
          onPress={() => setShowCreateModal(true)}
          className="bg-purple-600 active:bg-purple-700 p-3.5 rounded-2xl items-center flex-row justify-center mb-4"
        >
          <PlusCircle color="#ffffff" size={18} className="mr-2" />
          <Text className="text-white font-bold text-sm uppercase">Configurar y Crear Sala</Text>
        </Pressable>

        {/* Unirse con Código */}
        <View className="flex-row items-center">
          <TextInput
            value={roomIdInput}
            onChangeText={setRoomIdInput}
            placeholder="Código de Sala (Ej: ABC12)"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 mr-2 text-sm"
          />
          <Pressable
            disabled={loading}
            onPress={handleJoinRoom}
            className="bg-slate-800 active:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-xl flex-row items-center"
          >
            {loading && loadingAction === 'join' ? (
              <ActivityIndicator size="small" color="#fbbf24" />
            ) : (
              <>
                <LogIn color="#fbbf24" size={18} className="mr-1" />
                <Text className="text-amber-400 font-bold text-sm">Unirse</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* MISIONES DIARIAS REALES */}
      <DailyQuestsView />

      {/* LOGROS RECIENTES REALES */}
      <RecentAchievementsView />

      {/* RANKING TOP 5 GLOBAL REAL */}
      <TopRankingsView />

      {/* Modal 1: Configuración de Sala Privada */}
      <CreateRoomModal
        visible={showCreateModal}
        userCoins={profile?.coins || 0}
        onClose={() => setShowCreateModal(false)}
        onCreateRoom={handleCreateRoomConfirm}
      />

      {/* Modal 2: Sala de Espera Nativa con Código y Jugadores */}
      <WaitingRoomModal
        visible={showWaitingModal}
        roomId={currentRoomId}
        mode={roomMode}
        betAmount={roomBetAmount}
        playersData={playersInRoomData}
        onCancelRoom={handleCancelRoom}
        onSwitchTeam={(team) => {
          try {
            const socket = socketService.getSocket();
            socket.emit('switch_team', { roomId: currentRoomId, team });
          } catch {}
        }}
      />
    </ScrollView>
  );
}
