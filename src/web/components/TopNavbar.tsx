import React from 'react';
import { ProfileHeader } from './ProfileHeader';
import { AudioControlButton } from './AudioControlButton';
import brand21Icon from '../../Public/Icon (2).png';
import { Menu } from 'lucide-react';

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
    <header className="lg:hidden shrink-0 border-b border-white/[0.04] sticky top-0 relative z-30">
      <div className="bg-slate-900/80 backdrop-blur-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <img src={brand21Icon} alt="Kasino21 logo" className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg object-cover" />
            <h1 className="hidden sm:block text-xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-casino-gold to-yellow-600">
              KASINO21
            </h1>
          </div>

          <div className="flex items-center gap-3">
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
