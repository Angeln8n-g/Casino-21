import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface QuestItem {
  id: string;
  code: string;
  title: string;
  description: string;
  target_amount: number;
  reward_coins: number;
  reward_xp: number;
  reward_elo: number;
  quest_type: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  is_active: boolean;
}

const ELO_SUGGESTIONS = {
  easy: 1,
  medium: 3,
  hard: 6,
  elite: 10
};

export function QuestManager() {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuest, setCurrentQuest] = useState<Partial<QuestItem>>({
    code: '',
    title: '',
    description: '',
    target_amount: 1,
    reward_coins: 50,
    reward_xp: 10,
    reward_elo: 1,
    quest_type: 'play_match',
    difficulty: 'easy',
    is_active: true
  });

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quest_catalog')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setQuests(data || []);
    setLoading(false);
  };

  const handleDifficultyChange = (difficulty: 'easy' | 'medium' | 'hard' | 'elite') => {
    setCurrentQuest({
      ...currentQuest,
      difficulty,
      reward_elo: ELO_SUGGESTIONS[difficulty]
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (currentQuest.id) {
        // Usar RPC para actualización (admin_update_quest)
        const { error } = await supabase.rpc('admin_update_quest', {
          p_quest_id: currentQuest.id,
          p_code: currentQuest.code,
          p_title: currentQuest.title,
          p_description: currentQuest.description,
          p_target_amount: currentQuest.target_amount,
          p_reward_coins: currentQuest.reward_coins,
          p_reward_xp: currentQuest.reward_xp,
          p_reward_elo: currentQuest.reward_elo,
          p_quest_type: currentQuest.quest_type,
          p_difficulty: currentQuest.difficulty,
          p_is_active: currentQuest.is_active
        });
        if (error) throw error;
      } else {
        // Usar RPC para creación (admin_create_quest)
        const { error } = await supabase.rpc('admin_create_quest', {
          p_code: currentQuest.code,
          p_title: currentQuest.title,
          p_description: currentQuest.description,
          p_target_amount: currentQuest.target_amount,
          p_reward_coins: currentQuest.reward_coins,
          p_reward_xp: currentQuest.reward_xp,
          p_reward_elo: currentQuest.reward_elo,
          p_quest_type: currentQuest.quest_type,
          p_difficulty: currentQuest.difficulty
        });
        if (error) throw error;
      }

      setIsEditing(false);
      fetchQuests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleActive = async (quest: QuestItem) => {
    const { error } = await supabase.rpc('admin_toggle_quest', {
      p_quest_id: quest.id,
      p_is_active: !quest.is_active
    });
      
    if (error) setError(error.message);
    else fetchQuests();
  };

  const handleDuplicate = (quest: QuestItem) => {
    const { id, ...rest } = quest;
    setCurrentQuest({
      ...rest,
      code: `${rest.code}_copy`,
      title: `${rest.title} (Copia)`
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-blue-400">Gestor de Misiones</h3>
          <p className="text-xs text-gray-400">Administra las misiones diarias, dificultades y recompensas de ELO.</p>
        </div>
        <button 
          onClick={() => {
            setCurrentQuest({
              code: '',
              title: '',
              description: '',
              target_amount: 1,
              reward_coins: 50,
              reward_xp: 10,
              reward_elo: 1,
              quest_type: 'play_match',
              difficulty: 'easy',
              is_active: true
            });
            setIsEditing(true);
          }}
          className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-xl font-bold hover:bg-blue-500/40 transition border border-blue-500/30 text-sm"
        >
          + Nueva Misión
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 animate-fade-in">
          <h4 className="text-lg font-bold mb-4">{currentQuest.id ? 'Editar Misión' : 'Crear Nueva Misión'}</h4>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Código (Único)</label>
                <input required type="text" placeholder="ej: win_5_games" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.code} onChange={e => setCurrentQuest({...currentQuest, code: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título</label>
                <input required type="text" placeholder="Título visible para el jugador" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.title} onChange={e => setCurrentQuest({...currentQuest, title: e.target.value})} />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descripción</label>
                <input required type="text" placeholder="Descripción detallada de la misión" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.description} onChange={e => setCurrentQuest({...currentQuest, description: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Misión</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.quest_type} onChange={e => setCurrentQuest({...currentQuest, quest_type: e.target.value})}>
                  <option value="play_match">Jugar Partidas</option>
                  <option value="win_match">Ganar Partidas</option>
                  <option value="play_card">Jugar Cartas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cantidad Objetivo</label>
                <input required type="number" min="1" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.target_amount} onChange={e => setCurrentQuest({...currentQuest, target_amount: parseInt(e.target.value) || 1})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dificultad</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.difficulty} onChange={e => handleDifficultyChange(e.target.value as any)}>
                  <option value="easy">Fácil (Easy)</option>
                  <option value="medium">Medio (Medium)</option>
                  <option value="hard">Difícil (Hard)</option>
                  <option value="elite">Élite (Elite)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Recompensa Coins 🪙</label>
                <input required type="number" min="0" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.reward_coins} onChange={e => setCurrentQuest({...currentQuest, reward_coins: parseInt(e.target.value) || 0})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Recompensa XP</label>
                <input required type="number" min="0" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.reward_xp} onChange={e => setCurrentQuest({...currentQuest, reward_xp: parseInt(e.target.value) || 0})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Recompensa ELO 🏆</label>
                <input required type="number" min="0" max="20" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentQuest.reward_elo} onChange={e => setCurrentQuest({...currentQuest, reward_elo: parseInt(e.target.value) || 0})} />
                <p className="text-[10px] text-gray-500 mt-1 italic">Sugerido para {currentQuest.difficulty}: +{ELO_SUGGESTIONS[currentQuest.difficulty as keyof typeof ELO_SUGGESTIONS]}</p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/10 transition">Cancelar</button>
              <button type="submit" className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-500 text-white hover:bg-blue-400 transition">Guardar Misión</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                  <th className="p-4 font-black">Misión</th>
                  <th className="p-4 font-black text-center">Dificultad</th>
                  <th className="p-4 font-black">Tipo</th>
                  <th className="p-4 font-black">Recompensas</th>
                  <th className="p-4 font-black text-center">Estado</th>
                  <th className="p-4 font-black text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando catálogo de misiones...</td></tr>
                ) : quests.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay misiones configuradas.</td></tr>
                ) : (
                  quests.map(quest => (
                    <tr key={quest.id} className={`border-b border-white/5 transition-colors ${!quest.is_active ? 'opacity-50 grayscale' : 'hover:bg-white/5'}`}>
                      <td className="p-4">
                        <div className="font-bold">{quest.title}</div>
                        <div className="text-[10px] font-mono text-gray-500">{quest.code} • Objetiivo: {quest.target_amount}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          quest.difficulty === 'elite' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          quest.difficulty === 'hard' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          quest.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {quest.difficulty}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] text-gray-400 uppercase bg-white/5 px-2 py-1 rounded">{quest.quest_type.replace('_', ' ')}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-casino-gold font-bold">🪙 {quest.reward_coins}</span>
                          <span className="text-[10px] text-blue-400 font-bold">🏆 +{quest.reward_elo} ELO</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => toggleActive(quest)}
                          className={`text-[10px] px-2 py-1 rounded font-bold transition ${quest.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'}`}
                        >
                          {quest.is_active ? 'ACTIVO' : 'INACTIVO'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => {setCurrentQuest(quest); setIsEditing(true);}} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded transition">Editar</button>
                        <button onClick={() => handleDuplicate(quest)} className="text-[10px] bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 px-2 py-1.5 rounded transition">Duplicar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
