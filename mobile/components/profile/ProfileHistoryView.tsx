import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Clock, Trophy, Swords, Calendar } from 'lucide-react-native';

interface MatchHistoryItem {
  id: string;
  game_mode: string;
  winner_id: string | null;
  end_time: string;
  metadata: {
    id: string;
    name: string;
    score: number;
    elo_change: number;
    coins_earned: number;
    is_winner?: boolean;
  }[];
}

const PAGE_SIZE = 10;

export function ProfileHistoryView() {
  const { user } = useAuth();
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(
    async (page = 0) => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (page === 0) setLoading(true);
      else setLoadingMore(true);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      try {
        const { data, error, count } = await supabase
          .from('match_history')
          .select('*', { count: 'exact' })
          .order('end_time', { ascending: false })
          .range(from, to);

        if (error) {
          console.error('Error fetching match history:', error);
        } else {
          // Regla 5.3: Console log demostrando datos reales de API
          console.log('Profile match history from API:', data);

          if (page === 0) {
            setHistory((data as MatchHistoryItem[]) || []);
          } else {
            setHistory((prev) => [...prev, ...((data as MatchHistoryItem[]) || [])]);
          }

          if (
            (data?.length || 0) < PAGE_SIZE ||
            (count !== null && history.length + (data?.length || 0) >= count)
          ) {
            setHasMore(false);
          }
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, history.length]
  );

  useEffect(() => {
    fetchHistory(0);
  }, [user]);

  const loadMore = () => {
    const nextPage = Math.ceil(history.length / PAGE_SIZE);
    fetchHistory(nextPage);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <View className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800 my-4 items-center">
        <ActivityIndicator size="small" color="#fbbf24" />
        <Text className="text-slate-400 text-xs mt-2">Cargando historial oficial...</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 my-4 items-center">
        <Swords color="#64748b" size={36} className="mb-2" />
        <Text className="text-white font-bold text-sm mb-1">Sin partidas registradas</Text>
        <Text className="text-slate-400 text-xs text-center">
          ¡Juega partidas competitivas para empezar a forjar tu historial!
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800 my-4">
      <View className="flex-row items-center gap-2 mb-4">
        <Clock color="#fbbf24" size={16} />
        <Text className="text-white font-bold text-xs uppercase tracking-widest">
          Historial de Partidas Oficiales
        </Text>
      </View>

      <View className="gap-2.5">
        {history.map((match) => {
          const myData = match.metadata?.find((m) => m.id === user?.id);
          const opponents = match.metadata?.filter((m) => m.id !== user?.id) || [];

          if (!myData) return null;

          const isWinner =
            myData.is_winner !== undefined
              ? myData.is_winner
              : match.winner_id === user?.id;
          const isTie = match.winner_id === null;

          const mainOpponent = opponents[0];

          return (
            <View
              key={match.id}
              className={`p-3.5 rounded-2xl border ${
                isWinner
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : isTie
                  ? 'bg-slate-800/40 border-slate-700/50'
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <View className="flex-row justify-between items-center mb-1.5">
                <View className="flex-row items-center gap-2">
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      isWinner
                        ? 'bg-emerald-500/20'
                        : isTie
                        ? 'bg-slate-700'
                        : 'bg-rose-500/20'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase ${
                        isWinner
                          ? 'text-emerald-400'
                          : isTie
                          ? 'text-slate-300'
                          : 'text-rose-400'
                      }`}
                    >
                      {isWinner ? 'VICTORIA' : isTie ? 'EMPATE' : 'DERROTA'}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-[11px] font-semibold">
                    {match.game_mode.toUpperCase()}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1">
                  <Calendar color="#64748b" size={11} />
                  <Text className="text-slate-400 text-[10px]">{formatDate(match.end_time)}</Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center mt-1">
                <Text className="text-slate-300 text-xs font-semibold" numberOfLines={1}>
                  VS {mainOpponent ? mainOpponent.name : 'Oponente'}
                </Text>

                <View className="flex-row items-center gap-3">
                  <Text
                    className={`text-xs font-bold ${
                      (myData.elo_change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(myData.elo_change || 0) >= 0 ? `+${myData.elo_change}` : myData.elo_change} ELO
                  </Text>
                  <Text className="text-amber-400 text-xs font-bold">
                    +{(myData.coins_earned || 0).toLocaleString()} 🪙
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {hasMore && (
        <Pressable
          disabled={loadingMore}
          onPress={loadMore}
          className="mt-4 bg-slate-800 p-2.5 rounded-xl items-center border border-slate-700 active:bg-slate-700"
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color="#fbbf24" />
          ) : (
            <Text className="text-amber-400 font-bold text-xs">Cargar más partidas</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}
