// Feature: react-native-game-migration
// Requirements: 10.1, 10.2, 10.3, 10.4, 10.6
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocial } from '../hooks/useSocial';
import NotificationCenter from '../components/NotificationCenter';
import { socketService } from '../services/socketService';
import type { Friend, FriendRequest, DirectMessage } from '../services/socialService';
import { RootStackParamList } from '../navigation/types';

type SocialNavProp = NativeStackNavigationProp<RootStackParamList, 'Social'>;
type SocialTab = 'amigos' | 'solicitudes' | 'chat';

// ─── Avatar placeholder ───────────────────────────────────────────────────────

function Avatar({ name, size = 40, online }: { name: string; size?: number; online?: boolean }) {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},55%,38%)` }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
      </View>
      {online !== undefined && (
        <View style={[styles.onlineDot, online ? styles.dotOnline : styles.dotOffline,
          { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, bottom: 0, right: 0 }]} />
      )}
    </View>
  );
}

// ─── SocialScreen ─────────────────────────────────────────────────────────────

export function SocialScreen(): React.JSX.Element {
  const navigation = useNavigation<SocialNavProp>();
  const { friends, friendRequests, loading, error, sendFriendRequest,
    acceptFriendRequest, rejectFriendRequest, getDirectMessages,
    sendDirectMessage, searchPlayers } = useSocial();

  const [activeTab, setActiveTab] = useState<SocialTab>('amigos');
  const [notifVisible, setNotifVisible] = useState(false);
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([]);
  const [addFriendLoading, setAddFriendLoading] = useState(false);
  const [addFriendFeedback, setAddFriendFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const handleBack = useCallback(() => {
    if (chatFriend) { setChatFriend(null); setMessages([]); setMessageText(''); }
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainMenu');
  }, [chatFriend, navigation]);

  const handleOpenChat = useCallback(async (friend: Friend) => {
    setChatFriend(friend); setChatLoading(true);
    try { setMessages(await getDirectMessages(friend.id)); }
    catch { setMessages([]); }
    finally { setChatLoading(false); }
  }, [getDirectMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!chatFriend || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      await sendDirectMessage(chatFriend.id, messageText.trim());
      setMessages(await getDirectMessages(chatFriend.id));
      setMessageText('');
    } catch { /* silent */ }
    finally { setSendingMessage(false); }
  }, [chatFriend, messageText, sendDirectMessage, getDirectMessages]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    setAddFriendFeedback(null);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    try { setSearchResults(await searchPlayers(q)); }
    catch { setSearchResults([]); }
  }, [searchPlayers]);

  const handleAddFriend = useCallback(async (userId: string, username: string) => {
    setAddFriendLoading(true);
    setAddFriendFeedback(null);
    try {
      await sendFriendRequest(userId);
      setAddFriendFeedback({ type: 'ok', msg: `Solicitud enviada a ${username} ✓` });
      setSearchResults([]);
      setSearchQuery('');
    } catch (e) {
      setAddFriendFeedback({ type: 'err', msg: e instanceof Error ? e.message : 'Error' });
    } finally { setAddFriendLoading(false); }
  }, [sendFriendRequest]);

  const handleAccept = useCallback(async (id: string) => {
    try { await acceptFriendRequest(id); } catch { /* silent */ }
  }, [acceptFriendRequest]);

  const handleReject = useCallback(async (id: string) => {
    try { await rejectFriendRequest(id); } catch { /* silent */ }
  }, [rejectFriendRequest]);

  useEffect(() => {
    const handler = (data: unknown) => {
      const p = data as { roomId?: string };
      if (p?.roomId) {
        try { socketService.emit('join_room', { roomId: p.roomId }); } catch { /* silent */ }
        navigation.navigate('Game', { roomId: p.roomId });
      }
    };
    try { socketService.on('game_invitation_accepted', handler); } catch { /* silent */ }
    return () => { try { socketService.off('game_invitation_accepted'); } catch { /* silent */ } };
  }, [navigation]);

  // ── Chat view ──────────────────────────────────────────────────────────────
  if (chatFriend) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.chatHeader}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Avatar name={chatFriend.username} size={36} online={chatFriend.status === 'online'} />
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{chatFriend.username}</Text>
            <Text style={[styles.chatHeaderStatus, chatFriend.status === 'online' ? styles.statusOnline : styles.statusOffline]}>
              {chatFriend.status === 'online' ? '● En línea' : '○ Desconectado'}
            </Text>
          </View>
        </View>

        {chatLoading ? (
          <View style={styles.centered}><ActivityIndicator color="#7c3aed" size="large" /></View>
        ) : (
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <FlatList
              data={messages}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.chatList}
              ListEmptyComponent={<Text style={styles.emptyChat}>Inicia la conversación 👋</Text>}
              renderItem={({ item }) => {
                const mine = item.sender_id !== chatFriend.id;
                const time = new Date(item.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                return (
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={styles.bubbleText}>{item.content}</Text>
                    <Text style={styles.bubbleTime}>{time}</Text>
                  </View>
                );
              }}
            />
            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Mensaje..."
                placeholderTextColor="#6b7280"
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
                multiline={false}
              />
              <Pressable
                style={[styles.sendBtn, (!messageText.trim() || sendingMessage) && styles.sendBtnDisabled]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sendingMessage}
              >
                {sendingMessage
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sendBtnText}>↑</Text>}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    );
  }

  // ── Main social view ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Social</Text>
        <Pressable onPress={() => setNotifVisible(true)} style={styles.notifBtn} hitSlop={12}>
          <Text style={styles.notifIcon}>🔔</Text>
          {friendRequests.length > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{friendRequests.length}</Text></View>
          )}
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['amigos', 'solicitudes', 'chat'] as SocialTab[]).map(tab => (
          <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'amigos' ? '👥 Amigos' : tab === 'solicitudes' ? `🤝 Solicitudes${friendRequests.length > 0 ? ` (${friendRequests.length})` : ''}` : '💬 Chat'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color="#7c3aed" size="large" /></View>
      ) : (
        <>
          {activeTab === 'amigos' && (
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <FlatList
                data={friends}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <View style={styles.searchSection}>
                    <View style={styles.searchBox}>
                      <Text style={styles.searchIcon}>🔍</Text>
                      <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholder="Buscar jugadores..."
                        placeholderTextColor="#6b7280"
                        returnKeyType="search"
                      />
                      {searchQuery.length > 0 && (
                        <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }} hitSlop={8}>
                          <Text style={styles.clearSearch}>✕</Text>
                        </Pressable>
                      )}
                    </View>

                    {addFriendFeedback && (
                      <Text style={addFriendFeedback.type === 'ok' ? styles.feedbackOk : styles.feedbackErr}>
                        {addFriendFeedback.msg}
                      </Text>
                    )}

                    {searchResults.length > 0 && (
                      <View style={styles.searchResults}>
                        {searchResults.map(p => (
                          <View key={p.id} style={styles.searchResultRow}>
                            <Avatar name={p.username} size={38} />
                            <Text style={styles.searchResultName}>{p.username}</Text>
                            <Pressable
                              style={[styles.addBtn, addFriendLoading && styles.addBtnDisabled]}
                              onPress={() => handleAddFriend(p.id, p.username)}
                              disabled={addFriendLoading}
                            >
                              {addFriendLoading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.addBtnText}>+ Agregar</Text>}
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}

                    {friends.length > 0 && (
                      <Text style={styles.sectionLabel}>MIS AMIGOS · {friends.length}</Text>
                    )}
                    {error && friends.length === 0 && searchQuery.length === 0 && (
                      <View style={styles.inlineError}>
                        <Text style={styles.inlineErrorText}>No se pudieron cargar tus amigos</Text>
                      </View>
                    )}
                  </View>
                }
                ListEmptyComponent={
                  searchQuery.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyEmoji}>🎮</Text>
                      <Text style={styles.emptyTitle}>Sin amigos aún</Text>
                      <Text style={styles.emptySubtitle}>Busca jugadores arriba y agrégatelos</Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }: ListRenderItemInfo<Friend>) => (
                  <View style={styles.friendCard}>
                    <Avatar name={item.username} size={46} online={item.status === 'online'} />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{item.username}</Text>
                      <Text style={[styles.friendStatus, item.status === 'online' ? styles.statusOnline : styles.statusOffline]}>
                        {item.status === 'online' ? '● En línea' : '○ Desconectado'}
                      </Text>
                    </View>
                    <Pressable style={styles.inviteBtn} onPress={() => {}}>
                      <Text style={styles.inviteBtnText}>⚔️ Retar</Text>
                    </Pressable>
                  </View>
                )}
              />
            </KeyboardAvoidingView>
          )}

          {activeTab === 'solicitudes' && (
            <FlatList
              data={friendRequests}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={styles.emptyTitle}>Sin solicitudes</Text>
                  <Text style={styles.emptySubtitle}>Cuando alguien te agregue aparecerá aquí</Text>
                </View>
              }
              renderItem={({ item }: ListRenderItemInfo<FriendRequest>) => (
                <View style={styles.requestCard}>
                  <Avatar name={item.sender_username || item.sender_id} size={46} />
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{item.sender_username || item.sender_id.slice(0, 8)}</Text>
                    <Text style={styles.requestDate}>{new Date(item.created_at).toLocaleDateString('es-ES')}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <Pressable style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                      <Text style={styles.acceptBtnText}>✓</Text>
                    </Pressable>
                    <Pressable style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                      <Text style={styles.rejectBtnText}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}

          {activeTab === 'chat' && (
            <FlatList
              data={friends}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyTitle}>Sin chats</Text>
                  <Text style={styles.emptySubtitle}>Agrega amigos para chatear</Text>
                </View>
              }
              renderItem={({ item }: ListRenderItemInfo<Friend>) => (
                <Pressable style={({ pressed }) => [styles.chatCard, pressed && styles.pressed]} onPress={() => handleOpenChat(item)}>
                  <Avatar name={item.username} size={46} online={item.status === 'online'} />
                  <View style={styles.chatCardInfo}>
                    <Text style={styles.chatCardName}>{item.username}</Text>
                    <Text style={[styles.chatCardStatus, item.status === 'online' ? styles.statusOnline : styles.statusOffline]}>
                      {item.status === 'online' ? '● En línea' : '○ Desconectado'}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              )}
            />
          )}
        </>
      )}

      <NotificationCenter visible={notifVisible} onClose={() => setNotifVisible(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#7c3aed';
const PURPLE_LIGHT = '#a78bfa';
const BG = '#0f0f1a';
const CARD = '#1a1a2e';
const BORDER = '#2a2a40';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backArrow: { color: '#9ca3af', fontSize: 20, fontWeight: '600' },
  headerTitle: { flex: 1, color: '#f9fafb', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  notifBtn: { padding: 4, position: 'relative' },
  notifIcon: { fontSize: 22 },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#ef4444', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: CARD,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: PURPLE },
  tabText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // List
  listContent: { padding: 16, paddingBottom: 32 },

  // Search
  searchSection: { marginBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10, gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: '#f9fafb', fontSize: 15 },
  clearSearch: { color: '#6b7280', fontSize: 16 },
  feedbackOk: { color: '#34d399', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  feedbackErr: { color: '#f87171', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  searchResults: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: 12, overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  searchResultName: { flex: 1, color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  addBtn: {
    backgroundColor: PURPLE, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 10,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionLabel: {
    color: '#6b7280', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },

  // Friend card
  friendCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER, gap: 12,
  },
  friendInfo: { flex: 1 },
  friendName: { color: '#f9fafb', fontSize: 16, fontWeight: '700' },
  friendStatus: { fontSize: 12, marginTop: 2 },
  statusOnline: { color: '#34d399' },
  statusOffline: { color: '#6b7280' },
  inviteBtn: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1, borderColor: PURPLE,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  inviteBtnText: { color: PURPLE_LIGHT, fontSize: 13, fontWeight: '700' },

  // Request card
  requestCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER, gap: 12,
  },
  requestInfo: { flex: 1 },
  requestName: { color: '#f9fafb', fontSize: 15, fontWeight: '700' },
  requestDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  rejectBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center',
  },
  rejectBtnText: { color: '#9ca3af', fontSize: 16, fontWeight: '700' },

  // Chat list card
  chatCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER, gap: 12,
  },
  chatCardInfo: { flex: 1 },
  chatCardName: { color: '#f9fafb', fontSize: 16, fontWeight: '700' },
  chatCardStatus: { fontSize: 12, marginTop: 2 },
  chevron: { color: '#6b7280', fontSize: 24 },
  pressed: { opacity: 0.75 },

  // Chat header
  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12,
  },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { color: '#f9fafb', fontSize: 17, fontWeight: '700' },
  chatHeaderStatus: { fontSize: 12, marginTop: 1 },

  // Chat messages
  chatList: { padding: 16, paddingBottom: 8 },
  emptyChat: { color: '#6b7280', textAlign: 'center', marginTop: 40, fontSize: 15 },
  bubble: {
    maxWidth: '78%', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: PURPLE },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  bubbleText: { color: '#f9fafb', fontSize: 15 },
  bubbleTime: { color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 3, textAlign: 'right' },

  // Chat input
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: BORDER, gap: 8,
  },
  chatInput: {
    flex: 1, backgroundColor: CARD,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: '#f9fafb', fontSize: 15,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // Avatar
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  onlineDot: { position: 'absolute', borderWidth: 2, borderColor: BG },
  dotOnline: { backgroundColor: '#22c55e' },
  dotOffline: { backgroundColor: '#6b7280' },

  // Empty states
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: '#e5e7eb', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#6b7280', fontSize: 14, textAlign: 'center' },

  // Error
  errorEmoji: { fontSize: 40 },
  errorMsg: { color: '#f87171', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  inlineError: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  inlineErrorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default SocialScreen;
