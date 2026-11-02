import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { GameState } from 'domain/game-state';
import { Trophy, CheckCircle2, Clock, ShieldAlert } from 'lucide-react-native';

interface RoundSummaryModalProps {
  visible: boolean;
  gameState: GameState | null;
  localPlayerId: string | null;
  scoringTimeoutReady?: string[];
  onContinue: () => void;
  onClaimVictory?: () => void;
}

export function RoundSummaryModal({
  visible,
  gameState,
  localPlayerId,
  scoringTimeoutReady = [],
  onContinue,
  onClaimVictory,
}: RoundSummaryModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(60);
      return;
    }
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, secondsLeft]);

  if (!gameState || !visible) return null;

  const isReady = localPlayerId ? gameState.readyForNextRound?.includes(localPlayerId) : false;
  const localInTimeout = localPlayerId ? scoringTimeoutReady.includes(localPlayerId) : false;
  const opponentStillMissing = gameState.players.some(
    (p) => p.id !== localPlayerId && !scoringTimeoutReady.includes(p.id)
  );
  const canClaim = isReady && localInTimeout && opponentStillMissing;

  const entities = gameState.mode === '1v1' ? gameState.players : gameState.teams;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/90 justify-center items-center p-4">
        <View className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 w-full max-h-[90%] shadow-2xl">
          {/* Header */}
          <View className="items-center mb-3">
            <View className="bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 flex-row items-center mb-1">
              <Trophy color="#fbbf24" size={14} className="mr-1.5" />
              <Text className="text-amber-400 font-bold text-xs uppercase tracking-widest">
                Fin de Ronda {gameState.roundCount}
              </Text>
            </View>
            <Text className="text-white font-bold text-2xl">Resultados de la Ronda</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
            {/* Barras de progreso global (a 21 pts) */}
            <View className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-4">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                Progreso General a 21 Puntos
              </Text>
              {entities.map((entity) => {
                const isLocal = entity.id === localPlayerId;
                const score = entity.score || 0;
                const pct = Math.min((score / 21) * 100, 100);
                const name = (entity as any).name || `Equipo ${entity.id}`;

                return (
                  <View key={entity.id} className="mb-2.5 last:mb-0">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className={`font-bold text-xs ${isLocal ? 'text-cyan-400' : 'text-slate-200'}`}>
                        {isLocal ? 'Tú' : name}
                      </Text>
                      <Text className="text-amber-400 font-mono text-xs font-bold">{score} / 21</Text>
                    </View>
                    <View className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <View
                        className={`h-full rounded-full ${isLocal ? 'bg-cyan-500' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Desglose de puntos de la ronda actual */}
            {gameState.lastScoreBreakdown?.map((b) => {
              const isTeam = !!gameState.teams.find((t) => t.id === b.id);
              const entity = isTeam
                ? gameState.teams.find((t) => t.id === b.id)
                : gameState.players.find((p) => p.id === b.id);
              const entityName = (entity as any)?.name || (isTeam ? `Equipo ${b.id}` : b.id);
              const isMyCard = b.id === localPlayerId;

              return (
                <View
                  key={b.id}
                  className={`bg-slate-950/80 rounded-2xl p-4 mb-3 border ${
                    isMyCard ? 'border-cyan-500/40' : 'border-slate-800'
                  }`}
                >
                  <Text className={`font-bold text-sm mb-3 pb-1 border-b border-slate-800 ${isMyCard ? 'text-cyan-400' : 'text-amber-400'}`}>
                    {isMyCard ? 'Tu Desglose' : entityName}
                  </Text>

                  <View className="space-y-1.5">
                    <View className="flex-row justify-between py-1 border-b border-slate-900">
                      <Text className="text-slate-300 text-xs">👑 Mayoría de Cartas ({b.points.cards}):</Text>
                      <Text className="text-amber-400 font-mono text-xs font-bold">+{b.points.cards}</Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-slate-900">
                      <Text className="text-slate-300 text-xs">♠️ Mayoría de Picas ({b.points.spades}):</Text>
                      <Text className="text-amber-400 font-mono text-xs font-bold">+{b.points.spades}</Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-slate-900">
                      <Text className="text-slate-300 text-xs">♦️ 10 de Diamantes:</Text>
                      <Text className="text-amber-400 font-mono text-xs font-bold">+{b.points.tenOfDiamonds}</Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-slate-900">
                      <Text className="text-slate-300 text-xs">♠️ 2 de Picas:</Text>
                      <Text className="text-amber-400 font-mono text-xs font-bold">+{b.points.twoOfSpades}</Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-slate-900">
                      <Text className="text-slate-300 text-xs">🃏 Ases obtenidos:</Text>
                      <Text className="text-amber-400 font-mono text-xs font-bold">+{b.points.aces}</Text>
                    </View>
                    {b.points.virados > 0 && (
                      <View className="flex-row justify-between py-1">
                        <Text className="text-cyan-400 text-xs font-bold">✨ Puntos por Virados:</Text>
                        <Text className="text-cyan-400 font-mono text-xs font-bold">+{b.points.virados}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Acciones y Botón de Continuar */}
          {canClaim ? (
            <Pressable
              onPress={onClaimVictory}
              className="bg-emerald-500 active:bg-emerald-600 p-4 rounded-xl items-center flex-row justify-center"
            >
              <ShieldAlert color="#020617" size={18} className="mr-2" />
              <Text className="text-slate-950 font-bold text-sm uppercase">
                Reclamar Victoria por Inactividad
              </Text>
            </Pressable>
          ) : isReady ? (
            <View className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex-row items-center justify-center">
              <CheckCircle2 color="#10b981" size={18} className="mr-2" />
              <Text className="text-emerald-400 font-bold text-xs">
                Listo • Esperando a los demás jugadores ({secondsLeft}s)...
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={onContinue}
              className="bg-amber-500 active:bg-amber-600 p-4 rounded-xl items-center flex-row justify-center"
            >
              <Text className="text-slate-950 font-bold text-base uppercase tracking-wider">
                Continuar a la siguiente ronda
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
