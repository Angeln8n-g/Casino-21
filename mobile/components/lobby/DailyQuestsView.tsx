import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, Trophy, Coins } from 'lucide-react-native';

interface DailyQuest {
  id: string;
  quest_id: string;
  progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  assigned_date: string;
  catalog: {
    title: string;
    description: string;
    target_amount: number;
    reward_coins: number;
    reward_xp: number;
    reward_elo: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  };
}

export function DailyQuestsView() {
  const { user, refetchProfile } = useAuth();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Asignar misiones del día si aún no existen
      await supabase.rpc('assign_daily_quests', { p_player_id: user.id });

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('player_daily_quests')
        .select(`
          id, quest_id, progress, is_completed, is_claimed, assigned_date,
          catalog:quest_catalog (title, description, target_amount, reward_coins, reward_xp, reward_elo, difficulty)
        `)
        .eq('player_id', user.id)
        .eq('assigned_date', today);

      if (error) throw error;

      const formattedQuests: DailyQuest[] = (data || []).map((q: any) => ({
        ...q,
        catalog: Array.isArray(q.catalog) ? q.catalog[0] : q.catalog,
      }));

      console.log('Daily quests from API:', formattedQuests);
      setQuests(formattedQuests);
    } catch (error) {
      console.warn('Error fetching daily quests:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleClaim = async (questId: string) => {
    if (!user) return;
    try {
      setClaimingId(questId);
      const { error } = await supabase.rpc('claim_quest_reward', { p_player_quest_id: questId });
      if (error) throw error;

      setQuests((prev) =>
        prev.map((q) => (q.id === questId ? { ...q, is_claimed: true } : q))
      );

      if (refetchProfile) {
        await refetchProfile();
      }
    } catch (error: any) {
      console.warn('Error claiming quest reward:', error);
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800 items-center justify-center py-8">
        <ActivityIndicator size="small" color="#fbbf24" />
        <Text className="text-slate-400 text-xs mt-2">Cargando misiones diarias...</Text>
      </View>
    );
  }

  if (quests.length === 0) {
    return (
      <View className="bg-slate-900/80 rounded-3xl p-6 mb-5 border border-slate-800 items-center justify-center">
        <Text className="text-3xl mb-1">📜</Text>
        <Text className="text-white font-bold text-base">Sin Misiones Diarias</Text>
        <Text className="text-slate-400 text-xs mt-1 text-center">
          Vuelve mañana para recibir nuevas misiones y recompensas.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="bg-amber-500/10 p-2 rounded-xl mr-2.5 border border-amber-500/30">
            <Sparkles color="#fbbf24" size={20} />
          </View>
          <View>
            <Text className="text-white font-bold text-lg">Misiones Diarias</Text>
            <Text className="text-slate-400 text-xs">Completa desafíos y reclama oro y ELO</Text>
          </View>
        </View>
      </View>

      <View className="space-y-3">
        {quests.map((quest) => {
          const { title, description, target_amount, reward_coins, reward_elo, difficulty } = quest.catalog;
          const targetSafe = Math.max(1, target_amount || 1);
          const progressPercent = Math.min(100, Math.round((quest.progress / targetSafe) * 100));

          const difficultyBadge =
            difficulty === 'elite'
              ? { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' }
              : difficulty === 'hard'
              ? { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
              : difficulty === 'medium'
              ? { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' }
              : { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };

          return (
            <View
              key={quest.id}
              className={`p-4 rounded-2xl mb-3 border ${
                quest.is_claimed
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  : quest.is_completed
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center flex-1 mr-2">
                  <Text className="text-white font-bold text-sm mr-2 flex-shrink" numberOfLines={1}>
                    {title}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-md border ${difficultyBadge.bg} ${difficultyBadge.border}`}>
                    <Text className={`text-[9px] font-black uppercase ${difficultyBadge.text}`}>
                      {difficulty}
                    </Text>
                  </View>
                </View>

                {quest.is_claimed && (
                  <View className="bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                    <Text className="text-slate-400 text-[10px] font-bold uppercase">Reclamada</Text>
                  </View>
                )}
              </View>

              <Text className="text-slate-400 text-xs mb-3">{description}</Text>

              {/* Barra de progreso */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden mr-3">
                  <View
                    className={`h-full rounded-full ${quest.is_completed ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </View>
                <Text className="text-slate-400 font-mono font-bold text-xs">
                  {quest.progress} / {target_amount}
                </Text>
              </View>

              {/* Recompensas y Acción */}
              <View className="flex-row items-center justify-between pt-2 border-t border-slate-800/80">
                <View className="flex-row items-center space-x-2">
                  <View className="flex-row items-center bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl mr-2">
                    <Coins color="#fbbf24" size={13} />
                    <Text className="text-amber-400 font-bold text-xs font-mono ml-1">+{reward_coins}</Text>
                  </View>

                  {reward_elo > 0 && (
                    <View className="flex-row items-center bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                      <Trophy color="#38bdf8" size={13} />
                      <Text className="text-sky-400 font-bold text-xs font-mono ml-1">+{reward_elo}</Text>
                    </View>
                  )}
                </View>

                {quest.is_completed && !quest.is_claimed ? (
                  <Pressable
                    disabled={claimingId === quest.id}
                    onPress={() => handleClaim(quest.id)}
                    className="bg-amber-500 active:bg-amber-600 px-4 py-2 rounded-xl flex-row items-center justify-center border border-amber-400"
                  >
                    {claimingId === quest.id ? (
                      <ActivityIndicator size="small" color="#020617" />
                    ) : (
                      <>
                        <Sparkles color="#020617" size={14} />
                        <Text className="text-slate-950 font-black text-xs uppercase tracking-wider ml-1">
                          Reclamar
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : !quest.is_completed ? (
                  <View className="bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    <Text className="text-slate-500 text-[10px] font-bold uppercase">En Progreso</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
