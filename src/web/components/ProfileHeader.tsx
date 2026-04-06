import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

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
}

export function ProfileHeader({ 
  compact = false, 
  unreadCount = 0, 
  appNotifications = [],
  onMarkAllAsRead,
  onMarkAsRead,
  onChallengeClick
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

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
    <div className="glass-panel-strong p-4 rounded-2xl border border-casino-gold/20 relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-casino-gold/5 blur-3xl rounded-full group-hover:bg-casino-gold/10 transition-colors duration-500" />
      
      <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
        {/* Avatar Section */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-casino-surface-light to-casino-surface border-2 border-casino-gold/30 flex items-center justify-center text-3xl font-black text-casino-gold shadow-xl shadow-black/40">
            {profile?.username?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-casino-surface border border-casino-gold/30 px-2 py-0.5 rounded-lg shadow-lg">
            <span className={`text-[10px] font-black uppercase text-casino-gold tracking-widest`}>
              {div.label}
            </span>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-display font-black text-white tracking-tight leading-none">
                {profile?.username || 'Jugador'}
              </h2>
              <p className="text-casino-gold/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                Estatus VIP • {div.name}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2">
                <span className="text-xs font-bold text-casino-gold">ELO</span>
                <span className="text-lg font-mono font-black text-white leading-none">{elo}</span>
              </div>
              
              {/* Notifications Toggle */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
                    showNotifications 
                      ? 'bg-casino-gold text-casino-bg shadow-[0_0_15px_rgba(251,191,36,0.4)]' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Notificaciones"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-casino-bg text-[8px] font-black flex items-center justify-center text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div 
                    ref={dropdownRef}
                    className="absolute top-12 right-0 w-80 glass-panel-strong border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-scale-up origin-top-right scale-100"
                  >
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
                      <h3 className="text-xs font-display font-black text-white uppercase tracking-widest italic">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAllAsRead?.();
                          }}
                          className="text-[9px] text-casino-gold hover:text-white uppercase tracking-widest font-black transition-colors"
                        >
                          Limpiar todo
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto bg-casino-bg/40 backdrop-blur-lg">
                      {appNotifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center gap-2">
                          <span className="text-2xl opacity-20">📭</span>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Bandeja vacía</p>
                        </div>
                      ) : (
                        appNotifications.map(notif => (
                          <div 
                            key={notif.id} 
                            className={`p-4 border-b border-white/5 last:border-0 transition-all cursor-pointer hover:bg-white/10 relative group/item ${notif.is_read ? 'opacity-50' : 'bg-white/[0.03]'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notif.is_read) onMarkAsRead?.(notif.id);
                              setShowNotifications(false);
                              
                              if (notif.type === 'game_invitation' && notif.metadata) {
                                const m = notif.metadata;
                                onChallengeClick?.({
                                  invitationId: m.invitation_id,
                                  senderId: m.sender_id,
                                  username: m.sender_username || 'Amigo',
                                  elo: m.sender_elo || 1000,
                                  level: m.sender_level || 1,
                                  wins: m.sender_wins || 0,
                                  losses: m.sender_losses || 0,
                                  xp: m.sender_xp || 0,
                                  roomId: m.room_id || '????',
                                  expiresAt: m.expires_at || new Date(Date.now() + 60000).toISOString()
                                });
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {notif.type === 'friend_request' ? '👥' :
                                   notif.type === 'game_invitation' ? '⚔️' :
                                   notif.type === 'achievement' ? '🏆' :
                                   notif.type === 'level_up' ? '⭐' : '🔔'}
                                </span>
                                <h4 className={`text-[11px] font-black uppercase tracking-wider ${notif.is_read ? 'text-gray-400' : 'text-white'}`}>
                                  {notif.type === 'game_invitation' ? 'Desafío 1v1' : 'Notificación'}
                                </h4>
                              </div>
                              {!notif.is_read && <span className="w-2 h-2 rounded-full bg-casino-gold shadow-[0_0_8px_rgba(251,191,36,0.6)] mt-1" />}
                            </div>
                            <p className={`text-[11px] mt-1 pr-4 leading-relaxed ${notif.is_read ? 'text-gray-500' : 'text-gray-300'}`}>
                              {notif.content}
                            </p>
                            <div className="flex justify-between items-center mt-2 opacity-40 text-[9px] font-bold">
                              <span>Hace un momento</span>
                              <span className="group-hover/item:text-casino-gold transition-colors italic">Ver detalles →</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sign Out */}
              <button 
                onClick={signOut}
                className="w-10 h-10 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500/50 hover:text-red-400 flex items-center justify-center transition-all border border-red-500/10 hover:border-red-500/30 shadow-inner group/out"
                title="Cerrar sesión"
              >
                <svg className="group-hover/out:-translate-x-0.5 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Level Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] font-black tracking-widest uppercase italic">
              <span className="text-white/60">Nivel {level}</span>
              <span className="text-casino-gold">{xp} / {nextLevelXp} XP</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full p-0.5 border border-white/5 overflow-hidden shadow-inner">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-casino-gold-dark via-casino-gold to-yellow-200 transition-all duration-1000 relative"
                style={{ width: `${progress}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
