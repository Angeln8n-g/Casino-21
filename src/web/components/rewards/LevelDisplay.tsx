import React from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function LevelDisplay() {
  const { profile } = useAuth();

  const xp = profile?.xp || 0;
  const level = Math.floor(Math.sqrt(xp / 100));
  const currentLevelXP = level * level * 100;
  const nextLevelXP = (level + 1) * (level + 1) * 100;
  const progress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-yellow-400 fill-yellow-400" />
          <span className="text-white font-black text-lg">Nivel {level}</span>
        </div>
        <span className="text-gray-400 text-sm">{xp.toLocaleString()} XP</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-3 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{currentLevelXP.toLocaleString()} XP</span>
        <span>{nextLevelXP.toLocaleString()} XP</span>
      </div>
    </div>
  );
}
