import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Share,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const hasRequestedRematch = localPlayerId
    ? rematchStatus?.acceptedPlayers.includes(localPlayerId)
    : false;

  const handleShareResult = async () => {
    try {
      setSharing(true);
      const eloDiff = statsData?.eloChange
        ? `${statsData.eloChange > 0 ? '+' : ''}${statsData.eloChange} ELO`
        : '';
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

  const cardWidth = Math.min(Math.max(windowWidth - 32, 280), 360);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
    >
      <View
        style={{
          width: cardWidth,
          backgroundColor: '#0f172a',
          borderWidth: 1.5,
          borderColor: '#1e293b',
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
        }}
      >
        {/* Insignia Victoria / Derrota */}
        <View
          style={{
            padding: 16,
            borderRadius: 999,
            marginBottom: 12,
            borderWidth: 1,
            backgroundColor: isLocalWinner
              ? 'rgba(245, 158, 11, 0.2)'
              : 'rgba(239, 68, 68, 0.2)',
            borderColor: isLocalWinner
              ? 'rgba(245, 158, 11, 0.5)'
              : 'rgba(239, 68, 68, 0.5)',
          }}
        >
          {isLocalWinner ? <Trophy color="#fbbf24" size={44} /> : <Frown color="#ef4444" size={44} />}
        </View>

        <Text
          style={{
            color: '#ffffff',
            fontWeight: '900',
            fontSize: 22,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          {isLocalWinner ? '¡VICTORIA!' : 'DERROTA'}
        </Text>

        <Text
          style={{
            color: '#94a3b8',
            fontSize: 12,
            textAlign: 'center',
            marginBottom: 18,
          }}
        >
          {isLocalWinner
            ? '¡Excelente estrategia! Has superado la partida K21.'
            : 'Buen intento. Sigue practicando tus combinaciones.'}
        </Text>

        {/* Panel de Recompensas de la Partida */}
        {statsData && (
          <View
            style={{
              width: '100%',
              backgroundColor: '#020617',
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#1e293b',
              marginBottom: 18,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Award color="#fbbf24" size={15} />
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>
                  Variación ELO:
                </Text>
              </View>
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 12,
                  color: statsData.eloChange >= 0 ? '#34d399' : '#f87171',
                }}
              >
                {statsData.eloChange >= 0 ? `+${statsData.eloChange}` : statsData.eloChange}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Coins color="#fbbf24" size={15} />
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>
                  Monedas Ganadas:
                </Text>
              </View>
              <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                +{statsData.coinsEarned}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Zap color="#38bdf8" size={15} />
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>
                  Experiencia (XP):
                </Text>
              </View>
              <Text style={{ color: '#22d3ee', fontWeight: '800', fontSize: 12 }}>
                +{statsData.xpGained} XP
              </Text>
            </View>
          </View>
        )}

        {/* Botón Revancha */}
        <Pressable
          disabled={hasRequestedRematch}
          onPress={onRequestRematch}
          style={{
            width: '100%',
            paddingVertical: 13,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 10,
            backgroundColor: hasRequestedRematch ? '#1e293b' : '#06b6d4',
            borderWidth: hasRequestedRematch ? 1 : 0,
            borderColor: '#334155',
          }}
        >
          <RotateCcw color={hasRequestedRematch ? '#94a3b8' : '#020617'} size={18} />
          <Text
            style={{
              fontWeight: '800',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: hasRequestedRematch ? '#94a3b8' : '#020617',
            }}
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
          style={{
            width: '100%',
            paddingVertical: 12,
            backgroundColor: '#1e293b',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#334155',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Share2 color="#fbbf24" size={18} />
          <Text
            style={{
              color: '#fbbf24',
              fontWeight: '800',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Compartir Resultado
          </Text>
        </Pressable>

        {/* Botón Volver al Lobby */}
        <Pressable
          onPress={onBackToMenu}
          style={{
            width: '100%',
            paddingVertical: 12,
            backgroundColor: '#020617',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#1e293b',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Home color="#94a3b8" size={18} />
          <Text
            style={{
              color: '#cbd5e1',
              fontWeight: '800',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Volver al Lobby
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
