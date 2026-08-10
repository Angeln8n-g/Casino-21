import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';
import { CreateRoomModal } from '../../components/CreateRoomModal';
import { WaitingRoomModal } from '../../components/WaitingRoomModal';
import { Bot, Swords, Users, PlusCircle, LogIn, Trophy } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('expert');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Modales de Salas Privadas
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomMode, setRoomMode] = useState<'1v1' | '2v2'>('1v1');
  const [roomBetAmount, setRoomBetAmount] = useState<number>(0);
  const [playersInRoomData, setPlayersInRoomData] = useState<Array<{ name: string; id?: string; avatar?: string | null; team?: 1 | 2 }>>([]);

  const playerName = profile?.username || 'Jugador K21';

  // Suscripción a eventos de socket para navegación y estado de salas
  useEffect(() => {
    let socket: any;

    const setupSocket = async () => {
      try {
        socket = await socketService.connect();

        // 1. Al crear la sala
        socket.on('room_created', ({ roomId, mode, betAmount }: any) => {
          setLoading(false);
          setLoadingAction(null);
          setCurrentRoomId(roomId);
          if (mode) setRoomMode(mode);
          if (betAmount !== undefined) setRoomBetAmount(betAmount);
          setPlayersInRoomData([{ name: playerName, avatar: profile?.avatar_url }]);
          setShowWaitingModal(true);
        });

        // 2. Al unirse a la sala
        socket.on('room_joined', ({ roomId, mode, betAmount }: any) => {
          setLoading(false);
          setLoadingAction(null);
          setCurrentRoomId(roomId);
          if (mode) setRoomMode(mode);
          if (betAmount !== undefined) setRoomBetAmount(betAmount);
          setShowWaitingModal(true);
        });

        // 3. Cuando se une otro jugador
        socket.on('player_joined', ({ playersData }: any) => {
          if (playersData && Array.isArray(playersData)) {
            setPlayersInRoomData(playersData);
          }
        });

        // 4. Cuando la partida inicia
        socket.on('game_state_update', () => {
          setShowWaitingModal(false);
          setShowCreateModal(false);
          router.push('/game');
        });

        socket.on('room_closed', () => {
          setShowWaitingModal(false);
          setCurrentRoomId(null);
          setPlayersInRoomData([]);
          Alert.alert('Sala cerrada', 'La sala ha sido cerrada.');
        });

        socket.on('error', (msg: string) => {
          setLoading(false);
          setLoadingAction(null);
          Alert.alert('Error', msg || 'Ocurrió un error en la sala');
        });
      } catch (err) {
        console.error('Error conectando socket en lobby:', err);
      }
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.off('room_created');
        socket.off('room_joined');
        socket.off('player_joined');
        socket.off('game_state_update');
        socket.off('room_closed');
        socket.off('error');
      }
    };
  }, [playerName, profile?.avatar_url]);

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
    } catch (err) {
      setLoading(false);
      setLoadingAction(null);
      Alert.alert('Error', 'No se pudo buscar partida multijugador.');
    }
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

  // 4. Cancelar y Salir de Sala
  const handleCancelRoom = async () => {
    try {
      if (currentRoomId) {
        const socket = socketService.getSocket();
        socket.emit('cancel_room', { roomId: currentRoomId });
      }
    } catch (e) {}
    setShowWaitingModal(false);
    setCurrentRoomId(null);
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
      <View className="bg-slate-900/90 rounded-3xl p-6 mb-6 border border-slate-800 flex-row justify-between items-center">
        <View>
          <Text className="text-amber-400 font-bold text-3xl">KASINO 21</Text>
          <Text className="text-slate-300 font-bold text-base mt-1">¡Hola, {playerName}!</Text>
          <Text className="text-slate-500 text-xs mt-0.5">Elige un modo y comienza a jugar</Text>
        </View>
        <View className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/30 items-center justify-center">
          <Trophy color="#fbbf24" size={28} />
          <Text className="text-amber-400 font-bold text-xs mt-1">{profile?.elo || 1000} ELO</Text>
        </View>
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
                difficulty === diff
                  ? 'bg-cyan-500 border-cyan-400'
                  : 'bg-slate-800 border-slate-700'
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
      </View>

      {/* SALAS PRIVADAS */}
      <View className="bg-slate-900/80 rounded-3xl p-5 mb-10 border border-slate-800">
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
          } catch (e) {}
        }}
      />
    </ScrollView>
  );
}
