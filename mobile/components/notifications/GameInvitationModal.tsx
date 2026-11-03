import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { GameInviteToastData } from '../../hooks/useNotifications';
import { useAudio } from '../../hooks/useAudio';
import { Swords, Trophy, Flame } from 'lucide-react-native';

interface GameInvitationModalProps {
  invite: GameInviteToastData | null;
  onAccept: (invitationId: string, roomId: string) => void;
  onReject: (invitationId: string) => void;
  onClose: () => void;
}

function getDivisionFromElo(elo: number) {
  if (elo < 1200) return { label: 'Bronce', icon: '🥉', color: '#f59e0b', border: 'rgba(180, 83, 9, 0.5)' };
  if (elo < 1500) return { label: 'Plata', icon: '🥈', color: '#cbd5e1', border: 'rgba(148, 163, 184, 0.5)' };
  if (elo < 1800) return { label: 'Oro', icon: '🥇', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.5)' };
  if (elo < 2100) return { label: 'Platino', icon: '💎', color: '#22d3ee', border: 'rgba(34, 211, 238, 0.5)' };
  return { label: 'Diamante', icon: '👑', color: '#c084fc', border: 'rgba(192, 132, 252, 0.5)' };
}

export function GameInvitationModal({
  invite,
  onAccept,
  onReject,
  onClose,
}: GameInvitationModalProps) {
  // IMPORTANTE: Todos los hooks deben declararse SIEMPRE antes de cualquier return condicional
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { startLoop, stopLoop } = useAudio();
  const [progress, setProgress] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [accepting, setAccepting] = useState(false);
  const activeLoopIdRef = useRef<string | null>(null);

  const invitationId = invite?.invitationId ?? null;
  const expiresAt = invite?.expiresAt ?? null;

  useEffect(() => {
    if (!invitationId) return;

    const loopId = `invite-${invitationId}`;
    activeLoopIdRef.current = loopId;
    setAccepting(false);
    startLoop(loopId, 'alert', { volumeMultiplier: 0.8, playbackRate: 0.95 });

    return () => {
      stopLoop(loopId);
    };
  }, [invitationId, startLoop, stopLoop]);

  useEffect(() => {
    if (!invitationId || !expiresAt) return;

    let endTime = new Date(expiresAt).getTime();
    if (isNaN(endTime)) {
      endTime = Date.now() + 60000;
    }

    const totalMs = Math.max(1000, endTime - Date.now());
    if (endTime - Date.now() <= 0) {
      if (activeLoopIdRef.current) stopLoop(activeLoopIdRef.current);
      onReject(invitationId);
      onClose();
      return;
    }

    const tick = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(tick);
        if (activeLoopIdRef.current) stopLoop(activeLoopIdRef.current);
        onReject(invitationId);
        onClose();
        return;
      }
      const pct = Math.max(0, (remaining / totalMs) * 100);
      setProgress(pct);
      setSecondsLeft(Math.ceil(remaining / 1000));
    }, 250);

    return () => clearInterval(tick);
  }, [invitationId, expiresAt, onReject, onClose, stopLoop]);

  if (!invite) return null;

  const div = getDivisionFromElo(invite.elo || 1000);
  const wins = invite.wins || 0;
  const losses = invite.losses || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const handleAccept = () => {
    if (activeLoopIdRef.current) stopLoop(activeLoopIdRef.current);
    setAccepting(true);
    onAccept(invite.invitationId, invite.roomId);
    onClose();
  };

  const handleReject = () => {
    if (activeLoopIdRef.current) stopLoop(activeLoopIdRef.current);
    onReject(invite.invitationId);
    onClose();
  };

  const cardWidth = Math.min(Math.max(windowWidth - 32, 280), 370);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={handleReject} />

      <View
        style={{
          width: cardWidth,
          backgroundColor: '#0f172a',
          borderWidth: 2,
          borderColor: 'rgba(245, 158, 11, 0.7)',
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#f59e0b',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 25,
          elevation: 30,
        }}
      >
        {/* Barra de progreso de tiempo */}
        <View style={{ height: 6, width: '100%', backgroundColor: '#1e293b' }}>
          <View
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: secondsLeft <= 10 ? '#ef4444' : '#fbbf24',
            }}
          />
        </View>

        <View style={{ padding: 24 }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: 'rgba(245, 158, 11, 0.18)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
                borderWidth: 2,
                borderColor: '#fbbf24',
              }}
            >
              <Swords color="#fbbf24" size={32} />
            </View>
            <Text
              style={{
                color: '#ffffff',
                fontWeight: '900',
                fontSize: 20,
                textTransform: 'uppercase',
                letterSpacing: 1,
                textAlign: 'center',
              }}
            >
              ¡HAS SIDO DESAFIADO!
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              Sala Privada:{' '}
              <Text style={{ color: '#fbbf24', fontWeight: '800' }}>{invite.roomId}</Text>
            </Text>
          </View>

          {/* Perfil del Rival */}
          <View
            style={{
              backgroundColor: '#020617',
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#1e293b',
              marginBottom: 20,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: '#1e293b',
                borderWidth: 1,
                borderColor: '#334155',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 18 }}>
                {invite.username?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{ color: '#ffffff', fontWeight: '700', fontSize: 14, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {invite.username}
                </Text>
                <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '700' }}>
                  Niv.{invite.level}
                </Text>
              </View>

              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: div.border,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '900', color: div.color }}>
                  {div.icon} {div.label}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Trophy color="#fbbf24" size={12} />
                <Text
                  style={{
                    color: '#fbbf24',
                    fontWeight: '800',
                    fontSize: 12,
                    marginLeft: 4,
                  }}
                >
                  {invite.elo}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Flame color={winRate >= 50 ? '#10b981' : '#ef4444'} size={12} />
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 11,
                    marginLeft: 4,
                    color: winRate >= 50 ? '#34d399' : '#f87171',
                  }}
                >
                  {winRate}%
                </Text>
              </View>
            </View>
          </View>

          {/* Acciones */}
          <View style={{ gap: 10 }}>
            <Pressable
              disabled={accepting}
              onPress={handleAccept}
              style={({ pressed }) => ({
                width: '100%',
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: pressed ? '#d97706' : '#f59e0b',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: '#fbbf24',
              })}
            >
              {accepting ? (
                <ActivityIndicator size="small" color="#020617" />
              ) : (
                <>
                  <Swords color="#020617" size={18} />
                  <Text
                    style={{
                      color: '#020617',
                      fontWeight: '900',
                      fontSize: 14,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    ACEPTAR DESAFÍO
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              disabled={accepting}
              onPress={handleReject}
              style={({ pressed }) => ({
                width: '100%',
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: pressed ? '#334155' : '#1e293b',
                borderWidth: 1,
                borderColor: '#334155',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 12 }}>
                No, gracias ({secondsLeft}s)
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
