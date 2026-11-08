import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { GameState } from 'domain/game-state';
import { Card } from 'domain/card';
import { triggerHaptic } from '../utils/haptics';

export type ActionPayload =
  | { type: 'llevar'; boardCardIds: string[]; formationIds: string[] }
  | { type: 'formar'; boardCardIds: string[] }
  | { type: 'formarPar'; formationId?: string; boardCardIds?: string[] }
  | { type: 'aumentarFormacion'; formationId: string }
  | { type: 'cantar' }
  | { type: 'colocar' };

interface ActionPanelProps {
  gameState: GameState | null;
  handCard: Card | null;
  selectedHandCardId?: string | null;
  selectedBoardCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onPlayAction: (action: ActionPayload) => void;
  onClearSelection: () => void;
}

export const ActionPanel = memo(function ActionPanel({
  gameState,
  handCard,
  selectedHandCardId,
  selectedBoardCardIds,
  selectedFormationIds,
  onPlayAction,
  onClearSelection,
}: ActionPanelProps) {
  const activeHandCardId = selectedHandCardId ?? handCard?.id ?? null;

  if (!activeHandCardId || !handCard) {
    return null;
  }

  const handleColocar = () => {
    triggerHaptic('card_move');
    onPlayAction({ type: 'colocar' });
  };

  const handleLlevar = () => {
    triggerHaptic('card_move');
    const currentFormationIds = Array.from(selectedFormationIds);

    if (gameState) {
      const player = gameState.players[gameState.currentTurnPlayerIndex];
      const activeCard = player?.hand.find((c) => c.id === activeHandCardId) || handCard;

      if (player && activeCard) {
        const targetValues = activeCard.rank === 'A' ? [1, 14] : [activeCard.value];
        const myPendingFormations = gameState.board.formations.filter(
          (f) => f.createdBy === player.id && targetValues.includes(f.value)
        );

        for (const form of myPendingFormations) {
          if (!currentFormationIds.includes(form.id)) {
            currentFormationIds.push(form.id);
          }
        }
      }
    }

    onPlayAction({
      type: 'llevar',
      boardCardIds: Array.from(selectedBoardCardIds),
      formationIds: currentFormationIds,
    });
  };

  const handleFormar = () => {
    triggerHaptic('formation');
    onPlayAction({
      type: 'formar',
      boardCardIds: Array.from(selectedBoardCardIds),
    });
  };

  const handleFormarPar = () => {
    triggerHaptic('formation');
    if (selectedFormationIds.size === 1) {
      const formId = Array.from(selectedFormationIds)[0];
      onPlayAction({ type: 'formarPar', formationId: formId });
    } else if (selectedBoardCardIds.size > 0) {
      onPlayAction({
        type: 'formarPar',
        boardCardIds: Array.from(selectedBoardCardIds),
      });
    }
  };

  const handleAumentarFormacion = () => {
    triggerHaptic('formation');
    const formId = Array.from(selectedFormationIds)[0];
    if (formId) {
      onPlayAction({
        type: 'aumentarFormacion',
        formationId: formId,
      });
    }
  };

  const handleCantar = () => {
    triggerHaptic('card_move');
    onPlayAction({ type: 'cantar' });
  };

  return (
    <View
      className="flex-row flex-wrap items-center justify-center gap-2 bg-gray-950/90 px-3 py-2 rounded-xl border border-white/10 self-center my-1"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        gap: 8,
        backgroundColor: 'rgba(3, 7, 18, 0.92)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 4,
        zIndex: 1,
        elevation: 4,
      }}
    >
      <View
        className="flex-row flex-wrap items-center justify-center gap-2"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {selectedBoardCardIds.size === 0 && selectedFormationIds.size === 0 ? (
          <>
            <Pressable
              onPress={handleColocar}
              className="min-h-[36px] bg-cyan-600 active:bg-cyan-500 px-4 py-1.5 rounded-lg justify-center items-center shadow border border-cyan-400/30"
              style={{
                minHeight: 36,
                backgroundColor: '#0891b2',
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(34, 211, 238, 0.3)',
              }}
            >
              <Text className="text-white font-bold text-xs" style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>
                Colocar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCantar}
              className="min-h-[36px] bg-purple-900/60 active:bg-purple-800/80 px-4 py-1.5 rounded-lg justify-center items-center shadow border border-purple-500/30"
              style={{
                minHeight: 36,
                backgroundColor: 'rgba(88, 28, 135, 0.6)',
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(168, 85, 247, 0.3)',
              }}
            >
              <Text className="text-purple-200 font-bold text-xs" style={{ color: '#e9d5ff', fontWeight: '700', fontSize: 12 }}>
                Cantar As
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={handleLlevar}
              className="min-h-[36px] bg-emerald-600 active:bg-emerald-500 px-5 py-1.5 rounded-lg justify-center items-center shadow-md border border-emerald-400/40"
              style={{
                minHeight: 36,
                backgroundColor: '#059669',
                paddingHorizontal: 20,
                paddingVertical: 6,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(52, 211, 153, 0.4)',
              }}
            >
              <Text className="text-white font-bold text-xs" style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>
                Llevar
              </Text>
            </Pressable>

            {selectedBoardCardIds.size > 0 && selectedFormationIds.size === 0 && (
              <>
                <Pressable
                  onPress={handleFormar}
                  className="min-h-[36px] bg-gray-800 active:bg-gray-700 px-4 py-1.5 rounded-lg justify-center items-center border border-amber-500/30"
                  style={{
                    minHeight: 36,
                    backgroundColor: '#1f2937',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <Text className="text-amber-300 font-bold text-xs" style={{ color: '#fcd34d', fontWeight: '700', fontSize: 12 }}>
                    Formar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleFormarPar}
                  className="min-h-[36px] bg-gray-800 active:bg-gray-700 px-4 py-1.5 rounded-lg justify-center items-center border border-amber-500/30"
                  style={{
                    minHeight: 36,
                    backgroundColor: '#1f2937',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <Text className="text-amber-200 font-bold text-xs" style={{ color: '#fde68a', fontWeight: '700', fontSize: 12 }}>
                    Agrupar
                  </Text>
                </Pressable>
              </>
            )}

            {selectedFormationIds.size === 1 && selectedBoardCardIds.size === 0 && (
              <>
                <Pressable
                  onPress={handleFormarPar}
                  className="min-h-[36px] bg-gray-800 active:bg-gray-700 px-4 py-1.5 rounded-lg justify-center items-center border border-amber-500/30"
                  style={{
                    minHeight: 36,
                    backgroundColor: '#1f2937',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <Text className="text-amber-200 font-bold text-xs" style={{ color: '#fde68a', fontWeight: '700', fontSize: 12 }}>
                    Pares
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleAumentarFormacion}
                  className="min-h-[36px] bg-gray-800 active:bg-gray-700 px-4 py-1.5 rounded-lg justify-center items-center border border-rose-500/30"
                  style={{
                    minHeight: 36,
                    backgroundColor: '#1f2937',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(244, 63, 94, 0.3)',
                  }}
                >
                  <Text className="text-rose-300 font-bold text-xs" style={{ color: '#fda4af', fontWeight: '700', fontSize: 12 }}>
                    Aumentar
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}

        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onClearSelection();
          }}
          className="min-h-[36px] bg-white/5 active:bg-white/10 px-3 py-1.5 rounded-lg justify-center items-center border border-white/10"
          style={{
            minHeight: 36,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <Text className="text-gray-300 font-medium text-xs" style={{ color: '#d1d5db', fontWeight: '500', fontSize: 12 }}>
            Cancelar
          </Text>
        </Pressable>
      </View>
    </View>
  );
});
