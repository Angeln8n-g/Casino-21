import React from 'react';
import { ProfileHeader } from './ProfileHeader';

export type DesktopTab = 'all' | 'lobby' | 'social' | 'stats' | 'events' | 'store' | 'admin';

interface TopNavbarProps {
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
  onDeleteNotification?: (id: string) => void;
  activeTab: DesktopTab;
  onTabChange: (tab: DesktopTab) => void;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  isAdmin?: boolean;
}

export function TopNavbar({
  unreadCount,
  appNotifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onChallengeClick,
  onDeleteRead,
  onDeleteNotification,
  activeTab,
  onTabChange,
  leftCollapsed,
  rightCollapsed,
  onToggleLeft,
  onToggleRight,
  isAdmin,
}: TopNavbarProps) {
  return (
    <header className="hidden lg:block shrink-0 border-b border-white/[0.04] sticky top-0 relative z-30">
      <div className="glass-panel-strong px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">
          <div className="shrink-0">
            <ProfileHeader
              compact
              appNotifications={appNotifications}
              unreadCount={unreadCount}
              onMarkAllAsRead={onMarkAllAsRead}
              onMarkAsRead={onMarkAsRead}
              onChallengeClick={onChallengeClick}
              onDeleteRead={onDeleteRead}
              onDeleteNotification={onDeleteNotification}
            />
          </div>

          <div className="flex-1 text-center select-none">
            <h1 className="text-2xl md:text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-casino-gold via-casino-gold-dark to-yellow-800 drop-shadow-lg leading-none">
              CASINO 21
            </h1>
            <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-[0.3em] font-bold">
              Juego de cartas competitivo
            </p>
          </div>

          <div className="shrink-0 hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTabChange('all')}
              className={`glass-panel px-3 py-2 rounded-xl border text-[10px] uppercase tracking-[0.2em] font-black transition-colors ${
                activeTab === 'all' ? 'border-casino-gold/40 text-casino-gold bg-casino-gold/10' : 'border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => onTabChange('lobby')}
              className={`glass-panel px-3 py-2 rounded-xl border text-[10px] uppercase tracking-[0.2em] font-black transition-colors ${
                activeTab === 'lobby' ? 'border-casino-gold/40 text-casino-gold bg-casino-gold/10' : 'border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              Lobby
            </button>
            <button
              type="button"
              onClick={() => onTabChange('events')}
              className={`glass-panel px-3 py-2 rounded-xl border text-[10px] uppercase tracking-[0.2em] font-black transition-colors ${
                activeTab === 'events' ? 'border-casino-gold/40 text-casino-gold bg-casino-gold/10 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              Eventos
            </button>
            <button
              type="button"
              onClick={() => onTabChange('store')}
              className={`glass-panel px-3 py-2 rounded-xl border text-[10px] uppercase tracking-[0.2em] font-black transition-colors ${
                activeTab === 'store' ? 'border-purple-400/40 text-purple-400 bg-purple-400/10 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              Tienda
            </button>
            <button
              type="button"
              onClick={() => onTabChange('social')}
              className={`glass-panel px-3 py-2 rounded-xl border text-[10px] uppercase tracking-[0.2em] font-black transition-colors ${
                activeTab === 'social' ? 'border-casino-gold/40 text-casino-gold bg-casino-gold/10' : 'border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              Social
            </button>
            <button
              type="button"
              onClick={() => onTabChange('stats')}
              className={`glass-panel px-3 py-2 rounded-xl border text-[10px] uppercase tracking-[0.2em] font-black transition-colors ${
                activeTab === 'stats' ? 'border-casino-gold/40 text-casino-gold bg-casino-gold/10 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              Estadísticas
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onTabChange('admin')}
                className={`glass-panel px-3 py-2 rounded-xl border text-[10px] uppercase tracking-[0.2em] font-black transition-colors ${
                  activeTab === 'admin' ? 'border-purple-500/40 text-purple-400 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                Admin
              </button>
            )}

            {activeTab === 'all' && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
                <button
                  type="button"
                  onClick={onToggleLeft}
                  className="glass-panel w-10 h-10 rounded-xl border border-white/10 text-gray-300 hover:text-white transition-colors flex items-center justify-center"
                  title={leftCollapsed ? 'Expandir Social' : 'Contraer Social'}
                >
                  {leftCollapsed ? '⟩' : '⟨'}
                </button>
                <button
                  type="button"
                  onClick={onToggleRight}
                  className="glass-panel w-10 h-10 rounded-xl border border-white/10 text-gray-300 hover:text-white transition-colors flex items-center justify-center"
                  title={rightCollapsed ? 'Expandir Stats' : 'Contraer Stats'}
                >
                  {rightCollapsed ? '⟨' : '⟩'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
