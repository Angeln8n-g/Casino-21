import React from 'react';
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

export function ActionPanel({
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
    triggerHaptic('card_tap');
    onPlayAction({ type: 'colocar' });
  };

  const handleLlevar = () => {
    triggerHaptic('card_tap');
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
    triggerHaptic('card_tap');
    onPlayAction({
      type: 'formar',
      boardCardIds: Array.from(selectedBoardCardIds),
    });
  };

  const handleFormarPar = () => {
    triggerHaptic('card_tap');
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
    triggerHaptic('card_tap');
    const formId = Array.from(selectedFormationIds)[0];
    if (formId) {
      onPlayAction({
        type: 'aumentarFormacion',
        formationId: formId,
      });
    }
  };

  const handleCantar = () => {
    triggerHaptic('card_tap');
    onPlayAction({ type: 'cantar' });
  };

  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2 bg-gray-950/90 px-3 py-2 rounded-xl shadow-xl border border-white/10 w-full my-1">
      <View className="flex-row flex-wrap items-center gap-2 flex-1">
        {selectedBoardCardIds.size === 0 && selectedFormationIds.size === 0 ? (
          <>
            <Pressable
              onPress={handleColocar}
              className="min-h-[36px] bg-cyan-600 active:bg-cyan-500 px-4 py-1.5 rounded-lg justify-center items-center shadow border border-cyan-400/30"
            >
              <Text className="text-white font-bold text-xs">Colocar</Text>
            </Pressable>
            <Pressable
              onPress={handleCantar}
              className="min-h-[36px] bg-purple-900/60 active:bg-purple-800/80 px-4 py-1.5 rounded-lg justify-center items-center shadow border border-purple-500/30"
            >
              <Text className="text-purple-200 font-bold text-xs">Cantar As</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={handleLlevar}
              className="min-h-[36px] bg-emerald-600 active:bg-emerald-500 px-5 py-1.5 rounded-lg justify-center items-center shadow-md border border-emerald-400/40"
            >
              <Text className="text-white font-bold text-xs">Llevar</Text>
            </Pressable>

            {selectedBoardCardIds.size > 0 && selectedFormationIds.size === 0 && (
              <>
                <Pressable
                  onPress={handleFormar}
                  className="min-h-[36px] bg-gray-800 active:bg-gray-700 px-4 py-1.5 rounded-lg justify-center items-center border border-amber-500/30"
                >
                  <Text className="text-amber-300 font-bold text-xs">Formar</Text>
                </Pressable>
                <Pressable
                  onPress={handleFormarPar}
                  className="min-h-[36px] bg-gray-800 active:bg-gray-700 px-4 py-1.5 rounded-lg justify-center items-center border border-amber-500/30"
                >
                  <Text className="text-amber-200 font-bold text-xs">Agrupar</Text>
                </Pressable>
              </>
            )}

            {selectedFormationIds.size === 1 && selectedBoardCardIds.size === 0 && (
              <>
                <Pressable
                  onPress={handleFormarPar}
                  className="min-h-[36px] bg-gray-800 active:bg-gray-700 px-4 py-1.5 rounded-lg justify-center items-center border border-amber-500/30"
                >
                  <Text className="text-amber-200 font-bold text-xs">Pares</Text>
                </Pressable>
                <Pressable
                  onPress={handleAumentarFormacion}
                  className="min-h-[36px] bg-gray-800 active:bg-gray-700 px-4 py-1.5 rounded-lg justify-center items-center border border-rose-500/30"
                >
                  <Text className="text-rose-300 font-bold text-xs">Aumentar</Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </View>

      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onClearSelection();
        }}
        className="min-h-[36px] bg-white/5 active:bg-white/10 px-3 py-1.5 rounded-lg justify-center items-center border border-white/10"
      >
        <Text className="text-gray-300 font-medium text-xs">Cancelar</Text>
      </Pressable>
    </View>
  );
}
