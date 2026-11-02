import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Trophy, Award } from 'lucide-react-native';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'master';
  xp_reward: number;
  unlocked_at: string;
}

const CATEGORY_CONFIG = {
  beginner: { icon: '🌱', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  intermediate: { icon: '⚡', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  advanced: { icon: '🔥', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  master: { icon: '👑', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function RecentAchievementsView() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('player_achievements')
        .select(`
          id,
          unlocked_at,
          achievement:achievements (
            id,
            code,
            name,
            description,
            category,
            xp_reward
          )
        `)
        .eq('player_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        const mapped = data
          .filter((d: any) => d.achievement)
          .map((d: any) => ({
            ...d.achievement,
            unlocked_at: d.unlocked_at,
          }));

        console.log('Recent achievements from API:', mapped);
        setAchievements(mapped);
      }
    } catch (err) {
      console.warn('Error fetching recent achievements:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  if (loading) {
    return (
      <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800 items-center justify-center py-6">
        <ActivityIndicator size="small" color="#fbbf24" />
      </View>
    );
  }

  if (achievements.length === 0) {
    return (
      <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800 items-center justify-center">
        <Text className="text-2xl mb-1">🏅</Text>
        <Text className="text-white font-bold text-sm">Sin logros desbloqueados</Text>
        <Text className="text-slate-400 text-xs mt-0.5 text-center">
          ¡Juega partidas competitivas y torneos para desbloquear logros!
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-slate-900/80 rounded-3xl p-5 mb-5 border border-slate-800">
      <View className="flex-row items-center mb-3">
        <View className="bg-amber-500/10 p-2 rounded-xl mr-2.5 border border-amber-500/30">
          <Award color="#fbbf24" size={20} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-lg">Logros Recientes</Text>
          <Text className="text-slate-400 text-xs">Tus últimas condecoraciones desbloqueadas</Text>
        </View>
      </View>

      <View className="space-y-2.5">
        {achievements.map((item) => {
          const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.beginner;
          return (
            <View
              key={item.id}
              className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-2 flex-row items-center"
            >
              <View
                className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.border} border items-center justify-center mr-3`}
              >
                <Text className="text-base">{cfg.icon}</Text>
              </View>

              <View className="flex-1 mr-2">
                <Text className={`font-bold text-sm ${cfg.color}`} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-slate-400 text-xs" numberOfLines={1}>
                  {item.description}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-amber-400 font-bold text-xs font-mono">+{item.xp_reward} XP</Text>
                <Text className="text-slate-500 text-[10px] mt-0.5 font-mono">
                  {formatTimeAgo(item.unlocked_at)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
