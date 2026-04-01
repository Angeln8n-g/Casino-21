import React, { useEffect, useState } from 'react';
import { Medal } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

const ACHIEVEMENTS = [
  { id: 'first_win', name: 'Primera Victoria', description: 'Gana tu primera partida', category: 'beginner', xpReward: 50, emoji: '🥇' },
  { id: 'ten_wins', name: 'Diez Victorias', description: 'Gana 10 partidas', category: 'beginner', xpReward: 100, emoji: '🏅' },
  { id: 'fifty_wins', name: 'Cincuenta Victorias', description: 'Gana 50 partidas', category: 'intermediate', xpReward: 300, emoji: '🎖️' },
  { id: 'hundred_wins', name: 'Cien Victorias', description: 'Gana 100 partidas', category: 'intermediate', xpReward: 500, emoji: '🏆' },
  { id: 'elo_1200', name: 'Plata', description: 'Alcanza 1200 de ELO', category: 'beginner', xpReward: 100, emoji: '🥈' },
  { id: 'elo_1500', name: 'Maestro de Oro', description: 'Alcanza 1500 de ELO', category: 'intermediate', xpReward: 200, emoji: '🥇' },
  { id: 'elo_1800', name: 'Platino', description: 'Alcanza 1800 de ELO', category: 'advanced', xpReward: 350, emoji: '💎' },
  { id: 'elo_2100', name: 'Diamante', description: 'Alcanza 2100 de ELO', category: 'advanced', xpReward: 500, emoji: '💠' },
  { id: 'tournament_champ', name: 'Campeón de Torneo', description: 'Gana un torneo', category: 'master', xpReward: 500, emoji: '👑' },
  { id: 'win_streak_5', name: 'Racha de 5', description: 'Consigue 5 victorias seguidas', category: 'intermediate', xpReward: 150, emoji: '🔥' },
  { id: 'win_streak_10', name: 'Racha de 10', description: 'Consigue 10 victorias seguidas', category: 'advanced', xpReward: 400, emoji: '⚡' },
  { id: 'social_butterfly', name: 'Mariposa Social', description: 'Añade 10 amigos', category: 'beginner', xpReward: 75, emoji: '🦋' },
];

const CATEGORY_COLORS: Record<string, string> = {
  beginner: 'text-green-400 bg-green-500/10 border-green-500/20',
  intermediate: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  advanced: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  master: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

export function AchievementsList() {
  const { user } = useAuth();
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('player_achievements')
      .select('achievement_id')
      .eq('player_id', user.id)
      .then(({ data }) => setUnlockedIds(new Set(data?.map(a => a.achievement_id) || [])));
  }, [user]);

  const categories = ['all', 'beginner', 'intermediate', 'advanced', 'master'];
  const filtered = filter === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter(a => a.category === filter);
  const unlocked = filtered.filter(a => unlockedIds.has(a.id)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Medal size={18} className="text-yellow-400" />
          <span className="text-white font-bold">Logros</span>
        </div>
        <span className="text-gray-400 text-sm">{unlockedIds.size} / {ACHIEVEMENTS.length}</span>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${filter === c ? 'bg-yellow-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            {c === 'all' ? 'Todos' : c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {filtered.map(a => {
          const isUnlocked = unlockedIds.has(a.id);
          return (
            <div
              key={a.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isUnlocked ? CATEGORY_COLORS[a.category] : 'bg-white/5 border-white/5 opacity-50'}`}
            >
              <span className="text-2xl">{isUnlocked ? a.emoji : '🔒'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{a.name}</p>
                <p className="text-xs text-gray-400 truncate">{a.description}</p>
              </div>
              <span className="text-xs font-bold text-yellow-400 whitespace-nowrap">+{a.xpReward} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
