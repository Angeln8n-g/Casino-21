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
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        gap: 8,
        backgroundColor: 'rgba(3, 7, 18, 0.94)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        marginVertical: 4,
        zIndex: 10000,
        elevation: 20,
      }}
    >
      <View
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
              style={({ pressed }) => ({
                minHeight: 36,
                backgroundColor: pressed ? '#06b6d4' : '#0891b2',
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 10,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(34, 211, 238, 0.35)',
              })}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>Colocar</Text>
            </Pressable>
            <Pressable
              onPress={handleCantar}
              style={({ pressed }) => ({
                minHeight: 36,
                backgroundColor: pressed ? 'rgba(107, 33, 168, 0.85)' : 'rgba(88, 28, 135, 0.65)',
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 10,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(168, 85, 247, 0.35)',
              })}
            >
              <Text style={{ color: '#e9d5ff', fontWeight: '700', fontSize: 12 }}>Cantar As</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={handleLlevar}
              style={({ pressed }) => ({
                minHeight: 36,
                backgroundColor: pressed ? '#10b981' : '#059669',
                paddingHorizontal: 20,
                paddingVertical: 6,
                borderRadius: 10,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(52, 211, 153, 0.45)',
              })}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>Llevar</Text>
            </Pressable>

            {selectedBoardCardIds.size > 0 && selectedFormationIds.size === 0 && (
              <>
                <Pressable
                  onPress={handleFormar}
                  style={({ pressed }) => ({
                    minHeight: 36,
                    backgroundColor: pressed ? '#374151' : '#1f2937',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                  })}
                >
                  <Text style={{ color: '#fcd34d', fontWeight: '700', fontSize: 12 }}>Formar</Text>
                </Pressable>
                <Pressable
                  onPress={handleFormarPar}
                  style={({ pressed }) => ({
                    minHeight: 36,
                    backgroundColor: pressed ? '#374151' : '#1f2937',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                  })}
                >
                  <Text style={{ color: '#fde68a', fontWeight: '700', fontSize: 12 }}>Agrupar</Text>
                </Pressable>
              </>
            )}

            {selectedFormationIds.size === 1 && selectedBoardCardIds.size === 0 && (
              <>
                <Pressable
                  onPress={handleFormarPar}
                  style={({ pressed }) => ({
                    minHeight: 36,
                    backgroundColor: pressed ? '#374151' : '#1f2937',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                  })}
                >
                  <Text style={{ color: '#fde68a', fontWeight: '700', fontSize: 12 }}>Pares</Text>
                </Pressable>
                <Pressable
                  onPress={handleAumentarFormacion}
                  style={({ pressed }) => ({
                    minHeight: 36,
                    backgroundColor: pressed ? '#374151' : '#1f2937',
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(244, 63, 94, 0.35)',
                  })}
                >
                  <Text style={{ color: '#fda4af', fontWeight: '700', fontSize: 12 }}>Aumentar</Text>
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
          style={({ pressed }) => ({
            minHeight: 36,
            backgroundColor: pressed ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.06)',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
          })}
        >
          <Text style={{ color: '#d1d5db', fontWeight: '600', fontSize: 12 }}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
});
