import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

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

export function DailyQuests() {
  const { user } = useAuth();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchQuests();
    }
  }, [user]);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      // Intentar asignar misiones si no tiene
      await supabase.rpc('assign_daily_quests', { p_player_id: user?.id });

      // Obtener misiones de hoy
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('player_daily_quests')
        .select(`
          id, quest_id, progress, is_completed, is_claimed, assigned_date,
          catalog:quest_catalog (title, description, target_amount, reward_coins, reward_xp, reward_elo, difficulty)
        `)
        .eq('player_id', user?.id)
        .eq('assigned_date', today);

      if (error) throw error;
      
      // Transform data since Supabase returns related table as array/object
      const formattedQuests = (data || []).map((q: any) => ({
        ...q,
        catalog: Array.isArray(q.catalog) ? q.catalog[0] : q.catalog
      }));
      
      setQuests(formattedQuests);
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (questId: string) => {
    if (!user) return;
    try {
      setClaimingId(questId);
      const { error } = await supabase.rpc('claim_quest_reward', { p_player_quest_id: questId });
      
      if (error) throw error;

      // Update local state to reflect claimed status
      setQuests(prev => prev.map(q => 
        q.id === questId ? { ...q, is_claimed: true } : q
      ));
      
      // Emit events so other components (like ProfileHeader) can update UI
      window.dispatchEvent(new CustomEvent('coins_updated'));
      window.dispatchEvent(new CustomEvent('elo_updated'));
    } catch (error: any) {
      console.error('Error claiming quest:', error);
      alert('Error al reclamar la recompensa: ' + error.message);
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-4 animate-pulse space-y-3">
        <div className="h-6 bg-white/5 rounded w-1/3 mb-4"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white/5 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="glass-panel p-6 text-center">
        <span className="text-3xl mb-2 block">📜</span>
        <h3 className="text-lg font-display font-bold text-white mb-1">Sin Misiones</h3>
        <p className="text-gray-400 text-sm">Vuelve mañana para nuevas misiones diarias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quests.map((quest) => {
        const { title, description, target_amount, reward_coins, reward_elo, difficulty } = quest.catalog;
        const progressPercent = Math.min(100, Math.round((quest.progress / target_amount) * 100));
        
        return (
          <div 
            key={quest.id} 
            className={`glass-panel p-4 rounded-xl relative overflow-hidden transition-all duration-300 ${
              quest.is_claimed ? 'opacity-60 grayscale' : quest.is_completed ? 'border-casino-gold/30 bg-casino-gold/5' : 'border-white/[0.04]'
            }`}
          >
            {/* Progress Background */}
            {!quest.is_claimed && (
              <div 
                className="absolute top-0 left-0 bottom-0 bg-casino-emerald/10 transition-all duration-1000 z-0"
                style={{ width: `${progressPercent}%` }}
              />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-display font-bold text-white text-sm">{title}</h4>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                    difficulty === 'elite' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                    difficulty === 'hard' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-green-500/20 text-green-400 border-green-500/30'
                  }`}>
                    {difficulty}
                  </span>
                  {quest.is_claimed && (
                    <span className="bg-gray-600/50 text-gray-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                      Reclamada
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mb-3">{description}</p>
                
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        quest.is_completed ? 'bg-casino-gold' : 'bg-casino-emerald'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 font-mono">
                    {quest.progress} / {target_amount}
                  </span>
                </div>
              </div>

              {/* Action / Reward */}
              <div className="shrink-0 flex items-center gap-2 sm:flex-col sm:gap-2 w-full sm:w-auto">
                <div className="flex gap-2">
                  <div className="bg-black/30 px-2 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/5">
                    <span className="text-xs">🪙</span>
                    <span className="text-casino-gold font-bold text-xs font-mono">+{reward_coins}</span>
                  </div>
                  {reward_elo > 0 && (
                    <div className="bg-black/30 px-2 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/5">
                      <span className="text-xs">🏆</span>
                      <span className="text-blue-400 font-bold text-xs font-mono">+{reward_elo}</span>
                    </div>
                  )}
                </div>
                
                {quest.is_completed && !quest.is_claimed ? (
                  <button
                    onClick={() => handleClaim(quest.id)}
                    disabled={claimingId === quest.id}
                    className="btn-gold px-4 py-1.5 text-xs font-bold whitespace-nowrap ml-auto sm:ml-0"
                  >
                    {claimingId === quest.id ? 'Reclamando...' : 'Reclamar'}
                  </button>
                ) : !quest.is_completed ? (
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider ml-auto sm:ml-0">
                    En progreso
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
