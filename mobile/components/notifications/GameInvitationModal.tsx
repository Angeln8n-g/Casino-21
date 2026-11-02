import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
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
  if (elo < 1200) return { label: 'Bronce', icon: '🥉', badge: 'border-amber-700/50 text-amber-500' };
  if (elo < 1500) return { label: 'Plata', icon: '🥈', badge: 'border-slate-400/50 text-slate-300' };
  if (elo < 1800) return { label: 'Oro', icon: '🥇', badge: 'border-amber-400/50 text-amber-400' };
  if (elo < 2100) return { label: 'Platino', icon: '💎', badge: 'border-cyan-400/50 text-cyan-400' };
  return { label: 'Diamante', icon: '👑', badge: 'border-purple-400/50 text-purple-400' };
}

export function GameInvitationModal({ invite, onAccept, onReject, onClose }: GameInvitationModalProps) {
  if (!invite) return null;

  const { startLoop, stopLoop } = useAudio();
  const [progress, setProgress] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [accepting, setAccepting] = useState(false);
  const loopIdRef = useRef(`invite-${invite.invitationId}`);

  const div = getDivisionFromElo(invite.elo || 1000);
  const wins = invite.wins || 0;
  const losses = invite.losses || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  useEffect(() => {
    startLoop(loopIdRef.current, 'alert', { volumeMultiplier: 0.8, playbackRate: 0.95 });

    return () => {
      stopLoop(loopIdRef.current);
    };
  }, [startLoop, stopLoop]);

  useEffect(() => {
    let endTime = new Date(invite.expiresAt).getTime();
    if (isNaN(endTime)) {
      endTime = Date.now() + 60000;
    }

    const totalMs = Math.max(1000, endTime - Date.now());

    const tick = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(tick);
        stopLoop(loopIdRef.current);
        onReject(invite.invitationId);
        onClose();
        return;
      }
      const pct = Math.max(0, (remaining / totalMs) * 100);
      setProgress(pct);
      setSecondsLeft(Math.ceil(remaining / 1000));
    }, 250);

    return () => clearInterval(tick);
  }, [invite.expiresAt, invite.invitationId, onReject, onClose, stopLoop]);

  const handleAccept = () => {
    stopLoop(loopIdRef.current);
    setAccepting(true);
    onAccept(invite.invitationId, invite.roomId);
    onClose();
  };

  const handleReject = () => {
    stopLoop(loopIdRef.current);
    onReject(invite.invitationId);
    onClose();
  };

  return (
    <Modal visible={Boolean(invite)} transparent animationType="fade">
      <View className="flex-1 bg-black/80 items-center justify-center px-4">
        <View className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/70 rounded-3xl overflow-hidden shadow-2xl">
          {/* Barra de progreso de tiempo */}
          <View className="h-1.5 w-full bg-slate-800">
            <View
              className={`h-full ${secondsLeft <= 10 ? 'bg-red-500' : 'bg-amber-400'}`}
              style={{ width: `${progress}%` }}
            />
          </View>

          <View className="p-6">
            {/* Header */}
            <View className="items-center mb-5">
              <View className="w-16 h-16 rounded-2xl bg-amber-500/20 items-center justify-center mb-3 border-2 border-amber-400">
                <Swords color="#fbbf24" size={32} />
              </View>
              <Text className="text-white font-black text-xl uppercase tracking-wider">
                ¡HAS SIDO DESAFIADO!
              </Text>
              <Text className="text-slate-400 text-xs mt-1">
                Sala Privada: <Text className="text-amber-400 font-mono font-bold">{invite.roomId}</Text>
              </Text>
            </View>

            {/* Perfil del Rival */}
            <View className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5 flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 items-center justify-center mr-3">
                <Text className="text-white font-bold text-lg">
                  {invite.username.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View className="flex-1 mr-2">
                <View className="flex-row items-center">
                  <Text className="text-white font-bold text-sm mr-2" numberOfLines={1}>
                    {invite.username}
                  </Text>
                  <Text className="text-slate-500 text-[10px] font-bold">Niv.{invite.level}</Text>
                </View>

                <View className={`inline-flex self-start px-2 py-0.5 rounded-md border mt-1 ${div.badge}`}>
                  <Text className="text-[10px] font-black uppercase">
                    {div.icon} {div.label}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <View className="flex-row items-center mb-0.5">
                  <Trophy color="#fbbf24" size={12} />
                  <Text className="text-amber-400 font-bold text-xs font-mono ml-1">{invite.elo}</Text>
                </View>
                <View className="flex-row items-center">
                  <Flame color={winRate >= 50 ? '#10b981' : '#ef4444'} size={12} />
                  <Text
                    className={`font-bold text-[11px] font-mono ml-1 ${
                      winRate >= 50 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {winRate}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Acciones */}
            <View className="space-y-3">
              <Pressable
                disabled={accepting}
                onPress={handleAccept}
                className="w-full py-3.5 rounded-2xl bg-amber-500 active:bg-amber-600 items-center justify-center flex-row border border-amber-400 shadow-lg mb-2"
              >
                {accepting ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <>
                    <Swords color="#020617" size={18} className="mr-1.5" />
                    <Text className="text-slate-950 font-black text-sm uppercase tracking-wider">
                      ACEPTAR DESAFÍO
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                disabled={accepting}
                onPress={handleReject}
                className="w-full py-3 rounded-2xl bg-slate-800/80 active:bg-slate-800 border border-slate-700 items-center justify-center"
              >
                <Text className="text-slate-400 font-bold text-xs">
                  No, gracias ({secondsLeft}s)
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
