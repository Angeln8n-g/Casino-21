import React from 'react';
import { ProfileHeader } from './ProfileHeader';
import { AudioControlButton } from './AudioControlButton';
import brand21Icon from '../../Public/Icon (2).png';

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
            <div className="flex items-center justify-center gap-2">
              <img src={brand21Icon} alt="Kasino21 icono" className="w-8 h-8 rounded-lg object-cover border border-casino-gold/30" />
              <h1 className="text-2xl md:text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-casino-gold via-casino-gold-dark to-yellow-800 drop-shadow-lg leading-none">
                KASINO21
              </h1>
            </div>
            <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-[0.3em] font-bold">
              Juego de cartas competitivo
            </p>
          </div>

          <div className="shrink-0 hidden lg:flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="pr-1 mr-1 border-r border-white/10">
              <AudioControlButton />
            </div>
            <button
              type="button"
              onClick={() => onTabChange('all')}
              className={`px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black transition-all duration-300 ${
                activeTab === 'all' ? 'bg-casino-gold text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Jugar
            </button>
            <button
              type="button"
              onClick={() => onTabChange('events')}
              className={`px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black transition-all duration-300 ${
                activeTab === 'events' ? 'bg-casino-gold text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Torneos
            </button>
            <button
              type="button"
              onClick={() => onTabChange('store')}
              className={`px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black transition-all duration-300 ${
                activeTab === 'store' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Tienda
            </button>
            <button
              type="button"
              onClick={() => onTabChange('social')}
              className={`px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black transition-all duration-300 ${
                activeTab === 'social' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Social
            </button>
            <button
              type="button"
              onClick={() => onTabChange('stats')}
              className={`px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black transition-all duration-300 ${
                activeTab === 'stats' ? 'bg-casino-gold text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Perfil
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onTabChange('admin')}
                className={`ml-2 px-4 py-2 rounded-xl text-[11px] uppercase tracking-widest font-black transition-all duration-300 border border-purple-500/50 ${
                  activeTab === 'admin' ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-purple-500 hover:bg-purple-500/10'
                }`}
              >
                Admin
              </button>
            )}

            {activeTab === 'all' && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
                <button
                  type="button"
                  onClick={onToggleLeft}
                  className="w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                  title={leftCollapsed ? 'Expandir Social' : 'Contraer Social'}
                >
                  {leftCollapsed ? '⟩' : '⟨'}
                </button>
                <button
                  type="button"
                  onClick={onToggleRight}
                  className="w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
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
