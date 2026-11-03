import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Copy, LogOut, CheckCircle2 } from 'lucide-react-native';

interface PlayerRoomData {
  name: string;
  id?: string;
  avatar?: string | null;
  team?: 1 | 2;
}

interface WaitingRoomModalProps {
  visible: boolean;
  roomId: string | null;
  mode: '1v1' | '2v2';
  betAmount: number;
  playersData: PlayerRoomData[];
  onCancelRoom: () => void;
  onSwitchTeam?: (team: 1 | 2) => void;
}

export function WaitingRoomModal({
  visible,
  roomId,
  mode,
  betAmount,
  playersData,
  onCancelRoom,
  onSwitchTeam,
}: WaitingRoomModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const handleCopyCode = async () => {
    if (!roomId) return;
    await Clipboard.setStringAsync(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requiredPlayers = mode === '2v2' ? 4 : 2;
  const cardWidth = Math.min(Math.max(windowWidth - 32, 280), 370);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.86)',
          justifyContent: 'center',
          alignItems: 'center',
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
          padding: 22,
        }}
      >
        {/* Header */}
        <Text
          style={{
            color: '#fbbf24',
            fontWeight: '800',
            textAlign: 'center',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: 4,
          }}
        >
          SALA PRIVADA ({mode})
        </Text>
        <Text
          style={{
            color: '#ffffff',
            fontWeight: '800',
            textAlign: 'center',
            fontSize: 22,
            marginBottom: 16,
          }}
        >
          Esperando Jugadores
        </Text>

        {/* Código de Sala Privada */}
        <View
          style={{
            backgroundColor: '#020617',
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.4)',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: '800',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Código de Sala
          </Text>
          <Text
            style={{
              color: '#fbbf24',
              fontWeight: '900',
              fontSize: 28,
              letterSpacing: 4,
            }}
          >
            {roomId || '---'}
          </Text>

          <Pressable
            onPress={handleCopyCode}
            style={{
              marginTop: 12,
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.35)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {copied ? (
              <>
                <CheckCircle2 color="#10b981" size={16} />
                <Text style={{ color: '#34d399', fontWeight: '800', fontSize: 12 }}>
                  ¡Código Copiado!
                </Text>
              </>
            ) : (
              <>
                <Copy color="#fbbf24" size={16} />
                <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                  Copiar Código
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Apuesta */}
        {betAmount > 0 && (
          <View
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>
              Apuesta de la Sala:
            </Text>
            <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 13 }}>
              🪙 {betAmount} monedas
            </Text>
          </View>
        )}

        {/* Lista de Jugadores Unidos */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: '800',
              textTransform: 'uppercase',
            }}
          >
            Jugadores ({playersData.length} / {requiredPlayers})
          </Text>
          <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '700' }}>En vivo</Text>
        </View>

        <View
          style={{
            backgroundColor: '#020617',
            borderRadius: 16,
            padding: 12,
            borderWidth: 1,
            borderColor: '#1e293b',
            marginBottom: 18,
          }}
        >
          {playersData.length === 0 ? (
            <Text
              style={{
                color: '#64748b',
                fontSize: 12,
                fontStyle: 'italic',
                textAlign: 'center',
                paddingVertical: 12,
              }}
            >
              Esperando que se unan...
            </Text>
          ) : (
            playersData.map((player, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomWidth: index < playersData.length - 1 ? 1 : 0,
                  borderBottomColor: '#0f172a',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#1e293b',
                      borderWidth: 1,
                      borderColor: 'rgba(245, 158, 11, 0.4)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {player.avatar ? (
                      <Image
                        source={{ uri: player.avatar }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 12 }}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <Text style={{ color: '#34d399', fontWeight: '800', fontSize: 10 }}>
                    Listo
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Opciones 2v2 cambiar de equipo */}
        {mode === '2v2' && onSwitchTeam && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Pressable
              onPress={() => onSwitchTeam(1)}
              style={{
                flex: 1,
                paddingVertical: 10,
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#22d3ee', fontWeight: '800', fontSize: 12 }}>
                Equipo 1
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSwitchTeam(2)}
              style={{
                flex: 1,
                paddingVertical: 10,
                backgroundColor: '#1e293b',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fb7185', fontWeight: '800', fontSize: 12 }}>
                Equipo 2
              </Text>
            </Pressable>
          </View>
        )}

        {/* Botón Cancelar */}
        <Pressable
          onPress={onCancelRoom}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.35)',
            paddingVertical: 13,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <LogOut color="#ef4444" size={18} />
          <Text style={{ color: '#f87171', fontWeight: '800', fontSize: 13 }}>
            Cancelar y Salir
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
