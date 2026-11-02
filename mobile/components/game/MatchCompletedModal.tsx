import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Share, ActivityIndicator } from 'react-native';
import { GameState } from 'domain/game-state';
import { StatsData } from '../../hooks/useGame';
import { Trophy, Frown, Home, RotateCcw, Share2, Award, Coins, Zap } from 'lucide-react-native';

interface MatchCompletedModalProps {
  visible: boolean;
  gameState: GameState | null;
  localPlayerId: string | null;
  statsData: StatsData | null;
  rematchStatus: { acceptedPlayers: string[]; maxPlayers: number } | null;
  onRequestRematch: () => void;
  onBackToMenu: () => void;
}

export function MatchCompletedModal({
  visible,
  gameState,
  localPlayerId,
  statsData,
  rematchStatus,
  onRequestRematch,
  onBackToMenu,
}: MatchCompletedModalProps) {
  const [sharing, setSharing] = useState(false);

  if (!gameState || !visible) return null;

  const isPlayerWinner = (playerId: string): boolean => {
    if (!gameState.winnerId) return false;
    if (gameState.mode === '2v2') {
      const p = gameState.players.find((x) => x.id === playerId);
      return p ? p.teamId === gameState.winnerId : false;
    }
    return playerId === gameState.winnerId;
  };

  const isLocalWinner = localPlayerId ? isPlayerWinner(localPlayerId) : false;
  const hasRequestedRematch = localPlayerId ? rematchStatus?.acceptedPlayers.includes(localPlayerId) : false;

  const handleShareResult = async () => {
    try {
      setSharing(true);
      const eloDiff = statsData?.eloChange ? `${statsData.eloChange > 0 ? '+' : ''}${statsData.eloChange} ELO` : '';
      const text = `¡Acabo de jugar una partida en KASINO 21! Resultado: ${
        isLocalWinner ? '¡VICTORIA!' : 'Partida competitiva'
      } ${eloDiff}. ¡Ven a retarme!`;

      await Share.share({
        message: text,
      });
    } catch {} finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/85 items-center justify-center p-5">
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl">
          {/* Insignia Victoria / Derrota */}
          <View
            className={`p-4 rounded-full mb-3 border ${
              isLocalWinner ? 'bg-amber-500/20 border-amber-500/50' : 'bg-red-500/20 border-red-500/50'
            }`}
          >
            {isLocalWinner ? <Trophy color="#fbbf24" size={44} /> : <Frown color="#ef4444" size={44} />}
          </View>

          <Text className="text-white font-bold text-2xl uppercase tracking-wider mb-1">
            {isLocalWinner ? '¡VICTORIA!' : 'DERROTA'}
          </Text>

          <Text className="text-slate-400 text-xs text-center mb-5">
            {isLocalWinner
              ? '¡Excelente estrategia! Has superado la partida K21.'
              : 'Buen intento. Sigue practicando tus combinaciones.'}
          </Text>

          {/* Panel de Recompensas de la Partida */}
          {statsData && (
            <View className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 w-full mb-5">
              <View className="flex-row justify-between py-1.5 border-b border-slate-900">
                <View className="flex-row items-center">
                  <Award color="#fbbf24" size={15} className="mr-2" />
                  <Text className="text-slate-300 text-xs font-bold">Variación ELO:</Text>
                </View>
                <Text
                  className={`font-mono text-xs font-bold ${
                    statsData.eloChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {statsData.eloChange >= 0 ? `+${statsData.eloChange}` : statsData.eloChange}
                </Text>
              </View>

              <View className="flex-row justify-between py-1.5 border-b border-slate-900">
                <View className="flex-row items-center">
                  <Coins color="#fbbf24" size={15} className="mr-2" />
                  <Text className="text-slate-300 text-xs font-bold">Monedas Ganadas:</Text>
                </View>
                <Text className="text-amber-400 font-mono text-xs font-bold">+{statsData.coinsEarned}</Text>
              </View>

              <View className="flex-row justify-between py-1.5">
                <View className="flex-row items-center">
                  <Zap color="#38bdf8" size={15} className="mr-2" />
                  <Text className="text-slate-300 text-xs font-bold">Experiencia (XP):</Text>
                </View>
                <Text className="text-cyan-400 font-mono text-xs font-bold">+{statsData.xpGained} XP</Text>
              </View>
            </View>
          )}

          {/* Botón Revancha */}
          <Pressable
            disabled={hasRequestedRematch}
            onPress={onRequestRematch}
            className={`w-full p-3.5 rounded-xl flex-row items-center justify-center mb-2.5 ${
              hasRequestedRematch
                ? 'bg-slate-800 border border-slate-700'
                : 'bg-cyan-500 active:bg-cyan-600'
            }`}
          >
            <RotateCcw color={hasRequestedRematch ? '#94a3b8' : '#020617'} size={18} className="mr-2" />
            <Text
              className={`font-bold text-sm uppercase tracking-wider ${
                hasRequestedRematch ? 'text-slate-400' : 'text-slate-950'
              }`}
            >
              {hasRequestedRematch
                ? `Esperando al rival (${rematchStatus?.acceptedPlayers.length || 1}/${rematchStatus?.maxPlayers || 2})...`
                : 'Pedir Revancha'}
            </Text>
          </Pressable>

          {/* Botón Compartir */}
          <Pressable
            disabled={sharing}
            onPress={handleShareResult}
            className="w-full p-3 bg-slate-800 active:bg-slate-700 rounded-xl border border-slate-700 flex-row items-center justify-center mb-2.5"
          >
            <Share2 color="#fbbf24" size={18} className="mr-2" />
            <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider">
              Compartir Resultado
            </Text>
          </Pressable>

          {/* Botón Volver al Lobby */}
          <Pressable
            onPress={onBackToMenu}
            className="w-full p-3 bg-slate-950 active:bg-slate-900 rounded-xl border border-slate-800 flex-row items-center justify-center"
          >
            <Home color="#94a3b8" size={18} className="mr-2" />
            <Text className="text-slate-300 font-bold text-xs uppercase tracking-wider">
              Volver al Lobby
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
