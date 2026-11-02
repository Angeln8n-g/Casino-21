import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { GameState } from 'domain/game-state';
import { Card } from 'domain/card';
import { DefaultActionValidator, Action } from 'application/action-validator';
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
  selectedBoardCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onPlayAction: (action: ActionPayload) => void;
  onClearSelection: () => void;
}

export function ActionPanel({
  gameState,
  handCard,
  selectedBoardCardIds,
  selectedFormationIds,
  onPlayAction,
  onClearSelection,
}: ActionPanelProps) {
  if (!handCard) {
    return (
      <View className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 my-1 items-center">
        <Text className="text-slate-400 text-xs font-semibold text-center">
          Selecciona una carta de tu mano para ver las jugadas disponibles.
        </Text>
      </View>
    );
  }

  const isAce = handCard.rank === 'A' || (handCard as any).rank === 1;
  const hasBoardCardsSelected = selectedBoardCardIds.size > 0;
  const hasFormationsSelected = selectedFormationIds.size > 0;

  const handleLlevar = () => {
    triggerHaptic('card_tap');
    let currentFormationIds = Array.from(selectedFormationIds);

    if (gameState) {
      const player = gameState.players[gameState.currentTurnPlayerIndex];
      if (player) {
        const targetValues = handCard.rank === 'A' ? [1, 14] : [handCard.value];
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

  const handleColocar = () => {
    triggerHaptic('card_tap');
    onPlayAction({ type: 'colocar' });
  };

  const handleCantar = () => {
    triggerHaptic('card_tap');
    onPlayAction({ type: 'cantar' });
  };

  const handleFormar = () => {
    triggerHaptic('card_tap');
    onPlayAction({
      type: 'formar',
      boardCardIds: Array.from(selectedBoardCardIds),
    });
  };

  const handleAgrupar = () => {
    triggerHaptic('card_tap');
    if (selectedFormationIds.size === 1) {
      const formId = Array.from(selectedFormationIds)[0];
      onPlayAction({ type: 'formarPar', formationId: formId });
    } else {
      onPlayAction({
        type: 'formarPar',
        boardCardIds: Array.from(selectedBoardCardIds),
      });
    }
  };

  const handleAumentar = () => {
    triggerHaptic('card_tap');
    const formId = Array.from(selectedFormationIds)[0];
    if (formId) {
      onPlayAction({
        type: 'aumentarFormacion',
        formationId: formId,
      });
    }
  };

  return (
    <View className="bg-slate-900/95 p-3 rounded-2xl border border-amber-500/40 my-1">
      <View className="flex-row justify-between items-center mb-2 px-1">
        <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider">
          Acciones Disponibles
        </Text>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onClearSelection();
          }}
          className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700"
        >
          <Text className="text-slate-400 text-[10px] font-bold">Limpiar</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap justify-center gap-2">
        {/* 1. Sin nada seleccionado en tapete: Colocar Suelta y Cantar As */}
        {!hasBoardCardsSelected && !hasFormationsSelected && (
          <>
            <Pressable
              onPress={handleColocar}
              className="flex-1 py-2.5 px-3 bg-blue-600 active:bg-blue-700 rounded-xl items-center min-w-[110px]"
            >
              <Text className="text-white font-bold text-xs uppercase">Colocar Suelta</Text>
            </Pressable>

            {isAce && (
              <Pressable
                onPress={handleCantar}
                className="flex-1 py-2.5 px-3 bg-purple-600 active:bg-purple-700 rounded-xl items-center min-w-[110px]"
              >
                <Text className="text-white font-bold text-xs uppercase">Cantar As</Text>
              </Pressable>
            )}
          </>
        )}

        {/* 2. Con cartas o formaciones seleccionadas: Llevar (Capturar) */}
        {(hasBoardCardsSelected || hasFormationsSelected) && (
          <Pressable
            onPress={handleLlevar}
            className="flex-1 py-2.5 px-3 bg-emerald-600 active:bg-emerald-700 rounded-xl items-center min-w-[120px]"
          >
            <Text className="text-white font-bold text-xs uppercase">Llevar (Capturar)</Text>
          </Pressable>
        )}

        {/* 3. Con cartas sueltas seleccionadas: Formar y Agrupar */}
        {hasBoardCardsSelected && !hasFormationsSelected && (
          <>
            <Pressable
              onPress={handleFormar}
              className="flex-1 py-2.5 px-3 bg-amber-500 active:bg-amber-600 rounded-xl items-center min-w-[90px]"
            >
              <Text className="text-slate-950 font-bold text-xs uppercase">Formar</Text>
            </Pressable>

            <Pressable
              onPress={handleAgrupar}
              className="flex-1 py-2.5 px-3 bg-orange-600 active:bg-orange-700 rounded-xl items-center min-w-[90px]"
            >
              <Text className="text-white font-bold text-xs uppercase">Agrupar</Text>
            </Pressable>
          </>
        )}

        {/* 4. Con una formación seleccionada: Aumentar y Pares */}
        {hasFormationsSelected && selectedFormationIds.size === 1 && (
          <>
            <Pressable
              onPress={handleAumentar}
              className="flex-1 py-2.5 px-3 bg-purple-600 active:bg-purple-700 rounded-xl items-center min-w-[110px]"
            >
              <Text className="text-white font-bold text-xs uppercase">Aumentar</Text>
            </Pressable>

            <Pressable
              onPress={handleAgrupar}
              className="flex-1 py-2.5 px-3 bg-orange-600 active:bg-orange-700 rounded-xl items-center min-w-[90px]"
            >
              <Text className="text-white font-bold text-xs uppercase">Pares</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
