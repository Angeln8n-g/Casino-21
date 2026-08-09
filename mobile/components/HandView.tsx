import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Player } from 'domain/player';
import { Card } from 'domain/card';
import { DraggableCard } from './DraggableCard';

interface HandViewProps {
  localPlayer: Player | undefined;
  isCurrentTurn: boolean;
  selectedCardIndex: number | null;
  onSelectCard: (index: number) => void;
  onDropOnFormation: (formationIndex: number, cardIndex: number) => void;
}

export function HandView({
  localPlayer,
  isCurrentTurn,
  selectedCardIndex,
  onSelectCard,
  onDropOnFormation,
}: HandViewProps) {
  const virados = localPlayer?.virados || 0;
  const hand = localPlayer?.hand || [];

  return (
    <View className={`bg-slate-900/90 rounded-3xl p-3.5 border ${isCurrentTurn ? 'border-amber-400/60 shadow-2xl' : 'border-slate-800'}`}>
      {/* Banner Superior de Tu Zona */}
      <View className="flex-row justify-between items-center mb-3 px-1">
        <View className="flex-row items-center">
          <Text className="text-white font-bold text-base mr-2">{localPlayer?.name || 'Tú'}</Text>
          <View className={`px-2 py-0.5 rounded-full border ${isCurrentTurn ? 'bg-cyan-500/20 border-cyan-400' : 'bg-slate-800 border-slate-700'}`}>
            <Text className={`font-bold text-[10px] ${isCurrentTurn ? 'text-cyan-300' : 'text-slate-500'}`}>
              {isCurrentTurn ? 'Tu Turno' : 'Espera'}
            </Text>
          </View>
        </View>

        <View className="bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
          <Text className="text-amber-400 font-bold text-xs">Virados: {virados}</Text>
        </View>
      </View>

      {/* Cartas de la Mano del Jugador */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
        {hand.length === 0 ? (
          <Text className="text-slate-500 text-xs italic py-4">No tienes cartas en tu mano</Text>
        ) : (
          hand.map((card: Card, index: number) => (
            <View key={index} className="mr-3">
              <DraggableCard
                card={card}
                selected={selectedCardIndex === index}
                onPress={() => onSelectCard(index)}
                onDropOnFormation={(formationIdx) => onDropOnFormation(formationIdx, index)}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
