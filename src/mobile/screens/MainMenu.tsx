// Feature: react-native-game-migration
// Requirements: 6.6, 7.3

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
} from 'react-native';
import Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { socketService } from '../services/socketService';
import { persistenceService } from '../services/persistenceService';
import { authService } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type MainMenuNavProp = NativeStackNavigationProp<Omit<RootStackParamList, 'Auth'>>;

const BG = '#0f0f1a';
const CARD = '#1a1a2e';
const BORDER = '#2a2a40';
const PURPLE = '#7c3aed';
const GOLD = '#f59e0b';

const PLACEHOLDER_ELO = 1200;

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `hsl(${hue},55%,38%)`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
}

// ─── MainMenu ─────────────────────────────────────────────────────────────────

export function MainMenu(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<MainMenuNavProp>();

  const displayName = user?.user_metadata?.username ?? user?.email ?? 'Jugador';

  // Modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [myRoomsModalVisible, setMyRoomsModalVisible] = useState(false);
  const [roomCreatedModalVisible, setRoomCreatedModalVisible] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [createdRoomMode, setCreatedRoomMode] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<'1v1' | '2v2'>('1v1');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [lobbyWarning, setLobbyWarning] = useState('');
  const [myRooms, setMyRooms] = useState<{ roomId: string; mode: string; players: number; maxPlayers: number }[]>([]);
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);

  const goToSocial = useCallback(() => navigation.navigate('Social'), [navigation]);
  const goToTournament = useCallback(() => navigation.navigate('Tournament', {}), [navigation]);
  const goToSettings = useCallback(() => navigation.navigate('Settings'), [navigation]);
  const goToStats = useCallback(
    () => navigation.navigate('Stats', { playerId: user?.id ?? '' }),
    [navigation, user],
  );

  // ── Connect socket helper ──────────────────────────────────────────────────

  const ensureConnected = useCallback(async () => {
    const session = await authService.getSession();
    if (!session?.access_token) throw new Error('No hay sesión activa');
    await socketService.connect(session.access_token);
  }, []);

  // ── Socket listeners for lobby events ─────────────────────────────────────

  useEffect(() => {
    const handleLobbyExpiring = (data: unknown) => {
      const payload = data as { message: string };
      setLobbyWarning(payload.message);
    };
    const handleLobbyExpired = (data: unknown) => {
      const payload = data as { roomId: string; message: string };
      setLobbyWarning('');
      setMyRooms(prev => prev.filter(r => r.roomId !== payload.roomId));
      Alert.alert('Sala eliminada', payload.message);
    };
    const handleMyRooms = (data: unknown) => {
      setMyRooms(data as { roomId: string; mode: string; players: number; maxPlayers: number }[]);
    };
    const handleRoomDeletedOk = (data: unknown) => {
      const payload = data as { roomId: string };
      setMyRooms(prev => prev.filter(r => r.roomId !== payload.roomId));
      setDeletingRoom(null);
    };

    try {
      socketService.on('lobby_expiring', handleLobbyExpiring);
      socketService.on('lobby_expired', handleLobbyExpired);
      socketService.on('my_rooms', handleMyRooms);
      socketService.on('room_deleted_ok', handleRoomDeletedOk);
    } catch { /* socket not connected yet */ }

    return () => {
      try {
        socketService.off('lobby_expiring');
        socketService.off('lobby_expired');
        socketService.off('my_rooms');
        socketService.off('room_deleted_ok');
      } catch { /* ignore */ }
    };
  }, []);

  // ── My Rooms ───────────────────────────────────────────────────────────────

  const handleOpenMyRooms = useCallback(async () => {
    try {
      await ensureConnected();
      socketService.emit('get_my_rooms', {});
      setMyRoomsModalVisible(true);
    } catch {
      setMyRoomsModalVisible(true);
    }
  }, [ensureConnected]);

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    setDeletingRoom(roomId);
    try {
      await ensureConnected();
      socketService.emit('delete_room', { roomId });
    } catch {
      setDeletingRoom(null);
      Alert.alert('Error', 'No se pudo eliminar la sala');
    }
  }, [ensureConnected]);

  // ── Create room ────────────────────────────────────────────────────────────

  const handleCreateRoom = useCallback(async () => {
    setLoading(true);
    setActionError('');
    try {
      await ensureConnected();
      const playerName = user?.user_metadata?.username ?? user?.email ?? 'Jugador';
      socketService.emit('create_room', { playerName, mode: selectedMode });

      socketService.on('room_created', async (data: unknown) => {
        const payload = data as { roomId: string };
        socketService.off('room_created');
        await persistenceService.saveRoomId(payload.roomId);
        setLoading(false);
        setCreateModalVisible(false);
        // Show room code modal instead of navigating immediately
        setCreatedRoomId(payload.roomId);
        setCreatedRoomMode(selectedMode);
        setRoomCreatedModalVisible(true);
      });

      socketService.on('error', (msg: unknown) => {
        socketService.off('error');
        setActionError(typeof msg === 'string' ? msg : 'Error al crear sala');
        setLoading(false);
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error de conexión');
      setLoading(false);
    }
  }, [ensureConnected, user, selectedMode]);

  // ── Room created actions ───────────────────────────────────────────────────

  const handleShareRoom = useCallback(async () => {
    try {
      await Share.share({
        message: `¡Únete a mi partida de Casino 21! Código de sala: ${createdRoomId}`,
        title: 'Casino 21 — Código de sala',
      });
    } catch { /* user cancelled */ }
  }, [createdRoomId]);

  const handleCopyCode = useCallback(() => {
    Clipboard.setStringAsync(createdRoomId);
    Alert.alert('¡Copiado!', `Código ${createdRoomId} copiado al portapapeles`);
  }, [createdRoomId]);

  const handleEnterRoom = useCallback(() => {
    setRoomCreatedModalVisible(false);
    navigation.navigate('Game', { roomId: createdRoomId });
  }, [createdRoomId, navigation]);

  // ── Join room ──────────────────────────────────────────────────────────────

  const handleJoinRoom = useCallback(async () => {
    const trimmed = roomIdInput.trim().toUpperCase();
    if (!trimmed) {
      setActionError('Ingresa el código de sala');
      return;
    }
    setLoading(true);
    setActionError('');
    try {
      await ensureConnected();
      const playerName = user?.user_metadata?.username ?? user?.email ?? 'Jugador';
      socketService.emit('join_room', { roomId: trimmed, playerName });
      await persistenceService.saveRoomId(trimmed);

      socketService.on('game_state_update', () => {
        socketService.off('game_state_update');
        setJoinModalVisible(false);
        navigation.navigate('Game', { roomId: trimmed });
      });

      socketService.on('error', (msg: unknown) => {
        socketService.off('error');
        setActionError(typeof msg === 'string' ? msg : 'Sala no encontrada');
        setLoading(false);
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error de conexión');
      setLoading(false);
    }
  }, [ensureConnected, user, roomIdInput, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🃏 Casino 21</Text>
          <View style={styles.userCard}>
            <Avatar name={displayName} size={44} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.elo}>⭐ {PLACEHOLDER_ELO} ELO</Text>
            </View>
          </View>
        </View>

        {/* Lobby expiry warning */}
        {lobbyWarning ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>⚠️ {lobbyWarning}</Text>
            <Pressable onPress={() => setLobbyWarning('')} hitSlop={8}>
              <Text style={styles.warningDismiss}>✕</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Game actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PARTIDA</Text>

          <Pressable
            style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}
            onPress={() => { setActionError(''); setCreateModalVisible(true); }}
            testID="create-game-button"
          >
            <Text style={styles.buttonText}>⚔️ Crear Partida</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, styles.outlinePurpleButton, pressed && styles.pressed]}
            onPress={() => { setActionError(''); setRoomIdInput(''); setJoinModalVisible(true); }}
            testID="join-game-button"
          >
            <Text style={styles.outlinePurpleText}>🚪 Unirse a Partida</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, styles.outlineGrayButton, pressed && styles.pressed]}
            onPress={handleOpenMyRooms}
          >
            <Text style={styles.outlineGrayText}>🏠 Mis Salas Activas</Text>
          </Pressable>
        </View>

        {/* Navigation grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MENÚ</Text>
          <View style={styles.navGrid}>
            <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={goToSocial}>
              <Text style={styles.navCardEmoji}>👥</Text>
              <Text style={styles.navCardText}>Social</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={goToTournament}>
              <Text style={styles.navCardEmoji}>🏆</Text>
              <Text style={styles.navCardText}>Torneo</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={goToSettings}>
              <Text style={styles.navCardEmoji}>⚙️</Text>
              <Text style={styles.navCardText}>Config</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={goToStats}>
              <Text style={styles.navCardEmoji}>📊</Text>
              <Text style={styles.navCardText}>Stats</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, styles.signOutButton, pressed && styles.pressed]}
          onPress={signOut}
        >
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </Pressable>
      </ScrollView>

      {/* ── My Rooms Modal ── */}
      <Modal visible={myRoomsModalVisible} transparent animationType="fade" onRequestClose={() => setMyRoomsModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMyRoomsModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>🏠 Mis Salas Activas</Text>
            {myRooms.length === 0 ? (
              <Text style={styles.myRoomsEmpty}>No tienes salas activas en espera</Text>
            ) : (
              myRooms.map((room) => (
                <View key={room.roomId} style={styles.myRoomRow}>
                  <View style={styles.myRoomInfo}>
                    <Text style={styles.myRoomCode}>{room.roomId}</Text>
                    <Text style={styles.myRoomMeta}>{room.mode} · {room.players}/{room.maxPlayers} jugadores</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.deleteRoomButton, pressed && styles.pressed]}
                    onPress={() => handleDeleteRoom(room.roomId)}
                    disabled={deletingRoom === room.roomId}
                  >
                    {deletingRoom === room.roomId
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.deleteRoomText}>Eliminar</Text>
                    }
                  </Pressable>
                </View>
              ))
            )}
            <Pressable
              style={({ pressed }) => [styles.button, styles.signOutButton, { marginTop: 16 }, pressed && styles.pressed]}
              onPress={() => setMyRoomsModalVisible(false)}
            >
              <Text style={styles.signOutText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Room Created Modal ── */}
      <Modal visible={roomCreatedModalVisible} transparent animationType="slide" onRequestClose={() => setRoomCreatedModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <Text style={styles.roomCreatedEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>¡Sala creada!</Text>
            <Text style={styles.roomCreatedSub}>Modo {createdRoomMode} · Comparte el código con tus amigos</Text>

            {/* Room code display */}
            <Pressable style={styles.roomCodeBox} onPress={handleCopyCode} accessibilityLabel="Copiar código">
              <Text style={styles.roomCodeText}>{createdRoomId}</Text>
              <Text style={styles.roomCodeCopyHint}>Toca para copiar</Text>
            </Pressable>

            {/* Actions */}
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
              onPress={handleShareRoom}
            >
              <Text style={styles.shareBtnText}>📤 Compartir código</Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed]}
                onPress={() => setRoomCreatedModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Esperar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalConfirm, pressed && styles.pressed]}
                onPress={handleEnterRoom}
              >
                <Text style={styles.modalConfirmText}>Entrar ⚔️</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Create Room Modal ── */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚔️ Crear Partida</Text>
            <Text style={styles.modalLabel}>MODO DE JUEGO</Text>
            <View style={styles.modeRow}>
              {(['1v1', '2v2'] as const).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.modePill, selectedMode === m && styles.modePillActive]}
                  onPress={() => setSelectedMode(m)}
                >
                  <Text style={[styles.modePillText, selectedMode === m && styles.modePillTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>
            {actionError ? <Text style={styles.modalError}>⚠️ {actionError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed]}
                onPress={() => { setCreateModalVisible(false); setLoading(false); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalConfirm, loading && styles.buttonDisabled, pressed && styles.pressed]}
                onPress={handleCreateRoom}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Crear</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Join Room Modal ── */}
      <Modal visible={joinModalVisible} transparent animationType="fade" onRequestClose={() => setJoinModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚪 Unirse a Partida</Text>
            <Text style={styles.modalLabel}>CÓDIGO DE SALA</Text>
            <TextInput
              style={styles.modalInput}
              value={roomIdInput}
              onChangeText={setRoomIdInput}
              placeholder="Ej: ABC123"
              placeholderTextColor="#6b7280"
              autoCapitalize="characters"
              returnKeyType="go"
              onSubmitEditing={handleJoinRoom}
            />
            {actionError ? <Text style={styles.modalError}>⚠️ {actionError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed]}
                onPress={() => { setJoinModalVisible(false); setLoading(false); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalConfirm, loading && styles.buttonDisabled, pressed && styles.pressed]}
                onPress={handleJoinRoom}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Unirse</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 1,
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
    alignSelf: 'stretch',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f9fafb',
  },
  elo: {
    fontSize: 13,
    color: GOLD,
    fontWeight: '600',
    marginTop: 2,
  },
  // Warning
  warningBanner: {
    backgroundColor: '#78350f',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#92400e',
  },
  warningText: {
    flex: 1,
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: '500',
  },
  warningDismiss: {
    color: '#fef3c7',
    fontSize: 16,
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  // Buttons
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: PURPLE,
  },
  outlinePurpleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: PURPLE,
  },
  outlineGrayButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  outlinePurpleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#a78bfa',
  },
  outlineGrayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
  },
  signOutText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  // Nav grid
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  navCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
  },
  navCardEmoji: {
    fontSize: 26,
  },
  navCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f9fafb',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  modePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'transparent',
  },
  modePillActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  modePillText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  modePillTextActive: {
    color: '#fff',
  },
  modalInput: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#f9fafb',
    fontSize: 16,
    letterSpacing: 2,
    marginBottom: 16,
  },
  modalError: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalCancelText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: PURPLE,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Room created modal
  roomCreatedEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 8,
  },
  roomCreatedSub: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  roomCodeBox: {
    backgroundColor: BG,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PURPLE,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  roomCodeText: {
    color: '#f9fafb',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  roomCodeCopyHint: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 6,
  },
  shareBtn: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  shareBtnText: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '700',
  },
  // My rooms
  myRoomsEmpty: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  myRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  myRoomInfo: {
    flex: 1,
  },
  myRoomCode: {
    color: '#f9fafb',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
  },
  myRoomMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  deleteRoomButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  deleteRoomText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
