// Feature: react-native-game-migration
// Requirements: 15.1, 15.2, 15.3, 15.4
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { socketService } from '../services/socketService';
import { RootStackParamList } from '../navigation/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TournamentMatch {
  player1: string;
  player2: string;
  winner?: string;
}

export interface TournamentRound {
  round: number;
  matches: TournamentMatch[];
}

export interface TournamentState {
  id: string;
  name?: string;
  code?: string;
  status: 'lobby' | 'in_progress' | 'completed';
  participants: { id: string; name: string }[];
  bracket: TournamentRound[];
  current_players?: number;
  max_players?: number;
}

type TournamentView = 'create' | 'lobby' | 'bracket';
type TournamentNavProp = NativeStackNavigationProp<RootStackParamList, 'Tournament'>;

const BG = '#0f0f1a';
const CARD = '#1a1a2e';
const BORDER = '#2a2a40';
const PURPLE = '#7c3aed';
const GOLD = '#f59e0b';

// ─── Status label helper ──────────────────────────────────────────────────────

function statusLabel(status: TournamentState['status']): string {
  switch (status) {
    case 'lobby': return 'Lobby';
    case 'in_progress': return 'En progreso';
    case 'completed': return 'Finalizado';
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `hsl(${hue},55%,38%)`,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
}

// ─── TournamentScreen ─────────────────────────────────────────────────────────

export function TournamentScreen(): React.JSX.Element {
  const navigation = useNavigation<TournamentNavProp>();

  const [view, setView] = useState<TournamentView>('create');
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [tournamentName, setTournamentName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<4 | 8 | 16 | 32>(8);
  const [joinCode, setJoinCode] = useState('');

  // ── Socket event listeners ──────────────────────────────────────────────────

  useEffect(() => {
    const handlePlayerJoined = (data: unknown) => {
      const payload = data as { tournament: TournamentState };
      if (payload?.tournament) setTournament(payload.tournament);
    };

    const handleTournamentStarted = (data: unknown) => {
      const t = data as TournamentState;
      setTournament(t);
      setView('bracket');
    };

    const handleMatchReady = () => {
      if (tournament?.id) {
        try { socketService.emit('get_tournament', { tournamentId: tournament.id }); } catch { /* ignore */ }
      }
    };

    const handleTournamentData = (data: unknown) => {
      const t = data as TournamentState;
      if (t?.bracket) setTournament((prev) => (prev ? { ...prev, ...t } : t));
    };

    const handleTournamentCompleted = (data: unknown) => {
      const payload = data as { winnerId?: string };
      setTournament((prev) => prev ? { ...prev, status: 'completed' } : prev);
      if (payload?.winnerId) { /* optionally store winner */ }
    };

    try {
      socketService.on('tournament_player_joined', handlePlayerJoined);
      socketService.on('tournament_started', handleTournamentStarted);
      socketService.on('tournament_match_ready', handleMatchReady);
      socketService.on('tournament_data', handleTournamentData);
      socketService.on('tournament_completed', handleTournamentCompleted);
    } catch { /* socket not yet connected */ }

    return () => {
      try {
        socketService.off('tournament_player_joined');
        socketService.off('tournament_started');
        socketService.off('tournament_match_ready');
        socketService.off('tournament_data');
        socketService.off('tournament_completed');
      } catch { /* ignore */ }
    };
  }, [tournament?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!tournamentName.trim()) { setError('Ingresa un nombre para el torneo'); return; }
    setLoading(true);
    setError('');
    try {
      socketService.emit('create_tournament', { name: tournamentName.trim(), maxPlayers });
      socketService.on('tournament_created', (data: unknown) => {
        const t = data as TournamentState;
        setTournament(t);
        setView('lobby');
        setLoading(false);
        socketService.off('tournament_created');
      });
      socketService.on('error', (msg: unknown) => {
        setError(typeof msg === 'string' ? msg : 'Error al crear el torneo');
        setLoading(false);
        socketService.off('error');
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el torneo');
      setLoading(false);
    }
  }, [tournamentName, maxPlayers]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim()) { setError('Ingresa el código del torneo'); return; }
    setLoading(true);
    setError('');
    try {
      socketService.emit('join_tournament', { tournamentCode: joinCode.trim().toUpperCase() });
      socketService.on('tournament_joined', (data: unknown) => {
        const t = data as TournamentState;
        setTournament(t);
        setView('lobby');
        setLoading(false);
        socketService.off('tournament_joined');
      });
      socketService.on('error', (msg: unknown) => {
        setError(typeof msg === 'string' ? msg : 'Error al unirse al torneo');
        setLoading(false);
        socketService.off('error');
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al unirse al torneo');
      setLoading(false);
    }
  }, [joinCode]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainMenu');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </Pressable>
          <Text style={styles.headerTitle}>🏆 Torneos</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {view === 'create' && (
            <CreateView
              tournamentName={tournamentName}
              onNameChange={setTournamentName}
              maxPlayers={maxPlayers}
              onMaxPlayersChange={setMaxPlayers}
              joinCode={joinCode}
              onJoinCodeChange={setJoinCode}
              loading={loading}
              error={error}
              onCreate={handleCreate}
              onJoin={handleJoin}
            />
          )}
          {view === 'lobby' && tournament && <LobbyView tournament={tournament} />}
          {view === 'bracket' && tournament && <BracketView tournament={tournament} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── CreateView ───────────────────────────────────────────────────────────────

interface CreateViewProps {
  tournamentName: string;
  onNameChange: (v: string) => void;
  maxPlayers: 4 | 8 | 16 | 32;
  onMaxPlayersChange: (v: 4 | 8 | 16 | 32) => void;
  joinCode: string;
  onJoinCodeChange: (v: string) => void;
  loading: boolean;
  error: string;
  onCreate: () => void;
  onJoin: () => void;
}

function CreateView({
  tournamentName, onNameChange, maxPlayers, onMaxPlayersChange,
  joinCode, onJoinCodeChange, loading, error, onCreate, onJoin,
}: CreateViewProps): React.JSX.Element {
  const playerOptions: Array<4 | 8 | 16 | 32> = [4, 8, 16, 32];

  return (
    <View style={styles.card}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>CREAR TORNEO</Text>

      <TextInput
        style={styles.input}
        value={tournamentName}
        onChangeText={onNameChange}
        placeholder="Nombre del torneo"
        placeholderTextColor="#6b7280"
        returnKeyType="done"
        accessibilityLabel="Nombre del torneo"
      />

      <View style={styles.playerOptionsRow}>
        {playerOptions.map((n) => (
          <Pressable
            key={n}
            style={({ pressed }) => [
              styles.playerPill,
              maxPlayers === n && styles.playerPillSelected,
              pressed && styles.pressed,
            ]}
            onPress={() => onMaxPlayersChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} jugadores`}
          >
            <Text style={[styles.playerPillText, maxPlayers === n && styles.playerPillTextSelected]}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, loading && styles.buttonDisabled, pressed && styles.pressed]}
        onPress={onCreate}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Crear Torneo"
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.primaryButtonText}>🏆 Crear Torneo</Text>}
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>O ÚNETE</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.joinRow}>
        <TextInput
          style={[styles.input, styles.joinInput]}
          value={joinCode}
          onChangeText={(v) => onJoinCodeChange(v.toUpperCase())}
          placeholder="Código (6 chars)"
          placeholderTextColor="#6b7280"
          maxLength={6}
          autoCapitalize="characters"
          returnKeyType="done"
          accessibilityLabel="Código del torneo"
        />
        <Pressable
          style={({ pressed }) => [styles.joinButton, loading && styles.buttonDisabled, pressed && styles.pressed]}
          onPress={onJoin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Unirse a Torneo"
        >
          <Text style={styles.joinButtonText}>Unirse</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── LobbyView ────────────────────────────────────────────────────────────────

function LobbyView({ tournament }: { tournament: TournamentState }): React.JSX.Element {
  const current = tournament.current_players ?? tournament.participants.length;
  const max = tournament.max_players ?? 0;
  const progress = max > 0 ? (current / max) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.lobbyHeader}>
        <Text style={styles.lobbyTitle}>{tournament.name ?? 'Torneo'}</Text>
        <View style={[styles.statusBadge, styles.statusLobby]}>
          <Text style={styles.statusText}>{statusLabel(tournament.status)}</Text>
        </View>
      </View>

      {tournament.code ? (
        <Text style={styles.lobbyCode}>
          Código: <Text style={styles.lobbyCodeValue}>{tournament.code}</Text>
        </Text>
      ) : null}

      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Jugadores</Text>
          <Text style={styles.progressCount}>{current} / {max}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
      </View>

      {tournament.participants.length > 0 ? (
        <View style={styles.participantsList}>
          <Text style={styles.sectionLabel}>PARTICIPANTES</Text>
          {tournament.participants.map((p) => (
            <View key={p.id} style={styles.participantRow}>
              <Avatar name={p.name} size={32} />
              <Text style={styles.participantName}>{p.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.waitingRow}>
        <Text style={styles.waitingText}>El torneo iniciará automáticamente al completarse</Text>
      </View>
    </View>
  );
}

// ─── BracketView ──────────────────────────────────────────────────────────────

function BracketView({ tournament }: { tournament: TournamentState }): React.JSX.Element {
  const totalRounds = tournament.bracket.length;

  return (
    <View style={styles.card}>
      <View style={styles.bracketHeader}>
        <Text style={styles.bracketTitle}>Bracket del Torneo</Text>
        <View style={[styles.statusBadge, tournament.status === 'completed' ? styles.statusCompleted : styles.statusInProgress]}>
          <Text style={styles.statusText}>{statusLabel(tournament.status)}</Text>
        </View>
      </View>

      {tournament.status === 'completed' && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerText}>🏆 Torneo finalizado</Text>
        </View>
      )}

      {tournament.bracket.map((round) => {
        const isFinal = round.round === totalRounds;
        return (
          <View key={round.round} style={styles.roundSection}>
            <Text style={styles.roundLabel}>{isFinal ? 'Final' : `Ronda ${round.round}`}</Text>
            {round.matches.map((match, idx) => (
              <MatchCard key={idx} match={match} />
            ))}
          </View>
        );
      })}

      {tournament.bracket.length === 0 && (
        <Text style={styles.emptyBracket}>El bracket aún no está disponible.</Text>
      )}
    </View>
  );
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: TournamentMatch }): React.JSX.Element {
  const p1Won = match.winner === match.player1;
  const p2Won = match.winner === match.player2;
  return (
    <View style={styles.matchCard}>
      <PlayerSlot name={match.player1} isWinner={p1Won} />
      <View style={styles.matchVs}>
        <Text style={styles.matchVsText}>VS</Text>
      </View>
      <PlayerSlot name={match.player2} isWinner={p2Won} />
    </View>
  );
}

// ─── PlayerSlot ───────────────────────────────────────────────────────────────

function PlayerSlot({ name, isWinner }: { name: string; isWinner: boolean }): React.JSX.Element {
  return (
    <View style={[styles.playerSlot, isWinner && styles.playerSlotWinner]}>
      <Text style={[styles.playerSlotText, isWinner && styles.playerSlotTextWinner]} numberOfLines={1}>
        {isWinner ? '🏆 ' : ''}{name || 'Por definir'}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backButton: { paddingVertical: 4, paddingRight: 8 },
  backButtonText: { color: '#9ca3af', fontSize: 14 },
  headerTitle: { flex: 1, color: '#f9fafb', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 60 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, padding: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  sectionLabel: {
    color: '#6b7280', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12,
  },
  input: {
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    color: '#f9fafb', fontSize: 14, marginBottom: 12,
  },
  playerOptionsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  playerPill: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center',
  },
  playerPillSelected: { backgroundColor: PURPLE, borderColor: PURPLE },
  playerPillText: { color: '#9ca3af', fontSize: 14, fontWeight: '700' },
  playerPillTextSelected: { color: '#fff' },
  primaryButton: {
    backgroundColor: PURPLE, paddingVertical: 15,
    borderRadius: 14, alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { color: '#6b7280', fontSize: 11, fontWeight: '700', marginHorizontal: 12 },
  joinRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  joinInput: {
    flex: 1, marginBottom: 0, textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2,
  },
  joinButton: {
    backgroundColor: '#2563eb', paddingHorizontal: 16,
    paddingVertical: 13, borderRadius: 14, justifyContent: 'center',
  },
  joinButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  // Lobby
  lobbyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  lobbyTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },
  lobbyCode: { color: '#9ca3af', fontSize: 13, marginBottom: 20 },
  lobbyCodeValue: { color: GOLD, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  progressSection: { marginBottom: 20 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { color: '#9ca3af', fontSize: 13 },
  progressCount: { color: '#f9fafb', fontSize: 13, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: BG, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  progressFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 4 },
  participantsList: { marginBottom: 16 },
  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  participantName: { color: '#e5e7eb', fontSize: 14 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitingText: { color: '#60a5fa', fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  // Status badges
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusLobby: { backgroundColor: 'rgba(96,165,250,0.2)' },
  statusInProgress: { backgroundColor: 'rgba(245,158,11,0.2)' },
  statusCompleted: { backgroundColor: 'rgba(34,197,94,0.2)' },
  statusText: { color: '#e5e7eb', fontSize: 12, fontWeight: '600' },
  // Bracket
  bracketHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  bracketTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },
  winnerBanner: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center',
  },
  winnerText: { color: GOLD, fontSize: 15, fontWeight: '800' },
  roundSection: { marginBottom: 20 },
  roundLabel: {
    color: '#9ca3af', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase',
    textAlign: 'center', marginBottom: 10,
  },
  matchCard: {
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, overflow: 'hidden', marginBottom: 10,
  },
  matchVs: { backgroundColor: CARD, paddingVertical: 4, alignItems: 'center' },
  matchVsText: { color: '#6b7280', fontSize: 11, fontWeight: '700' },
  playerSlot: { paddingHorizontal: 16, paddingVertical: 11 },
  playerSlotWinner: { backgroundColor: 'rgba(245,158,11,0.2)' },
  playerSlotText: { color: '#d1d5db', fontSize: 14, fontWeight: '500' },
  playerSlotTextWinner: { color: GOLD, fontWeight: '700' },
  emptyBracket: { color: '#6b7280', fontSize: 14, textAlign: 'center', paddingVertical: 24, fontStyle: 'italic' },
});

export default TournamentScreen;
