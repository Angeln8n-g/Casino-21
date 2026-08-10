import React from 'react';
import { View, Text, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { Board } from 'domain/board';
import { Card } from 'domain/card';
import { CardView } from './CardView';

interface BoardViewProps {
  board: Board | undefined;
  selectedBoardCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onToggleBoardCard: (cardId: string) => void;
  onToggleFormation: (formationId: string) => void;
}

export function BoardView({
  board,
  selectedBoardCardIds,
  selectedFormationIds,
  onToggleBoardCard,
  onToggleFormation,
}: BoardViewProps) {
  const looseCards = board?.cards || [];
  const formations = board?.formations || [];

  return (
    <View className="flex-1 bg-amber-950/20 rounded-3xl p-3.5 border-2 border-amber-500/30 justify-between my-2">
      {/* 1. SECCIÓN SUPERIOR: CARTAS SUELTAS SOBRE EL TAPETE */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest">
            CARTAS SUELTAS EN MESA ({looseCards.length})
          </Text>
          <Text className="text-amber-300 font-semibold text-[10px]">Toca una o varias cartas</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row min-h-[95px] py-1">
          {looseCards.length === 0 ? (
            <View className="flex-1 items-center justify-center py-4 px-6 border border-dashed border-slate-700/50 rounded-2xl">
              <Text className="text-slate-500 text-xs italic">No hay cartas sueltas en la mesa</Text>
            </View>
          ) : (
            looseCards.map((card: Card) => {
              const isSelected = selectedBoardCardIds.has(card.id);
              return (
                <View
                  key={card.id}
                  style={{
                    marginRight: 12,
                    padding: 2,
                    borderRadius: 16,
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: isSelected ? '#fbbf24' : 'transparent',
                    backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.25)' : 'transparent',
                  }}
                >
                  <CardView
                    card={card}
                    selected={isSelected}
                    onPress={() => onToggleBoardCard(card.id)}
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* 2. SECCIÓN INFERIOR: FORMACIONES ACTIVAS */}
      <View className="flex-1 border-t border-amber-500/20 pt-3">
        <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-2">
          FORMACIONES EN TABLERO ({formations.length})
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {formations.length === 0 ? (
            <View className="w-full items-center justify-center py-4 border border-dashed border-slate-700/50 rounded-2xl">
              <Text className="text-slate-500 text-xs italic">Sin formaciones activas aún</Text>
            </View>
          ) : (
            formations.map((formation, index) => {
              const isSelected = selectedFormationIds.has(formation.id);
              const sum = formation.cards.reduce((acc, c) => acc + (typeof c.rank === 'number' ? c.rank : 10), 0);

              return (
                <TouchableOpacity
                  key={formation.id || index}
                  activeOpacity={0.8}
                  onPress={() => onToggleFormation(formation.id)}
                  style={{
                    marginRight: 12,
                    padding: 10,
                    borderRadius: 20,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderWidth: 2,
                    borderColor: isSelected ? '#fbbf24' : '#1e293b',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minWidth: 105,
                  }}
                >
                  <Text className="text-amber-400 font-bold text-xs">Formación #{index + 1}</Text>
                  
                  <View className="my-2 items-center">
                    {formation.cards.map((c: Card, i: number) => (
                      <View key={i} className={i > 0 ? '-mt-9' : ''}>
                        <CardView card={c} />
                      </View>
                    ))}
                  </View>

                  <Text className="text-slate-300 text-[10px] font-bold">
                    Suma: <Text className="text-amber-400 font-bold">{sum}</Text>
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}
