import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type ActionPayload =
  | { type: 'llevar'; boardCardIds: string[]; formationIds: string[] }
  | { type: 'formar'; boardCardIds: string[] }
  | { type: 'formarPar'; formationId?: string; boardCardIds?: string[] }
  | { type: 'aumentarFormacion'; formationId: string }
  | { type: 'colocar' };

interface ActionPanelProps {
  selectedHandCardId: string | null;
  selectedBoardCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onPlayAction: (action: ActionPayload) => void;
  onClearSelection: () => void;
}

export function ActionPanel({
  selectedHandCardId,
  selectedBoardCardIds,
  selectedFormationIds,
  onPlayAction,
  onClearSelection,
}: ActionPanelProps) {
  if (!selectedHandCardId) {
    return (
      <View className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 my-2 items-center">
        <Text className="text-slate-400 text-xs font-medium text-center">
          Selecciona una carta de tu mano para ver las acciones disponibles.
        </Text>
      </View>
    );
  }

  const hasBoardCardsSelected = selectedBoardCardIds.size > 0;
  const hasFormationsSelected = selectedFormationIds.size > 0;

  return (
    <View className="bg-slate-900/95 p-3 rounded-2xl border border-amber-500/40 my-2 shadow-2xl">
      <View className="flex-row justify-between items-center mb-2 px-1">
        <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider">
          Acciones Disponibles
        </Text>
        <Pressable onPress={onClearSelection} className="px-2 py-0.5 bg-slate-800 rounded-lg">
          <Text className="text-slate-400 text-[10px] font-bold">Limpiar</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap justify-center gap-2">
        {/* Si no hay nada seleccionado en el tablero: COLOCAR */}
        {!hasBoardCardsSelected && !hasFormationsSelected && (
          <Pressable
            onPress={() => onPlayAction({ type: 'colocar' })}
            className="flex-1 py-2.5 px-4 bg-blue-600 active:bg-blue-700 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-xs uppercase">Colocar Suelta</Text>
          </Pressable>
        )}

        {/* Si hay cartas o formaciones seleccionadas: LLEVAR */}
        {(hasBoardCardsSelected || hasFormationsSelected) && (
          <Pressable
            onPress={() =>
              onPlayAction({
                type: 'llevar',
                boardCardIds: Array.from(selectedBoardCardIds),
                formationIds: Array.from(selectedFormationIds),
              })
            }
            className="flex-1 py-2.5 px-4 bg-emerald-600 active:bg-emerald-700 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-xs uppercase">LLEVAR (Capturar)</Text>
          </Pressable>
        )}

        {/* Si hay cartas sueltas seleccionadas: FORMAR o AGRUPAR */}
        {hasBoardCardsSelected && !hasFormationsSelected && (
          <>
            <Pressable
              onPress={() =>
                onPlayAction({
                  type: 'formar',
                  boardCardIds: Array.from(selectedBoardCardIds),
                })
              }
              className="flex-1 py-2.5 px-4 bg-amber-500 active:bg-amber-600 rounded-xl items-center"
            >
              <Text className="text-slate-950 font-bold text-xs uppercase">Formar</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                onPlayAction({
                  type: 'formarPar',
                  boardCardIds: Array.from(selectedBoardCardIds),
                })
              }
              className="flex-1 py-2.5 px-4 bg-orange-600 active:bg-orange-700 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-xs uppercase">Agrupar</Text>
            </Pressable>
          </>
        )}

        {/* Si hay una formación seleccionada: AUMENTAR */}
        {hasFormationsSelected && selectedFormationIds.size === 1 && (
          <Pressable
            onPress={() =>
              onPlayAction({
                type: 'aumentarFormacion',
                formationId: Array.from(selectedFormationIds)[0],
              })
            }
            className="flex-1 py-2.5 px-4 bg-purple-600 active:bg-purple-700 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-xs uppercase">Aumentar Formación</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
