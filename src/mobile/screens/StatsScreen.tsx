// Feature: react-native-game-migration
// Requirements: 16.1, 16.2, 16.3, 16.4
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import EloChart, { EloDataPoint } from '../components/EloChart';
import { useGame } from '../hooks/useGame';
import type { RootStackParamList } from '../navigation/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatsRouteProp = RouteProp<RootStackParamList, 'Stats'>;

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
}

interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  currentElo: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function generateMockEloHistory(playerId: string): EloDataPoint[] {
  const seed = playerId.length || 5;
  const base = 1000 + seed * 20;
  const today = new Date();
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (9 - i));
    const delta = Math.sin(i * seed) * 30;
    return {
      date: d.toISOString().slice(0, 10),
      elo: Math.round(base + delta + i * 8),
    };
  });
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, playerId: 'p1', username: 'ElMaestro', elo: 1850, wins: 120, losses: 30 },
  { rank: 2, playerId: 'p2', username: 'CasinoKing', elo: 1780, wins: 98, losses: 42 },
  { rank: 3, playerId: 'p3', username: 'CartasBraves', elo: 1720, wins: 85, losses: 55 },
  { rank: 4, playerId: 'p4', username: 'As21', elo: 1650, wins: 70, losses: 60 },
  { rank: 5, playerId: 'p5', username: 'JugadorPro', elo: 1600, wins: 65, losses: 65 },
  { rank: 6, playerId: 'p6', username: 'NovataFuerte', elo: 1540, wins: 50, losses: 70 },
  { rank: 7, playerId: 'p7', username: 'MesaVacia', elo: 1490, wins: 45, losses: 75 },
  { rank: 8, playerId: 'p8', username: 'Formaciones', elo: 1430, wins: 40, losses: 80 },
  { rank: 9, playerId: 'p9', username: 'Cantador', elo: 1380, wins: 35, losses: 85 },
  { rank: 10, playerId: 'p10', username: 'Aprendiz', elo: 1320, wins: 28, losses: 90 },
];

const LEADERBOARD_ROW_HEIGHT = 56;

// ─── LeaderboardRow ───────────────────────────────────────────────────────────

const LeaderboardRow = React.memo(function LeaderboardRow({
  item,
  isCurrentPlayer,
}: {
  item: LeaderboardEntry;
  isCurrentPlayer: boolean;
}): React.JSX.Element {
  const rankColor =
    item.rank === 1 ? '#f59e0b' :
    item.rank === 2 ? '#C0C0C0' :
    item.rank === 3 ? '#CD7F32' :
    '#9ca3af';
  return (
    <View style={[styles.leaderboardRow, isCurrentPlayer && styles.leaderboardRowHighlight]}>
      <Text style={[styles.rank, { color: rankColor }]}>#{item.rank}</Text>
      <Text style={styles.leaderboardUsername} numberOfLines={1}>{item.username}</Text>
      <Text style={styles.leaderboardElo}>{item.elo}</Text>
      <Text style={styles.leaderboardRecord}>{item.wins}W / {item.losses}L</Text>
    </View>
  );
});

// ─── StatsScreen ──────────────────────────────────────────────────────────────

export function StatsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<StatsRouteProp>();
  const { playerId } = route.params;

  const { state } = useGame();
  const gameState = state.gameState;

  const [eloHistory, setEloHistory] = useState<EloDataPoint[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    setLoading(true);
    const history = generateMockEloHistory(playerId);
    const lastElo = history[history.length - 1]?.elo ?? 1200;
    const wins = 45;
    const losses = 30;
    setEloHistory(history);
    setPlayerStats({
      gamesPlayed: wins + losses,
      wins,
      losses,
      winRate: Math.round((wins / (wins + losses)) * 100),
      currentElo: lastElo,
    });
    setLoading(false);
  }, [playerId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (gameState?.phase === 'completed') loadStats();
  }, [gameState?.phase, loadStats]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const keyExtractor = useCallback((item: LeaderboardEntry) => item.playerId, []);

  const renderLeaderboardItem = useCallback(
    ({ item }: ListRenderItemInfo<LeaderboardEntry>) => (
      <LeaderboardRow item={item} isCurrentPlayer={item.playerId === playerId} />
    ),
    [playerId],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: LEADERBOARD_ROW_HEIGHT,
      offset: LEADERBOARD_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const leaderboardHeader = useMemo(
    () => (
      <View style={styles.leaderboardHeader}>
        <Text style={styles.leaderboardHeaderRank}>#</Text>
        <Text style={styles.leaderboardHeaderName}>Jugador</Text>
        <Text style={styles.leaderboardHeaderElo}>ELO</Text>
        <Text style={styles.leaderboardHeaderRecord}>Récord</Text>
      </View>
    ),
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#7c3aed" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <Text style={styles.headerTitle}>📊 Estadísticas</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={MOCK_LEADERBOARD}
        keyExtractor={keyExtractor}
        renderItem={renderLeaderboardItem}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            {/* Player stats summary */}
            {playerStats && (
              <View style={styles.statsCard}>
                <Text style={styles.sectionLabel}>MIS ESTADÍSTICAS</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.eloColor]}>{playerStats.currentElo}</Text>
                    <Text style={styles.statLabel}>ELO</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{playerStats.gamesPlayed}</Text>
                    <Text style={styles.statLabel}>Partidas</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.winsColor]}>{playerStats.wins}</Text>
                    <Text style={styles.statLabel}>Victorias</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.lossesColor]}>{playerStats.losses}</Text>
                    <Text style={styles.statLabel}>Derrotas</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{playerStats.winRate}%</Text>
                    <Text style={styles.statLabel}>% Victoria</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ELO history chart */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionLabel}>HISTORIAL DE ELO</Text>
              <EloChart data={eloHistory} />
            </View>

            {/* Leaderboard header */}
            <Text style={[styles.sectionLabel, styles.leaderboardTitle]}>🏆 CLASIFICACIÓN</Text>
            {leaderboardHeader}
          </>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG = '#0f0f1a';
const CARD = '#1a1a2e';
const BORDER = '#2a2a40';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backButton: { paddingVertical: 4, paddingRight: 8 },
  backButtonText: { color: '#9ca3af', fontSize: 14 },
  headerTitle: { flex: 1, color: '#f9fafb', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 56 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    color: '#6b7280', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12,
  },
  // Stats card
  statsCard: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 24,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statItem: {
    flex: 1, minWidth: '28%', alignItems: 'center',
    backgroundColor: BG, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  statValue: { color: '#f9fafb', fontSize: 22, fontWeight: '700' },
  statLabel: { color: '#9ca3af', fontSize: 11, marginTop: 4, textAlign: 'center' },
  eloColor: { color: '#f59e0b' },
  winsColor: { color: '#22c55e' },
  lossesColor: { color: '#ef4444' },
  // Chart
  chartSection: { marginBottom: 24 },
  leaderboardTitle: { marginTop: 4 },
  // Leaderboard header row
  leaderboardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: CARD, borderRadius: 10,
    marginBottom: 4, borderWidth: 1, borderColor: BORDER,
  },
  leaderboardHeaderRank: { width: 36, color: '#6b7280', fontSize: 11, fontWeight: '700' },
  leaderboardHeaderName: { flex: 1, color: '#6b7280', fontSize: 11, fontWeight: '700' },
  leaderboardHeaderElo: { width: 52, color: '#6b7280', fontSize: 11, fontWeight: '700', textAlign: 'right' },
  leaderboardHeaderRecord: { width: 80, color: '#6b7280', fontSize: 11, fontWeight: '700', textAlign: 'right' },
  // Leaderboard rows
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center',
    height: LEADERBOARD_ROW_HEIGHT, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  leaderboardRowHighlight: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 10,
  },
  rank: { width: 36, fontSize: 13, fontWeight: '700' },
  leaderboardUsername: { flex: 1, color: '#e5e7eb', fontSize: 14, fontWeight: '500' },
  leaderboardElo: { width: 52, color: '#f59e0b', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  leaderboardRecord: { width: 80, color: '#9ca3af', fontSize: 12, textAlign: 'right' },
  pressed: { opacity: 0.75 },
});

export default StatsScreen;
