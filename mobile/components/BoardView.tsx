import React, { useRef, useEffect, useCallback, memo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Board } from 'domain/board';
import { Card } from 'domain/card';
import { CardView } from './CardView';
import { CardTheme, BoardTheme, ThemeFontKey } from '../themes/themeRegistry';
import { extractGradientColors } from './card/TacticalCard3D';

export interface DropTargetRect {
  id: string;
  type: 'boardCard' | 'formation' | 'board';
  targetId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoardViewProps {
  board: Board | undefined;
  selectedBoardCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  hoveredTargetId?: string | null;
  theme?: CardTheme;
  fontKey?: ThemeFontKey;
  boardTheme?: BoardTheme | null;
  onToggleBoardCard: (cardId: string) => void;
  onToggleFormation: (formationId: string) => void;
  onRegisterMeasureFn?: (measureFn: () => void) => void;
  onTargetsMeasured?: (targets: DropTargetRect[]) => void;
}

export const BoardView = memo(function BoardView({
  board,
  selectedBoardCardIds,
  selectedFormationIds,
  hoveredTargetId = null,
  theme,
  fontKey,
  boardTheme,
  onToggleBoardCard,
  onToggleFormation,
  onRegisterMeasureFn,
  onTargetsMeasured,
}: BoardViewProps) {
  const looseCards = board?.cards || [];
  const formations = board?.formations || [];
  const cantedCards = board?.cantedCards || [];
  const isEmpty =
    looseCards.length === 0 && formations.length === 0 && cantedCards.length === 0;

  const boardRef = useRef<View | null>(null);
  const cardRefs = useRef<Map<string, View | null>>(new Map());
  const formationRefs = useRef<Map<string, View | null>>(new Map());

  const measureAllTargets = useCallback(() => {
    if (!onTargetsMeasured) return;
    const measured: DropTargetRect[] = [];
    let pending = 1 + cardRefs.current.size + formationRefs.current.size;

    const checkDone = () => {
      pending -= 1;
      if (pending <= 0) {
        onTargetsMeasured(measured);
      }
    };

    if (boardRef.current) {
      boardRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          measured.push({
            id: 'board-area',
            type: 'board',
            x,
            y,
            width,
            height,
          });
        }
        checkDone();
      });
    } else {
      checkDone();
    }

    cardRefs.current.forEach((node, cardId) => {
      if (node) {
        node.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            measured.push({
              id: `board-card-${cardId}`,
              type: 'boardCard',
              targetId: cardId,
              x,
              y,
              width,
              height,
            });
          }
          checkDone();
        });
      } else {
        checkDone();
      }
    });

    formationRefs.current.forEach((node, formId) => {
      if (node) {
        node.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            measured.push({
              id: `formation-${formId}`,
              type: 'formation',
              targetId: formId,
              x,
              y,
              width,
              height,
            });
          }
          checkDone();
        });
      } else {
        checkDone();
      }
    });
  }, [onTargetsMeasured]);

  useEffect(() => {
    onRegisterMeasureFn?.(measureAllTargets);
  }, [measureAllTargets, onRegisterMeasureFn]);

  useEffect(() => {
    const timer = setTimeout(measureAllTargets, 120);
    return () => clearTimeout(timer);
  }, [looseCards.length, formations.length, cantedCards.length, measureAllTargets]);

  const defaultMatColors: [string, string, ...string[]] = ['#0e4429', '#072e1a', '#041d10'];
  const matColors = boardTheme?.background
    ? extractGradientColors(boardTheme.background, defaultMatColors)
    : defaultMatColors;

  const isBoardHovered = hoveredTargetId === 'board-area';

  return (
    <View
      ref={boardRef}
      onLayout={measureAllTargets}
      style={{
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: isBoardHovered ? 2.5 : 2,
        borderColor: isBoardHovered
          ? 'rgba(74, 222, 128, 0.7)'
          : boardTheme?.borderColor || '#78350f',
        marginVertical: 4,
        shadowColor: boardTheme?.glowColor || '#0e4429',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 1,
      }}
    >
      <LinearGradient
        colors={matColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          flex: 1,
          padding: 10,
        }}
      >
        {/* Riel interior sutil igual que en Web */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: boardTheme?.innerRingColor || 'rgba(234, 179, 8, 0.45)',
          }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={measureAllTargets}
          onMomentumScrollEnd={measureAllTargets}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 4,
          }}
        >
          {isEmpty && (
            <View className="py-10 items-center justify-center">
              <Text className="text-sky-200/45 text-base font-bold tracking-widest uppercase">
                Mesa Vacía
              </Text>
            </View>
          )}

          {/* 1. Cartas Sueltas — Zona Central */}
          {looseCards.length > 0 && (
            <View className="w-full items-center px-2.5 py-2.5 rounded-xl bg-black/25 border border-white/10">
              <Text className="text-[10px] font-bold mb-2 text-amber-200/85 tracking-wider uppercase text-center">
                Cartas en Mesa
              </Text>
              <View className="flex-row flex-wrap gap-2.5 justify-center items-center min-h-[56px]">
                {looseCards.map((card: Card) => {
                  const isSelected = selectedBoardCardIds.has(card.id);
                  const isHovered = hoveredTargetId === `board-card-${card.id}`;
                  return (
                    <View
                      key={card.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(card.id, el);
                        else cardRefs.current.delete(card.id);
                      }}
                    >
                      <CardView
                        card={card}
                        selected={isSelected}
                        isHovered={isHovered}
                        theme={theme}
                        fontKey={fontKey || theme?.fontKey}
                        variant="auto"
                        onPress={() => onToggleBoardCard(card.id)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* 2. Formaciones — Zona Separada Visualmente (idéntico a DroppableFormation.tsx) */}
          {formations.length > 0 && (
            <View className="w-full items-center px-2.5 py-2.5 rounded-xl bg-black/25 border border-white/10">
              <Text className="text-[10px] font-bold mb-2 text-amber-200/85 tracking-wider uppercase text-center">
                Formaciones
              </Text>
              <View className="flex-row flex-wrap justify-center items-center gap-3 w-full">
                {formations.map((formation) => {
                  const isSelected = selectedFormationIds.has(formation.id);
                  const isHovered = hoveredTargetId === `formation-${formation.id}`;

                  return (
                    <Pressable
                      key={formation.id}
                      ref={(el) => {
                        if (el) formationRefs.current.set(formation.id, el as unknown as View);
                        else formationRefs.current.delete(formation.id);
                      }}
                      onPress={() => onToggleFormation(formation.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 16,
                        borderWidth: isHovered ? 2.5 : 2,
                        borderColor: isHovered
                          ? '#4ade80'
                          : isSelected
                          ? '#facc15'
                          : 'rgba(234, 179, 8, 0.35)',
                        backgroundColor: isSelected
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'rgba(0, 0, 0, 0.35)',
                        transform: [{ scale: isHovered ? 1.05 : isSelected ? 1.03 : 1 }],
                      }}
                    >
                      {formation.isGroup && (
                        <View
                          style={{
                            position: 'absolute',
                            top: -9,
                            right: -8,
                            backgroundColor: '#ea580c',
                            paddingHorizontal: 6,
                            paddingVertical: 1.5,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: '#fdba74',
                            zIndex: 20,
                          }}
                        >
                          <Text className="text-white text-[8px] font-black uppercase">
                            GRUPO
                          </Text>
                        </View>
                      )}

                      <Text className="text-xs font-bold text-amber-300 mb-1.5 text-center">
                        Valor: {formation.value}
                      </Text>

                      <View className="flex-row items-center justify-center px-1">
                        {formation.cards.map((c: Card, i: number) => (
                          <View
                            key={c.id || i}
                            style={{
                              zIndex: i + 1,
                              marginLeft: i > 0 ? -16 : 0,
                            }}
                          >
                            <CardView
                              card={c}
                              theme={theme}
                              fontKey={fontKey || theme?.fontKey}
                              variant="auto"
                              size="sm"
                            />
                          </View>
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 3. Cartas Cantadas — Zona Separada */}
          {cantedCards.length > 0 && (
            <View className="w-full items-center px-2.5 py-2.5 rounded-xl bg-black/25 border border-white/10">
              <Text className="text-[10px] font-bold mb-2 text-amber-200/85 tracking-wider uppercase text-center">
                Cartas Cantadas
              </Text>
              <View className="flex-row flex-wrap justify-center items-center gap-3 w-full pt-1">
                {cantedCards.map((canted) => {
                  const isSelected = selectedBoardCardIds.has(canted.card.id);
                  const isHovered = hoveredTargetId === `board-card-${canted.card.id}`;
                  return (
                    <View
                      key={canted.card.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(canted.card.id, el);
                        else cardRefs.current.delete(canted.card.id);
                      }}
                      style={{ position: 'relative' }}
                    >
                      <View
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: '#fbbf24',
                          paddingHorizontal: 6,
                          paddingVertical: 1.5,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: '#fde68a',
                          zIndex: 20,
                        }}
                      >
                        <Text className="text-amber-950 text-[8px] font-black">CANTADA</Text>
                      </View>
                      <CardView
                        card={canted.card}
                        selected={isSelected}
                        isHovered={isHovered}
                        theme={theme}
                        fontKey={fontKey || theme?.fontKey}
                        variant="auto"
                        onPress={() => onToggleBoardCard(canted.card.id)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
});
