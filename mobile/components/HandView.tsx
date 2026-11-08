import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';
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
  headerAction?: React.ReactNode;
  onSelectCard: (cardId: string) => void;
  onDragStart?: (card: Card) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragRelease?: (
    card: Card,
    absoluteX: number,
    absoluteY: number,
    translationX: number,
    translationY: number
  ) => void;
  onDropOnBoard?: (card: Card) => void;
  onDropOnFormation?: (formationIndex: number, cardId: string) => void;
}

export const HandView = memo(function HandView({
  localPlayer,
  isCurrentTurn,
  selectedCardId,
  theme,
  fontKey,
  headerAction,
  onSelectCard,
  onDragStart,
  onDragMove,
  onDragRelease,
  onDropOnBoard,
  onDropOnFormation,
}: HandViewProps) {
  const virados = localPlayer?.virados || 0;
  const hand = localPlayer?.hand || [];
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!isCurrentTurn) {
      setDraggingCardId(null);
    }
  }, [isCurrentTurn]);

  const handleCardDragStart = useCallback(
    (card: Card) => {
      setDraggingCardId(card.id);
      onDragStart?.(card);
    },
    [onDragStart]
  );

  const handleCardDragEnd = useCallback((card: Card) => {
    setDraggingCardId((prev) => (prev === card.id ? null : prev));
  }, []);

  return (
    <View
      style={{
        backgroundColor: isCurrentTurn ? 'rgba(8, 51, 68, 0.55)' : 'rgba(9, 13, 22, 0.85)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1.5,
        borderColor: isCurrentTurn ? 'rgba(34, 211, 238, 0.5)' : 'rgba(255, 255, 255, 0.1)',
        zIndex: 9999,
        elevation: 9999,
        overflow: 'visible',
      }}
    >
      {/* Header Bar de Tu Mano (idéntico a HandView.tsx de Web) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
          paddingHorizontal: 4,
          zIndex: draggingCardId ? 1 : 50,
          overflow: 'visible',
        }}
      >
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-xs font-semibold text-gray-200">
            Tu Mano <Text className="text-gray-400 font-normal">({hand.length})</Text>
          </Text>

          {isCurrentTurn && (
            <View className="bg-cyan-500/20 border border-cyan-400/35 px-2 py-0.5 rounded-full">
              <Text className="text-cyan-200 text-[10px] font-bold uppercase tracking-wider">
                Tu Turno
              </Text>
            </View>
          )}

          {virados > 0 && (
            <View className="bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] text-amber-200/90 font-medium">
                Virados: <Text className="font-bold text-amber-300">{virados}</Text>
              </Text>
            </View>
          )}
        </View>

        {headerAction && (
          <View style={{ zIndex: 99999, overflow: 'visible' }}>{headerAction}</View>
        )}
      </View>

      {/* Cartas de la Mano del Jugador */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
          minHeight: 102,
          zIndex: draggingCardId ? 200 : 10,
          elevation: draggingCardId ? 200 : 10,
          overflow: 'visible',
        }}
      >
        {hand.length === 0 ? (
          <Text className="text-gray-300 text-xs italic py-4">Esperando cartas...</Text>
        ) : (
          hand.map((card: Card) => {
            const isCardDragging = draggingCardId === card.id;
            const isCardSelected = selectedCardId === card.id;
            return (
              <View
                key={card.id}
                style={{
                  marginHorizontal: 5,
                  overflow: 'visible',
                  zIndex: isCardDragging ? 999999 : isCardSelected ? 99999 : 1,
                  elevation: isCardDragging ? 999999 : isCardSelected ? 99999 : 1,
                }}
              >
                <DraggableCard
                  card={card}
                  selected={isCardSelected}
                  disabled={!isCurrentTurn}
                  theme={theme}
                  fontKey={fontKey}
                  variant="auto"
                  onPress={() => isCurrentTurn && onSelectCard(card.id)}
                  onDragStart={handleCardDragStart}
                  onDragMove={onDragMove}
                  onDragEnd={handleCardDragEnd}
                  onDragRelease={onDragRelease}
                  onDropOnBoard={onDropOnBoard}
                  onDropOnFormation={
                    onDropOnFormation
                      ? (formationIdx) => onDropOnFormation(formationIdx, card.id)
                      : undefined
                  }
                />
              </View>
            );
          })
        )}
      </View>
    </View>
  );
});
