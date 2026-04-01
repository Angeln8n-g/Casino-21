import { supabase } from '../supabase';
import {
  Season,
  Division,
  LeaderboardEntry,
  SeasonHistory,
} from '../domain/tournament';

export class LeagueManager {
  private static readonly DIVISIONS = {
    bronze: { min: 0, max: 1199 },
    silver: { min: 1200, max: 1499 },
    gold: { min: 1500, max: 1799 },
    platinum: { min: 1800, max: 2099 },
    diamond: { min: 2100, max: Infinity },
  } as const;

  private static readonly SEASON_DURATION_DAYS = 30;

  async calculateDivision(elo: number): Promise<Division> {
    for (const [division, range] of Object.entries(LeagueManager.DIVISIONS)) {
      if (elo >= range.min && elo <= range.max) {
        return division as Division;
      }
    }
    return 'bronze'; // Fallback
  }

  async getCurrentSeason(): Promise<Season> {
    const { data: season, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !season) {
      // Crear nueva temporada si no existe
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + LeagueManager.SEASON_DURATION_DAYS);

      const { data: newSeason, error: createError } = await supabase
        .from('seasons')
        .insert({
          number: 1, // Esto debería ser dinámico (máximo número + 1)
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Error al crear temporada: ${createError.message}`);
      }

      return newSeason as Season;
    }

    return season as Season;
  }

  async getPlayerDivision(playerId: string): Promise<Division> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('elo')
      .eq('id', playerId)
      .single();

    if (!profile) {
      throw new Error('Jugador no encontrado');
    }

    return this.calculateDivision(profile.elo);
  }

  async getDivisionLeaderboard(
    division: Division,
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    const divisionRange = LeagueManager.DIVISIONS[division];

    const { data: rankings, error } = await supabase
      .from('season_rankings')
      .select(`
        player_id,
        profiles (username),
        elo,
        wins,
        losses
      `)
      .gte('elo', divisionRange.min)
      .lte('elo', divisionRange.max)
      .order('elo', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error al obtener leaderboard: ${error.message}`);
    }

    return rankings.map((entry, index) => ({
      playerId: entry.player_id,
      username: (entry.profiles as any)?.username || 'Unknown',
      elo: entry.elo,
      wins: entry.wins,
      losses: entry.losses,
      rank: index + 1,
    }));
  }

  async endSeason(): Promise<void> {
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id, number')
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (seasonError || !season) {
      throw new Error('No hay temporada activa para finalizar');
    }

    // Calcular rankings finales
    const { error: updateError } = await supabase
      .from('seasons')
      .update({ status: 'completed' })
      .eq('id', season.id);

    if (updateError) {
      throw new Error(`Error al finalizar temporada: ${updateError.message}`);
    }

    // Aquí se podrían otorgar recompensas basadas en el ranking
    // (esto se haría mediante un trigger o procedimiento almacenado)
  }

  async startNewSeason(): Promise<void> {
    // Finalizar temporada actual si existe
    const { data: currentSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (currentSeason) {
      await this.endSeason();
    }

    // Crear nueva temporada
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + LeagueManager.SEASON_DURATION_DAYS);

    // Obtener número de temporada (máximo + 1)
    const { data: maxSeason } = await supabase
      .from('seasons')
      .select('number')
      .order('number', { ascending: false })
      .limit(1)
      .single();

    const seasonNumber = (maxSeason?.number || 0) + 1;

    const { data: newSeason, error } = await supabase
      .from('seasons')
      .insert({
        number: seasonNumber,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear nueva temporada: ${error.message}`);
    }

    // Aplicar reset de Elo
    await this.applySeasonalEloReset();
  }

  async applySeasonalEloReset(): Promise<void> {
    // Fórmula: E_new = E_old + 0.2 * (1500 - E_old)
    // Esto se hace mediante una consulta SQL directa
    const { error } = await supabase.rpc('apply_seasonal_elo_reset');

    if (error) {
      throw new Error(`Error al aplicar reset de Elo: ${error.message}`);
    }
  }

  async getPlayerSeasonHistory(playerId: string): Promise<SeasonHistory[]> {
    const { data: history, error } = await supabase
      .from('season_rankings')
      .select(`
        season_number,
        division,
        final_rank,
        final_elo,
        wins,
        losses
      `)
      .eq('player_id', playerId)
      .order('season_number', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener historial: ${error.message}`);
    }

    return (history as unknown) as SeasonHistory[];
  }
}
