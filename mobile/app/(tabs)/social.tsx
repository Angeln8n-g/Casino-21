import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
import { socketService } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { appEvents } from '../../utils/events';
import { triggerHaptic } from '../../utils/haptics';
import { PrivateChatModal, ChatFriend } from '../../components/chat/PrivateChatModal';
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  UserMinus,
  Clock,
  MessageSquare,
  Swords,
  ChevronRight,
  Bell,
} from 'lucide-react-native';

const ONLINE_WINDOW_MS = 45000;

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

interface IncomingRequest {
  requestId: string;
  senderId: string;
  username: string;
  elo: number;
  avatar_url?: string | null;
}

type RelationshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

interface SearchItem {
  id: string;
  username: string;
  elo: number;
  avatar_url?: string | null;
  relationship: RelationshipStatus;
  requestId?: string;
}

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return 'hace un tiempo';
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function SocialScreen() {
  const router = useRouter();
  const { user, profile, presenceByUserId } = useAuth();
  const { unreadCount, totalPending, setShowNotificationsModal } = useNotifications();
  const totalBadgeCount = unreadCount + totalPending;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search' | 'chat'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Chat Privado & Badges
  const [activeChatFriend, setActiveChatFriend] = useState<ChatFriend | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [friendUnreadMap, setFriendUnreadMap] = useState<Record<string, number>>({});
  const [lastMessageMap, setLastMessageMap] = useState<
    Record<string, { content: string; created_at: string; sender_id: string }>
  >({});

  // ── Fetch Amigos Aceptados ─────────────────────────────────
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    try {
      const { data: friendships, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .limit(50);

      if (error || !friendships) {
        setFriends([]);
        return;
      }

      const friendIds = Array.from(
        new Set(
          friendships.map((f) => (f.sender_id === user.id ? f.receiver_id : f.sender_id))
        )
      );

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, username, elo, level, wins, losses, xp, last_seen_at, current_room_id, avatar_url, equipped_avatar')
        .in('id', friendIds);

      if (!pErr && profiles) {
        // Regla 5.3: Console log demostrando datos reales de API
        console.log('Social friends from API:', profiles);
        setFriends(profiles as Friend[]);
      }
    } catch (e) {
      console.error('Error fetching friends:', e);
    }
  }, [user]);

  // ── Fetch Solicitudes Entrantes ────────────────────────────
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error || !data || data.length === 0) {
        setPendingRequests([]);
        return;
      }

      const senderIds = data.map((r) => r.sender_id);
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, username, elo, avatar_url')
        .in('id', senderIds);

      if (!pErr && profiles) {
        const mapped: IncomingRequest[] = data
          .map((req) => {
            const p = profiles.find((prof) => prof.id === req.sender_id);
            if (!p) return null;
            return {
              requestId: req.id,
              senderId: req.sender_id,
              username: p.username,
              elo: p.elo,
              avatar_url: p.avatar_url,
            };
          })
          .filter(Boolean) as IncomingRequest[];

        setPendingRequests(mapped);
      }
    } catch (e) {
      console.error('Error fetching incoming friend requests:', e);
    }
  }, [user]);

  // ── Fetch Mensajes No Leídos y Últimos Mensajes ───────────
  const fetchUnreadAndLastMessages = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Mensajes no leídos recibidos
      const { data: unreadData } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (unreadData) {
        const counts: Record<string, number> = {};
        unreadData.forEach((m) => {
          counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
        });
        setFriendUnreadMap(counts);
        setUnreadMessagesCount(unreadData.length);
      }

      // 2. Último mensaje con cada amigo
      if (friends.length > 0) {
        const map: Record<string, { content: string; created_at: string; sender_id: string }> = {};
        for (const f of friends) {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at, sender_id, deleted_at')
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${f.id}),and(sender_id.eq.${f.id},receiver_id.eq.${user.id})`
            )
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastMsg) {
            map[f.id] = {
              content: lastMsg.deleted_at ? 'Mensaje eliminado' : lastMsg.content,
              created_at: lastMsg.created_at,
              sender_id: lastMsg.sender_id,
            };
          }
        }
        setLastMessageMap(map);
      }
    } catch (e) {
      console.error('Error fetching unread messages:', e);
    }
  }, [user, friends]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchRequests()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchFriends, fetchRequests]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    fetchUnreadAndLastMessages();

    if (!user?.id) return;

    // 1. Suscripción en tiempo real a mensajes privados
    const msgChannel = supabase
      .channel(`social_unread_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadAndLastMessages();
        }
      )
      .subscribe();

    // 2. Suscripción en tiempo real a friend_requests (idéntico a SocialPanel.tsx en Web)
    const frChannel = supabase
      .channel(`social_fr_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
        },
        (payload) => {
          if (
            payload.new.sender_id === user.id ||
            payload.new.receiver_id === user.id
          ) {
            fetchFriends();
            fetchRequests();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'friend_requests',
        },
        () => {
          fetchFriends();
          fetchRequests();
        }
      )
      .subscribe();

    // 3. Sincronización periódica ligera de respaldo cada 6s
    const syncTimer = setInterval(() => {
      fetchUnreadAndLastMessages();
      fetchRequests();
    }, 6000);

    // 4. Escuchar evento de apertura de pestaña desde notificaciones / toasts
    const handleOpenSocialTab = (payload?: { tab?: 'friends' | 'requests' | 'search' | 'chat' }) => {
      const targetTab = payload?.tab || 'friends';
      setActiveTab(targetTab);
      fetchFriends();
      fetchRequests();
    };
    appEvents.on('open_social_tab', handleOpenSocialTab);

    return () => {
      clearInterval(syncTimer);
      appEvents.off('open_social_tab', handleOpenSocialTab);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(frChannel);
    };
  }, [user?.id, fetchUnreadAndLastMessages, fetchFriends, fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
    fetchUnreadAndLastMessages();
  };

  // ── Cálculo de estado online ──────────────────────────────
  const isFriendOnline = useCallback(
    (friend: Friend) => {
      if (presenceByUserId && presenceByUserId[friend.id]) return true;
      if (!friend.last_seen_at) return false;
      const ts = Date.parse(friend.last_seen_at);
      if (!Number.isFinite(ts)) return false;
      return Date.now() - ts <= ONLINE_WINDOW_MS;
    },
    [presenceByUserId]
  );

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aOnline = isFriendOnline(a);
      const bOnline = isFriendOnline(b);
      const aInRoom = Boolean(a.current_room_id);
      const bInRoom = Boolean(b.current_room_id);

      const aOrder = aOnline && !aInRoom ? 0 : aOnline && aInRoom ? 1 : 2;
      const bOrder = bOnline && !bInRoom ? 0 : bOnline && bInRoom ? 1 : 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.elo - a.elo;
    });
  }, [friends, isFriendOnline]);

  // ── Aceptar Solicitud ──────────────────────────────────────
  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;
    triggerHaptic('card_tap');
    setActionBusyId(requestId);
    try {
      const { error: rpcErr } = await supabase.rpc('auto_accept_friend_request', {
        p_user_id: user.id,
        p_other_id: senderId,
      });

      if (rpcErr) {
        const { error: updateErr } = await supabase
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        if (updateErr) {
          Alert.alert('Error', updateErr.message || 'No se pudo aceptar la solicitud');
          return;
        }
      }

      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      await fetchFriends();
      Alert.alert('¡Amigo añadido!', 'Ahora pueden jugar partidas y chatear.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error inesperado.');
    } finally {
      setActionBusyId(null);
    }
  };

  // ── Rechazar Solicitud ─────────────────────────────────────
  const handleRejectRequest = async (requestId: string) => {
    triggerHaptic('light');
    setActionBusyId(requestId);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        await supabase.from('friend_requests').delete().eq('id', requestId);
      }
      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } catch (err: any) {
      console.error('Error rejecting request:', err);
    } finally {
      setActionBusyId(null);
    }
  };

  // ── Eliminar Amigo ─────────────────────────────────────────
  const handleRemoveFriend = (friend: Friend) => {
    if (!user) return;
    Alert.alert(
      'Eliminar Amigo',
      `¿Deseas eliminar a ${friend.username} de tu lista de amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setActionBusyId(friend.id);
            try {
              await supabase
                .from('friend_requests')
                .delete()
                .or(
                  `and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`
                );

              setFriends((prev) => prev.filter((f) => f.id !== friend.id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el amigo');
            } finally {
              setActionBusyId(null);
            }
          },
        },
      ]
    );
  };

  // ── Desafiar a Partida Directa ──────────────────────────────
  const handleChallengeFriend = async (friend: Friend) => {
    if (!user) return;
    try {
      setActionBusyId(`challenge_${friend.id}`);
      const socket = await socketService.connect();
      const playerName = profile?.username || 'Jugador K21';

      socket.emit('send_challenge', {
        receiverId: friend.id,
        playerName,
        betAmount: 0,
      });

      triggerHaptic('light');
      Alert.alert(
        '⚔️ ¡Desafío Enviado!',
        `Has invitado a ${friend.username} a una partida. Entrarán automáticamente al juego cuando acepte.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo enviar el desafío.');
    } finally {
      setActionBusyId(null);
    }
  };

  // ── Búsqueda de Jugadores ───────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, username, elo, avatar_url')
          .ilike('username', `%${searchQuery.trim()}%`)
          .neq('id', user.id)
          .limit(10);

        if (error || !profiles) {
          setSearchResults([]);
          return;
        }

        const candidateIds = profiles.map((p) => p.id);
        const { data: reqs } = await supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status')
          .or(
            candidateIds
              .map(
                (cid) =>
                  `and(sender_id.eq.${user.id},receiver_id.eq.${cid}),and(sender_id.eq.${cid},receiver_id.eq.${user.id})`
              )
              .join(',')
          );

        const items: SearchItem[] = profiles.map((p) => {
          const match = reqs?.find(
            (r) =>
              (r.sender_id === user.id && r.receiver_id === p.id) ||
              (r.sender_id === p.id && r.receiver_id === user.id)
          );

          let rel: RelationshipStatus = 'none';
          if (match) {
            if (match.status === 'accepted') rel = 'accepted';
            else if (match.status === 'pending') {
              rel = match.sender_id === user.id ? 'pending_sent' : 'pending_received';
            }
          }

          return {
            id: p.id,
            username: p.username,
            elo: p.elo,
            avatar_url: p.avatar_url,
            relationship: rel,
            requestId: match?.id,
          };
        });

        setSearchResults(items);
      } catch (e) {
        console.error('Error searching players:', e);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleSendRequest = async (target: SearchItem) => {
    if (!user) return;
    triggerHaptic('light');
    setActionBusyId(target.id);
    try {
      const { error } = await supabase.from('friend_requests').insert({
        sender_id: user.id,
        receiver_id: target.id,
        status: 'pending',
      });

      if (error) {
        Alert.alert('Aviso', error.message || 'No se pudo enviar la solicitud');
        return;
      }

      setSearchResults((prev) =>
        prev.map((item) => (item.id === target.id ? { ...item, relationship: 'pending_sent' } : item))
      );
      Alert.alert('Solicitud enviada', `Has enviado una solicitud de amistad a ${target.username}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error inesperado al enviar solicitud.');
    } finally {
      setActionBusyId(null);
    }
  };

  const openPrivateChat = (f: Friend) => {
    triggerHaptic('light');
    setActiveChatFriend({
      id: f.id,
      username: f.username,
      elo: f.elo,
      avatar_url: f.equipped_avatar || f.avatar_url,
      isOnline: isFriendOnline(f),
    });
  };

  const openGlobalChat = () => {
    triggerHaptic('light');
    setActiveChatFriend({
      id: 'GLOBAL',
      username: 'Chat Global K21',
      elo: 0,
      avatar_url: null,
      isOnline: true,
    });
  };

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <View>
          <Text className="text-amber-400 font-bold text-2xl">SOCIAL</Text>
          <Text className="text-slate-400 text-xs">Juega con amigos y chatea en privado</Text>
        </View>
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setShowNotificationsModal(true);
            }}
            className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700 items-center justify-center relative active:bg-slate-800"
          >
            <Bell color={totalBadgeCount > 0 ? '#fbbf24' : '#94a3b8'} size={22} />
            {totalBadgeCount > 0 && (
              <View className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full min-w-[18px] h-4.5 px-1 items-center justify-center border border-slate-950">
                <Text className="text-white text-[9px] font-black">{totalBadgeCount}</Text>
              </View>
            )}
          </Pressable>
          <View className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
            <Users color="#fbbf24" size={24} />
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-slate-900/80 p-1 rounded-2xl border border-slate-800 mb-4">
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('friends');
          }}
          className={`flex-1 py-2 rounded-xl items-center ${activeTab === 'friends' ? 'bg-amber-500' : ''}`}
        >
          <Text
            className={`font-bold text-xs uppercase tracking-wider ${
              activeTab === 'friends' ? 'text-slate-950 font-black' : 'text-slate-400'
            }`}
          >
            Amigos ({friends.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('chat');
          }}
          className={`flex-1 py-2 rounded-xl items-center relative ${
            activeTab === 'chat' ? 'bg-amber-500' : ''
          }`}
        >
          <View className="flex-row items-center gap-1">
            <Text
              className={`font-bold text-xs uppercase tracking-wider ${
                activeTab === 'chat' ? 'text-slate-950 font-black' : 'text-slate-400'
              }`}
            >
              Chat
            </Text>
            {unreadMessagesCount > 0 && (
              <View className="bg-red-500 px-1.5 py-0.2 rounded-full">
                <Text className="text-white text-[9px] font-black">{unreadMessagesCount}</Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('requests');
          }}
          className={`flex-1 py-2 rounded-xl items-center relative ${
            activeTab === 'requests' ? 'bg-amber-500' : ''
          }`}
        >
          <View className="flex-row items-center gap-1">
            <Text
              className={`font-bold text-xs uppercase tracking-wider ${
                activeTab === 'requests' ? 'text-slate-950 font-black' : 'text-slate-400'
              }`}
            >
              Solicitudes
            </Text>
            {pendingRequests.length > 0 && (
              <View className="bg-red-500 px-1.5 py-0.2 rounded-full">
                <Text className="text-white text-[9px] font-black">{pendingRequests.length}</Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('search');
          }}
          className={`flex-1 py-2 rounded-xl items-center ${activeTab === 'search' ? 'bg-amber-500' : ''}`}
        >
          <Text
            className={`font-bold text-xs uppercase tracking-wider ${
              activeTab === 'search' ? 'text-slate-950 font-black' : 'text-slate-400'
            }`}
          >
            Buscar
          </Text>
        </Pressable>
      </View>

      {/* Contenido según pestaña */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text className="text-slate-400 text-xs mt-3 font-semibold">Sincronizando amigos...</Text>
        </View>
      ) : activeTab === 'friends' ? (
        <FlatList
          data={sortedFriends}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <View className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 items-center mt-6">
              <Users color="#64748b" size={40} className="mb-2" />
              <Text className="text-white font-bold text-base mb-1">Aún no tienes amigos agregados</Text>
              <Text className="text-slate-400 text-xs text-center">
                Ve a la pestaña Buscar para encontrar jugadores por su nombre de usuario.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isOnline = isFriendOnline(item);
            const inRoom = Boolean(item.current_room_id);
            const isBusy = actionBusyId === item.id;
            const unread = friendUnreadMap[item.id] || 0;

            return (
              <View className="bg-slate-900/90 p-4 rounded-2xl mb-3 border border-slate-800 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="relative mr-3">
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} className="w-11 h-11 rounded-full" />
                    ) : (
                      <View className="w-11 h-11 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
                        <Text className="text-white text-base">👤</Text>
                      </View>
                    )}
                    <View
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        inRoom ? 'bg-amber-400' : isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>
                      {item.username}
                    </Text>
                    <Text className="text-amber-400 text-xs font-semibold">
                      ELO: {item.elo} •{' '}
                      <Text
                        className={
                          inRoom
                            ? 'text-amber-400'
                            : isOnline
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {inRoom ? 'En partida' : isOnline ? 'En línea' : formatRelativeTime(item.last_seen_at)}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Acciones para amigo */}
                <View className="flex-row items-center gap-2">
                  {/* Botón de Desafío */}
                  <Pressable
                    disabled={isBusy}
                    onPress={() => handleChallengeFriend(item)}
                    className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 active:bg-red-500/20"
                  >
                    <Swords color="#ef4444" size={16} />
                  </Pressable>

                  {/* Botón de Chat */}
                  <Pressable
                    onPress={() => openPrivateChat(item)}
                    className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 active:bg-amber-500/20 relative"
                  >
                    <MessageSquare color="#fbbf24" size={16} />
                    {unread > 0 && (
                      <View className="absolute -top-1 -right-1 bg-red-600 rounded-full w-4 h-4 items-center justify-center">
                        <Text className="text-white text-[9px] font-black">{unread}</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Botón Eliminar */}
                  <Pressable
                    disabled={isBusy}
                    onPress={() => handleRemoveFriend(item)}
                    className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 active:bg-red-500/20"
                  >
                    <UserMinus color="#94a3b8" size={16} />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : activeTab === 'chat' ? (
        /* Pestaña de Chat Global + Chats Privados */
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={() => (
            <Pressable
              onPress={openGlobalChat}
              className="bg-amber-500/10 p-4 rounded-2xl mb-3 border border-amber-500/40 flex-row items-center justify-between active:bg-amber-500/20"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="relative mr-3">
                  <View className="w-11 h-11 rounded-full bg-amber-500/20 items-center justify-center border border-amber-400/50">
                    <Text className="text-base">🌐</Text>
                  </View>
                  <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Text className="text-amber-300 font-bold text-sm">Chat Global K21</Text>
                    <View className="bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      <Text className="text-emerald-400 text-[8px] font-black uppercase">En vivo</Text>
                    </View>
                  </View>
                  <Text className="text-slate-300 text-xs" numberOfLines={1}>
                    Sala pública de la comunidad • +2 XP por mensaje
                  </Text>
                </View>
              </View>
              <ChevronRight color="#fbbf24" size={18} />
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 items-center mt-2">
              <MessageSquare color="#64748b" size={40} className="mb-2" />
              <Text className="text-white font-bold text-base mb-1">Sin chats privados aún</Text>
              <Text className="text-slate-400 text-xs text-center">
                Puedes conversar en el Chat Global arriba o agregar amigos para chatear en privado.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isOnline = isFriendOnline(item);
            const unread = friendUnreadMap[item.id] || 0;
            const lastMsg = lastMessageMap[item.id];
            const avatarUri = item.equipped_avatar || item.avatar_url;

            return (
              <Pressable
                onPress={() => openPrivateChat(item)}
                className="bg-slate-900/90 p-4 rounded-2xl mb-3 border border-slate-800 flex-row items-center justify-between active:bg-slate-800/80"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="relative mr-3">
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} className="w-11 h-11 rounded-full" />
                    ) : (
                      <View className="w-11 h-11 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
                        <Text className="text-white">👤</Text>
                      </View>
                    )}
                    <View
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-0.5">
                      <Text className="text-white font-bold text-sm" numberOfLines={1}>
                        {item.username}
                      </Text>
                      {lastMsg && (
                        <Text className="text-slate-500 text-[10px]">
                          {formatRelativeTime(lastMsg.created_at)}
                        </Text>
                      )}
                    </View>
                    <Text
                      className={`text-xs ${
                        unread > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'
                      }`}
                      numberOfLines={1}
                    >
                      {lastMsg ? lastMsg.content : 'Toca para iniciar una conversación'}
                    </Text>
                  </View>
                </View>

                {unread > 0 ? (
                  <View className="bg-red-500 px-2 py-0.5 rounded-full ml-2">
                    <Text className="text-white text-[10px] font-black">{unread}</Text>
                  </View>
                ) : (
                  <ChevronRight color="#64748b" size={16} />
                )}
              </Pressable>
            );
          }}
        />
      ) : activeTab === 'requests' ? (
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item.requestId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fbbf24" />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <View className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 items-center mt-6">
              <Clock color="#64748b" size={40} className="mb-2" />
              <Text className="text-white font-bold text-base mb-1">Sin solicitudes pendientes</Text>
              <Text className="text-slate-400 text-xs text-center">
                Cuando otros jugadores te envíen una solicitud de amistad aparecerá aquí.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isBusy = actionBusyId === item.requestId;

            return (
              <View className="bg-slate-900/90 p-4 rounded-2xl mb-3 border border-slate-800 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} className="w-10 h-10 rounded-full mr-3" />
                  ) : (
                    <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center mr-3">
                      <Text className="text-white">👤</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>
                      {item.username}
                    </Text>
                    <Text className="text-amber-400 text-xs font-semibold">ELO: {item.elo}</Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <Pressable
                    disabled={isBusy}
                    onPress={() => handleAcceptRequest(item.requestId, item.senderId)}
                    className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 active:bg-emerald-500/30"
                  >
                    <Check color="#34d399" size={16} />
                  </Pressable>
                  <Pressable
                    disabled={isBusy}
                    onPress={() => handleRejectRequest(item.requestId)}
                    className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 active:bg-red-500/30"
                  >
                    <X color="#f87171" size={16} />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View className="flex-1">
          <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 mb-4">
            <Search color="#94a3b8" size={18} className="mr-2" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar jugadores por nombre..."
              placeholderTextColor="#64748b"
              className="flex-1 text-white text-sm"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator size="small" color="#fbbf24" />}
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={() => (
              <View className="items-center mt-6">
                <Text className="text-slate-500 text-xs">
                  {searchQuery.trim()
                    ? isSearching
                      ? 'Buscando...'
                      : 'No se encontraron jugadores con ese nombre.'
                    : 'Ingresa al menos 2 letras para iniciar la búsqueda.'}
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isBusy = actionBusyId === item.id;

              return (
                <View className="bg-slate-900/90 p-4 rounded-2xl mb-3 border border-slate-800 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} className="w-10 h-10 rounded-full mr-3" />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center mr-3">
                        <Text className="text-white">👤</Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-white font-bold text-sm" numberOfLines={1}>
                        {item.username}
                      </Text>
                      <Text className="text-amber-400 text-xs">ELO: {item.elo}</Text>
                    </View>
                  </View>

                  {item.relationship === 'accepted' ? (
                    <View className="bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/40">
                      <Text className="text-emerald-400 font-bold text-xs">Amigos</Text>
                    </View>
                  ) : item.relationship === 'pending_sent' ? (
                    <View className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                      <Text className="text-slate-400 font-bold text-xs">Enviada</Text>
                    </View>
                  ) : item.relationship === 'pending_received' ? (
                    <Pressable
                      disabled={isBusy}
                      onPress={() => item.requestId && handleAcceptRequest(item.requestId, item.id)}
                      className="bg-emerald-500 px-3 py-1.5 rounded-xl active:bg-emerald-600"
                    >
                      <Text className="text-slate-950 font-bold text-xs">Aceptar</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={isBusy}
                      onPress={() => handleSendRequest(item)}
                      className="bg-amber-500 px-3.5 py-1.5 rounded-xl active:bg-amber-600 flex-row items-center gap-1"
                    >
                      <UserPlus color="#020617" size={14} />
                      <Text className="text-slate-950 font-bold text-xs">Añadir</Text>
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ── Modal de Chat Privado 1a1 ───────────────────────── */}
      <PrivateChatModal
        friend={activeChatFriend}
        isOpen={Boolean(activeChatFriend)}
        onClose={() => {
          setActiveChatFriend(null);
          fetchUnreadAndLastMessages();
        }}
      />
    </View>
  );
}
