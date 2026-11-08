import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { GameState } from 'domain/game-state';
import { Trophy, CheckCircle2, ShieldAlert } from 'lucide-react-native';

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const cardWidth = Math.min(Math.max(windowWidth - 28, 290), 400);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 14,
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
    >
      <View
        style={{
          width: cardWidth,
          maxHeight: windowHeight * 0.88,
          backgroundColor: '#0f172a',
          borderWidth: 1.5,
          borderColor: 'rgba(245, 158, 11, 0.45)',
          borderRadius: 24,
          padding: 20,
        }}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.35)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}
          >
            <Trophy color="#fbbf24" size={14} />
            <Text
              style={{
                color: '#fbbf24',
                fontWeight: '800',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Fin de Ronda {gameState.roundCount}
            </Text>
          </View>
          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 22 }}>
            Resultados de la Ronda
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {/* Barras de progreso global (a 21 pts) */}
          <View
            style={{
              backgroundColor: '#020617',
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#1e293b',
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 10,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              Progreso General a 21 Puntos
            </Text>
            {entities.map((entity) => {
              const isLocal = entity.id === localPlayerId;
              const score = entity.score || 0;
              const pct = Math.min((score / 21) * 100, 100);
              const name = (entity as any).name || `Equipo ${entity.id}`;

              return (
                <View key={entity.id} style={{ marginBottom: 10 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 12,
                        color: isLocal ? '#22d3ee' : '#e2e8f0',
                      }}
                    >
                      {isLocal ? 'Tú' : name}
                    </Text>
                    <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                      {score} / 21
                    </Text>
                  </View>
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      borderRadius: 999,
                      height: 10,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#1e293b',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: isLocal ? '#06b6d4' : '#f59e0b',
                        width: `${pct}%`,
                      }}
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
                style={{
                  backgroundColor: 'rgba(2, 6, 23, 0.85)',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: isMyCard ? 'rgba(6, 182, 212, 0.4)' : '#1e293b',
                }}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 14,
                    marginBottom: 10,
                    paddingBottom: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: '#1e293b',
                    color: isMyCard ? '#22d3ee' : '#fbbf24',
                  }}
                >
                  {isMyCard ? 'Tu Desglose' : entityName}
                </Text>

                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#cbd5e1', fontSize: 12 }}>
                      👑 Mayoría de Cartas ({b.points.cards}):
                    </Text>
                    <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                      +{b.points.cards}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#cbd5e1', fontSize: 12 }}>
                      ♠️ Mayoría de Picas ({b.points.spades}):
                    </Text>
                    <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                      +{b.points.spades}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#cbd5e1', fontSize: 12 }}>♦️ 10 de Diamantes:</Text>
                    <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                      +{b.points.tenOfDiamonds}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#cbd5e1', fontSize: 12 }}>♠️ 2 de Picas:</Text>
                    <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                      +{b.points.twoOfSpades}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#cbd5e1', fontSize: 12 }}>🃏 Ases obtenidos:</Text>
                    <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                      +{b.points.aces}
                    </Text>
                  </View>
                  {b.points.virados > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#22d3ee', fontSize: 12, fontWeight: '700' }}>
                        ✨ Puntos por Virados:
                      </Text>
                      <Text style={{ color: '#22d3ee', fontWeight: '800', fontSize: 12 }}>
                        +{b.points.virados}
                      </Text>
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
            style={{
              backgroundColor: '#10b981',
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <ShieldAlert color="#020617" size={18} />
            <Text
              style={{
                color: '#020617',
                fontWeight: '900',
                fontSize: 13,
                textTransform: 'uppercase',
              }}
            >
              Reclamar Victoria por Inactividad
            </Text>
          </Pressable>
        ) : isReady ? (
          <View
            style={{
              backgroundColor: '#020617',
              borderWidth: 1,
              borderColor: '#1e293b',
              paddingVertical: 14,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 color="#10b981" size={18} />
            <Text style={{ color: '#34d399', fontWeight: '700', fontSize: 12 }}>
              Listo • Esperando a los demás jugadores ({secondsLeft}s)...
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={onContinue}
            style={{ width: '100%', borderRadius: 14, overflow: 'hidden' }}
          >
            {({ pressed }) => (
              <View
                style={{
                  backgroundColor: pressed ? '#d97706' : '#f59e0b',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#020617',
                    fontWeight: '900',
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Continuar a la siguiente ronda
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
