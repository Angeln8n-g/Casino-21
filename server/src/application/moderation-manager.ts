import { supabase } from '../supabase';

export class ModerationManager {
  private static readonly REPORT_THRESHOLD = 5;
  private static readonly REPORT_WINDOW_HOURS = 24;
  private static readonly RATE_LIMIT_MAX_ACTIONS = 100;
  private static readonly RATE_LIMIT_WINDOW_MINUTES = 1;

  async handleReport(
    reporterId: string,
    reportedId: string,
    reason: string,
    evidence: string
  ): Promise<void> {
    // Insertar reporte
    const { error } = await supabase.from('player_reports').insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason: reason,
      evidence: evidence,
      status: 'pending',
    });

    if (error) {
      throw new Error(`Error al registrar reporte: ${error.message}`);
    }

    // Verificar si se alcanzó el umbral de bloqueo automático
    await this.checkAutoBlock(reportedId);
  }

  async checkAutoBlock(playerId: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - ModerationManager.REPORT_WINDOW_HOURS * 60 * 60 * 1000
    );

    const { data: recentReports } = await supabase
      .from('player_reports')
      .select('id')
      .eq('reported_id', playerId)
      .gte('created_at', windowStart.toISOString())
      .eq('status', 'pending');

    if (recentReports && recentReports.length >= ModerationManager.REPORT_THRESHOLD) {
      await this.autoBlockPlayer(playerId, 24); // Bloqueo de 24 horas
    }
  }

  async autoBlockPlayer(playerId: string, durationHours: number): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    // Insertar bloqueo temporal
    const { error } = await supabase.from('temporary_bans').insert({
      player_id: playerId,
      reason: 'Demasiados reportes',
      duration_hours: durationHours,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true,
    });

    if (error) {
      throw new Error(`Error al bloquear jugador: ${error.message}`);
    }

    // Aquí se notificaría al jugador bloqueado
  }

  async blockPlayer(blockerId: string, blockedId: string): Promise<void> {
    // Insertar bloqueo
    const { error } = await supabase.from('player_blocks').insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Error al bloquear jugador: ${error.message}`);
    }
  }

  async unblockPlayer(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('player_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      throw new Error(`Error al desbloquear jugador: ${error.message}`);
    }
  }

  async checkRateLimit(playerId: string, actionType: string): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - ModerationManager.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    );

    const { data: recentActions } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('player_id', playerId)
      .eq('action_type', actionType)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (!recentActions) {
      return false;
    }

    return recentActions.count >= ModerationManager.RATE_LIMIT_MAX_ACTIONS;
  }

  async recordAction(playerId: string, actionType: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - ModerationManager.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    );

    // Verificar si ya existe un registro para esta ventana
    const { data: existingRecord } = await supabase
      .from('rate_limits')
      .select('id, count')
      .eq('player_id', playerId)
      .eq('action_type', actionType)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (existingRecord) {
      await supabase
        .from('rate_limits')
        .update({ count: existingRecord.count + 1 })
        .eq('id', existingRecord.id);
    } else {
      await supabase.from('rate_limits').insert({
        player_id: playerId,
        action_type: actionType,
        count: 1,
        window_start: now.toISOString(),
      });
    }
  }

  async getActiveBan(playerId: string): Promise<{
    isActive: boolean;
    expiresAt: string;
    reason: string;
  } | null> {
    const now = new Date().toISOString();

    const { data: ban } = await supabase
      .from('temporary_bans')
      .select('is_active, expires_at, reason')
      .eq('player_id', playerId)
      .eq('is_active', true)
      .gte('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (!ban) {
      return null;
    }

    return {
      isActive: ban.is_active,
      expiresAt: ban.expires_at,
      reason: ban.reason,
    };
  }
}
