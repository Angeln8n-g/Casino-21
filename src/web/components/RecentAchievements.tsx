import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

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
  beginner: { icon: '🌱', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  intermediate: { icon: '⚡', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  advanced: { icon: '🔥', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  master: { icon: '👑', color: 'text-casino-gold', bg: 'bg-casino-gold/10', border: 'border-casino-gold/20' },
};

export function RecentAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAchievements();
  }, [user]);

  // Auto-rotate carousel
  useEffect(() => {
    if (achievements.length <= 1) return;
    
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % achievements.length);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [achievements.length]);

  const fetchAchievements = async () => {
    try {
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
        .eq('player_id', user!.id)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        const mapped = data
          .filter((d: any) => d.achievement)
          .map((d: any) => ({
            ...d.achievement,
            unlocked_at: d.unlocked_at,
          }));
        setAchievements(mapped);
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  };

  if (loading) {
    return (
      <div className="glass-panel p-4 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-1/2 mb-3" />
        <div className="h-16 bg-white/5 rounded" />
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="glass-panel p-5 text-center">
        <div className="text-2xl mb-2">🏅</div>
        <p className="text-gray-400 text-sm">Sin logros aún</p>
        <p className="text-gray-500 text-xs mt-1">¡Juega partidas para desbloquear logros!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Carousel */}
      <div className="relative overflow-hidden rounded-2xl">
        <div 
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {achievements.map((achievement) => {
            const config = CATEGORY_CONFIG[achievement.category] || CATEGORY_CONFIG.beginner;
            return (
              <div
                key={achievement.id}
                className="w-full shrink-0 achievement-pill flex-col items-start"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} ${config.border} border flex items-center justify-center text-lg shrink-0`}>
                    {config.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-display font-bold text-sm ${config.color} truncate`}>
                      {achievement.name}
                    </h4>
                    <p className="text-gray-400 text-[11px] line-clamp-1">{achievement.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-casino-gold text-[11px] font-bold">+{achievement.xp_reward} XP</span>
                  <span className="text-gray-500 text-[10px]">{formatTimeAgo(achievement.unlocked_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carousel dots */}
      {achievements.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {achievements.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveIndex(idx);
                // Reset auto-rotation
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                  setActiveIndex(prev => (prev + 1) % achievements.length);
                }, 4000);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex 
                  ? 'bg-casino-emerald w-4' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
