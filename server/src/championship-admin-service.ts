import { Request, Response, NextFunction } from 'express';
import { supabase } from './supabase';
import { generateChampionshipBracket, startChampionshipFinal } from './championship-service';
import { sendPushToUser, PushPayload } from './web-push';
import { Server } from 'socket.io';

/**
 * Helper to ensure express param is a string (handles string | string[])
 */
function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

// ─── Middleware para verificar admin ─────────────────────────
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error || !profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    next();
  } catch (err) {
    console.error('[Championship] Error en requireAdmin:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── Audit Log Helper ────────────────────────────────────────
export async function logChampionshipAdminAction(
  eventId: string,
  adminId: string,
  action: string,
  reason?: string,
  targetUserId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('championship_admin_audit_log').insert({
      event_id: eventId,
      admin_user_id: adminId,
      action,
      reason: reason || null,
      target_user_id: targetUserId || null,
      metadata: metadata || {}
    });
    console.log(`[Championship] Acción admin registrada: ${action} por ${adminId}`);
  } catch (err) {
    console.error('[Championship] Error registrando acción admin:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════

export const createChampionship = async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const payload = {
      ...req.body,
      is_championship: true,
      championship_phase: 'league',
      type: 'liga'
    };
    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    await logChampionshipAdminAction(data.id, user.id, 'create_championship');
    res.status(201).json(data);
  } catch (error: any) {
    console.error('[Championship] Error creando championship:', error);
    res.status(400).json({ error: error.message });
  }
};

export const updateChampionship = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  try {
    const { data, error } = await supabase
      .from('events')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_championship', true)
      .select()
      .single();
    if (error) throw error;
    await logChampionshipAdminAction(id, user.id, 'edit_championship');
    res.json(data);
  } catch (error: any) {
    console.error('[Championship] Error actualizando championship:', error);
    res.status(400).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// PHASE CONTROL
// ═══════════════════════════════════════════════════════════════

export const forceCutChampionship = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const { reason } = req.body;
  try {
    const { data, error } = await supabase.rpc('freeze_championship_league', { p_event_id: id });
    if (error) throw error;
    if (!data?.success) {
      return res.status(400).json({ error: data?.error || 'FREEZE_FAILED' });
    }
    await logChampionshipAdminAction(id, user.id, 'force_cut', reason || 'Corte manual forzado por admin');
    res.json(data);
  } catch (error: any) {
    console.error('[Championship] Error en force cut:', error);
    res.status(400).json({ error: error.message });
  }
};

export const startFinalChampionship = (io: Server) => async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const { reason } = req.body;
  try {
    // Verificar que estamos en fase 'cut' antes de iniciar
    const { data: event } = await supabase
      .from('events')
      .select('championship_phase')
      .eq('id', id)
      .eq('is_championship', true)
      .single();

    if (!event) {
      return res.status(404).json({ error: 'Championship no encontrado' });
    }
    if (event.championship_phase !== 'cut') {
      return res.status(400).json({ error: `No se puede iniciar la final en fase '${event.championship_phase}'. Se requiere fase 'cut'.` });
    }

    // Generar el bracket
    const bracketResult = await generateChampionshipBracket(id);
    if (!bracketResult.success) {
      return res.status(400).json({ error: `Error generando bracket: ${bracketResult.error}` });
    }

    // Iniciar la final
    const result = await startChampionshipFinal(io, id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    await logChampionshipAdminAction(id, user.id, 'start_final', reason || 'Final iniciada por admin');
    res.json({ success: true, bracket: bracketResult });
  } catch (error: any) {
    console.error('[Championship] Error iniciando final:', error);
    res.status(400).json({ error: error.message });
  }
};

export const pauseFinalChampionship = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const { reason } = req.body;
  try {
    const { error } = await supabase
      .from('events')
      .update({ is_final_paused: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_championship', true);
    if (error) throw error;
    await logChampionshipAdminAction(id, user.id, 'pause_final', reason || 'Final pausada por admin');
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Championship] Error pausando final:', error);
    res.status(400).json({ error: error.message });
  }
};

export const resumeFinalChampionship = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const { reason } = req.body;
  try {
    const { error } = await supabase
      .from('events')
      .update({ is_final_paused: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_championship', true);
    if (error) throw error;
    await logChampionshipAdminAction(id, user.id, 'resume_final', reason || 'Final reanudada por admin');
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Championship] Error reanudando final:', error);
    res.status(400).json({ error: error.message });
  }
};

export const cancelChampionship = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const { reason } = req.body;
  try {
    // Cancelar: devolver coins a los participantes si hubo entry_fee
    const { data: event } = await supabase
      .from('events')
      .select('entry_fee_coins')
      .eq('id', id)
      .single();

    if (event && event.entry_fee_coins > 0) {
      // Reembolsar coins a cada participante
      const { data: participants } = await supabase
        .from('championship_participants')
        .select('user_id')
        .eq('event_id', id);

      if (participants && participants.length > 0) {
        for (const p of participants) {
          try {
            await supabase.rpc('add_coins_to_user', {
              p_user_id: p.user_id,
              p_amount: event.entry_fee_coins
            });
          } catch {
            await supabase
              .from('profiles')
              .update({ coins: event.entry_fee_coins })
              .eq('id', p.user_id);
          }
        }
        console.log(`[Championship] Reembolso de ${event.entry_fee_coins} coins a ${participants.length} participantes`);
      }
    }

    const { error } = await supabase
      .from('events')
      .update({
        status: 'completed',
        championship_phase: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (error) throw error;

    await logChampionshipAdminAction(id, user.id, 'cancel_championship', reason || 'Championship cancelado por admin');
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Championship] Error cancelando championship:', error);
    res.status(400).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// LEADERBOARD & ANTI-FRAUD
// ═══════════════════════════════════════════════════════════════

export const getLeaderboard = async (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  try {
    const { data, error } = await supabase
      .from('championship_participants')
      .select('*, profiles:user_id(username, avatar_url, elo)')
      .eq('event_id', id)
      .order('points', { ascending: false })
      .limit(1000);
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('[Championship] Error obteniendo leaderboard:', error);
    res.status(400).json({ error: error.message });
  }
};

export const disqualifyUser = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const userId = getParam(req.params.userId);
  const { reason } = req.body;
  try {
    const { data, error } = await supabase.rpc('disqualify_championship_participant', {
      p_event_id: id,
      p_user_id: userId,
      p_reason: reason || 'Descalificado por admin',
      p_admin_id: user.id
    });
    if (error) throw error;
    if (!data?.success) {
      return res.status(400).json({ error: data?.error || 'DISQUALIFY_FAILED' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('[Championship] Error descalificando usuario:', error);
    res.status(400).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// KYC VERIFICATION QUEUE
// ═══════════════════════════════════════════════════════════════

export const getKycQueue = async (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  try {
    const { data, error } = await supabase
      .from('championship_participants')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('event_id', id)
      .eq('is_qualified', true)
      .order('rank_position', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('[Championship] Error obteniendo cola KYC:', error);
    res.status(400).json({ error: error.message });
  }
};

export const approveKyc = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const userId = getParam(req.params.userId);
  try {
    const { error } = await supabase
      .from('championship_participants')
      .update({
        kyc_status: 'approved',
        kyc_reviewed_at: new Date().toISOString(),
        kyc_reviewer_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('event_id', id)
      .eq('user_id', userId);
    if (error) throw error;
    await logChampionshipAdminAction(id, user.id, 'approve_kyc', undefined, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Championship] Error aprobando KYC:', error);
    res.status(400).json({ error: error.message });
  }
};

export const rejectKyc = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const userId = getParam(req.params.userId);
  const { reason } = req.body;
  try {
    if (!reason) {
      return res.status(400).json({ error: 'Se requiere un motivo para rechazar el KYC' });
    }
    const { error } = await supabase
      .from('championship_participants')
      .update({
        kyc_status: 'rejected',
        kyc_reject_reason: reason,
        kyc_reviewed_at: new Date().toISOString(),
        kyc_reviewer_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('event_id', id)
      .eq('user_id', userId);
    if (error) throw error;
    await logChampionshipAdminAction(id, user.id, 'reject_kyc', reason, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Championship] Error rechazando KYC:', error);
    res.status(400).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// MATCH MANAGEMENT (BRACKET ADMIN)
// ═══════════════════════════════════════════════════════════════

export const forceMatchWinner = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const matchId = getParam(req.params.matchId);
  const { winnerId } = req.body;
  try {
    if (!winnerId) {
      return res.status(400).json({ error: 'Se requiere winnerId' });
    }

    const { data: match, error: fetchError } = await supabase
      .from('tournament_matches')
      .select('id, round_number, match_order, player1_id, player2_id, status')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) {
      return res.status(404).json({ error: 'Match no encontrado' });
    }
    if (match.status === 'completed') {
      return res.status(400).json({ error: 'El match ya fue completado' });
    }

    const { error } = await supabase
      .from('tournament_matches')
      .update({ winner_id: winnerId, status: 'completed' })
      .eq('id', matchId);
    if (error) throw error;

    await advanceWinnerToNextRound(id, match.round_number, match.match_order, winnerId);

    await logChampionshipAdminAction(id, user.id, 'force_match_winner', `Ganador forzado en match ${matchId}`, winnerId, { matchId });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Championship] Error forzando ganador:', error);
    res.status(400).json({ error: error.message });
  }
};

export const walkoverMatch = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  const matchId = getParam(req.params.matchId);
  const { winnerId, reason } = req.body;
  try {
    if (!winnerId) {
      return res.status(400).json({ error: 'Se requiere winnerId' });
    }

    const { data: match, error: fetchError } = await supabase
      .from('tournament_matches')
      .select('id, round_number, match_order, player1_id, player2_id, status')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) {
      return res.status(404).json({ error: 'Match no encontrado' });
    }

    const { error } = await supabase
      .from('tournament_matches')
      .update({ winner_id: winnerId, status: 'completed' })
      .eq('id', matchId);
    if (error) throw error;

    await advanceWinnerToNextRound(id, match.round_number, match.match_order, winnerId);

    await logChampionshipAdminAction(id, user.id, 'walkover', reason || 'Walkover otorgado', winnerId, { matchId });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Championship] Error en walkover:', error);
    res.status(400).json({ error: error.message });
  }
};

async function advanceWinnerToNextRound(
  eventId: string,
  currentRound: number,
  currentMatchOrder: number,
  winnerId: string
) {
  const nextRound = currentRound + 1;
  const nextOrder = Math.ceil(currentMatchOrder / 2);

  if (nextRound > 4) {
    console.log(`[Championship] ¡Campeón del Championship! Winner: ${winnerId}`);
    return;
  }

  const { data: nextMatch } = await supabase
    .from('tournament_matches')
    .select('id, player1_id, player2_id')
    .eq('event_id', eventId)
    .eq('round_number', nextRound)
    .eq('match_order', nextOrder)
    .single();

  if (!nextMatch) {
    console.warn(`[Championship] No se encontró match siguiente (ronda ${nextRound}, orden ${nextOrder})`);
    return;
  }

  const isPlayer1Slot = currentMatchOrder % 2 === 1;
  const updateField = isPlayer1Slot ? 'player1_id' : 'player2_id';

  await supabase
    .from('tournament_matches')
    .update({ [updateField]: winnerId })
    .eq('id', nextMatch.id);

  console.log(`[Championship] Ganador ${winnerId} avanzado a ronda ${nextRound}, match ${nextOrder} (${updateField})`);
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

export const getAnalytics = async (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  try {
    const { data, error } = await supabase.rpc('get_championship_analytics', { p_event_id: id });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('[Championship] Error obteniendo analytics:', error);
    res.status(400).json({ error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// PRIZE REMINDERS
// ═══════════════════════════════════════════════════════════════

export const remindPrizes = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const id = getParam(req.params.id);
  try {
    const { data: pendingClaims, error: fetchError } = await supabase
      .from('tournament_prize_claims')
      .select('user_id, amount_usd, rank_position')
      .eq('event_id', id)
      .eq('status', 'pending_claim');

    if (fetchError) throw fetchError;

    if (!pendingClaims || pendingClaims.length === 0) {
      return res.json({ success: true, reminded: 0, message: 'No hay reclamos pendientes' });
    }

    const pushPayload: PushPayload = {
      type: 'tournament_start',
      title: '💰 ¡Reclama tu premio!',
      body: '¡Tienes un premio pendiente del KASINO21 CHAMPIONSHIP! Completa tus datos bancarios antes de que expire.',
      data: {
        eventId: id,
        isTournament: true
      }
    };

    let reminded = 0;
    for (const claim of pendingClaims) {
      try {
        await sendPushToUser(claim.user_id, pushPayload);
        reminded++;
      } catch (pushErr) {
        console.error(`[Championship] Error enviando recordatorio a ${claim.user_id}:`, pushErr);
      }
    }

    await logChampionshipAdminAction(id, user.id, 'edit_championship', `Recordatorio de premios enviado a ${reminded} usuarios`);
    res.json({ success: true, reminded, total: pendingClaims.length });
  } catch (error: any) {
    console.error('[Championship] Error enviando recordatorios de premios:', error);
    res.status(400).json({ error: error.message });
  }
};
