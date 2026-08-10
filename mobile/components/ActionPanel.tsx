import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from 'domain/card';

export type ActionPayload =
  | { type: 'llevar'; boardCardIds: string[]; formationIds: string[] }
  | { type: 'formar'; boardCardIds: string[] }
  | { type: 'formarPar'; formationId?: string; boardCardIds?: string[] }
  | { type: 'aumentarFormacion'; formationId: string }
  | { type: 'cantar' }
  | { type: 'colocar' };

interface ActionPanelProps {
  handCard: Card | null;
  selectedBoardCardIds: Set<string>;
  selectedFormationIds: Set<string>;
  onPlayAction: (action: ActionPayload) => void;
  onClearSelection: () => void;
}

export function ActionPanel({
  handCard,
  selectedBoardCardIds,
  selectedFormationIds,
  onPlayAction,
  onClearSelection,
}: ActionPanelProps) {
  if (!handCard) {
    return (
      <View style={{ padding: 10, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 16, borderBottomWidth: 1, borderColor: '#1e293b', marginVertical: 6, alignItems: 'center' }}>
        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500', textAlign: 'center' }}>
          Selecciona una carta de tu mano para ver las acciones disponibles.
        </Text>
      </View>
    );
  }

  const isAce = handCard.rank === 'A' || (handCard as any).rank === 1;
  const hasBoardCardsSelected = selectedBoardCardIds.size > 0;
  const hasFormationsSelected = selectedFormationIds.size > 0;

  return (
    <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)', marginVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
        <Text style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Acciones Disponibles
        </Text>
        <TouchableOpacity onPress={onClearSelection} activeOpacity={0.7} style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#1e293b', borderRadius: 8 }}>
          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {/* 1. Si no hay nada seleccionado en el tablero: COLOCAR SUELTA y CANTAR AS (si es As) */}
        {!hasBoardCardsSelected && !hasFormationsSelected && (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onPlayAction({ type: 'colocar' })}
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#2563eb', borderRadius: 12, alignItems: 'center', minWidth: 110 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>Colocar Suelta</Text>
            </TouchableOpacity>

            {isAce && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onPlayAction({ type: 'cantar' })}
                style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#9333ea', borderRadius: 12, alignItems: 'center', minWidth: 110 }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>Cantar As</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* 2. Si hay cartas o formaciones seleccionadas: LLEVAR (Capturar) */}
        {(hasBoardCardsSelected || hasFormationsSelected) && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              onPlayAction({
                type: 'llevar',
                boardCardIds: Array.from(selectedBoardCardIds),
                formationIds: Array.from(selectedFormationIds),
              })
            }
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#059669', borderRadius: 12, alignItems: 'center', minWidth: 120 }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>LLEVAR (Capturar)</Text>
          </TouchableOpacity>
        )}

        {/* 3. Si hay cartas sueltas seleccionadas: FORMAR y AGRUPAR */}
        {hasBoardCardsSelected && !hasFormationsSelected && (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                onPlayAction({
                  type: 'formar',
                  boardCardIds: Array.from(selectedBoardCardIds),
                })
              }
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#f59e0b', borderRadius: 12, alignItems: 'center', minWidth: 100 }}
            >
              <Text style={{ color: '#020617', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>Formar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                onPlayAction({
                  type: 'formarPar',
                  boardCardIds: Array.from(selectedBoardCardIds),
                })
              }
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#ea580c', borderRadius: 12, alignItems: 'center', minWidth: 100 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>Agrupar</Text>
            </TouchableOpacity>
          </>
        )}

        {/* 4. Si hay una formación seleccionada: AUMENTAR y PARES */}
        {hasFormationsSelected && selectedFormationIds.size === 1 && (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                onPlayAction({
                  type: 'aumentarFormacion',
                  formationId: Array.from(selectedFormationIds)[0],
                })
              }
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#9333ea', borderRadius: 12, alignItems: 'center', minWidth: 120 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>Aumentar Formación</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                onPlayAction({
                  type: 'formarPar',
                  formationId: Array.from(selectedFormationIds)[0],
                })
              }
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#ea580c', borderRadius: 12, alignItems: 'center', minWidth: 100 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>Pares</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
