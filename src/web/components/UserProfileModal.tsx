import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { getDivisionFromElo, calculateLevelFromXp, xpForLevel } from './ProfileHeader';
import { AvatarGallery } from './AvatarGallery';
import { Edit2, Check, X, Coins, Trophy, Award, TrendingUp, Sparkles, LogOut } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface UserProfileModalProps {
  onClose: () => void;
}

export function UserProfileModal({ onClose }: UserProfileModalProps) {
  const { user, profile, signOut } = useAuth();
  
  // Stats
  const elo = profile?.elo || 1000;
  const xp = profile?.xp || 0;
  const level = calculateLevelFromXp(xp);
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelMinXp = xpForLevel(level);
  const progress = ((xp - currentLevelMinXp) / (nextLevelXp - currentLevelMinXp)) * 100;
  const div = getDivisionFromElo(elo);

  const wins = profile?.wins || 0;
  const losses = profile?.losses || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const coins = profile?.coins || 0;
  const tournamentsWon = (profile as any)?.tournaments_won || 0;

  // Username Editing States
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  // Avatar Gallery Trigger
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);

  useEffect(() => {
    if (profile?.username) {
      setNewUsername(profile.username);
    }
  }, [profile?.username]);

  const handleEditUsername = () => {
    triggerHaptic('light');
    setIsEditingUsername(true);
    setUsernameError('');
  };

  const handleCancelEdit = () => {
    triggerHaptic('light');
    setIsEditingUsername(false);
    setNewUsername(profile?.username || '');
    setUsernameError('');
  };

  const handleSaveUsername = async () => {
    if (!user) return;
    triggerHaptic('success');
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setUsernameError('El nombre no puede estar vacío');
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError('El nombre debe tener al menos 3 caracteres');
      return;
    }
    if (trimmed.length > 15) {
      setUsernameError('El nombre no puede exceder los 15 caracteres');
      return;
    }

    setIsSavingUsername(true);
    setUsernameError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', user.id);

      if (error) {
        if (error.message.includes('unique')) {
          setUsernameError('Este nombre de usuario ya está en uso');
        } else {
          setUsernameError('Error al guardar. Inténtalo de nuevo.');
        }
      } else {
        setIsEditingUsername(false);
        // Dispatch update event
        window.dispatchEvent(new Event('profile_updated'));
        window.dispatchEvent(new Event('coins_updated'));
      }
    } catch (err) {
      console.error(err);
      setUsernameError('Error de red. Inténtalo de nuevo.');
    } finally {
      setIsSavingUsername(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl transition-all max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.99) 100%)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.85), 0 0 50px rgba(251,191,36,0.08)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Large Full-Width Avatar Cover */}
        <div 
          onClick={() => { triggerHaptic('light'); setShowAvatarGallery(true); }}
          className="w-full h-52 relative overflow-hidden bg-slate-900 border-b border-white/[0.05] cursor-pointer group shrink-0"
          title="Hacer clic para cambiar avatar"
        >
          {profile?.equipped_avatar ? (
            <img src={profile.equipped_avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl font-black text-casino-gold bg-casino-surface-light">
              {profile?.username?.charAt(0).toUpperCase() || 'P'}
            </div>
          )}

          {/* Hover overlay to change avatar */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-black/75 border border-casino-gold/50 text-casino-gold text-xs font-black px-4 py-2 rounded-2xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse">
              <Sparkles className="w-3.5 h-3.5" /> Cambiar Avatar
            </span>
          </div>

          {/* Cover Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/35 pointer-events-none" />

          {/* Division Badge Over Image */}
          <div className="absolute top-4 left-4 z-10 flex items-center">
            <span className={`text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border bg-black/60 backdrop-blur-md ${div.cssClass.replace('division-', 'border-').replace('text-', '')}`}>
              {div.icon} {div.label}
            </span>
          </div>
        </div>

        {/* Main Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Identity */}
          <div className="flex flex-col items-center text-center space-y-3">

            {/* Username Editing Block */}
            <div className="w-full flex flex-col items-center">
              {isEditingUsername ? (
                <div className="flex items-center gap-2 max-w-xs w-full">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="flex-1 min-w-0 bg-black/40 border border-casino-gold/30 focus:border-casino-gold rounded-xl px-3 py-1.5 text-center text-base text-white font-bold placeholder:text-gray-600 outline-none"
                    placeholder="Nuevo nombre..."
                    maxLength={15}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveUsername}
                    disabled={isSavingUsername}
                    className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 hover:text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    {isSavingUsername ? (
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSavingUsername}
                    className="p-2 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <h3 className="text-xl font-display font-black text-white">
                    {profile?.username || 'Jugador'}
                  </h3>
                  <button
                    onClick={handleEditUsername}
                    className="p-1 rounded-lg text-gray-500 hover:text-casino-gold hover:bg-white/5 opacity-0 group-hover/name:opacity-100 focus:opacity-100 transition-opacity"
                    title="Editar nombre de usuario"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {usernameError && (
                <span className="text-[10px] text-red-400 font-bold mt-1 animate-pulse">
                  {usernameError}
                </span>
              )}

              {profile?.equipped_title && (
                <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase mt-1">
                  ✨ {profile.equipped_title} ✨
                </span>
              )}
            </div>
          </div>

          {/* Level and XP Section */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Progreso de Nivel</span>
              <span className="text-[10px] font-black text-casino-gold tabular-nums">
                Lvl {level} — {xp}/{nextLevelXp} XP
              </span>
            </div>
            <div className="h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
              <div
                className="h-full bg-gradient-to-r from-casino-gold-dark via-casino-gold to-yellow-200 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${Math.min(progress, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel p-3 text-center rounded-2xl border border-white/5 flex flex-col items-center">
              <Coins className="w-5 h-5 text-yellow-400 mb-1" />
              <span className="text-white font-bold text-sm leading-none tabular-nums">{coins}</span>
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider mt-1.5">Fichas</span>
            </div>
            <div className="glass-panel p-3 text-center rounded-2xl border border-white/5 flex flex-col items-center">
              <Trophy className="w-5 h-5 text-casino-gold mb-1" />
              <span className="text-white font-bold text-sm leading-none tabular-nums">{elo}</span>
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider mt-1.5">ELO</span>
            </div>
            <div className="glass-panel p-3 text-center rounded-2xl border border-white/5 flex flex-col items-center">
              <Award className="w-5 h-5 text-orange-400 mb-1" />
              <span className="text-white font-bold text-sm leading-none tabular-nums">{tournamentsWon}</span>
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider mt-1.5">Torneos</span>
            </div>
          </div>

          {/* Record & Win Rate */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Historial de Combates</span>
              <span className="text-white text-xs font-black tabular-nums">
                {wins}W / {losses}L
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-casino-emerald to-emerald-400 rounded-full transition-all"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className={`text-xs font-black tabular-nums shrink-0 ${winRate >= 50 ? 'text-casino-emerald animate-pulse' : 'text-red-400'}`}>
                {winRate}% WR
              </span>
            </div>

            <div className="text-[10px] text-gray-500 font-bold text-center mt-1">
              Total de Partidas Oficiales: <span className="text-gray-300">{totalGames}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions (Sign Out) */}
        <div className="p-4 border-t border-white/5 bg-black/30 flex gap-2 justify-center shrink-0">
          <button
            onClick={() => {
              triggerHaptic('success');
              signOut();
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Inner Avatar Gallery Modal */}
      {showAvatarGallery && (
        <AvatarGallery
          onClose={() => setShowAvatarGallery(false)}
          onAvatarSelected={() => {
            window.dispatchEvent(new Event('profile_updated'));
            window.dispatchEvent(new Event('coins_updated'));
          }}
          currentAvatarUrl={profile?.avatar_url}
        />
      )}
    </div>
  );
}
