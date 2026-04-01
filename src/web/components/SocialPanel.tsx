import React, { useState, useEffect } from 'react';
import { Users, Trophy, BarChart2, Medal, X } from 'lucide-react';
import { FriendsList } from './social/FriendsList';
import { FriendRequests } from './social/FriendRequests';
import { FriendChat } from './social/FriendChat';
import { NotificationCenter } from './social/NotificationCenter';
import { PlayerStats } from './stats/PlayerStats';
import { EloHistoryChart } from './stats/EloHistoryChart';
import { LevelDisplay } from './rewards/LevelDisplay';
import { AchievementsList } from './rewards/AchievementsList';
import { LeagueLeaderboard } from './league/LeagueLeaderboard';
import { useSocial, Friend } from '../hooks/useSocial';

type Tab = 'friends' | 'stats' | 'achievements' | 'league';

interface SocialPanelProps {
  onClose: () => void;
  openChatWith?: { id: string; username: string } | null;
  onChatOpened?: () => void;
}

export function SocialPanel({ onClose, openChatWith, onChatOpened }: SocialPanelProps) {
  const [tab, setTab] = useState<Tab>('friends');
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const { pendingRequests } = useSocial();

  // Navegar al chat cuando llega desde notificación
  useEffect(() => {
    if (openChatWith) {
      setChatFriend({ id: openChatWith.id, username: openChatWith.username, status: 'online' });
      onChatOpened?.();
    }
  }, [openChatWith]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'friends', label: 'Amigos', icon: <Users size={16} />, badge: pendingRequests.length },
    { id: 'stats', label: 'Stats', icon: <BarChart2 size={16} /> },
    { id: 'achievements', label: 'Logros', icon: <Medal size={16} /> },
    { id: 'league', label: 'Liga', icon: <Trophy size={16} /> },
  ];

  return (
    <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-80 bg-slate-900/98 backdrop-blur-xl border-t sm:border-t-0 sm:border-l border-white/10 flex flex-col z-40 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <span className="text-white font-bold text-sm">Social</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Chat view — ocupa todo el panel cuando está abierto */}
      {chatFriend ? (
        <div className="flex-1 flex flex-col p-4 min-h-0">
          <FriendChat
            friendId={chatFriend.id}
            friendName={chatFriend.username}
            onBack={() => setChatFriend(null)}
          />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition-all relative ${tab === t.id ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.badge && t.badge > 0 ? (
                  <span className="absolute top-1 right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'friends' && (
              <div className="space-y-4">
                {pendingRequests.length > 0 && (
                  <div>
                    <p className="text-xs text-yellow-400 uppercase tracking-widest font-bold mb-2">
                      Solicitudes ({pendingRequests.length})
                    </p>
                    <FriendRequests />
                  </div>
                )}
                <FriendsList onChat={setChatFriend} />
              </div>
            )}
            {tab === 'stats' && (
              <div className="space-y-4">
                <LevelDisplay />
                <PlayerStats />
                <EloHistoryChart />
              </div>
            )}
            {tab === 'achievements' && <AchievementsList />}
            {tab === 'league' && <LeagueLeaderboard />}
          </div>
        </>
      )}
    </div>
  );
}
