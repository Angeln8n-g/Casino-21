import { supabase } from '../supabase';
import {
  Tournament,
  TournamentConfig,
  TournamentBracket,
  Round,
  TournamentMatch,
  TournamentStatus,
  MatchStatus,
} from '../domain/tournament';

export class TournamentManager {
  private static readonly VALID_PLAYER_COUNTS = [4, 8, 16, 32] as const;

  async createTournament(creatorId: string, config: TournamentConfig): Promise<Tournament> {
    // Validar conteo de jugadores
    if (!this.isValidPlayerCount(config.maxPlayers)) {
      throw new Error(`Número de jugadores inválido. Debe ser 4, 8, 16 o 32.`);
    }

    const tournamentCode = this.generateTournamentCode();

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        code: tournamentCode,
        creator_id: creatorId,
        name: config.name || `Torneo ${tournamentCode}`,
        max_players: config.maxPlayers,
        current_players: 0,
        status: 'waiting',
        bracket: this.createInitialBracket(config.maxPlayers),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear torneo: ${error.message}`);
    }

    // Auto-unir al creador
    await this.joinTournament(tournamentCode, creatorId);

    return tournament as Tournament;
  }

  async joinTournament(tournamentCode: string, playerId: string): Promise<void> {
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, max_players, current_players, status')
      .eq('code', tournamentCode)
      .single();

    if (tournamentError || !tournament) {
      throw new Error('Torneo no encontrado');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('El torneo ya ha comenzado o ha finalizado');
    }

    if (tournament.current_players >= tournament.max_players) {
      throw new Error('El torneo está lleno');
    }

    // Verificar si el jugador ya está inscrito
    const { data: existingParticipant } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('player_id', playerId)
      .single();

    if (existingParticipant) {
      throw new Error('Ya estás inscrito en este torneo');
    }

    // Insertar participante
    await supabase.from('tournament_participants').insert({
      tournament_id: tournament.id,
      player_id: playerId,
      joined_at: new Date().toISOString(),
    });

    // Actualizar contador
    await supabase
      .from('tournaments')
      .update({ current_players: tournament.current_players + 1 })
      .eq('id', tournament.id);

    // Auto-iniciar si se alcanzó el límite
    if (tournament.current_players + 1 === tournament.max_players) {
      await this.startTournament(tournament.id);
    }
  }

  async startTournament(tournamentId: string): Promise<void> {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('id, status, bracket')
      .eq('id', tournamentId)
      .single();

    if (error || !tournament) {
      throw new Error('Torneo no encontrado');
    }

    if (tournament.status !== 'waiting') {
      throw new Error('El torneo ya ha comenzado');
    }

    // Actualizar estado
    await supabase
      .from('tournaments')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', tournamentId);

    // Notificar a los participantes que el torneo ha comenzado
    // (esto se hará mediante WebSocket en la capa de presentación)
  }

  async recordMatchResult(
    tournamentId: string,
    matchId: string,
    winnerId: string
  ): Promise<void> {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, status, bracket')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      throw new Error('Torneo no encontrado');
    }

    if (tournament.status !== 'in_progress') {
      throw new Error('El torneo no está en curso');
    }

    // Actualizar resultado del match
    await supabase
      .from('tournament_matches')
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    // Avanzar al ganador
    await this.advanceWinner(tournamentId, matchId, winnerId);
  }

  async advanceWinner(tournamentId: string, matchId: string, winnerId: string): Promise<void> {
    // Obtener el match actual
    const { data: match } = await supabase
      .from('tournament_matches')
      .select('id, round_number, player1_id, player2_id')
      .eq('id', matchId)
      .single();

    if (!match) {
      throw new Error('Match no encontrado');
    }

    // Obtener el siguiente round
    const nextRoundNumber = match.round_number + 1;

    // Buscar el siguiente match en el siguiente round donde este jugador debe jugar
    const { data: nextMatch } = await supabase
      .from('tournament_matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('round_number', nextRoundNumber)
      .limit(1)
      .single();

    if (nextMatch) {
      // Actualizar al ganador en el siguiente match
      // Determinar si es player1 o player2 (lógica simplificada)
      await supabase
        .from('tournament_matches')
        .update({ player1_id: winnerId })
        .eq('id', nextMatch.id)
        .is('player1_id', null);
    } else {
      // Verificar si el torneo ha terminado (solo un match en el último round)
      const { data: finalRoundMatches } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('round_number', match.round_number)
        .limit(10);

      if (finalRoundMatches && finalRoundMatches.length === 1) {
        await this.completeTournament(tournamentId, winnerId);
      }
    }
  }

  async completeTournament(tournamentId: string, winnerId?: string): Promise<void> {
    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', tournamentId);

    if (error) {
      throw new Error(`Error al completar torneo: ${error.message}`);
    }

    // Aquí se podrían otorgar recompensas al ganador
    // (esto se haría mediante un trigger o procedimiento almacenado)
  }

  async handleNoShow(tournamentId: string, playerId: string): Promise<void> {
    // Obtener todos los matches del torneo donde el jugador esté participando
    const { data: matches, error } = await supabase
      .from('tournament_matches')
      .select('id, round_number, player1_id, player2_id, status')
      .eq('tournament_id', tournamentId)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Error al obtener matches: ${error.message}`);
    }

    if (!matches || matches.length === 0) {
      throw new Error('El jugador no tiene matches pendientes');
    }

    // Marcar todos los matches pendientes como no-show
    for (const match of matches) {
      // Actualizar el match
      await supabase
        .from('tournament_matches')
        .update({
          status: 'no_show',
          completed_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      // Determinar el oponente
      const opponentId = match.player1_id === playerId ? match.player2_id : match.player1_id;

      if (opponentId) {
        // Avanzar al oponente
        await this.advanceWinner(tournamentId, match.id, opponentId);
      }
    }
  }

  async getTournamentByCode(code: string): Promise<Tournament | null> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('code', code)
      .single();

    if (error) return null;
    return data as Tournament;
  }

  async getTournament(tournamentId: string): Promise<Tournament | null> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error) {
      throw new Error(`Error al obtener torneo: ${error.message}`);
    }

    return data as Tournament;
  }

  async getTournamentBracket(tournamentId: string): Promise<TournamentBracket> {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('bracket')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      throw new Error('Torneo no encontrado');
    }

    return tournament.bracket as TournamentBracket;
  }

  private createInitialBracket(playerCount: number): any {
    const rounds = Math.log2(playerCount);
    const bracketRounds: any[] = [];

    for (let round = 1; round <= rounds; round++) {
      const matchCount = playerCount / Math.pow(2, round);
      const matches: any[] = [];

      for (let i = 0; i < matchCount; i++) {
        matches.push({
          id: `match-${round}-${i}`,
          round_number: round,
          status: 'pending' as MatchStatus,
          player1_id: null,
          player2_id: null,
        });
      }

      bracketRounds.push({
        round_number: round,
        matches,
      });
    }

    return bracketRounds;
  }

  private generateTournamentCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private isValidPlayerCount(count: number): count is 4 | 8 | 16 | 32 {
    return [4, 8, 16, 32].includes(count);
  }
}
