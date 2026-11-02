import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { appEvents } from '../../utils/events';
import {
  calculateDynamicPot,
  buildPrizeDisplayGroups,
  parseLegacyCoinPool,
  PrizeTier,
  TournamentFormat,
} from '../../../src/domain/tournament';
import {
  joinTournamentEvent,
  leaveTournamentEvent,
  checkInTournamentEvent,
} from '../../services/tournamentApi';
import { Trophy, Calendar, Users, CheckCircle2, ShieldAlert, LogOut, Check } from 'lucide-react-native';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  rules?: string;
  type: 'torneo' | 'liga' | 'especial';
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  tournament_format?: TournamentFormat;
  check_in_enabled?: boolean;
  check_in_deadline?: string | null;
  check_in_window_minutes?: number;
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: string;
  guaranteed_prize_coins?: number;
  current_prize_coins?: number;
  entry_pool_percent?: number;
  prize_tiers?: PrizeTier[] | null;
  participants_count: number;
  max_participants: number;
  is_championship?: boolean;
  is_sponsored?: boolean;
  sponsor_name?: string;
}

interface UserEntryState {
  checked_in: boolean;
}

function resolveEventCoinPot(ev: EventItem): number {
  if ((ev.current_prize_coins ?? 0) > 0) return ev.current_prize_coins!;
  const dynamic = calculateDynamicPot(
    ev.guaranteed_prize_coins ?? 0,
    ev.entry_fee ?? 0,
    ev.participants_count ?? 0,
    ev.entry_pool_percent ?? 90
  );
  if (typeof dynamic === 'number' && dynamic > 0) return dynamic;
  return parseLegacyCoinPool(ev.prize_pool);
}

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [enrolledMap, setEnrolledMap] = useState<Record<string, UserEntryState>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .neq('status', 'draft')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error al cargar eventos:', error);
      } else if (data) {
        setEvents(data as EventItem[]);
      }

      if (user?.id) {
        const { data: entries, error: entriesErr } = await supabase
          .from('event_entries')
          .select('event_id, checked_in')
          .eq('player_id', user.id);

        if (!entriesErr && entries) {
          const map: Record<string, UserEntryState> = {};
          entries.forEach((e: any) => {
            map[e.event_id] = { checked_in: Boolean(e.checked_in) };
          });
          setEnrolledMap(map);
        }
      }
    } catch (e) {
      console.error('Error al consultar eventos en Supabase:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEvents();

    const onTournamentRefresh = () => {
      fetchEvents();
    };
    appEvents.on('tournament_refresh', onTournamentRefresh);

    return () => {
      appEvents.off('tournament_refresh', onTournamentRefresh);
    };
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleJoin = async (event: EventItem) => {
    if (!user) {
      Alert.alert('Acceso requerido', 'Debes iniciar sesión para inscribirte en un torneo.');
      return;
    }

    if (enrolledMap[event.id]) {
      Alert.alert('Ya estás inscrito', `Ya formas parte del evento "${event.title}".`);
      return;
    }

    if (event.participants_count >= event.max_participants) {
      Alert.alert('Cupos agotados', 'Lo sentimos, este torneo ha alcanzado el límite de participantes.');
      return;
    }

    Alert.alert(
      'Confirmar Inscripción',
      `¿Deseas inscribirte a "${event.title}"?${
        event.entry_fee > 0
          ? ` Se descontarán ${event.entry_fee} monedas de tu cuenta.`
          : ' La entrada es gratuita.'
      }`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Inscribirme',
          onPress: async () => {
            setActionLoading(event.id);
            try {
              const res = await joinTournamentEvent(event.id);
              if (!res.success) {
                Alert.alert('Inscripción no realizada', res.error || 'No se pudo completar la inscripción.');
              } else {
                Alert.alert('¡Inscripción Exitosa!', `Te has inscrito en "${event.title}". ¡Buena suerte!`);
                await fetchEvents();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Error inesperado.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleLeave = async (event: EventItem) => {
    if (!user) return;

    Alert.alert(
      'Cancelar Inscripción',
      `¿Estás seguro de que deseas retirarte de "${event.title}"?${
        event.entry_fee > 0 ? ' Tus monedas serán reembolsadas.' : ''
      }`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Retirarme',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(event.id);
            try {
              const res = await leaveTournamentEvent(event.id);
              if (!res.success) {
                Alert.alert('Error al cancelar', res.error || 'No se pudo cancelar la inscripción.');
              } else {
                Alert.alert('Inscripción cancelada', 'Has abandonado el torneo.');
                await fetchEvents();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Error inesperado.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCheckIn = async (event: EventItem) => {
    if (!user) return;
    setActionLoading(event.id);
    try {
      const res = await checkInTournamentEvent(event.id);
      if (!res.success) {
        Alert.alert('Check-in fallido', res.error || 'No se pudo registrar el Check-in.');
      } else {
        Alert.alert('¡Check-in Confirmado!', 'Tu presencia ha sido confirmada. El cuadro iniciará pronto.');
        await fetchEvents();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error inesperado.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === 'all') return true;
    return ev.status === filter;
  });

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <View>
          <Text className="text-amber-400 font-bold text-2xl">TORNEOS & EVENTOS</Text>
          <Text className="text-slate-400 text-xs">Compite en torneos y clasifica a la Gran Final</Text>
        </View>
        <View className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
          <Trophy color="#fbbf24" size={24} />
        </View>
      </View>

      {/* Filtros de Estado */}
      <View className="flex-row gap-2 mb-4">
        {(['all', 'live', 'upcoming', 'completed'] as const).map((tab) => {
          const isActive = filter === tab;
          const labels = {
            all: 'Todos',
            live: 'En Vivo',
            upcoming: 'Próximos',
            completed: 'Finalizados',
          };
          return (
            <Pressable
              key={tab}
              onPress={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl border ${
                isActive ? 'bg-amber-500/20 border-amber-500/50' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <Text className={`text-xs font-bold ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Lista de Eventos */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text className="text-slate-400 mt-4 text-xs font-semibold">Cargando torneos desde el servidor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
          ListEmptyComponent={() => (
            <View className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 items-center mt-6">
              <Calendar color="#94a3b8" size={40} className="mb-3" />
              <Text className="text-white font-bold text-lg mb-1">Sin torneos disponibles</Text>
              <Text className="text-slate-400 text-xs text-center">
                No hay torneos bajo esta categoría en este momento. ¡Vuelve a revisar pronto!
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const entryState = enrolledMap[item.id];
            const isEnrolled = Boolean(entryState);
            const isCheckedIn = Boolean(entryState?.checked_in);
            const isLive = item.status === 'live';
            const isUpcoming = item.status === 'upcoming';
            const isCompleted = item.status === 'completed';
            const isFull = item.participants_count >= item.max_participants;
            const isActionBusy = actionLoading === item.id;

            const potCoins = resolveEventCoinPot(item);
            const maxPlayers = Math.max(2, item.max_participants || 8);
            const prizeGroups = buildPrizeDisplayGroups(potCoins, item.prize_tiers, maxPlayers);
            const firstPrize = prizeGroups[0]?.coinsEach ?? 0;

            const isCheckInAvailable =
              isEnrolled &&
              item.check_in_enabled &&
              !isCheckedIn &&
              isUpcoming;

            return (
              <View className="bg-slate-900/90 rounded-3xl p-5 mb-4 border border-slate-800">
                {/* Header del Card */}
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-amber-400 font-bold text-lg">{item.title}</Text>
                    <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>

                  <View className="flex-row gap-1 items-center">
                    {item.is_championship && (
                      <View className="bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded-full">
                        <Text className="text-purple-300 font-bold text-[9px] uppercase">Championship</Text>
                      </View>
                    )}
                    <View
                      className={`px-2 py-0.5 rounded-full border ${
                        isLive
                          ? 'bg-red-500/20 border-red-500/50'
                          : isUpcoming
                          ? 'bg-cyan-500/20 border-cyan-500/50'
                          : 'bg-slate-700/30 border-slate-700'
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-black uppercase ${
                          isLive ? 'text-red-400' : isUpcoming ? 'text-cyan-400' : 'text-slate-400'
                        }`}
                      >
                        {isLive ? 'En Vivo' : isUpcoming ? 'Próximo' : 'Finalizado'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Fechas, Cupos y Premio */}
                <View className="flex-row justify-between items-center mt-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/50">
                  <View className="flex-row items-center">
                    <Calendar color="#94a3b8" size={14} className="mr-1.5" />
                    <Text className="text-slate-300 text-xs font-semibold">
                      {isUpcoming ? `Inicia: ${formatDate(item.start_date)}` : `Fin: ${formatDate(item.end_date)}`}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Users color="#94a3b8" size={14} className="mr-1" />
                    <Text className="text-slate-400 text-xs font-mono">
                      {item.participants_count}/{item.max_participants}
                    </Text>
                  </View>
                </View>

                {/* Pozo y Entrada */}
                <View className="flex-row justify-between items-center mt-2.5 px-1">
                  <Text className="text-amber-400 font-bold text-xs">
                    🏆 Pozo: {potCoins > 0 ? `${potCoins.toLocaleString()} Monedas` : item.prize_pool}
                    {firstPrize > 0 ? ` (1º: ${firstPrize.toLocaleString()})` : ''}
                  </Text>
                  {item.entry_fee > 0 ? (
                    <Text className="text-amber-400 font-bold text-xs">🪙 Entrada: {item.entry_fee}</Text>
                  ) : (
                    <Text className="text-emerald-400 font-bold text-xs">✨ Entrada Gratis</Text>
                  )}
                </View>

                {/* Acciones para Inscripción / Check-in / Retirada */}
                {isUpcoming && (
                  <View className="mt-3.5 flex-col gap-2">
                    {isEnrolled ? (
                      <View className="flex-row gap-2">
                        {isCheckInAvailable ? (
                          <Pressable
                            disabled={isActionBusy}
                            onPress={() => handleCheckIn(item)}
                            className="flex-1 bg-emerald-500 active:bg-emerald-600 p-3 rounded-2xl items-center flex-row justify-center gap-1.5"
                          >
                            <Check color="#020617" size={16} />
                            <Text className="text-slate-950 font-bold text-xs">
                              {isActionBusy ? 'Confirmando...' : 'Confirmar Check-in'}
                            </Text>
                          </Pressable>
                        ) : isCheckedIn ? (
                          <View className="flex-1 bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-2xl items-center flex-row justify-center gap-1.5">
                            <CheckCircle2 color="#34d399" size={16} />
                            <Text className="text-emerald-400 font-bold text-xs">Check-in listo</Text>
                          </View>
                        ) : (
                          <View className="flex-1 bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-2xl items-center flex-row justify-center gap-1.5">
                            <CheckCircle2 color="#34d399" size={16} />
                            <Text className="text-emerald-400 font-bold text-xs">Inscrito</Text>
                          </View>
                        )}

                        <Pressable
                          disabled={isActionBusy}
                          onPress={() => handleLeave(item)}
                          className="bg-red-500/20 border border-red-500/30 px-3.5 rounded-2xl items-center justify-center active:bg-red-500/30"
                        >
                          <LogOut color="#f87171" size={16} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        disabled={isFull || isActionBusy}
                        onPress={() => handleJoin(item)}
                        className={`p-3 rounded-2xl items-center ${
                          isFull ? 'bg-slate-800 border border-slate-700' : 'bg-amber-500 active:bg-amber-600'
                        }`}
                      >
                        <Text className={`font-bold text-sm ${isFull ? 'text-slate-500' : 'text-slate-950'}`}>
                          {isActionBusy ? 'Inscribiendo...' : isFull ? 'Cupos Llenos' : 'Inscribirme al Torneo'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {isLive && isEnrolled && (
                  <View className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl items-center mt-3.5 flex-row justify-center gap-1.5">
                    <CheckCircle2 color="#34d399" size={16} />
                    <Text className="text-emerald-400 font-bold text-xs">Estás en competencia en este torneo</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
