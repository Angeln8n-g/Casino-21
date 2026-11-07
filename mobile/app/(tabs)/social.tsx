import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  MessageCircle,
  Search,
  UserPlus,
  Check,
  X,
  Swords,
  Globe,
  Clock,
  Hand,
} from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { socketService } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import { useProfilePresence } from '../../hooks/useProfilePresence';
import { useNotifications } from '../../hooks/useNotifications';
import { appEvents } from '../../utils/events';
import { triggerHaptic } from '../../utils/haptics';
import {
  FriendData,
  IncomingRequest,
  SentRequest,
  SearchPlayerData,
  RelationshipStatus,
  resolveAvatarUrl,
  formatRelativeTime,
} from '../../components/social/socialUtils';
import { FriendProfileModal } from '../../components/social/FriendProfileModal';
import { QuickChallengeModal } from '../../components/social/QuickChallengeModal';
import { FriendRequestModal } from '../../components/social/FriendRequestModal';
import { PlayerProfileModal } from '../../components/social/PlayerProfileModal';
import { ChatView } from '../../components/chat/ChatView';

type SocialTab = 'friends' | 'search' | 'chat';

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, presenceByUserId } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<SocialTab>('friends');
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [lastChatMap, setLastChatMap] = useState<Record<string, number>>({});
  const [onlineCount, setOnlineCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filtro de amigos en pestaña Amigos (igual que Web cuando friends.length > 3)
  const [friendFilter, setFriendFilter] = useState('');

  // Búsqueda de jugadores en pestaña Buscar
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchPlayerData[]>([]);
  const [searching, setSearching] = useState(false);

  // Chat activo en pestaña Chat (null = Global, FriendData = Privado)
  const [selectedChatFriend, setSelectedChatFriend] = useState<FriendData | null>(null);

  // Modales Sociales (100% paridad con Web)
  const [selectedProfileFriend, setSelectedProfileFriend] = useState<FriendData | null>(null);
  const [quickChallengeTarget, setQuickChallengeTarget] = useState<FriendData | null>(null);
  const [selectedRequestModal, setSelectedRequestModal] = useState<IncomingRequest | null>(null);
  const [selectedSearchPlayer, setSelectedSearchPlayer] = useState<SearchPlayerData | null>(null);

  const hasLoggedFriendsRef = useRef(false);
  const selectedChatFriendRef = useRef<FriendData | null>(null);
  const activeTabRef = useRef<SocialTab>('friends');

  useEffect(() => {
    selectedChatFriendRef.current = selectedChatFriend;
  }, [selectedChatFriend]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Presencia en tiempo real desde la tabla profiles (last_seen_at y current_room_id)
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const initialPresenceData = useMemo(() => {
    const map: Record<string, { last_seen_at?: string | null; current_room_id?: string | null }> = {};
    for (const f of friends) {
      map[f.id] = {
        last_seen_at: f.last_seen_at ?? null,
        current_room_id: f.current_room_id ?? null,
      };
    }
    return map;
  }, [friends]);

  const profilePresenceMap = useProfilePresence(friendIds, initialPresenceData);

  const isFriendOnline = useCallback(
    (friendId: string): boolean => {
      return Boolean(presenceByUserId[friendId]) || Boolean(profilePresenceMap[friendId]?.isOnline);
    },
    [presenceByUserId, profilePresenceMap]
  );

  const isFriendInRoom = useCallback(
    (friendId: string): boolean => {
      return (
        Boolean(presenceByUserId[friendId]?.room_id) ||
        Boolean(profilePresenceMap[friendId]?.isInRoom)
      );
    },
    [presenceByUserId, profilePresenceMap]
  );

  const getFriendRoomId = useCallback(
    (friendId: string): string | null => {
      return (
        presenceByUserId[friendId]?.room_id ||
        profilePresenceMap[friendId]?.currentRoomId ||
        null
      );
    },
    [presenceByUserId, profilePresenceMap]
  );

  // Escuchar eventos globales para abrir pestañas específicas (desde notificaciones o banners)
  useEffect(() => {
    const handleOpenTab = (payload?: { tab?: string; friendId?: string }) => {
      const requested = payload?.tab;
      if (requested === 'search') {
        setActiveTab('search');
      } else if (requested === 'chat') {
        if (payload?.friendId) {
          const found = friends.find((f) => f.id === payload.friendId);
          if (found) setSelectedChatFriend(found);
        }
        setActiveTab('chat');
      } else {
        // 'friends' o 'requests' van a 'friends' (donde Solicitudes aparece arriba igual que Web)
        setActiveTab('friends');
      }
    };
    appEvents.on('open_social_tab', handleOpenTab);
    return () => {
      appEvents.off('open_social_tab', handleOpenTab);
    };
  }, [friends]);

  // Contador en vivo de jugadores online vía Socket.io
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    let attachedSocket: any = null;

    const handleOnlineCount = ({ count }: { count: number }) => {
      if (isMounted && typeof count === 'number') {
        setOnlineCount(count);
      }
    };

    socketService
      .connect()
      .then((socket) => {
        if (!isMounted) return;
        attachedSocket = socket;
        socket.on('online_count', handleOnlineCount);
        socket.emit('request_online_count');
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (attachedSocket) {
        attachedSocket.off('online_count', handleOnlineCount);
      }
    };
  }, [user]);

  const fetchUnreadAndLastChats = useCallback(async () => {
    if (!user) return;
    try {
      const [unreadRes, recentRes] = await Promise.all([
        supabase
          .from('messages')
          .select('sender_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false),
        supabase
          .from('messages')
          .select('sender_id, receiver_id, created_at')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      if (unreadRes.data) {
        const counts: Record<string, number> = {};
        for (const row of unreadRes.data) {
          counts[row.sender_id] = (counts[row.sender_id] || 0) + 1;
        }
        setUnreadMap(counts);
      }

      if (recentRes.data) {
        const timeMap: Record<string, number> = {};
        for (const m of recentRes.data) {
          const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          if (otherId && !timeMap[otherId]) {
            timeMap[otherId] = new Date(m.created_at).getTime();
          }
        }
        setLastChatMap(timeMap);
      }
    } catch (err) {
      console.warn('Error obteniendo no leídos y últimos chats:', err);
    }
  }, [user]);

  const fetchSocialData = useCallback(
    async (silent = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);

      try {
        // 1. Obtener amigos aceptados desde friend_requests (idéntico a Web SocialPanel.tsx) + friendships
        const [acceptedReqsRes, friendshipsRes] = await Promise.all([
          supabase
            .from('friend_requests')
            .select('id, sender_id, receiver_id')
            .eq('status', 'accepted')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
          supabase
            .from('friendships')
            .select('id, player1_id, player2_id')
            .eq('status', 'accepted')
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`),
        ]);

        const idsFromRequests = (acceptedReqsRes.data || []).map((f: any) =>
          f.sender_id === user.id ? f.receiver_id : f.sender_id
        );
        const idsFromFriendships = (friendshipsRes.data || []).map((f: any) =>
          f.player1_id === user.id ? f.player2_id : f.player1_id
        );

        const targetFriendIds = [...new Set([...idsFromRequests, ...idsFromFriendships])];

        let mappedFriends: FriendData[] = [];
        if (targetFriendIds.length > 0) {
          const { data: friendProfiles } = await supabase
            .from('profiles')
            .select(
              'id, username, avatar_url, equipped_avatar, elo, level, wins, losses, xp, last_seen_at, current_room_id'
            )
            .in('id', targetFriendIds);

          if (friendProfiles) {
            mappedFriends = friendProfiles.map((fp: any) => ({
              id: fp.id,
              username: fp.username || 'Jugador',
              avatar_url: fp.avatar_url,
              equipped_avatar: fp.equipped_avatar,
              elo: fp.elo || 1000,
              level: fp.level || 1,
              wins: fp.wins || 0,
              losses: fp.losses || 0,
              xp: fp.xp || 0,
              last_seen_at: fp.last_seen_at,
              current_room_id: fp.current_room_id,
            }));
          }
        }

        if (!hasLoggedFriendsRef.current) {
          hasLoggedFriendsRef.current = true;
          console.log('Social friends from API:', mappedFriends);
        }
        setFriends(mappedFriends);

        // 2. Solicitudes entrantes pendientes (con stats completos para FriendRequestModal)
        const { data: incRows } = await supabase
          .from('friend_requests')
          .select('id, sender_id')
          .eq('receiver_id', user.id)
          .eq('status', 'pending');

        if (incRows && incRows.length > 0) {
          const senderIds = incRows.map((r) => r.sender_id);
          const { data: senderProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, equipped_avatar, elo, level, wins, losses, xp')
            .in('id', senderIds);

          const pMap = new Map((senderProfiles || []).map((p: any) => [p.id, p]));
          setIncomingRequests(
            incRows
              .filter((r) => pMap.has(r.sender_id))
              .map((r) => ({
                id: r.id,
                sender_id: r.sender_id,
                sender: pMap.get(r.sender_id)!,
              }))
          );
        } else {
          setIncomingRequests([]);
        }

        // 3. Solicitudes enviadas pendientes
        const { data: sentRows } = await supabase
          .from('friend_requests')
          .select('id, receiver_id')
          .eq('sender_id', user.id)
          .eq('status', 'pending');

        if (sentRows && sentRows.length > 0) {
          const receiverIds = sentRows.map((r) => r.receiver_id);
          const { data: receiverProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, equipped_avatar, elo, level')
            .in('id', receiverIds);

          const rMap = new Map((receiverProfiles || []).map((p: any) => [p.id, p]));
          setSentRequests(
            sentRows
              .filter((r) => rMap.has(r.receiver_id))
              .map((r) => ({
                id: r.id,
                receiver_id: r.receiver_id,
                receiver: rMap.get(r.receiver_id)!,
              }))
          );
        } else {
          setSentRequests([]);
        }

        await fetchUnreadAndLastChats();
      } catch (err) {
        console.warn('Error cargando datos sociales:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, fetchUnreadAndLastChats]
  );

  useEffect(() => {
    fetchSocialData();
  }, [fetchSocialData]);

  // Suscripción Realtime a amistades, solicitudes y mensajes privados
  useEffect(() => {
    if (!user) return;

    const socialChannel = supabase
      .channel(`mobile_social_sync_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        () => fetchSocialData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => fetchSocialData(true)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg?.sender_id) return;
          const isActivelyReading =
            activeTabRef.current === 'chat' &&
            selectedChatFriendRef.current?.id === newMsg.sender_id;

          if (!isActivelyReading) {
            setUnreadMap((prev) => ({
              ...prev,
              [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1,
            }));
          }
          setLastChatMap((prev) => ({
            ...prev,
            [newMsg.sender_id]: new Date(newMsg.created_at || Date.now()).getTime(),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg?.receiver_id) return;
          setLastChatMap((prev) => ({
            ...prev,
            [newMsg.receiver_id]: new Date(newMsg.created_at || Date.now()).getTime(),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchUnreadAndLastChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(socialChannel);
    };
  }, [user, fetchSocialData, fetchUnreadAndLastChats]);

  // Búsqueda de jugadores en tiempo real con resolución completa de relación
  useEffect(() => {
    if (!user) return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, equipped_avatar, elo, level, wins, losses, xp')
          .ilike('username', `%${trimmed}%`)
          .neq('id', user.id)
          .limit(15);

        if (error || !profilesData) {
          setSearchResults([]);
          return;
        }

        const resultIds = profilesData.map((p: any) => p.id);
        if (resultIds.length === 0) {
          setSearchResults([]);
          return;
        }

        const [reqsCheck, friendshipsCheck] = await Promise.all([
          supabase
            .from('friend_requests')
            .select('id, sender_id, receiver_id, status')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
          supabase
            .from('friendships')
            .select('player1_id, player2_id')
            .eq('status', 'accepted')
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`),
        ]);

        const friendIdSet = new Set<string>(
          (friendshipsCheck.data || []).map((f: any) =>
            f.player1_id === user.id ? f.player2_id : f.player1_id
          )
        );
        const sentMap = new Map<string, string>();
        const recMap = new Map<string, string>();
        for (const req of reqsCheck.data || []) {
          const otherId = req.sender_id === user.id ? req.receiver_id : req.sender_id;
          if (req.status === 'accepted') {
            friendIdSet.add(otherId);
          } else if (req.status === 'pending') {
            if (req.sender_id === user.id) sentMap.set(req.receiver_id, req.id);
            else recMap.set(req.sender_id, req.id);
          }
        }

        const enriched: SearchPlayerData[] = profilesData.map((p: any) => {
          let rel: RelationshipStatus = 'none';
          let reqId: string | undefined;
          if (friendIdSet.has(p.id)) {
            rel = 'friends';
          } else if (sentMap.has(p.id)) {
            rel = 'pending_sent';
            reqId = sentMap.get(p.id);
          } else if (recMap.has(p.id)) {
            rel = 'pending_received';
            reqId = recMap.get(p.id);
          }

          return {
            id: p.id,
            username: p.username || 'Jugador',
            avatar_url: p.avatar_url,
            equipped_avatar: p.equipped_avatar,
            elo: p.elo || 1000,
            level: p.level || 1,
            wins: p.wins || 0,
            losses: p.losses || 0,
            xp: p.xp || 0,
            relationshipStatus: rel,
            requestId: reqId,
          };
        });

        setSearchResults(enriched);
      } catch (err) {
        console.warn('Error buscando jugadores:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  // Responder solicitud entrante (usando RPC respond_friend_request igual que Web)
  const handleRespondRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    if (!user) return;
    triggerHaptic(action === 'accepted' ? 'success' : 'light');
    setActionLoadingId(requestId);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('respond_friend_request', {
        p_request_id: requestId,
        p_user_id: user.id,
        p_action: action,
      });

      if (rpcError) {
        showToast({
          title: '⚠️ Aviso',
          message: rpcError.message || 'No se pudo procesar la solicitud.',
          type: 'warning',
        });
        return;
      } else if (
        typeof result === 'object' &&
        result !== null &&
        result.success === false &&
        result.status !== 'already_friends'
      ) {
        showToast({
          title: '⚠️ Aviso',
          message: result.message || 'No se pudo procesar la solicitud.',
          type: 'warning',
        });
        return;
      }

      showToast({
        title: action === 'accepted' ? '🤝 ¡Nuevo Amigo!' : 'Solicitud rechazada',
        message:
          action === 'accepted'
            ? 'Solicitud aceptada. ¡Ya pueden jugar y chatear!'
            : 'Has rechazado la solicitud de amistad.',
        type: action === 'accepted' ? 'success' : 'info',
      });
      await fetchSocialData(true);
    } catch (err) {
      console.warn('Error respondiendo solicitud:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Enviar solicitud (con soporte para auto_accept_friend_request y resend_friend_request igual que Web)
  const handleSendFriendRequest = async (receiverId: string) => {
    if (!user) return;
    triggerHaptic('light');
    setActionLoadingId(receiverId);
    try {
      const { data: existingList } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`
        );

      const acceptedRow = existingList?.find((r: any) => r.status === 'accepted');
      if (acceptedRow) {
        setSearchResults((prev) =>
          prev.map((p) => (p.id === receiverId ? { ...p, relationshipStatus: 'friends' } : p))
        );
        showToast({
          title: '🤝 ¡Ya son amigos!',
          message: 'Este jugador ya está en tu lista de amigos.',
          type: 'info',
        });
        await fetchSocialData(true);
        return;
      }

      const reverseReq = existingList?.find(
        (r: any) => r.sender_id === receiverId && r.status === 'pending'
      );
      const myOwnReq = existingList?.find((r: any) => r.sender_id === user.id);

      if (reverseReq) {
        const { error: rpcErr } = await supabase.rpc('auto_accept_friend_request', {
          p_user_id: user.id,
          p_other_id: receiverId,
        });
        if (rpcErr) {
          await supabase.rpc('respond_friend_request', {
            p_request_id: reverseReq.id,
            p_user_id: user.id,
            p_action: 'accepted',
          });
        }
        setSearchResults((prev) =>
          prev.map((p) => (p.id === receiverId ? { ...p, relationshipStatus: 'friends' } : p))
        );
        showToast({
          title: '🤝 ¡Nuevos Amigos!',
          message: 'Ya te había enviado solicitud. ¡Ahora son amigos!',
          type: 'success',
        });
        await fetchSocialData(true);
        return;
      }

      if (myOwnReq) {
        if (myOwnReq.status === 'pending') {
          setSearchResults((prev) =>
            prev.map((p) =>
              p.id === receiverId ? { ...p, relationshipStatus: 'pending_sent' } : p
            )
          );
          return;
        }
        if (myOwnReq.status === 'rejected') {
          const { error: resendErr } = await supabase.rpc('resend_friend_request', {
            p_sender_id: user.id,
            p_receiver_id: receiverId,
          });
          if (!resendErr) {
            setSearchResults((prev) =>
              prev.map((p) =>
                p.id === receiverId ? { ...p, relationshipStatus: 'pending_sent' } : p
              )
            );
            showToast({
              title: '📨 Solicitud Reenviada',
              message: 'Se ha vuelto a enviar la solicitud de amistad.',
              type: 'success',
            });
            await fetchSocialData(true);
          } else {
            showToast({
              title: '⚠️ Error',
              message: resendErr.message || 'No se pudo reenviar la solicitud.',
              type: 'warning',
            });
          }
        }
        return;
      }

      const { error: insertErr } = await supabase.from('friend_requests').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
      });

      if (!insertErr) {
        setSearchResults((prev) =>
          prev.map((p) =>
            p.id === receiverId ? { ...p, relationshipStatus: 'pending_sent' } : p
          )
        );
        showToast({
          title: '📨 Solicitud Enviada',
          message: 'Tu solicitud de amistad ha sido enviada.',
          type: 'success',
        });
        await fetchSocialData(true);
      } else if (insertErr.code === '23505') {
        setSearchResults((prev) =>
          prev.map((p) =>
            p.id === receiverId ? { ...p, relationshipStatus: 'pending_sent' } : p
          )
        );
      }
    } catch (err) {
      console.warn('Error enviando solicitud de amistad:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Aceptar solicitud desde Búsqueda o PlayerProfileModal
  const handleAcceptSearchRequest = async (otherPlayerId: string, requestId?: string) => {
    if (!user) return;
    triggerHaptic('success');
    setActionLoadingId(requestId || otherPlayerId);
    try {
      const { error: rpcErr } = await supabase.rpc('auto_accept_friend_request', {
        p_user_id: user.id,
        p_other_id: otherPlayerId,
      });
      if (rpcErr && requestId) {
        await supabase.rpc('respond_friend_request', {
          p_request_id: requestId,
          p_user_id: user.id,
          p_action: 'accepted',
        });
      }
      setSearchResults((prev) =>
        prev.map((p) => (p.id === otherPlayerId ? { ...p, relationshipStatus: 'friends' } : p))
      );
      showToast({
        title: '🤝 ¡Nuevo Amigo!',
        message: 'Solicitud aceptada exitosamente.',
        type: 'success',
      });
      await fetchSocialData(true);
    } catch (err) {
      console.warn('Error aceptando solicitud desde búsqueda:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Abrir conversación con un amigo en la pestaña Chat (idéntico a Web)
  const openFriendChat = useCallback((friend: FriendData) => {
    triggerHaptic('light');
    setSelectedChatFriend(friend);
    setUnreadMap((prev) => ({ ...prev, [friend.id]: 0 }));
    setActiveTab('chat');
  }, []);

  // Clic en avatar desde Chat Global o Chat Privado (idéntico a handleAvatarClick en Web)
  const handleAvatarClick = useCallback(
    async (playerId: string) => {
      if (!user || !playerId || playerId === 'anon') return;
      triggerHaptic('light');

      if (playerId === user.id) {
        router.push('/(tabs)/profile');
        return;
      }

      const existingFriend = friends.find((f) => f.id === playerId);
      if (existingFriend) {
        setSelectedProfileFriend(existingFriend);
        return;
      }

      try {
        const [{ data: profileRow }, { data: reqs }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, username, avatar_url, equipped_avatar, elo, level, wins, losses, xp')
            .eq('id', playerId)
            .maybeSingle(),
          supabase
            .from('friend_requests')
            .select('id, sender_id, receiver_id, status')
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${playerId}),and(sender_id.eq.${playerId},receiver_id.eq.${user.id})`
            ),
        ]);

        if (!profileRow) return;

        let rel: RelationshipStatus = 'none';
        let reqId: string | undefined;
        if (reqs && reqs.length > 0) {
          const accepted = reqs.find((x: any) => x.status === 'accepted');
          const pending = reqs.find((x: any) => x.status === 'pending');
          if (accepted) {
            rel = 'friends';
          } else if (pending) {
            if (pending.sender_id === user.id) {
              rel = 'pending_sent';
              reqId = pending.id;
            } else {
              rel = 'pending_received';
              reqId = pending.id;
            }
          }
        }

        setSelectedSearchPlayer({
          id: profileRow.id,
          username: profileRow.username || 'Jugador',
          avatar_url: profileRow.avatar_url,
          equipped_avatar: profileRow.equipped_avatar,
          elo: profileRow.elo || 1000,
          level: profileRow.level || 1,
          wins: profileRow.wins || 0,
          losses: profileRow.losses || 0,
          xp: profileRow.xp || 0,
          relationshipStatus: rel,
          requestId: reqId,
        });
      } catch (err) {
        console.warn('Error cargando perfil al tocar avatar:', err);
      }
    },
    [user, friends, router]
  );

  // Totales y ordenamientos
  const totalUnreadMessages = useMemo(
    () => Object.values(unreadMap).reduce((sum, c) => sum + c, 0),
    [unreadMap]
  );

  const onlineFriendsCount = useMemo(
    () => friends.filter((f) => isFriendOnline(f.id)).length,
    [friends, isFriendOnline]
  );

  const sortedFilteredFriends = useMemo(() => {
    const q = friendFilter.trim().toLowerCase();
    const list = q
      ? friends.filter((f) => f.username.toLowerCase().includes(q))
      : [...friends];

    return list.sort((a, b) => {
      const aOnline = isFriendOnline(a.id) ? 1 : 0;
      const bOnline = isFriendOnline(b.id) ? 1 : 0;
      if (bOnline !== aOnline) return bOnline - aOnline;
      return b.elo - a.elo;
    });
  }, [friends, friendFilter, isFriendOnline]);

  const sortedCarouselFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const uA = unreadMap[a.id] || 0;
      const uB = unreadMap[b.id] || 0;
      if (uB !== uA) return uB - uA;

      const tA = lastChatMap[a.id] || 0;
      const tB = lastChatMap[b.id] || 0;
      if (tB !== tA) return tB - tA;

      const oA = isFriendOnline(a.id) ? 1 : 0;
      const oB = isFriendOnline(b.id) ? 1 : 0;
      if (oB !== oA) return oB - oA;

      return a.username.localeCompare(b.username);
    });
  }, [friends, unreadMap, lastChatMap, isFriendOnline]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#020617',
        paddingTop: Math.max(insets.top, 12),
      }}
    >
      {/* Cabecera Social + Banner Invitar Amigo (+200 PTS) */}
      <View className="px-4 pt-2 pb-2.5">
        <View className="flex-row items-center justify-between mb-2.5">
          <View>
            <Text className="text-amber-400 text-[10px] font-black uppercase tracking-widest">
              Comunidad Kasino21
            </Text>
            <Text className="text-white text-2xl font-black tracking-tight">Social</Text>
          </View>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              appEvents.emit('open_referral_modal');
            }}
            className="flex-row items-center gap-2 px-3 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 active:bg-purple-600/35"
          >
            <View className="w-7 h-7 rounded-lg bg-purple-500 items-center justify-center">
              <UserPlus color="#ffffff" size={15} />
            </View>
            <View>
              <View className="flex-row items-center gap-1">
                <Text className="text-[11px] font-black text-white uppercase">
                  Invitar Amigo
                </Text>
                <View className="bg-amber-400 px-1.5 py-0.5 rounded">
                  <Text className="text-[8px] font-black text-slate-950">+200 PTS</Text>
                </View>
              </View>
              <Text className="text-[9px] text-purple-200/80 font-semibold">
                Gana puntos en Championship
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Barra de 3 Pestañas Idéntica a Web: Amigos | Buscar | Chat (onlineCount) */}
        <View className="flex-row bg-black/50 p-1 rounded-xl border border-white/[0.07]">
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('friends');
            }}
            className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-1.5 ${
              activeTab === 'friends' ? 'bg-amber-400' : ''
            }`}
          >
            <Users color={activeTab === 'friends' ? '#020617' : '#9ca3af'} size={14} />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'friends' ? 'text-slate-950 font-black' : 'text-gray-400'
              }`}
            >
              Amigos
            </Text>
            {incomingRequests.length > 0 ? (
              <View
                className={`min-w-[16px] h-4 px-1 rounded-full items-center justify-center ${
                  activeTab === 'friends' ? 'bg-slate-950' : 'bg-red-500'
                }`}
              >
                <Text
                  className={`text-[9px] font-black ${
                    activeTab === 'friends' ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  {incomingRequests.length}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('search');
            }}
            className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-1.5 ${
              activeTab === 'search' ? 'bg-amber-400' : ''
            }`}
          >
            <Search color={activeTab === 'search' ? '#020617' : '#9ca3af'} size={14} />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'search' ? 'text-slate-950 font-black' : 'text-gray-400'
              }`}
            >
              Buscar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('chat');
            }}
            className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-1.5 ${
              activeTab === 'chat' ? 'bg-amber-400' : ''
            }`}
          >
            <MessageCircle color={activeTab === 'chat' ? '#020617' : '#9ca3af'} size={14} />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'chat' ? 'text-slate-950 font-black' : 'text-gray-400'
              }`}
            >
              Chat{onlineCount > 0 ? ` (${onlineCount})` : ''}
            </Text>
            {totalUnreadMessages > 0 && activeTab !== 'chat' ? (
              <View className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-[9px] font-black text-white">
                  {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* ─── PESTAÑA 1: AMIGOS (Solicitudes + Mis Amigos + Filtro + Acciones Rápidas) ─── */}
      {activeTab === 'friends' ? (
        loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        ) : (
          <FlatList
            data={sortedFilteredFriends}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchSocialData(true);
                }}
                tintColor="#fbbf24"
              />
            }
            ListHeaderComponent={
              <View>
                {/* Sección de Solicitudes Entrantes y Enviadas */}
                {incomingRequests.length > 0 || sentRequests.length > 0 ? (
                  <View className="mb-4 pb-3 border-b border-white/[0.06]">
                    {incomingRequests.length > 0 ? (
                      <View className="mb-2">
                        <View className="flex-row items-center gap-2 mb-2 px-1">
                          <Text className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                            📨 Solicitudes Recibidas
                          </Text>
                          <View className="w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                            <Text className="text-[9px] font-black text-white">
                              {incomingRequests.length}
                            </Text>
                          </View>
                        </View>

                        {incomingRequests.map((req) => {
                          const avatarUri = resolveAvatarUrl(
                            req.sender.equipped_avatar || req.sender.avatar_url
                          );
                          const isBusy = actionLoadingId === req.id;
                          return (
                            <View
                              key={req.id}
                              className="flex-row items-center justify-between bg-amber-500/[0.06] border border-amber-400/20 p-2.5 rounded-2xl mb-2"
                            >
                              <Pressable
                                onPress={() => {
                                  triggerHaptic('light');
                                  setSelectedRequestModal(req);
                                }}
                                className="flex-row items-center gap-2.5 flex-1 mr-2"
                              >
                                <View className="w-10 h-10 rounded-full bg-slate-900 border border-amber-400/40 items-center justify-center overflow-hidden">
                                  {avatarUri ? (
                                    <Image
                                      source={{ uri: avatarUri }}
                                      style={{ width: '100%', height: '100%' }}
                                      contentFit="cover"
                                    />
                                  ) : (
                                    <Text className="text-amber-400 font-black text-sm">
                                      {req.sender.username?.charAt(0).toUpperCase() || 'J'}
                                    </Text>
                                  )}
                                </View>
                                <View className="flex-1">
                                  <Text
                                    numberOfLines={1}
                                    className="text-white font-bold text-sm"
                                  >
                                    {req.sender.username}
                                  </Text>
                                  <Text className="text-[10px] text-amber-400/80 font-semibold">
                                    {req.sender.elo} ELO • Toca para ver perfil
                                  </Text>
                                </View>
                              </Pressable>

                              <View className="flex-row items-center gap-1.5">
                                <Pressable
                                  disabled={isBusy}
                                  onPress={() => handleRespondRequest(req.id, 'accepted')}
                                  className="w-8 h-8 rounded-xl bg-emerald-500 active:bg-emerald-400 items-center justify-center"
                                >
                                  <Check color="#020617" size={16} />
                                </Pressable>
                                <Pressable
                                  disabled={isBusy}
                                  onPress={() => handleRespondRequest(req.id, 'rejected')}
                                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 items-center justify-center"
                                >
                                  <X color="#d1d5db" size={15} />
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}

                    {sentRequests.length > 0 ? (
                      <View>
                        <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                          Enviadas ({sentRequests.length})
                        </Text>
                        {sentRequests.map((req) => {
                          const avatarUri = resolveAvatarUrl(
                            req.receiver.equipped_avatar || req.receiver.avatar_url
                          );
                          return (
                            <View
                              key={req.id}
                              className="flex-row items-center justify-between bg-slate-900/60 border border-white/[0.06] p-2.5 rounded-xl mb-1.5"
                            >
                              <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                                <View className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 items-center justify-center overflow-hidden">
                                  {avatarUri ? (
                                    <Image
                                      source={{ uri: avatarUri }}
                                      style={{ width: '100%', height: '100%' }}
                                      contentFit="cover"
                                    />
                                  ) : (
                                    <Text className="text-gray-300 font-black text-xs">
                                      {req.receiver.username?.charAt(0).toUpperCase() || 'J'}
                                    </Text>
                                  )}
                                </View>
                                <View className="flex-1">
                                  <Text
                                    numberOfLines={1}
                                    className="text-gray-200 font-bold text-xs"
                                  >
                                    {req.receiver.username}
                                  </Text>
                                  <Text className="text-[10px] text-amber-400/70">
                                    ⏳ Pendiente • {req.receiver.elo} ELO
                                  </Text>
                                </View>
                              </View>

                              <View className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <Text className="text-amber-400 text-[10px] font-bold">
                                  ⏳ Pendiente
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Encabezado Mis Amigos + Contador en línea */}
                <View className="flex-row items-center justify-between mb-2.5 px-1">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    👥 Mis Amigos ({friends.length})
                  </Text>
                  <View className="flex-row items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <Text className="text-[10px] font-bold text-emerald-400">
                      {onlineFriendsCount} en línea
                    </Text>
                  </View>
                </View>

                {/* Buscador local "Filtrar amigos..." cuando hay más de 3 amigos */}
                {friends.length > 3 ? (
                  <View className="flex-row items-center bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 mb-3">
                    <Search color="#6b7280" size={14} />
                    <TextInput
                      value={friendFilter}
                      onChangeText={setFriendFilter}
                      placeholder="Filtrar amigos..."
                      placeholderTextColor="#6b7280"
                      className="flex-1 text-white text-xs ml-2 py-0"
                    />
                    {friendFilter.length > 0 ? (
                      <Pressable onPress={() => setFriendFilter('')} className="p-0.5">
                        <X color="#9ca3af" size={14} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              friends.length === 0 ? (
                <View className="items-center py-12 px-6 bg-slate-900/40 rounded-2xl border border-white/5">
                  <View className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 items-center justify-center mb-3">
                    <Users color="#fbbf24" size={24} />
                  </View>
                  <Text className="text-gray-300 font-bold text-sm text-center">
                    No tienes amigos agregados.
                  </Text>
                  <Pressable
                    onPress={() => setActiveTab('search')}
                    className="mt-3 px-4 py-2 rounded-xl bg-amber-400/15 border border-amber-400/30"
                  >
                    <Text className="text-amber-400 text-xs font-black">
                      Buscar Jugadores →
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-gray-500 text-xs">
                    Sin resultados para "{friendFilter}"
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const online = isFriendOnline(item.id);
              const inRoom = isFriendInRoom(item.id);
              const unread = unreadMap[item.id] || 0;
              const avatarUri = resolveAvatarUrl(item.equipped_avatar || item.avatar_url);

              return (
                <View className="flex-row items-center justify-between bg-slate-900/80 border border-white/[0.07] p-3 rounded-2xl mb-2">
                  {/* Tocar fila/avatar abre FriendProfileModal */}
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedProfileFriend(item);
                    }}
                    className="flex-row items-center gap-3 flex-1 mr-2"
                  >
                    <View className="relative">
                      <View className="w-11 h-11 rounded-full bg-slate-800 border border-white/10 items-center justify-center overflow-hidden">
                        {avatarUri ? (
                          <Image
                            source={{ uri: avatarUri }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <Text className="text-amber-400 font-black text-base">
                            {item.username.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      {online ? (
                        <View
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                            inRoom ? 'bg-purple-500' : 'bg-emerald-400'
                          }`}
                        />
                      ) : null}
                    </View>

                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-white font-bold text-sm">
                        {item.username}
                      </Text>
                      <Text
                        className={`text-[11px] font-semibold mt-0.5 ${
                          online && inRoom
                            ? 'text-purple-400'
                            : online
                            ? 'text-emerald-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {online && inRoom
                          ? '🎮 En partida'
                          : online
                          ? 'En línea'
                          : `${item.elo} ELO`}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Botones de Acción Rápida (Chat, Avisar, Desafiar con Apuesta) */}
                  <View className="flex-row items-center gap-1.5">
                    <Pressable
                      onPress={() => openFriendChat(item)}
                      className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 items-center justify-center relative"
                    >
                      <MessageCircle color="#fbbf24" size={16} />
                      {unread > 0 ? (
                        <View className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 items-center justify-center">
                          <Text className="text-white text-[9px] font-black">{unread}</Text>
                        </View>
                      ) : null}
                    </Pressable>

                    {online && inRoom ? (
                      <Pressable
                        onPress={() => {
                          triggerHaptic('light');
                          socketService.notifyFriendWaiting(item.id);
                        }}
                        className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 items-center justify-center"
                      >
                        <Clock color="#c084fc" size={15} />
                      </Pressable>
                    ) : null}

                    {online && !inRoom ? (
                      <>
                        <Pressable
                          onPress={() => {
                            triggerHaptic('light');
                            socketService.notifyFriendConnected(item.id);
                          }}
                          className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center"
                        >
                          <Hand color="#34d399" size={15} />
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            triggerHaptic('light');
                            setQuickChallengeTarget(item);
                          }}
                          className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 items-center justify-center"
                        >
                          <Swords color="#fbbf24" size={16} />
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        )
      ) : null}

      {/* ─── PESTAÑA 2: BUSCAR JUGADORES ─── */}
      {activeTab === 'search' ? (
        <View className="flex-1 px-4">
          <View className="flex-row items-center bg-slate-900 border border-white/15 rounded-2xl px-3.5 py-2.5 mb-3">
            <Search color="#9ca3af" size={18} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar jugador por nombre..."
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-white text-sm ml-2.5 py-0.5"
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} className="p-1">
                <X color="#9ca3af" size={16} />
              </Pressable>
            ) : null}
          </View>

          {searching ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#fbbf24" />
            </View>
          ) : searchQuery.trim().length < 2 ? (
            <View className="items-center py-12 px-6">
              <Search color="#4b5563" size={38} />
              <Text className="text-gray-400 text-xs font-semibold mt-3 text-center">
                Escribe al menos 2 letras para buscar jugadores en Kasino21
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Text className="text-2xl mb-1">🔍</Text>
                  <Text className="text-gray-400 text-sm font-semibold">
                    No se encontraron jugadores con "{searchQuery}"
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const avatarUri = resolveAvatarUrl(item.equipped_avatar || item.avatar_url);
                const isBusy =
                  actionLoadingId === item.id ||
                  (Boolean(item.requestId) && actionLoadingId === item.requestId);

                return (
                  <View className="flex-row items-center justify-between bg-slate-900/80 border border-white/[0.08] p-3.5 rounded-2xl mb-2.5">
                    <Pressable
                      onPress={() => {
                        triggerHaptic('light');
                        const asFriend = friends.find((f) => f.id === item.id);
                        if (asFriend) {
                          setSelectedProfileFriend(asFriend);
                        } else {
                          setSelectedSearchPlayer(item);
                        }
                      }}
                      className="flex-row items-center gap-3 flex-1 mr-2"
                    >
                      <View className="w-11 h-11 rounded-full bg-slate-800 border border-amber-500/30 items-center justify-center overflow-hidden">
                        {avatarUri ? (
                          <Image
                            source={{ uri: avatarUri }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <Text className="text-amber-400 font-black text-sm">
                            {item.username.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="text-white font-bold text-sm">
                          {item.username}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-0.5">
                          {item.elo} ELO
                        </Text>
                      </View>
                    </Pressable>

                    {item.relationshipStatus === 'friends' ? (
                      <Pressable
                        onPress={() => {
                          const f = friends.find((fr) => fr.id === item.id);
                          if (f) openFriendChat(f);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30"
                      >
                        <Text className="text-emerald-400 text-xs font-bold">✓ Amigos</Text>
                      </Pressable>
                    ) : item.relationshipStatus === 'pending_sent' ? (
                      <View className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                        <Text className="text-amber-400 text-xs font-bold">Pendiente</Text>
                      </View>
                    ) : item.relationshipStatus === 'pending_received' ? (
                      <Pressable
                        disabled={isBusy}
                        onPress={() => handleAcceptSearchRequest(item.id, item.requestId)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 active:bg-emerald-400"
                      >
                        <Text className="text-slate-950 font-black text-xs">Aceptar</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        disabled={isBusy}
                        onPress={() => handleSendFriendRequest(item.id)}
                        className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 active:bg-amber-300"
                      >
                        <UserPlus color="#020617" size={14} />
                        <Text className="text-slate-950 font-black text-xs">Agregar</Text>
                      </Pressable>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : null}

      {/* ─── PESTAÑA 3: CHAT INTEGRADO (Carrusel Horizontal Global + Amigos + ChatView en vivo) ─── */}
      {activeTab === 'chat' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {/* Carrusel Horizontal de Chats (🌍 Global + Amigos ordenados por no leídos/recientes/online) */}
          <View className="px-3 pb-2 border-b border-white/[0.06]">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 4, paddingVertical: 4 }}
            >
              {/* Opción Global */}
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedChatFriend(null);
                }}
                style={{ width: 58 }}
                className="items-center"
              >
                <View className="relative">
                  <View
                    className={`w-11 h-11 rounded-full items-center justify-center border-2 ${
                      !selectedChatFriend
                        ? 'bg-amber-400/20 border-amber-400'
                        : 'bg-white/[0.05] border-white/10'
                    }`}
                  >
                    <Globe color={!selectedChatFriend ? '#fbbf24' : '#9ca3af'} size={20} />
                  </View>
                  {onlineCount > 0 ? (
                    <View className="absolute -bottom-0.5 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 border border-slate-950 items-center justify-center">
                      <Text className="text-[8px] font-black text-slate-950">{onlineCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  className={`text-[10px] font-bold mt-1 ${
                    !selectedChatFriend ? 'text-amber-400' : 'text-gray-400'
                  }`}
                >
                  Global
                </Text>
              </Pressable>

              {/* Amigos */}
              {sortedCarouselFriends.map((f) => {
                const isSelected = selectedChatFriend?.id === f.id;
                const unread = unreadMap[f.id] || 0;
                const online = isFriendOnline(f.id);
                const inRoom = isFriendInRoom(f.id);
                const lastTs = lastChatMap[f.id];
                const avatarUri = resolveAvatarUrl(f.equipped_avatar || f.avatar_url);

                return (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedChatFriend(f);
                      setUnreadMap((prev) => ({ ...prev, [f.id]: 0 }));
                    }}
                    style={{ width: 58 }}
                    className="items-center"
                  >
                    <View className="relative">
                      <View
                        className={`w-11 h-11 rounded-full bg-slate-900 items-center justify-center overflow-hidden border-2 ${
                          isSelected
                            ? 'border-amber-400'
                            : unread > 0
                            ? 'border-red-500'
                            : online && inRoom
                            ? 'border-purple-400/60'
                            : online
                            ? 'border-emerald-400/60'
                            : 'border-white/10'
                        }`}
                      >
                        {avatarUri ? (
                          <Image
                            source={{ uri: avatarUri }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <Text
                            className={`font-black text-sm ${
                              isSelected ? 'text-amber-400' : 'text-gray-300'
                            }`}
                          >
                            {f.username.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>

                      {unread > 0 ? (
                        <View className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 border border-slate-950 items-center justify-center">
                          <Text className="text-[8px] font-black text-white">
                            {unread > 9 ? '9+' : unread}
                          </Text>
                        </View>
                      ) : null}

                      {online ? (
                        <View
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                            inRoom ? 'bg-purple-500' : 'bg-emerald-400'
                          }`}
                        />
                      ) : null}
                    </View>

                    <Text
                      numberOfLines={1}
                      className={`text-[10px] font-bold mt-1 max-w-[56px] ${
                        isSelected
                          ? 'text-amber-400'
                          : unread > 0
                          ? 'text-white font-black'
                          : 'text-gray-400'
                      }`}
                    >
                      {f.username}
                    </Text>
                    {lastTs ? (
                      <Text className="text-[8px] text-gray-600 leading-tight">
                        {formatRelativeTime(new Date(lastTs).toISOString())}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Vista de Chat en Vivo */}
          <View className="flex-1 px-3 pt-2 pb-2">
            <ChatView
              receiverId={selectedChatFriend?.id || null}
              receiverName={selectedChatFriend?.username}
              receiverAvatar={
                selectedChatFriend?.equipped_avatar || selectedChatFriend?.avatar_url
              }
              isReceiverOnline={
                selectedChatFriend ? isFriendOnline(selectedChatFriend.id) : false
              }
              isReceiverInRoom={
                selectedChatFriend ? isFriendInRoom(selectedChatFriend.id) : false
              }
              showPartnerHeader={Boolean(selectedChatFriend)}
              onMessagesRead={() => {
                if (selectedChatFriend) {
                  setUnreadMap((prev) => ({ ...prev, [selectedChatFriend.id]: 0 }));
                }
                fetchUnreadAndLastChats();
              }}
              onAvatarClick={handleAvatarClick}
            />
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {/* ─── MODALES SOCIALES (100% Paridad con Web) ─── */}
      <FriendProfileModal
        friend={selectedProfileFriend}
        isOnline={selectedProfileFriend ? isFriendOnline(selectedProfileFriend.id) : false}
        isInRoom={selectedProfileFriend ? isFriendInRoom(selectedProfileFriend.id) : false}
        currentRoomId={
          selectedProfileFriend ? getFriendRoomId(selectedProfileFriend.id) : null
        }
        senderName={profile?.username || 'Jugador'}
        onClose={() => setSelectedProfileFriend(null)}
        onOpenChat={(f) => openFriendChat(f)}
      />

      <QuickChallengeModal
        friend={quickChallengeTarget}
        senderName={profile?.username || 'Jugador'}
        onClose={() => setQuickChallengeTarget(null)}
      />

      <FriendRequestModal
        request={selectedRequestModal}
        onClose={() => setSelectedRequestModal(null)}
        onResponded={() => fetchSocialData(true)}
      />

      <PlayerProfileModal
        player={selectedSearchPlayer}
        onClose={() => setSelectedSearchPlayer(null)}
        onSendRequest={handleSendFriendRequest}
        onAcceptRequest={handleAcceptSearchRequest}
        onOpenChat={(p) => {
          const existing = friends.find((f) => f.id === p.id);
          if (existing) openFriendChat(existing);
        }}
      />
    </View>
  );
}
