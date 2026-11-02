import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { triggerHaptic } from '../../utils/haptics';
import {
  FINAL_ROUND_NUMBER,
  getInitialRoundNumber,
  getRoundDisplayName,
} from '../../../src/domain/tournament';
import {
  claimTournamentWalkoverApi,
  inviteTournamentOpponentApi,
} from '../../services/tournamentApi';
import { Trophy, Swords, Zap, Bell, Check, Clock, ShieldAlert, ArrowLeft, X } from 'lucide-react-native';

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar?: string | null;
  isWinner?: boolean;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  status: 'pending' | 'live' | 'completed';
  game_room_id?: string | null;
  best_of?: number;
  series_game?: number;
  walkover_reason?: string | null;
  waiting_player_id?: string | null;
  waiting_since?: string | null;
}

interface TournamentBracketViewProps {
  eventId: string;
  eventTitle: string;
  maxParticipants: number;
  onClose: () => void;
  onJoinMatchRoom?: (roomId: string) => void;
}

export function TournamentBracketView({
  eventId,
  eventTitle,
  maxParticipants,
  onClose,
  onJoinMatchRoom,
}: TournamentBracketViewProps) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [inviteCooldowns, setInviteCooldowns] = useState<Record<string, number>>({});
  const [actionBusyMatchId, setActionBusyMatchId] = useState<string | null>(null);

  // ── Fetch de partidos y llaves del torneo ─────────────────
  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          id, round_number, match_order, status, winner_id,
          player1_id, player2_id, game_room_id,
          best_of, series_game,
          walkover_reason, waiting_player_id, waiting_since
        `)
        .eq('event_id', eventId);

      if (error || !data) {
        console.error('Error fetching tournament matches:', error);
        setMatches([]);
        return;
      }

      const playerIds = Array.from(
        new Set(data.flatMap((m) => [m.player1_id, m.player2_id]).filter(Boolean))
      );

      const profilesMap: Record<string, any> = {};
      if (playerIds.length > 0) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, equipped_avatar')
          .in('id', playerIds);

        (pData || []).forEach((p) => {
          profilesMap[p.id] = p;
        });
      }

      const mapped: TournamentMatch[] = data.map((m) => {
        const p1 = m.player1_id ? profilesMap[m.player1_id] : null;
        const p2 = m.player2_id ? profilesMap[m.player2_id] : null;

        return {
          id: m.id,
          round: m.round_number,
          position: m.match_order,
          player1: p1
            ? {
                id: p1.id,
                name: p1.username || 'Jugador',
                avatar: p1.equipped_avatar || p1.avatar_url,
                isWinner: m.winner_id === p1.id,
              }
            : null,
          player2: p2
            ? {
                id: p2.id,
                name: p2.username || 'Jugador',
                avatar: p2.equipped_avatar || p2.avatar_url,
                isWinner: m.winner_id === p2.id,
              }
            : null,
          status: m.status === 'in_progress' ? 'live' : m.status,
          game_room_id: m.game_room_id,
          best_of: m.best_of,
          series_game: m.series_game,
          walkover_reason: m.walkover_reason,
          waiting_player_id: m.waiting_player_id,
          waiting_since: m.waiting_since,
        };
      });

      // Regla 5.3: Evidenciar datos reales de la API
      console.log('Tournament bracket matches from API:', mapped);
      setMatches(mapped);

      // Determinar ronda activa por defecto
      if (mapped.length > 0) {
        const startR = getInitialRoundNumber(maxParticipants);
        for (let r = startR; r <= FINAL_ROUND_NUMBER; r++) {
          const rMatches = mapped.filter((m) => m.round === r);
          if (rMatches.length > 0 && rMatches.some((m) => m.status !== 'completed')) {
            setSelectedRound(r);
            break;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching bracket:', e);
    } finally {
      setLoading(false);
    }
  }, [eventId, maxParticipants]);

  useEffect(() => {
    fetchMatches();

    // Suscripción Realtime para actualizar llaves cuando termine un partido
    const channel = supabase
      .channel(`bracket_live_${eventId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchMatches]);

  // Lista de rondas
  const startRound = getInitialRoundNumber(maxParticipants);
  const roundsList: number[] = [];
  for (let r = startRound; r <= FINAL_ROUND_NUMBER; r++) {
    roundsList.push(r);
  }

  // Partido activo del jugador actual
  const userActiveMatch = matches.find(
    (m) =>
      m.status !== 'completed' &&
      user &&
      (m.player1?.id === user.id || m.player2?.id === user.id)
  );

  const filteredMatches = matches
    .filter((m) => m.round === selectedRound)
    .sort((a, b) => a.position - b.position);

  // ── Acciones de Partido ─────────────────────────────────────
  const handleInvite = async (match: TournamentMatch, opponentId: string) => {
    if (!match.game_room_id) return;
    const now = Date.now();
    if (inviteCooldowns[opponentId] && now - inviteCooldowns[opponentId] < 30000) {
      Alert.alert('Espera un momento', 'Ya has enviado un aviso recientemente.');
      return;
    }

    setActionBusyMatchId(match.id);
    try {
      const res = await inviteTournamentOpponentApi({
        opponentId,
        roomId: match.game_room_id,
        eventTitle,
        senderName: user?.email?.split('@')[0] || 'Tu oponente',
      });

      if (res.success) {
        triggerHaptic('success');
        setInviteCooldowns((prev) => ({ ...prev, [opponentId]: Date.now() }));
        Alert.alert('Aviso enviado', 'Tu oponente ha recibido la notificación de partida.');
      } else {
        Alert.alert('Error al avisar', res.error || 'No se pudo contactar al oponente.');
      }
    } finally {
      setActionBusyMatchId(null);
    }
  };

  const handleClaimWalkover = async (matchId: string) => {
    setActionBusyMatchId(matchId);
    try {
      const res = await claimTournamentWalkoverApi(matchId);
      if (res.success) {
        triggerHaptic('success');
        Alert.alert('¡Victoria por Walkover!', 'Has avanzado a la siguiente ronda reglamentariamente.');
        await fetchMatches();
      } else {
        Alert.alert('Walkover no disponible', res.error || 'Aún no se cumple el tiempo de espera.');
      }
    } finally {
      setActionBusyMatchId(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-950 p-4">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between mb-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
        <Pressable onPress={onClose} className="p-1.5 rounded-xl bg-slate-800 border border-slate-700">
          <ArrowLeft color="#fbbf24" size={18} />
        </Pressable>
        <View className="items-center flex-1 mx-2">
          <Text className="text-amber-400 font-bold text-sm text-center" numberOfLines={1}>
            {eventTitle}
          </Text>
          <Text className="text-slate-400 text-[10px] uppercase font-bold">Cuadro Eliminatorio</Text>
        </View>
        <Pressable onPress={onClose} className="p-1.5 rounded-xl bg-slate-800 border border-slate-700">
          <X color="#94a3b8" size={18} />
        </Pressable>
      </View>

      {/* ── Tu Partido Activo (Destacado) ────────────────────── */}
      {userActiveMatch && (
        <View className="bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-900 border border-amber-500/50 p-4 rounded-3xl mb-4 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <Zap color="#fbbf24" size={16} />
              <Text className="text-amber-400 font-black text-xs uppercase tracking-wider">
                Tu Partido Activo — {getRoundDisplayName(userActiveMatch.round, maxParticipants)}
              </Text>
            </View>
            <View className="bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full">
              <Text className="text-red-400 font-black text-[9px] uppercase">En Curso</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/5 my-2">
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-xs" numberOfLines={1}>
                {userActiveMatch.player1?.name || 'Esperando rival'}
              </Text>
              {userActiveMatch.player1?.id === user?.id && (
                <Text className="text-amber-400 text-[9px] font-bold">(Tú)</Text>
              )}
            </View>

            <Text className="text-slate-500 font-black text-sm px-2">VS</Text>

            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-xs" numberOfLines={1}>
                {userActiveMatch.player2?.name || 'Esperando rival'}
              </Text>
              {userActiveMatch.player2?.id === user?.id && (
                <Text className="text-amber-400 text-[9px] font-bold">(Tú)</Text>
              )}
            </View>
          </View>

          {/* Botón de Entrada al Match */}
          {userActiveMatch.game_room_id && (
            <Pressable
              onPress={() => onJoinMatchRoom && onJoinMatchRoom(userActiveMatch.game_room_id!)}
              className="bg-amber-500 active:bg-amber-600 p-3 rounded-2xl items-center flex-row justify-center gap-1.5 mt-1"
            >
              <Swords color="#020617" size={16} />
              <Text className="text-slate-950 font-black text-xs uppercase tracking-wider">
                Entrar a la Sala de Juego
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Selector Horizontal de Rondas ────────────────────── */}
      <View className="mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {roundsList.map((r) => {
            const isActive = selectedRound === r;
            const rMatches = matches.filter((m) => m.round === r);
            const isCompleted = rMatches.length > 0 && rMatches.every((m) => m.status === 'completed');

            return (
              <Pressable
                key={r}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedRound(r);
                }}
                className={`py-2 px-3.5 rounded-xl border flex-row items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500 border-amber-400'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isActive ? 'text-slate-950 font-black' : 'text-slate-400'
                  }`}
                >
                  {getRoundDisplayName(r, maxParticipants)}
                </Text>
                {isCompleted && (
                  <Text className={`text-[10px] ${isActive ? 'text-slate-950' : 'text-emerald-400'}`}>
                    ✓
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Partidos de la Ronda Seleccionada ────────────────── */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text className="text-slate-400 text-xs mt-3">Cargando partidos de la ronda...</Text>
        </View>
      ) : filteredMatches.length === 0 ? (
        <View className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 items-center mt-6">
          <Clock color="#64748b" size={36} className="mb-2" />
          <Text className="text-white font-bold text-sm mb-1">Partidos aún no definidos</Text>
          <Text className="text-slate-400 text-xs text-center">
            Los jugadores clasificados aparecerán aquí a medida que concluyan los encuentros anteriores.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }}>
          {filteredMatches.map((match) => {
            const isUserMatch =
              user && (match.player1?.id === user.id || match.player2?.id === user.id);
            const opponentId = isUserMatch
              ? match.player1?.id === user?.id
                ? match.player2?.id
                : match.player1?.id
              : null;
            const isLive = match.status === 'live';
            const isDone = match.status === 'completed';
            const isBusy = actionBusyMatchId === match.id;

            return (
              <View
                key={match.id}
                className={`bg-slate-900/90 rounded-2xl p-4 mb-3 border ${
                  isUserMatch
                    ? 'border-amber-500/60 bg-amber-950/10'
                    : isLive
                    ? 'border-red-500/40 bg-red-950/10'
                    : 'border-slate-800'
                }`}
              >
                {/* Header del Partido */}
                <View className="flex-row justify-between items-center mb-2.5">
                  <Text className="text-slate-400 font-bold text-[10px] uppercase">
                    Partido #{match.position} {match.best_of ? `• Mejor de ${match.best_of}` : ''}
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full border ${
                      isLive
                        ? 'bg-red-500/20 border-red-500/50'
                        : isDone
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-cyan-500/20 border-cyan-500/40'
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-black uppercase ${
                        isLive ? 'text-red-400' : isDone ? 'text-slate-400' : 'text-cyan-400'
                      }`}
                    >
                      {isLive ? 'EN VIVO' : isDone ? 'FINALIZADO' : 'PENDIENTE'}
                    </Text>
                  </View>
                </View>

                {/* Jugador 1 */}
                <View className="flex-row justify-between items-center p-2 rounded-xl bg-slate-800/60 mb-1.5 border border-slate-700/40">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Text className="text-base mr-2">👤</Text>
                    <Text
                      className={`text-xs font-bold ${
                        match.player1?.isWinner
                          ? 'text-emerald-400 font-black'
                          : isDone
                          ? 'text-slate-500 line-through'
                          : 'text-white'
                      }`}
                      numberOfLines={1}
                    >
                      {match.player1 ? match.player1.name : 'Por definir'}
                    </Text>
                  </View>
                  {match.player1?.isWinner && (
                    <View className="bg-emerald-500/20 px-2 py-0.5 rounded">
                      <Text className="text-emerald-400 text-[10px] font-black">Ganador</Text>
                    </View>
                  )}
                </View>

                {/* Jugador 2 */}
                <View className="flex-row justify-between items-center p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Text className="text-base mr-2">👤</Text>
                    <Text
                      className={`text-xs font-bold ${
                        match.player2?.isWinner
                          ? 'text-emerald-400 font-black'
                          : isDone
                          ? 'text-slate-500 line-through'
                          : 'text-white'
                      }`}
                      numberOfLines={1}
                    >
                      {match.player2 ? match.player2.name : 'Por definir'}
                    </Text>
                  </View>
                  {match.player2?.isWinner && (
                    <View className="bg-emerald-500/20 px-2 py-0.5 rounded">
                      <Text className="text-emerald-400 text-[10px] font-black">Ganador</Text>
                    </View>
                  )}
                </View>

                {/* Botones de Acción para el Match */}
                {isUserMatch && !isDone && (
                  <View className="flex-row gap-2 mt-3 pt-2 border-t border-slate-800">
                    {match.game_room_id && (
                      <Pressable
                        onPress={() => onJoinMatchRoom && onJoinMatchRoom(match.game_room_id!)}
                        className="flex-1 bg-amber-500 active:bg-amber-600 p-2.5 rounded-xl items-center flex-row justify-center gap-1"
                      >
                        <Swords color="#020617" size={14} />
                        <Text className="text-slate-950 font-bold text-xs">Jugar Partido</Text>
                      </Pressable>
                    )}

                    {opponentId && match.game_room_id && (
                      <Pressable
                        disabled={isBusy}
                        onPress={() => handleInvite(match, opponentId)}
                        className="bg-slate-800 active:bg-slate-700 p-2.5 rounded-xl border border-slate-700 items-center justify-center"
                      >
                        <Bell color="#fbbf24" size={15} />
                      </Pressable>
                    )}

                    {match.waiting_player_id === user?.id && (
                      <Pressable
                        disabled={isBusy}
                        onPress={() => handleClaimWalkover(match.id)}
                        className="bg-emerald-500/20 active:bg-emerald-500/30 border border-emerald-500/40 px-3 py-2.5 rounded-xl items-center justify-center"
                      >
                        <Text className="text-emerald-400 font-bold text-xs">Reclamar W.O.</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
