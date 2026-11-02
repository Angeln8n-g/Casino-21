import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Player } from 'domain/player';
import { Card } from 'domain/card';
import { DraggableCard } from './DraggableCard';
import { CardTheme, ThemeFontKey } from '../themes/themeRegistry';

interface HandViewProps {
  localPlayer: Player | undefined;
  isCurrentTurn: boolean;
  selectedCardId: string | null;
  theme?: CardTheme;
  fontKey?: ThemeFontKey;
  onSelectCard: (cardId: string) => void;
  onDropOnFormation: (formationIndex: number, cardId: string) => void;
}

export function HandView({
  localPlayer,
  isCurrentTurn,
  selectedCardId,
  theme,
  fontKey,
  onSelectCard,
  onDropOnFormation,
}: HandViewProps) {
  const virados = localPlayer?.virados || 0;
  const hand = localPlayer?.hand || [];

  return (
    <View
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderRadius: 24,
        padding: 12,
        borderWidth: 1.5,
        borderColor: isCurrentTurn ? 'rgba(251, 191, 36, 0.6)' : '#1e293b',
        zIndex: 9999,
        elevation: 9999,
        overflow: 'visible',
      }}
    >
      {/* Banner Superior de Tu Zona */}
      <View className="flex-row justify-between items-center mb-2 px-1">
        <View className="flex-row items-center">
          <Text className="text-white font-bold text-sm mr-2">{localPlayer?.name || 'Tú'}</Text>
          <View
            className={`px-2 py-0.5 rounded-full border ${
              isCurrentTurn ? 'bg-cyan-500/20 border-cyan-400' : 'bg-slate-800 border-slate-700'
            }`}
          >
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ overflow: 'visible' }}
        contentContainerStyle={{ overflow: 'visible', paddingVertical: 4 }}
      >
        {hand.length === 0 ? (
          <Text className="text-slate-500 text-xs italic py-4">No tienes cartas en tu mano</Text>
        ) : (
          hand.map((card: Card) => (
            <View key={card.id} style={{ marginRight: 10, overflow: 'visible', zIndex: 9999, elevation: 9999 }}>
              <DraggableCard
                card={card}
                selected={selectedCardId === card.id}
                theme={theme}
                fontKey={fontKey}
                onPress={() => onSelectCard(card.id)}
                onDropOnFormation={(formationIdx) => onDropOnFormation(formationIdx, card.id)}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
