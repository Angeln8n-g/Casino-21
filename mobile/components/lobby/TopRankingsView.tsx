import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Trophy } from 'lucide-react-native';

interface LeaderboardEntry {
  id: string;
  username: string;
  elo: number;
  wins: number;
  avatar_url?: string | null;
}

function getDivisionFromElo(elo: number) {
  if (elo < 1200) return { name: 'bronze', label: 'Bronce', icon: '🥉', badgeColor: 'border-amber-700/50 text-amber-500' };
  if (elo < 1500) return { name: 'silver', label: 'Plata', icon: '🥈', badgeColor: 'border-slate-400/50 text-slate-300' };
  if (elo < 1800) return { name: 'gold', label: 'Oro', icon: '🥇', badgeColor: 'border-amber-400/50 text-amber-400' };
  if (elo < 2100) return { name: 'platinum', label: 'Platino', icon: '💎', badgeColor: 'border-cyan-400/50 text-cyan-400' };
  return { name: 'diamond', label: 'Diamante', icon: '👑', badgeColor: 'border-purple-400/50 text-purple-400' };
}

export function TopRankingsView() {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, elo, wins, avatar_url')
        .order('elo', { ascending: false })
        .limit(5);

      if (!error && data) {
        console.log('Lobby top rankings from API:', data);
        setLeaderboard(data);
      }
    } catch (err) {
      console.warn('Error fetching lobby top rankings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800 items-center justify-center py-6">
        <ActivityIndicator size="small" color="#fbbf24" />
      </View>
    );
  }

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <View className="bg-slate-900/80 rounded-3xl p-5 mb-10 border border-slate-800">
      <View className="flex-row items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <View className="flex-row items-center">
          <View className="bg-amber-500/10 p-2 rounded-xl mr-2.5 border border-amber-500/30">
            <Trophy color="#fbbf24" size={20} />
          </View>
          <View>
            <Text className="text-white font-bold text-lg">Top 5 Clasificación</Text>
            <Text className="text-slate-400 text-xs">Los mejores jugadores del servidor</Text>
          </View>
        </View>
        <View className="bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
          <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Global</Text>
        </View>
      </View>

      <View className="space-y-2">
        {leaderboard.map((entry, idx) => {
          const divInfo = getDivisionFromElo(entry.elo);
          const isCurrentUser = entry.username === profile?.username;

          const medalBg =
            idx === 0
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : idx === 1
              ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40'
              : idx === 2
              ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
              : 'bg-slate-800/80 text-slate-400 border border-slate-700';

          return (
            <View
              key={entry.id || idx}
              className={`flex-row items-center p-3 rounded-2xl mb-2 border ${
                isCurrentUser
                  ? 'bg-amber-500/10 border-amber-500/50'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              {/* Posición */}
              <View className={`w-8 h-8 rounded-xl items-center justify-center mr-3 ${medalBg}`}>
                <Text className="font-black text-xs">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                </Text>
              </View>

              {/* Nombre y tú */}
              <View className="flex-1 mr-2">
                <View className="flex-row items-center">
                  <Text
                    className={`font-bold text-sm mr-1.5 ${
                      isCurrentUser ? 'text-amber-400 font-black' : 'text-white'
                    }`}
                    numberOfLines={1}
                  >
                    {entry.username}
                  </Text>
                  {isCurrentUser && (
                    <View className="bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                      <Text className="text-amber-400 text-[9px] font-black uppercase">TÚ</Text>
                    </View>
                  )}
                </View>
                <Text className="text-slate-500 text-[11px]">{entry.wins} Victorias</Text>
              </View>

              {/* División y ELO */}
              <View className="items-end">
                <View className={`px-2 py-0.5 rounded-lg border bg-slate-900 ${divInfo.badgeColor}`}>
                  <Text className="text-[10px] font-black uppercase tracking-wider">
                    {divInfo.icon} {entry.elo} ELO
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
