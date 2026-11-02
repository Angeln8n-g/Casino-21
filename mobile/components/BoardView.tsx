import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Board } from 'domain/board';
import { Card } from 'domain/card';
import { CardView } from './CardView';
import { CardTheme } from '../themes/themeRegistry';
import { Lock } from 'lucide-react-native';

interface BoardViewProps {
  board: Board | undefined;
  selectedBoardCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  theme?: CardTheme;
  onToggleBoardCard: (cardId: string) => void;
  onToggleFormation: (formationId: string) => void;
}

export function BoardView({
  board,
  selectedBoardCardIds,
  selectedFormationIds,
  theme,
  onToggleBoardCard,
  onToggleFormation,
}: BoardViewProps) {
  const looseCards = board?.cards || [];
  const formations = board?.formations || [];

  return (
    <View className="flex-1 bg-amber-950/20 rounded-3xl p-3 border-2 border-amber-500/30 justify-between my-1">
      {/* 1. SECCIÓN SUPERIOR: CARTAS SUELTAS EN MESA */}
      <View className="mb-2">
        <View className="flex-row items-center justify-between mb-1.5 px-1">
          <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest">
            CARTAS EN MESA ({looseCards.length})
          </Text>
          <Text className="text-slate-400 text-[10px]">Toca para seleccionar</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row min-h-[96px] py-1">
          {looseCards.length === 0 ? (
            <View className="flex-1 items-center justify-center py-4 px-6 border border-dashed border-slate-700/60 rounded-2xl">
              <Text className="text-slate-500 text-xs italic">No hay cartas sueltas en la mesa</Text>
            </View>
          ) : (
            looseCards.map((card: Card) => {
              const isSelected = selectedBoardCardIds.has(card.id);
              return (
                <View key={card.id} className="mr-2.5">
                  <CardView
                    card={card}
                    selected={isSelected}
                    theme={theme}
                    onPress={() => onToggleBoardCard(card.id)}
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* 2. SECCIÓN INFERIOR: FORMACIONES ACTIVAS */}
      <View className="flex-1 border-t border-amber-500/20 pt-2">
        <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-1.5 px-1">
          FORMACIONES ({formations.length})
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {formations.length === 0 ? (
            <View className="w-full items-center justify-center py-4 border border-dashed border-slate-700/60 rounded-2xl">
              <Text className="text-slate-500 text-xs italic">Sin formaciones activas</Text>
            </View>
          ) : (
            formations.map((formation, index) => {
              const isSelected = selectedFormationIds.has(formation.id);
              const val = formation.value;

              return (
                <Pressable
                  key={formation.id || index}
                  onPress={() => onToggleFormation(formation.id)}
                  className={`mr-3 p-2.5 rounded-2xl bg-slate-900/90 border-2 items-center justify-between min-w-[100px] ${
                    isSelected ? 'border-amber-400' : 'border-slate-800'
                  }`}
                >
                  <View className="flex-row items-center justify-between w-full mb-1">
                    <Text className="text-amber-400 font-bold text-xs">#{index + 1}</Text>
                    {formation.isGroup && <Lock color="#fbbf24" size={12} />}
                  </View>

                  <View className="my-1 items-center">
                    {formation.cards.map((c: Card, i: number) => (
                      <View key={i} className={i > 0 ? '-mt-12' : ''}>
                        <CardView card={c} theme={theme} size="sm" />
                      </View>
                    ))}
                  </View>

                  <Text className="text-slate-300 text-[10px] font-bold mt-1">
                    Valor: <Text className="text-amber-400 font-bold text-xs">{val}</Text>
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}
