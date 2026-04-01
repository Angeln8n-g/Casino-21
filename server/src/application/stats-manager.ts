import { supabase } from '../supabase';
import { PlayerStats, EloHistory } from '../domain/tournament';

export class StatsManager {
  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('elo, wins, losses')
      .eq('id', playerId)
      .single();

    if (!profile) {
      throw new Error('Jugador no encontrado');
    }

    // Obtener estadísticas adicionales
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    const totalGames = matches?.length || 0;
    const wins = matches?.filter(m => m.winner_id === playerId).length || 0;
    const losses = totalGames - wins;

    // Calcular rachas
    const { currentStreak, bestStreak } = this.calculateStreaks(matches || [], playerId);

    // Obtener historial de Elo
    const { data: eloHistory } = await supabase
      .from('elo_history')
      .select('elo, change, timestamp, reason')
      .eq('player_id', playerId)
      .order('timestamp', { ascending: false })
      .limit(30);

    const maxElo = Math.max(
      profile.elo,
      ...(eloHistory?.map(e => e.elo) || [])
    );

    // Calcular tiempo promedio por turno (esto requeriría más datos)
    const avgTurnTime = 0; // Placeholder

    // Contar cartas jugadas por posición (esto requeriría más datos)
    const cardsPlayedByPosition: Record<string, number> = {};

    return {
      playerId,
      totalGames,
      wins,
      losses,
      currentStreak,
      bestStreak,
      currentElo: profile.elo,
      maxElo,
      avgTurnTime,
      cardsPlayedByPosition,
    };
  }

  async recordMatchResult(
    playerId: string,
    isWinner: boolean,
    eloChange: number
  ): Promise<void> {
    // Actualizar perfil
    await supabase.rpc('update_player_stats', {
      p_player_id: playerId,
      p_is_winner: isWinner,
      p_elo_change: eloChange,
    });

    // Registrar historial de Elo
    const { data: profile } = await supabase
      .from('profiles')
      .select('elo')
      .eq('id', playerId)
      .single();

    if (profile) {
      await supabase.from('elo_history').insert({
        player_id: playerId,
        elo: profile.elo,
        change: eloChange,
        timestamp: new Date().toISOString(),
        reason: 'match',
      });
    }
  }

  async getDivisionStats(division: string): Promise<{
    wins: number;
    losses: number;
    avgElo: number;
  }> {
    // Esto requeriría una vista o procedimiento almacenado
    return {
      wins: 0,
      losses: 0,
      avgElo: 0,
    };
  }

  async getEloHistory(playerId: string, fromDate?: Date, toDate?: Date): Promise<EloHistory[]> {
    let query = supabase
      .from('elo_history')
      .select('*')
      .eq('player_id', playerId)
      .order('timestamp', { ascending: false })
      .limit(30);

    if (fromDate) query = query.gte('timestamp', fromDate.toISOString());
    if (toDate) query = query.lte('timestamp', toDate.toISOString());

    const { data, error } = await query;
    if (error) throw new Error(`Error al obtener historial de Elo: ${error.message}`);
    return (data || []) as EloHistory[];
  }

  async getRecentMatches(playerId: string, limit: number = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Error al obtener partidas recientes: ${error.message}`);
    return data || [];
  }

  async compareStats(playerId: string, opponentId: string): Promise<{
    player: PlayerStats;
    opponent: PlayerStats;
  }> {
    const [player, opponent] = await Promise.all([
      this.getPlayerStats(playerId),
      this.getPlayerStats(opponentId),
    ]);
    return { player, opponent };
  }

  async updateStatsAfterMatch(
    playerId: string,
    isWinner: boolean,
    eloChange: number
  ): Promise<void> {
    return this.recordMatchResult(playerId, isWinner, eloChange);
  }

  private calculateStreaks(
    matches: any[],
    playerId: string
  ): { currentStreak: number; bestStreak: number } {
    let currentStreak = 0;
    let bestStreak = 0;
    let current = 0;

    for (const match of matches) {
      const isWin = match.winner_id === playerId;
      if (isWin) {
        current++;
        bestStreak = Math.max(bestStreak, current);
      } else {
        current = 0;
      }
    }

    currentStreak = current;

    return { currentStreak, bestStreak };
  }
}
