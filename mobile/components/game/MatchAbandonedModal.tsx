import React from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { Trophy, Frown, Home, Award, Coins } from 'lucide-react-native';

interface MatchAbandonedData {
  winnerId: string;
  coinsEarned: number;
  eloEarned: number;
}

interface MatchAbandonedModalProps {
  visible: boolean;
  data: MatchAbandonedData | null;
  localPlayerId: string | null;
  onBackToMenu: () => void;
}

export function MatchAbandonedModal({
  visible,
  data,
  localPlayerId,
  onBackToMenu,
}: MatchAbandonedModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (!visible || !data) return null;

  const isWinner = data.winnerId === localPlayerId;
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
          borderColor: 'rgba(245, 158, 11, 0.4)',
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            padding: 16,
            borderRadius: 999,
            marginBottom: 12,
            borderWidth: 1,
            backgroundColor: isWinner ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderColor: isWinner ? 'rgba(245, 158, 11, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          }}
        >
          {isWinner ? <Trophy color="#fbbf24" size={42} /> : <Frown color="#ef4444" size={42} />}
        </View>

        <Text
          style={{
            color: '#ffffff',
            fontWeight: '800',
            fontSize: 19,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 4,
            textAlign: 'center',
          }}
        >
          {isWinner ? '¡Oponente Desconectado!' : 'Partida Abandonada'}
        </Text>

        <Text
          style={{
            color: '#94a3b8',
            fontSize: 12,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          {isWinner ? 'Has ganado la partida automáticamente.' : 'La partida ha concluido.'}
        </Text>

        {isWinner && (
          <View
            style={{
              width: '100%',
              backgroundColor: '#020617',
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#1e293b',
              marginBottom: 22,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: '#0f172a',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Coins color="#fbbf24" size={16} />
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>
                  Monedas Ganadas:
                </Text>
              </View>
              <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 14 }}>
                +{data.coinsEarned}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Award color="#10b981" size={16} />
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>
                  Puntos ELO:
                </Text>
              </View>
              <Text style={{ color: '#34d399', fontWeight: '800', fontSize: 14 }}>
                +{data.eloEarned} ▲
              </Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={onBackToMenu}
          style={({ pressed }) => ({
            width: '100%',
            backgroundColor: pressed ? '#d97706' : '#f59e0b',
            paddingVertical: 14,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          })}
        >
          <Home color="#020617" size={18} />
          <Text
            style={{
              color: '#020617',
              fontWeight: '900',
              fontSize: 14,
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
