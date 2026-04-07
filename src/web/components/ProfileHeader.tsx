import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Bell, Shield, TrendingUp, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useGame } from '../hooks/useGame';

// ─── Utility: Division from ELO ───
export function getDivisionFromElo(elo: number): { name: string; label: string; icon: string; cssClass: string } {
  if (elo < 1200) return { name: 'bronze', label: 'Bronce', icon: '🥉', cssClass: 'division-bronze' };
  if (elo < 1500) return { name: 'silver', label: 'Plata', icon: '🥈', cssClass: 'division-silver' };
  if (elo < 1800) return { name: 'gold', label: 'Oro', icon: '🥇', cssClass: 'division-gold' };
  if (elo < 2100) return { name: 'platinum', label: 'Platino', icon: '💎', cssClass: 'division-platinum' };
  return { name: 'diamond', label: 'Diamante', icon: '👑', cssClass: 'division-diamond' };
}

// ─── Utility: Level from XP ───
export function calculateLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100));
}

// ─── Utility: XP needed for next level ───
export function xpForLevel(level: number): number {
  return level * level * 100;
}

interface ProfileHeaderProps {
  compact?: boolean;
  unreadCount?: number;
  appNotifications?: { 
    id: string; 
    type: string; 
    content: string; 
    is_read: boolean; 
    created_at: string;
    metadata?: any;
  }[];
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
  onChallengeClick?: (inviteData: any) => void;
  onDeleteRead?: () => void;
}

export function ProfileHeader({ 
  compact = false, 
  unreadCount = 0, 
  appNotifications = [],
  onMarkAllAsRead,
  onMarkAsRead,
  onChallengeClick,
  onDeleteRead
}: ProfileHeaderProps) {
  const { profile, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const elo = profile?.elo || 1000;
  const xp = profile?.xp || 0;
  const level = calculateLevelFromXp(xp);
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelMinXp = xpForLevel(level);
  const progress = ((xp - currentLevelMinXp) / (nextLevelXp - currentLevelMinXp)) * 100;
  const div = getDivisionFromElo(elo);

  // Click outside and Esc listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifications]);

  if (compact) {
    return (
      <div className="flex items-center gap-3 glass-panel p-2 rounded-xl border border-white/10">
        <div className="w-10 h-10 rounded-lg bg-casino-surface-light flex items-center justify-center text-lg font-black text-casino-gold border border-casino-gold/20">
          {profile?.username?.charAt(0).toUpperCase() || 'P'}
        </div>
        <div className="flex flex-col">
          <span className="text-white font-bold text-sm leading-tight">{profile?.username || 'Jugador'}</span>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold ${div.cssClass}`}>{div.icon} {div.label}</span>
            <span className="text-[10px] text-casino-gold font-bold">Lvl {level}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-visible glass-panel-strong p-3 md:p-5 rounded-2xl border border-casino-gold/10 group animate-fade-in shadow-2xl">
      {/* ─── Header Row ─── */}
      <div className="flex justify-between items-center gap-4 relative z-20">
        
        {/* Lado Izquierdo: Perfil e Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-casino-surface-light to-casino-surface border-2 border-casino-gold/30 flex items-center justify-center text-2xl font-black text-casino-gold shadow-lg transform group-hover:rotate-1 transition-transform duration-500">
              {profile?.username?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-casino-surface border border-casino-gold/20 px-2 py-0.5 rounded-lg shadow-xl z-30">
              <span className="text-[8px] font-black uppercase text-casino-gold tracking-tighter whitespace-nowrap">
                {div.label}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display font-black text-white leading-tight truncate pr-1" title={profile?.username}>
              {profile?.username || 'Jugador'}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 shadow-inner">
                <Shield className="w-3 h-3 text-casino-gold" />
                <span className="text-[10px] font-black text-gray-400">LVL {level}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 shadow-inner">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-black text-emerald-400">{elo} ELO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Iconos y Dropdown Anchor (REGLA 1 y 3) */}
        <div className="flex items-center gap-[8px] shrink-0 relative">
          
          {/* BOTÓN CAMPANA */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifications(!showNotifications);
            }}
            className={`
              relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
              border border-white/10 bg-white/[0.03]
              ${showNotifications ? 'bg-casino-gold/20 border-casino-gold text-casino-gold shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/20'}
            `}
          >
            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-swing' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-casino-surface-light animate-bounce shadow-lg">
                {unreadCount}
              </span>
            )}
          </button>

          {/* BOTÓN LOGOUT */}
          <button 
            onClick={signOut}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 transition-all duration-300"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4 translate-x-0.5" />
          </button>

          {/* ══════════════════════════════════════════════════════════════════
               DROPDOWN DE NOTIFICACIONES (REGLA 2 y 5)
               ══════════════════════════════════════════════════════════════════ */}
          {showNotifications && (
            <div 
              ref={dropdownRef}
              className="
                absolute top-[calc(100%+10px)] right-0 lg:-right-4 xl:-right-6 2xl:-right-8
                w-[90vw] md:w-[350px] max-h-[480px]
                bg-[#020617]/95 backdrop-blur-[12px]
                border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]
                overflow-hidden z-[1000] animate-scale-up origin-top-right
              "
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-casino-gold animate-pulse" />
                  <h3 className="text-xs font-display font-black text-white uppercase tracking-widest italic">Avisos Recientes</h3>
                </div>
                <div className="flex gap-3">
                  {unreadCount > 0 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAllAsRead?.();
                      }}
                      className="text-[10px] font-black text-casino-gold hover:text-white transition-colors uppercase tracking-wider"
                    >
                      Limpiar todo
                    </button>
                  )}
                  {appNotifications.some(n => n.is_read) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRead?.();
                      }}
                      className="text-[10px] font-black text-gray-400 hover:text-red-400 transition-colors uppercase tracking-wider"
                      title="Borrar notificaciones leídas"
                    >
                      Borrar leídas
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto max-h-[400px] p-2 space-y-2 custom-scrollbar">
                {appNotifications.length === 0 ? (
                  <div className="py-12 text-center space-y-3 opacity-40">
                    <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto border border-white/5">
                      <Bell className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Bandeja vacía</p>
                  </div>
                ) : (
                  appNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) onMarkAsRead?.(n.id);
                        setShowNotifications(false);
                        if (n.type === 'friend_request') {
                          window.dispatchEvent(new CustomEvent('open_social_tab', { detail: { tab: 'friends' } }));
                        }
                        if (n.type === 'game_invitation' && n.metadata) {
                          onChallengeClick?.({
                            invitationId: n.metadata.invitation_id,
                            senderId: n.metadata.sender_id,
                            username: n.metadata.senderName || n.metadata.sender_username || 'Amigo',
                            elo: n.metadata.sender_elo || 1000,
                            level: n.metadata.sender_level || 1,
                            roomId: n.metadata.roomId || n.metadata.room_id || '????',
                            expiresAt: n.metadata.expiresAt || n.metadata.expires_at
                          });
                        }
                      }}
                      className={`
                        w-full text-left p-3.5 rounded-xl transition-all duration-300 group/notif cursor-pointer
                        border border-transparent hover:border-white/10
                        ${!n.is_read ? 'bg-white/[0.04] shadow-lg' : 'opacity-40 grayscale-[0.5]'}
                      `}
                    >
                      <div className="flex gap-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5
                          ${n.type === 'game_invitation' ? 'bg-casino-gold/20 text-casino-gold' : 'bg-blue-500/20 text-blue-400'}
                        `}>
                          {n.type === 'game_invitation' ? <Trophy className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">
                            {n.type === 'game_invitation' ? 'Desafío Real' : 'Sistema'}
                          </h4>
                          <p className="text-[11px] font-bold text-white mb-0.5 line-clamp-2 leading-relaxed">
                            {n.content}
                          </p>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-casino-gold shrink-0 mt-3 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar Row */}
      <div className="mt-5 space-y-2 relative z-10">
        <div className="flex justify-between items-end px-1">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Nivel {level}</span>
          <span className="text-[10px] font-black text-casino-gold drop-shadow-sm">{xp} / {nextLevelXp} XP</span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-casino-gold-dark via-casino-gold to-yellow-200 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${progress}%` }}
          >
             <div className="absolute inset-0 bg-white/20 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
