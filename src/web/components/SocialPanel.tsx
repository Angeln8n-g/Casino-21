import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDivisionFromElo } from './ProfileHeader';
import { useProfilePresence, ONLINE_WINDOW_MS } from '../hooks/useProfilePresence';
import { FriendSearch } from './FriendSearch';
import { ChatWindow } from './ChatWindow';
import { FriendRequestModal, FriendRequestProfile } from './FriendRequestModal';
import { FriendProfileModal, FriendForModal } from './FriendProfileModal';
import { triggerHaptic } from '../utils/haptics';
import { socketService } from '../services/socket';

interface Friend {
  id: string;
  username: string;
  elo: number;
  level: number;
  wins: number;
  losses: number;
  xp: number;
  last_seen_at?: string | null;
  current_room_id?: string | null;
  avatar_url?: string | null;
  equipped_avatar?: string | null;
}

export function SocialPanel() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FriendRequestProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'chat'>('friends');
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [friendUnreadMap, setFriendUnreadMap] = useState<Record<string, number>>({});
  const friendIds = friends.map((f) => f.id);
  const { presenceMap, refreshPresence } = useProfilePresence(friendIds);

  const isFriendOnline = useCallback(
    (friend: Friend) => {
      const presence = presenceMap[friend.id];
      if (presence) return presence.isOnline;
      if (!friend.last_seen_at) return false;
      const ts = Date.parse(friend.last_seen_at);
      if (!Number.isFinite(ts)) return false;
      return Date.now() - ts <= ONLINE_WINDOW_MS;
    },
    [presenceMap]
  );

  // Modals
  const [selectedRequest, setSelectedRequest] = useState<FriendRequestProfile | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendForModal | null>(null);
  const [quickChallengeFriend, setQuickChallengeFriend] = useState<Friend | null>(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');

  // Escape key closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedRequest) setSelectedRequest(null);
        else if (selectedFriend) setSelectedFriend(null);
        else if (quickChallengeFriend) setQuickChallengeFriend(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRequest, selectedFriend, quickChallengeFriend]);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    fetchFriends(() => isMounted);
    fetchPendingIncoming(() => isMounted);
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // ── Fetch accepted friends ──────────────────────────────────
  const fetchFriends = useCallback(async (getIsMounted?: () => boolean) => {
    if (!user) { setLoading(false); return; }
    try {
      const query = supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .limit(30);
        
      const { data: friendships, error } = await query;

      if (getIsMounted && !getIsMounted()) return;

      if (error || !friendships) { setLoading(false); return; }

      const friendIds = [
        ...new Set(
          friendships.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id)
        )
      ];

      if (friendIds.length === 0) { 
        setFriends([]);
        setLoading(false); 
        return; 
      }

      const profilesQuery = supabase
        .from('profiles')
        .select('id, username, elo, level, wins, losses, xp, last_seen_at, current_room_id, avatar_url, equipped_avatar')
        .in('id', friendIds);
        
      const { data: profiles, error: profilesError } = await profilesQuery;

      if (getIsMounted && !getIsMounted()) return;

      if (profiles && !profilesError) setFriends(profiles);
    } catch (err: any) {
      if (getIsMounted && !getIsMounted()) return;
      console.error('Error fetching friends:', err);
    } finally {
      if (!getIsMounted || getIsMounted()) setLoading(false);
    }
  }, [user]);

  // ── Fetch pending INCOMING requests ─────────────────────────
  const fetchPendingIncoming = useCallback(async (getIsMounted?: () => boolean) => {
    if (!user) return;
    try {
      const query = supabase
        .from('friend_requests')
        .select('id, sender_id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
        
      const { data, error } = await query;

      if (getIsMounted && !getIsMounted()) return;

      if (error || !data || data.length === 0) {
        setPendingIncoming([]);
        return;
      }

      const senderIds = data.map(r => r.sender_id);
      const profilesQuery = supabase
        .from('profiles')
        .select('id, username, elo, level, wins, losses, xp, avatar_url, equipped_avatar')
        .in('id', senderIds);
        
      const { data: profiles, error: profilesError } = await profilesQuery;

      if (getIsMounted && !getIsMounted()) return;

      if (!profiles || profilesError) return;

      const requests: FriendRequestProfile[] = data
        .map(req => {
          const profile = profiles.find(p => p.id === req.sender_id);
          if (!profile) return null;
          return {
            requestId: req.id,
            senderId: req.sender_id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            equipped_avatar: profile.equipped_avatar,
            elo: profile.elo,
            level: profile.level,
            wins: profile.wins,
            losses: profile.losses,
            xp: profile.xp,
          };
        })
        .filter(Boolean) as FriendRequestProfile[];

      setPendingIncoming(requests);
    } catch (err: any) {
      if (getIsMounted && !getIsMounted()) return;
      console.error('Error fetching pending requests:', err);
    }
  }, [user]);


  // ── Real-time: new and updated friend requests ─────────────────
  useEffect(() => {
    if (!user) return;
    
    const channelName = `social_panel_fr_${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, elo, level, wins, losses, xp')
            .eq('id', payload.new.sender_id)
            .single();
          if (profile) {
            setPendingIncoming(prev => {
              if (prev.some(r => r.requestId === payload.new.id)) return prev;
              return [...prev, {
                requestId: payload.new.id,
                senderId: payload.new.sender_id,
                username: profile.username,
                elo: profile.elo,
                level: profile.level,
                wins: profile.wins,
                losses: profile.losses,
                xp: profile.xp,
              }];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friend_requests' },
        (payload) => {
          // If a request we sent was accepted, or a request we received was updated
          if (payload.new.status === 'accepted') {
            if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) {
              fetchFriends();
              setPendingIncoming(prev => prev.filter(r => r.requestId !== payload.new.id));
            }
          } else if (payload.new.status === 'rejected') {
            if (payload.new.receiver_id === user.id) {
              setPendingIncoming(prev => prev.filter(r => r.requestId !== payload.new.id));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'friend_requests' },
        (payload) => {
          setPendingIncoming(prev => prev.filter(r => r.requestId !== payload.old.id));
        }
      )
      .subscribe();
    
    // Listen for custom events from child components (like FriendSearch)
    const handleEvents = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (e.type === 'friendships_changed') {
        fetchFriends();
        fetchPendingIncoming();
      } else if (e.type === 'open_social_tab') {
        const { tab } = customEvent.detail;
        setActiveTab(tab);
      }
    };
    window.addEventListener('friendships_changed', handleEvents);
    window.addEventListener('open_social_tab', handleEvents);

    return () => { 
      supabase.removeChannel(channel);
      window.removeEventListener('friendships_changed', handleEvents);
      window.removeEventListener('open_social_tab', handleEvents);
    };
  }, [user, fetchFriends, fetchPendingIncoming]);

  // ── Real-time: Chat Badges ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch of unread counts
    const fetchUnread = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      
      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach(m => {
          counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
        });
        setFriendUnreadMap(counts);
        
        // Sum total overall unread messages
        setUnreadMessagesCount(data.length);
      }
    };
    fetchUnread();

    const channelName = `social_panel_msgs_${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleRequestAccepted = (requestId: string) => {
    setPendingIncoming(prev => prev.filter(r => r.requestId !== requestId));
    fetchFriends();
  };

  const handleRequestRejected = (requestId: string) => {
    setPendingIncoming(prev => prev.filter(r => r.requestId !== requestId));
  };

  const openFriendModal = (friend: Friend) => {
    const isOnline = isFriendOnline(friend);
    const roomId = friend.current_room_id ?? null;
    setSelectedFriend({
      id: friend.id,
      username: friend.username,
      avatar_url: friend.avatar_url,
      equipped_avatar: friend.equipped_avatar,
      elo: friend.elo,
      level: friend.level,
      wins: friend.wins,
      losses: friend.losses,
      xp: friend.xp,
      isOnline,
      roomId,
    });
  };

  const tabCount = pendingIncoming.length;

  const sortedFriends = useMemo(() => {
    let filtered = friends;
    if (friendSearchQuery.trim()) {
      const q = friendSearchQuery.toLowerCase();
      filtered = friends.filter((f) => f.username.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      const aOnline = isFriendOnline(a);
      const bOnline = isFriendOnline(b);
      const aInRoom = presenceMap[a.id]?.isInRoom ?? !!a.current_room_id;
      const bInRoom = presenceMap[b.id]?.isInRoom ?? !!b.current_room_id;
      const aOrder = aOnline && !aInRoom ? 0 : aOnline && aInRoom ? 1 : 2;
      const bOrder = bOnline && !bInRoom ? 0 : bOnline && bInRoom ? 1 : 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.elo - a.elo;
    });
  }, [friends, presenceMap, isFriendOnline, friendSearchQuery]);

  return (
    <>
      <div className="flex flex-col h-full space-y-5 glass-panel p-4 md:p-6 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-lg relative z-10">
        {/* ── TABS ──────────────────────────────────────────── */}
        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shrink-0 overflow-x-auto custom-scrollbar shadow-inner">
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('friends'); }}
            className={`flex-1 py-2 text-xs uppercase tracking-widest font-black rounded-xl transition-all relative whitespace-nowrap px-4 ${
              activeTab === 'friends' ? 'bg-white/10 text-casino-gold shadow-md border border-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            Amigos
            {tabCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-black text-white flex items-center justify-center px-1 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-bounce">
                {tabCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('search'); }}
            className={`flex-1 py-2 text-xs uppercase tracking-widest font-black rounded-xl transition-all whitespace-nowrap px-4 ${
              activeTab === 'search' ? 'bg-white/10 text-casino-gold shadow-md border border-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            Buscar
          </button>
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('chat'); }}
            className={`flex-1 py-2 text-xs uppercase tracking-widest font-black rounded-xl transition-all relative whitespace-nowrap px-4 ${
              activeTab === 'chat' ? 'bg-white/10 text-casino-gold shadow-md border border-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            Chat
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-black text-white flex items-center justify-center px-1 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                {unreadMessagesCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* ─── AMIGOS TAB ─────────────────────────────────── */}
          {activeTab === 'friends' && (
            <div className="space-y-3 animate-fade-in h-full flex flex-col pb-2">
              {/* Pending incoming requests */}
              {pendingIncoming.length > 0 && (
                <div className="shrink-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="section-header mb-0 text-casino-gold drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">📨 Solicitudes</h3>
                    <span className="bg-red-500/20 text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                      {pendingIncoming.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {pendingIncoming.map(req => {
                      const div = getDivisionFromElo(req.elo);
                      return (
                        <div
                          key={req.requestId}
                          onClick={() => { triggerHaptic('card_tap'); setSelectedRequest(req); }}
                          className="glass-panel px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:border-casino-gold/50 transition-all group border border-casino-gold/20 bg-black/20 backdrop-blur-sm hover:shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-casino-gold/40 to-casino-gold/10 flex items-center justify-center text-xs font-bold text-casino-gold shrink-0 border border-casino-gold/30 overflow-hidden">
                            {req.equipped_avatar ? (
                              <img 
                                src={req.equipped_avatar} 
                                alt="Avatar" 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  if (target.parentElement) target.parentElement.innerHTML = req.username.charAt(0).toUpperCase();
                                }}
                              />
                            ) : req.avatar_url ? (
                              <img 
                                src={req.avatar_url} 
                                alt="Avatar" 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  if (target.parentElement) target.parentElement.innerHTML = req.username.charAt(0).toUpperCase();
                                }}
                              />
                            ) : (
                              req.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white font-medium truncate group-hover:text-casino-gold transition-colors drop-shadow-md">
                              {req.username}
                            </p>
                            <div className={`division-badge ${div.cssClass} text-[8px] mt-0.5`}>
                              {div.icon} {req.elo}
                            </div>
                          </div>
                          <span className="shrink-0 text-[9px] text-casino-gold/80 font-bold uppercase tracking-wider group-hover:text-casino-gold transition-colors group-hover:drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]">
                            Ver →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-white/5 pt-1" />
                </div>
              )}

              {/* Friends header */}
              <div className="flex items-center justify-between shrink-0">
                <h3 className="section-header mb-0">👥 Mis Amigos</h3>
                <span className="text-gray-600 text-[10px]">
                  {friends.filter(isFriendOnline).length} en línea
                </span>
              </div>

              {friends.length > 3 && (
                <div className="relative shrink-0">
                  <input
                    type="text"
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    placeholder="Filtrar amigos..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-casino-gold/50 transition-colors"
                  />
                  {friendSearchQuery && (
                    <button
                      onClick={() => setFriendSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Friends list */}
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1.5 min-h-[100px]">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-panel p-3 animate-pulse flex items-center gap-3 bg-black/20">
                        <div className="w-8 h-8 rounded-full bg-white/5" />
                        <div className="flex-1">
                          <div className="h-3 bg-white/5 rounded w-20 mb-1" />
                          <div className="h-2 bg-white/5 rounded w-14" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : friends.length === 0 ? (
                  <div className="glass-panel p-5 text-center bg-black/20 backdrop-blur-md">
                    <div className="text-2xl mb-2 opacity-40">👤</div>
                    <p className="text-gray-500 text-xs">Aún no tienes amigos</p>
                    <p className="text-gray-600 text-[10px] mt-1">Busca jugadores y envíales una solicitud</p>
                  </div>
                ) : (
                  sortedFriends.map((friend) => {
                    const div = getDivisionFromElo(friend.elo);
                    const isOnline = isFriendOnline(friend);
                    const presence = presenceMap[friend.id];
                    const isInRoom = presence?.isInRoom ?? !!friend.current_room_id;
                    const unread = friendUnreadMap[friend.id] || 0;

                    return (
                      <div
                        key={friend.id}
                        className="glass-panel px-3 py-2.5 flex items-center gap-3 hover:border-white/[0.15] transition-all group bg-black/20 backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_15px_rgba(255,255,255,0.05)]"
                      >
                        {/* Avatar + status dot */}
                        <div className="relative shrink-0 cursor-pointer" onClick={() => { triggerHaptic('card_tap'); openFriendModal(friend); }}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-inner overflow-hidden ${
                            isOnline ? 'bg-gradient-to-br from-casino-emerald/20 to-black/50 text-white border border-casino-emerald/30' : 'bg-white/5 text-gray-500 border border-white/5'
                          }`}>
                            {friend.equipped_avatar ? (
                              <img 
                                src={friend.equipped_avatar} 
                                alt="Avatar" 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  if (target.parentElement) target.parentElement.innerHTML = friend.username.charAt(0).toUpperCase();
                                }}
                              />
                            ) : friend.avatar_url ? (
                              <img 
                                src={friend.avatar_url} 
                                alt="Avatar" 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  if (target.parentElement) target.parentElement.innerHTML = friend.username.charAt(0).toUpperCase();
                                }}
                              />
                            ) : (
                              friend.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0B101A] transition-colors shadow-sm ${
                            !isOnline ? 'bg-gray-600'
                            : isInRoom ? 'bg-purple-500 animate-pulse drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]'
                            : 'bg-casino-emerald drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]'
                          }`} />
                        </div>

                        {/* Name + status */}
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { triggerHaptic('card_tap'); openFriendModal(friend); }}>
                          <p className={`text-sm font-bold truncate transition-colors drop-shadow-sm ${
                            isOnline ? 'text-gray-100 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-300'
                          }`}>
                            {friend.username}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`division-badge ${div.cssClass} text-[8px]`}>
                              {div.icon} {friend.elo}
                            </div>
                            {isOnline && (
                              <span className={`text-[8px] font-black uppercase tracking-wider ${
                                isInRoom ? 'text-purple-400 drop-shadow-[0_0_3px_rgba(168,85,247,0.5)]' : 'text-casino-emerald drop-shadow-[0_0_3px_rgba(16,185,129,0.5)]'
                              }`}>
                                {isInRoom ? '🎮 En partida' : '● Online'}
                              </span>
                            )}
                            {unread > 0 && (
                              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chat Button */}
                        <button
                          onClick={() => {
                            triggerHaptic('card_tap');
                            setActiveChatFriendId(friend.id);
                            setActiveTab('chat');
                          }}
                          className="shrink-0 p-2 rounded-lg bg-white/5 text-gray-400 hover:text-casino-gold hover:bg-casino-gold/10 hover:border-casino-gold/30 border border-transparent transition-all md:opacity-0 md:group-hover:opacity-100 opacity-100 shadow-sm"
                          title="Chat privado"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </button>
                        {isFriendOnline(friend) && !isInRoom && (
                          <button
                            onClick={() => {
                              triggerHaptic('card_tap');
                              setQuickChallengeFriend(friend);
                            }}
                            className="shrink-0 p-2 rounded-lg bg-white/5 text-gray-400 hover:text-casino-gold hover:bg-casino-gold/10 hover:border-casino-gold/30 border border-transparent transition-all md:opacity-0 md:group-hover:opacity-100 opacity-100 shadow-sm"
                            title="Desafiar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m18 16 4-4-4-4M6 8l-4 4 4 4m8.5-12-5 16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Online counter summary */}
              <div className="glass-panel px-4 py-2.5 flex items-center justify-between shrink-0 mt-auto bg-black/20 backdrop-blur-md shadow-[0_-5px_15px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-casino-emerald" />
                    <span className="text-gray-400 text-[10px]">Online</span>
                    <span className="text-white font-bold text-[10px]">
                      {friends.filter(f => {
                        const p = presenceMap[f.id];
                        return p ? p.isOnline && !p.isInRoom : isFriendOnline(f) && !f.current_room_id;
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="text-gray-400 text-[10px]">En partida</span>
                    <span className="text-white font-bold text-[10px]">
                      {friends.filter(f => {
                        const p = presenceMap[f.id];
                        return p ? p.isInRoom : isFriendOnline(f) && !!f.current_room_id;
                      }).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── BUSCAR TAB ─────────────────────────────────── */}
          {activeTab === 'search' && (
            <div className="animate-fade-in h-full flex flex-col pb-2">
              <h3 className="section-header shrink-0">🔍 Buscar Jugadores</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <FriendSearch />
              </div>
            </div>
          )}

          {/* ─── CHAT TAB ───────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="animate-fade-in h-full flex flex-col pb-2">
              <div className="flex items-center justify-between shrink-0 mb-2">
                <h3 className="section-header mb-0">
                  {activeChatFriendId 
                    ? `💬 Chat con ${friends.find(f => f.id === activeChatFriendId)?.username || 'Amigo'}` 
                    : '💬 Chat Global'}
                </h3>
                {activeChatFriendId && (
                  <button 
                    onClick={() => { triggerHaptic('light'); setActiveChatFriendId(null); }}
                    className="text-[10px] text-gray-500 hover:text-casino-gold font-bold uppercase transition-colors flex items-center gap-1"
                  >
                    <span>←</span> Global
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow receiverId={activeChatFriendId || undefined} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─────────────────────────────────────────────── */}
      {selectedRequest && (
        <FriendRequestModal
          request={selectedRequest}
          onAccepted={handleRequestAccepted}
          onRejected={handleRequestRejected}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {selectedFriend && (
        <FriendProfileModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onOpenChat={() => {
            setActiveChatFriendId(selectedFriend.id);
            setActiveTab('chat');
            setSelectedFriend(null);
          }}
        />
      )}

      {quickChallengeFriend && (
        <QuickChallengeModal
          friend={{
            id: quickChallengeFriend.id,
            username: quickChallengeFriend.username,
            avatar_url: quickChallengeFriend.avatar_url,
            equipped_avatar: quickChallengeFriend.equipped_avatar,
            elo: quickChallengeFriend.elo,
            level: quickChallengeFriend.level,
            wins: quickChallengeFriend.wins,
            losses: quickChallengeFriend.losses,
            xp: quickChallengeFriend.xp,
            isOnline: true,
            roomId: null,
          }}
          onClose={() => setQuickChallengeFriend(null)}
        />
      )}
    </>
  );
}

const CHALLENGE_DURATION_MS = 60_000;

function QuickChallengeModal({ friend, onClose }: { friend: FriendForModal; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [state, setState] = useState<'idle' | 'waiting' | 'accepted' | 'expired'>('idle');
  const [progress, setProgress] = useState(100);
  const [betAmount, setBetAmount] = useState(0);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [challengeRoomId, setChallengeRoomId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const closeChallengeRoom = async (roomId?: string | null) => {
    if (!roomId) return;
    try {
      const socket = await socketService.connect();
      socket.emit('cancel_room', { roomId, reason: 'challenge_cancelled' });
    } catch { /* ignore */ }
  };

  const startCountdown = (invId: string, roomId: string) => {
    startTimeRef.current = Date.now();
    setProgress(100);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / CHALLENGE_DURATION_MS) * 100);
      setProgress(pct);
      if (pct <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setState('expired');
        supabase.from('game_invitations').update({ status: 'expired' }).eq('id', invId).then(() => {});
        closeChallengeRoom(roomId);
      }
    }, 250);
  };

  const handleChallenge = async () => {
    if (!user) return;
    setState('waiting');
    try {
      const socket = await socketService.connect();
      const roomId = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
        socket.once('room_created', ({ roomId }: { roomId: string }) => {
          clearTimeout(timeout);
          resolve(roomId);
        });
        socket.emit('create_room', {
          playerName: user.user_metadata?.username || user.email?.split('@')[0] || 'Jugador',
          mode: '1v1',
          betAmount,
        });
      });

      const expiresAt = new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString();
      const { data, error } = await supabase
        .from('game_invitations')
        .insert({ sender_id: user.id, receiver_id: friend.id, status: 'pending', expires_at: expiresAt, room_id: roomId, bet_amount: betAmount })
        .select('id')
        .single();
      if (error) throw error;
      setInvitationId(data.id);
      setChallengeRoomId(roomId);

      const { data: senderProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const betText = betAmount > 0 ? ` por ${betAmount} 🪙` : '';
      await supabase.from('notifications').insert({
        player_id: friend.id,
        type: 'game_invitation',
        content: `¡${senderProfile?.username || 'Un amigo'} te ha desafiado${betText}!`,
        is_read: false,
        metadata: { sender_id: user.id, invitation_id: data.id, roomId, senderName: senderProfile?.username, expiresAt, betAmount },
      });

      startCountdown(data.id, roomId);

      const channel = supabase
        .channel(`quick_challenge_${data.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_invitations', filter: `id=eq.${data.id}` }, (payload) => {
          if (payload.new.status === 'accepted') {
            if (timerRef.current) clearInterval(timerRef.current);
            setState('accepted');
            setChallengeRoomId(null);
            supabase.removeChannel(channel);
            setTimeout(onClose, 1250);
          } else if (['rejected', 'cancelled', 'expired'].includes(payload.new.status)) {
            if (timerRef.current) clearInterval(timerRef.current);
            setState('expired');
            closeChallengeRoom(roomId);
            setChallengeRoomId(null);
            supabase.removeChannel(channel);
          }
        })
        .subscribe();
    } catch {
      setState('idle');
    }
  };

  const handleCancel = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (invitationId) await supabase.from('game_invitations').update({ status: 'cancelled' }).eq('id', invitationId);
    await closeChallengeRoom(challengeRoomId);
    setState('idle');
    setInvitationId(null);
    setChallengeRoomId(null);
  };

  const secondsLeft = Math.ceil((progress / 100) * (CHALLENGE_DURATION_MS / 1000));

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(2,6,23,0.99) 100%)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 50px rgba(251,191,36,0.1)' }}>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="h-16 bg-gradient-to-r from-casino-gold/20 via-casino-emerald/10 to-casino-gold/20 flex items-center justify-center">
          <span className="text-sm font-black text-casino-gold tracking-widest uppercase">Desafiar a {friend.username}</span>
        </div>

        <div className="px-6 py-5 space-y-4">
          {state === 'idle' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Apuesta</label>
                <div className="flex gap-2">
                  {[0, 50, 100, 250, 500].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                        betAmount === amount
                          ? 'bg-casino-gold/20 border-casino-gold text-casino-gold shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {amount === 0 ? 'Gratis' : `${amount}`}
                    </button>
                  ))}
                </div>
                {betAmount > 0 && (
                  <div className={`mt-1 text-[10px] font-bold ${profile?.coins !== undefined && profile.coins >= betAmount ? 'text-emerald-400' : 'text-red-400'}`}>
                    Saldo: {profile?.coins?.toLocaleString() || '?'} 🪙
                  </div>
                )}
              </div>
              <button
                onClick={handleChallenge}
                disabled={profile?.coins !== undefined && betAmount > profile.coins}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black font-bold text-sm hover:from-yellow-400 hover:to-casino-gold transition-all active:scale-[0.98] shadow-lg shadow-casino-gold/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enviar Desafío{betAmount > 0 ? ` por ${betAmount} 🪙` : ''}
              </button>
            </div>
          )}
          {state === 'waiting' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-bold">⏳ Esperando...</span>
                <span className={`text-sm font-mono font-bold ${secondsLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-casino-gold'}`}>{secondsLeft}s</span>
              </div>
              {betAmount > 0 && (
                <div className="text-center text-[10px] font-bold text-casino-gold">Apuesta: {betAmount} 🪙</div>
              )}
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-casino-gold to-yellow-400 transition-all" style={{ width: `${progress}%`, transition: 'width 0.25s linear' }} />
              </div>
              <button onClick={handleCancel} className="w-full py-2 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 font-bold text-xs border border-white/10 transition-all">Cancelar</button>
            </div>
          )}
          {state === 'accepted' && (
            <div className="space-y-2 py-3 rounded-xl text-center bg-casino-emerald/10 border border-casino-emerald/30 animate-pulse">
              <p className="text-casino-emerald font-bold text-sm">🎮 ¡Desafío aceptado!</p>
              {betAmount > 0 && <p className="text-casino-gold text-[10px] font-bold">Apuesta: {betAmount} 🪙</p>}
            </div>
          )}
          {state === 'expired' && (
            <div className="space-y-2">
              <div className="py-3 rounded-xl text-center bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 font-bold text-sm">⏱ Sin respuesta</p>
              </div>
              <button onClick={() => { setState('idle'); setInvitationId(null); }} className="w-full py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-bold border border-white/10 transition-all">Intentar de nuevo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

