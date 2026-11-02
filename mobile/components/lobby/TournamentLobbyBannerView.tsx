import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, Swords, Calendar, CheckCircle2, ChevronRight, Zap } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';
import { checkInTournamentEvent } from '../../services/tournamentApi';
import {
  CASH_PRIZES_ENABLED,
  getRoundDisplayName,
  calculateDynamicPot,
  parseLegacyCoinPool,
} from '../../../src/domain/tournament';

interface ReadyMatchInfo {
  matchId: string;
  eventId: string;
  eventTitle: string;
  roundNumber: number;
  maxParticipants: number;
  gameRoomId: string;
}

interface FeaturedEventRow {
  id: string;
  title: string;
  status: 'upcoming' | 'live';
  tournament_format?: 'sit_and_go' | 'scheduled';
  start_date: string;
  entry_fee: number;
  prize_pool?: string;
  guaranteed_prize_coins?: number;
  current_prize_coins?: number;
  entry_pool_percent?: number;
  participants_count: number;
  max_participants: number;
  min_elo?: number;
  check_in_enabled?: boolean;
  check_in_deadline?: string | null;
  reward_xp_winner?: number;
  reward_store_item_id?: string | null;
  is_championship?: boolean;
}

export function TournamentLobbyBannerView() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [readyMatch, setReadyMatch] = useState<ReadyMatchInfo | null>(null);
  const [checkInEvent, setCheckInEvent] = useState<FeaturedEventRow | null>(null);
  const [featuredEvent, setFeaturedEvent] = useState<FeaturedEventRow | null>(null);
  const [enrolledMap, setEnrolledMap] = useState<Record<string, { checked_in: boolean }>>({});
  const [checkingIn, setCheckingIn] = useState(false);

  const loadBannerState = useCallback(async () => {
    try {
      setLoading(true);
      const { data: rawEvents } = await supabase
        .from('events')
        .select('*')
        .eq('type', 'torneo')
        .in('status', ['upcoming', 'live'])
        .order('start_date', { ascending: true });

      const validEvents = ((rawEvents || []) as FeaturedEventRow[]).filter(
        (ev) => CASH_PRIZES_ENABLED || !ev.is_championship
      );

      let entryMap: Record<string, { checked_in: boolean }> = {};

      if (user?.id) {
        const { data: entries } = await supabase
          .from('event_entries')
          .select('event_id, checked_in')
          .eq('player_id', user.id);

        for (const e of entries || []) {
          entryMap[e.event_id] = { checked_in: Boolean(e.checked_in) };
        }

        // Buscar si el usuario tiene algún partido activo listo para jugar
        const liveEventIds = validEvents.filter((e) => e.status === 'live').map((e) => e.id);
        if (liveEventIds.length > 0) {
          const { data: myMatches } = await supabase
            .from('tournament_matches')
            .select('id, event_id, round_number, series_game, status, winner_id, player1_id, player2_id, game_room_id')
            .in('event_id', liveEventIds)
            .is('winner_id', null)
            .in('status', ['pending', 'ready', 'playing'])
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
            .order('round_number', { ascending: true })
            .order('series_game', { ascending: true });

          const playable = (myMatches || []).find(
            (m) => m.player1_id && m.player2_id && m.game_room_id
          );

          if (playable) {
            const ev = validEvents.find((e) => e.id === playable.event_id);
            setReadyMatch({
              matchId: playable.id,
              eventId: playable.event_id,
              eventTitle: ev?.title || 'Torneo Oficial',
              roundNumber: playable.round_number,
              maxParticipants: ev?.max_participants || 8,
              gameRoomId: playable.game_room_id,
            });
          } else {
            setReadyMatch(null);
          }
        } else {
          setReadyMatch(null);
        }
      } else {
        setReadyMatch(null);
      }

      setEnrolledMap(entryMap);

      // Prioridad 2: Check-in abierto para evento donde está inscrito
      const pendingCheckIn = validEvents.find(
        (ev) =>
          ev.status === 'upcoming' &&
          ev.check_in_enabled &&
          entryMap[ev.id] &&
          !entryMap[ev.id].checked_in
      );
      setCheckInEvent(pendingCheckIn || null);

      // Prioridad 3: Sit & Go más lleno -> Programado -> En vivo
      const upcomingSng = validEvents
        .filter((ev) => ev.status === 'upcoming' && ev.tournament_format === 'sit_and_go')
        .sort((a, b) => {
          const ratioA = (a.participants_count || 0) / Math.max(1, a.max_participants || 8);
          const ratioB = (b.participants_count || 0) / Math.max(1, b.max_participants || 8);
          return ratioB - ratioA;
        });

      const upcomingScheduled = validEvents
        .filter((ev) => ev.status === 'upcoming' && ev.tournament_format !== 'sit_and_go')
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      const liveTournaments = validEvents.filter((ev) => ev.status === 'live');

      const chosenEvent = upcomingSng[0] || upcomingScheduled[0] || liveTournaments[0] || null;
      setFeaturedEvent(chosenEvent);

      console.log('Tournament banner event from API:', {
        readyMatch,
        pendingCheckIn,
        featuredEvent: chosenEvent,
      });
    } catch (err) {
      console.warn('Error loading tournament banner state:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBannerState();
  }, [loadBannerState]);

  const handleEnterMatch = async (gameRoomId: string) => {
    try {
      const socket = await socketService.connect();
      socket.emit('join_room', {
        roomId: gameRoomId,
        playerName: profile?.username || 'Jugador',
      });
      router.push('/game');
    } catch (err) {
      Alert.alert('Error', 'No se pudo conectar a la sala del partido de torneo.');
    }
  };

  const handlePerformCheckIn = async (eventId: string) => {
    try {
      setCheckingIn(true);
      await checkInTournamentEvent(eventId);
      Alert.alert('¡Check-in Confirmado!', 'Has confirmado tu asistencia al torneo.');
      await loadBannerState();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error al confirmar check-in.');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return null;
  }

  // 1. PRIORIDAD MÁXIMA: PARTIDO ACTIVO LISTO PARA JUGAR
  if (readyMatch) {
    return (
      <View className="bg-gradient-to-r from-red-950/90 to-amber-950/90 rounded-3xl p-5 mb-5 border-2 border-red-500/80 shadow-lg">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <View className="bg-red-500/20 p-2 rounded-xl mr-2.5 border border-red-500/40">
              <Swords color="#ef4444" size={20} />
            </View>
            <View>
              <Text className="text-red-400 font-black text-xs uppercase tracking-widest">
                ¡PARTIDO DE TORNEO LISTO!
              </Text>
              <Text className="text-white font-bold text-base">{readyMatch.eventTitle}</Text>
            </View>
          </View>
          <View className="bg-red-500 px-2 py-0.5 rounded-full">
            <Text className="text-white font-black text-[10px] uppercase">EN VIVO</Text>
          </View>
        </View>

        <Text className="text-slate-300 text-xs mb-3">
          Ronda: {getRoundDisplayName(readyMatch.roundNumber, readyMatch.maxParticipants)} • Sala:{' '}
          <Text className="font-mono font-bold text-amber-300">{readyMatch.gameRoomId}</Text>
        </Text>

        <Pressable
          onPress={() => handleEnterMatch(readyMatch.gameRoomId)}
          className="bg-red-600 active:bg-red-700 py-3 rounded-2xl items-center flex-row justify-center border border-red-400"
        >
          <Swords color="#ffffff" size={18} className="mr-2" />
          <Text className="text-white font-black text-sm uppercase tracking-wider">
            ENTRAR AL PARTIDO AHORA
          </Text>
        </Pressable>
      </View>
    );
  }

  // 2. PRIORIDAD 2: CHECK-IN ABIERTO
  if (checkInEvent) {
    return (
      <View className="bg-amber-950/60 rounded-3xl p-5 mb-5 border border-amber-500/60">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <View className="bg-amber-500/20 p-2 rounded-xl mr-2.5 border border-amber-500/40">
              <Zap color="#fbbf24" size={20} />
            </View>
            <View>
              <Text className="text-amber-400 font-black text-xs uppercase tracking-widest">
                CHECK-IN OBLIGATORIO
              </Text>
              <Text className="text-white font-bold text-base">{checkInEvent.title}</Text>
            </View>
          </View>
        </View>

        <Text className="text-slate-300 text-xs mb-3">
          El torneo está por comenzar. Confirma tu presencia para no perder tu cupo en la llave.
        </Text>

        <Pressable
          disabled={checkingIn}
          onPress={() => handlePerformCheckIn(checkInEvent.id)}
          className="bg-amber-500 active:bg-amber-600 py-3 rounded-2xl items-center flex-row justify-center border border-amber-400"
        >
          {checkingIn ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <>
              <CheckCircle2 color="#020617" size={18} className="mr-1.5" />
              <Text className="text-slate-950 font-black text-sm uppercase tracking-wider">
                CONFIRMAR CHECK-IN
              </Text>
            </>
          )}
        </Pressable>
      </View>
    );
  }

  // 3. PRIORIDAD 3: TORNEO DESTACADO (SIT & GO O PRÓXIMO PROGRAMADO)
  if (featuredEvent) {
    const dynamic = calculateDynamicPot(
      featuredEvent.guaranteed_prize_coins ?? 0,
      featuredEvent.entry_fee ?? 0,
      featuredEvent.participants_count ?? 0,
      featuredEvent.entry_pool_percent ?? 90
    );
    const totalCoins = typeof dynamic === 'number' && dynamic > 0 ? dynamic : parseLegacyCoinPool(featuredEvent.prize_pool);

    const isEnrolled = Boolean(enrolledMap[featuredEvent.id]);
    const isSng = featuredEvent.tournament_format === 'sit_and_go';

    return (
      <View className="bg-slate-900/90 rounded-3xl p-5 mb-5 border border-amber-500/30">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="bg-amber-500/10 p-2 rounded-xl mr-2.5 border border-amber-500/30">
              <Trophy color="#fbbf24" size={20} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider mr-2">
                  {isSng ? 'Torneo Sit & Go' : 'Torneo Oficial'}
                </Text>
                {featuredEvent.status === 'live' && (
                  <View className="bg-red-500/20 px-2 py-0.5 rounded border border-red-500/40">
                    <Text className="text-red-400 text-[9px] font-black uppercase">EN VIVO</Text>
                  </View>
                )}
              </View>
              <Text className="text-white font-bold text-base" numberOfLines={1}>
                {featuredEvent.title}
              </Text>
            </View>
          </View>

          <View className="bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 items-end">
            <Text className="text-amber-400 font-black text-xs font-mono">
              🪙 {totalCoins.toLocaleString()}
            </Text>
            <Text className="text-slate-400 text-[9px] uppercase">Pozo Total</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between py-2 border-t border-b border-slate-800 my-2">
          <Text className="text-slate-400 text-xs">
            Inscritos: <Text className="text-white font-bold">{featuredEvent.participants_count}</Text> /{' '}
            {featuredEvent.max_participants}
          </Text>

          <Text className="text-slate-400 text-xs">
            Entrada:{' '}
            <Text className="text-amber-400 font-bold">
              {featuredEvent.entry_fee > 0 ? `${featuredEvent.entry_fee} 🪙` : 'Gratis'}
            </Text>
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/events')}
          className={`py-3 rounded-2xl items-center flex-row justify-center border ${
            isEnrolled
              ? 'bg-slate-800 border-amber-500/40'
              : 'bg-amber-500 active:bg-amber-600 border-amber-400'
          }`}
        >
          <Text
            className={`font-black text-xs uppercase tracking-wider mr-1 ${
              isEnrolled ? 'text-amber-400' : 'text-slate-950'
            }`}
          >
            {isEnrolled ? 'Inscrito • Ver Cuadro' : 'Ver y Participar'}
          </Text>
          <ChevronRight color={isEnrolled ? '#fbbf24' : '#020617'} size={16} />
        </Pressable>
      </View>
    );
  }

  return null;
}
