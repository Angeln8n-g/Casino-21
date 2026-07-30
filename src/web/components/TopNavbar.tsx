import React from 'react';
import { ProfileHeader } from './ProfileHeader';
import { AudioControlButton } from './AudioControlButton';
import brand21Icon from '../../Public/brand21Icon-164.webp';
import { Menu, Gift } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

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
}: TopNavbarProps) {
  return (
    <header className="lg:hidden shrink-0 border-b border-white/[0.04] sticky top-0 z-30">
      <div className="bg-slate-900/80 backdrop-blur-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <img src={brand21Icon} alt="Kasino21 logo" className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg object-cover" />
            <h1 className="hidden sm:block text-xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-casino-gold to-yellow-600">
              KASINO21
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                triggerHaptic('light');
                window.dispatchEvent(new Event('open_referral_modal'));
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/30 border border-casino-gold/40 rounded-xl text-casino-gold font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_10px_rgba(250,204,21,0.15)] group cursor-pointer"
              title="Invitar Amigo y ganar +200 puntos"
            >
              <Gift className="w-3.5 h-3.5 text-casino-gold group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Invitar</span>
              <span className="text-[9px] bg-casino-gold text-black font-black px-1.5 py-0.5 rounded-md shadow-sm">
                +200 pts
              </span>
            </button>
            <AudioControlButton />
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

        </div>
      </div>
    </header>
  );
}
