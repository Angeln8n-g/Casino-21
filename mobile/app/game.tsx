import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { socketService } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { CardView } from '../components/CardView';
import { DraggableCard } from '../components/DraggableCard';
import { GameState } from 'domain/game-state';
import { Card } from 'domain/card';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';

export default function GameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { playSfx } = useAudio();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    let socket: any;

    const initSocket = async () => {
      try {
        socket = await socketService.connect();
        
        socket.on('game_state_update', (state: GameState) => {
          setGameState(state);
        });

        socket.on('timer_update', ({ remaining }: { remaining: number }) => {
          setTimeRemaining(Math.ceil(remaining / 1000));
        });
      } catch (err) {
        console.error("Error conectando socket en GameScreen:", err);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.off('game_state_update');
        socket.off('timer_update');
      }
    };
  }, []);

  const handleSelectCard = (index: number) => {
    setSelectedCardIndex(index === selectedCardIndex ? null : index);
    playSfx('cardPlay');
  };

  const handlePlaceCardOnFormation = (formationIndex: number, specifiedCardIndex?: number) => {
    const cardIdx = specifiedCardIndex ?? selectedCardIndex;
    if (cardIdx === null || cardIdx === undefined || !gameState) return;

    try {
      const socket = socketService.getSocket();
      socket.emit('play_card', {
        cardIndex: cardIdx,
        targetFormationIndex: formationIndex,
      });
      setSelectedCardIndex(null);
      playSfx('cardDeal');
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la jugada al servidor.');
    }
  };

  const localPlayer = gameState?.players.find(p => p.id === user?.id) || gameState?.players[0];
  const opponent = gameState?.players.find(p => p.id !== user?.id) || gameState?.players[1];

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-12">
      {/* Navbar Superior */}
      <View className="flex-row items-center justify-between mb-4">
        <Pressable onPress={() => router.back()} className="p-2 rounded-xl bg-slate-900 border border-slate-800">
          <ArrowLeft color="#ffffff" size={20} />
        </Pressable>
        <View className="items-center">
          <Text className="text-amber-400 font-bold text-lg">PARTIDA K21</Text>
          <Text className="text-slate-400 text-xs">Fase: {gameState?.phase || 'Esperando'}</Text>
        </View>
        <View className="bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/40">
          <Text className="text-amber-400 font-bold text-sm">⏳ {timeRemaining}s</Text>
        </View>
      </View>

      {/* Info del Oponente */}
      <View className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex-row justify-between items-center mb-4">
        <Text className="text-slate-300 font-bold">{opponent?.name || 'Oponente'}</Text>
        <Text className="text-amber-400 font-bold">Puntos: {opponent?.score || 0}</Text>
      </View>

      {/* Tablero (4 Formaciones Verticales) */}
      <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Formaciones del Tablero (Arrastra o toca)</Text>
      <View className="flex-row justify-between mb-6">
        {[0, 1, 2, 3].map(colIndex => {
          const formation = gameState?.board.formations[colIndex];
          const sum = formation?.cards.reduce((acc, c) => acc + (typeof c.rank === 'number' ? c.rank : 10), 0) || 0;

          return (
            <Pressable
              key={colIndex}
              onPress={() => handlePlaceCardOnFormation(colIndex)}
              className={`w-[23%] h-44 rounded-2xl bg-slate-900 p-2 items-center justify-between border-2 ${
                selectedCardIndex !== null ? 'border-amber-500/80 bg-amber-500/5' : 'border-slate-800'
              }`}
            >
              <Text className="text-amber-400 font-bold text-xs">Col {colIndex + 1}</Text>
              <View className="items-center">
                {formation?.cards.map((c, i) => (
                  <View key={i} className={i > 0 ? '-mt-10' : ''}>
                    <CardView card={c} />
                  </View>
                ))}
              </View>
              <Text className="text-slate-400 text-xs font-bold">Suma: {sum}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Info del Jugador Local */}
      <View className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex-row justify-between items-center mb-3">
        <Text className="text-amber-400 font-bold">{localPlayer?.name || 'Tú'}</Text>
        <Text className="text-amber-400 font-bold">Puntos: {localPlayer?.score || 0}</Text>
      </View>

      {/* Mano de Cartas del Jugador Local con Drag & Drop */}
      <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Tu Mano (Arrastra hacia arriba o toca)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
        {localPlayer?.hand.map((card: Card, index: number) => (
          <View key={index} className="mr-3">
            <DraggableCard
              card={card}
              selected={selectedCardIndex === index}
              onPress={() => handleSelectCard(index)}
              onDropOnFormation={(formationIdx) => handlePlaceCardOnFormation(formationIdx, index)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
