import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    <View
      style={{
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(168, 85, 247, 0.45)',
        marginVertical: 4,
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
      }}
    >
      <LinearGradient
        colors={['#2a103e', '#190a26', '#0f0517']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          flex: 1,
          padding: 10,
          justifyContent: 'space-between',
        }}
      >
        {/* 1. SECCIÓN SUPERIOR: CARTAS EN MESA */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View className="flex-row items-center justify-between mb-1.5 px-1">
            <Text className="text-amber-300 font-bold text-xs uppercase tracking-widest">
              CARTAS EN MESA ({looseCards.length})
            </Text>
            <Text className="text-slate-400 text-[10px]">Toca para seleccionar</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 4,
            }}
          >
            {looseCards.length === 0 ? (
              <View className="py-4 px-6 border border-dashed border-purple-500/30 rounded-2xl items-center justify-center">
                <Text className="text-slate-400 text-xs italic">No hay cartas sueltas en la mesa</Text>
              </View>
            ) : (
              looseCards.map((card: Card) => {
                const isSelected = selectedBoardCardIds.has(card.id);
                return (
                  <View key={card.id} style={{ marginHorizontal: 5 }}>
                    <CardView
                      card={card}
                      selected={isSelected}
                      theme={theme}
                      variant="dark"
                      onPress={() => onToggleBoardCard(card.id)}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* 2. SECCIÓN INFERIOR: FORMACIONES ACTIVAS */}
        <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(168, 85, 247, 0.25)' }}>
          <Text className="text-amber-300 font-bold text-xs uppercase tracking-widest mb-1.5 px-1">
            FORMACIONES ({formations.length})
          </Text>

          {formations.length === 0 ? (
            <View className="py-2.5 px-4 border border-dashed border-purple-500/20 rounded-xl items-center justify-center">
              <Text className="text-slate-400 text-[11px] italic">Sin formaciones activas</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
              {formations.map((formation, index) => {
                const isSelected = selectedFormationIds.has(formation.id);
                const val = formation.value;

                return (
                  <Pressable
                    key={formation.id || index}
                    onPress={() => onToggleFormation(formation.id)}
                    className={`mr-3 p-2.5 rounded-2xl bg-slate-950/90 border-2 items-center justify-between min-w-[96px] ${
                      isSelected ? 'border-amber-400 shadow-md shadow-amber-400/30' : 'border-purple-500/40'
                    }`}
                  >
                    <View className="flex-row items-center justify-between w-full mb-1">
                      <Text className="text-amber-400 font-bold text-xs">#{index + 1}</Text>
                      {formation.isGroup && <Lock color="#fbbf24" size={12} />}
                    </View>

                    <View className="my-1 items-center">
                      {formation.cards.map((c: Card, i: number) => (
                        <View key={i} className={i > 0 ? '-mt-12' : ''}>
                          <CardView card={c} theme={theme} variant="dark" size="sm" />
                        </View>
                      ))}
                    </View>

                    <Text className="text-slate-200 text-[11px] font-bold mt-1">
                      Valor: <Text className="text-amber-400 font-black">{val}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}
