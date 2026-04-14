import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDivisionFromElo } from './ProfileHeader';
import { FriendSearch } from './FriendSearch';
import { ChatWindow } from './ChatWindow';
import { FriendRequestModal, FriendRequestProfile } from './FriendRequestModal';
import { FriendProfileModal, FriendForModal } from './FriendProfileModal';

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

const ONLINE_WINDOW_MS = 45_000;

export function SocialPanel() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FriendRequestProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'chat'>('friends');
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [friendUnreadMap, setFriendUnreadMap] = useState<Record<string, number>>({});

  const isFriendOnline = useCallback((friend: Friend) => {
    if (!friend.last_seen_at) return false;
    const ts = Date.parse(friend.last_seen_at);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts <= ONLINE_WINDOW_MS;
  }, []);

  // Modals
  const [selectedRequest, setSelectedRequest] = useState<FriendRequestProfile | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendForModal | null>(null);

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

  // Keep friend online/offline state fresh even when no realtime events arrive
  useEffect(() => {
    if (!user) return;
    const intervalId = window.setInterval(() => {
      fetchFriends();
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [user, fetchFriends]);

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
    
    const channelName = `social_panel_friend_requests_${user.id}_${Date.now()}_${Math.random()}`;
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

    const channelName = `unread_messages_sync_${user.id}_${Date.now()}_${Math.random()}`;
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

  return (
    <>
      <div className="flex flex-col h-full space-y-4">
        {/* ── TABS ──────────────────────────────────────────── */}
        <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05] shrink-0">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all relative ${
              activeTab === 'friends' ? 'bg-white/10 text-casino-gold shadow-sm border border-white/5' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Amigos
            {tabCount > 0 && (
              <span className="absolute -top-1.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-1 animate-bounce">
                {tabCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all ${
              activeTab === 'search' ? 'bg-white/10 text-casino-gold shadow-sm border border-white/5' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Buscar
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all relative ${
              activeTab === 'chat' ? 'bg-white/10 text-casino-gold shadow-sm border border-white/5' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Chat
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-1 animate-pulse">
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
                          onClick={() => setSelectedRequest(req)}
                          className="glass-panel px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:border-casino-gold/50 transition-all group border border-casino-gold/20 bg-black/20 backdrop-blur-sm hover:shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-casino-gold/40 to-casino-gold/10 flex items-center justify-center text-xs font-bold text-casino-gold shrink-0 border border-casino-gold/30 overflow-hidden">
                            {req.equipped_avatar ? (
                              <img src={`/assets/store/${req.equipped_avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                            ) : req.avatar_url ? (
                              <img src={req.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
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
                  friends.map((friend) => {
                    const div = getDivisionFromElo(friend.elo);
                    const isOnline = isFriendOnline(friend);
                    const roomId = friend.current_room_id;
                    const isInRoom = !!roomId;
                    const unread = friendUnreadMap[friend.id] || 0;

                    return (
                      <div
                        key={friend.id}
                        className="glass-panel px-3 py-2.5 flex items-center gap-3 hover:border-white/[0.15] transition-all group bg-black/20 backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.2)] hover:shadow-[0_4px_15px_rgba(255,255,255,0.05)]"
                      >
                        {/* Avatar + status dot */}
                        <div className="relative shrink-0 cursor-pointer" onClick={() => openFriendModal(friend)}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-inner overflow-hidden ${
                            isOnline ? 'bg-gradient-to-br from-casino-emerald/20 to-black/50 text-white border border-casino-emerald/30' : 'bg-white/5 text-gray-500 border border-white/5'
                          }`}>
                            {friend.equipped_avatar ? (
                              <img src={`/assets/store/${friend.equipped_avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                            ) : friend.avatar_url ? (
                              <img src={friend.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
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
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openFriendModal(friend)}>
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
                            setActiveChatFriendId(friend.id);
                            setActiveTab('chat');
                          }}
                          className="shrink-0 p-2 rounded-lg bg-white/5 text-gray-400 hover:text-casino-gold hover:bg-casino-gold/10 hover:border-casino-gold/30 border border-transparent transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                          title="Chat privado"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </button>
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
                      {friends.filter(f => isFriendOnline(f) && !f.current_room_id).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="text-gray-400 text-[10px]">En partida</span>
                    <span className="text-white font-bold text-[10px]">
                      {friends.filter(f => isFriendOnline(f) && !!f.current_room_id).length}
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
                    onClick={() => setActiveChatFriendId(null)}
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
    </>
  );
}

