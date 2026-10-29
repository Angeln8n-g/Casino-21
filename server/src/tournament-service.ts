import crypto from 'crypto';
import { Server } from 'socket.io';
import { supabase } from './supabase';
import { RoomStore } from './room-store';
import { sendPushToUser } from './web-push';
import {
  CASH_PRIZES_ENABLED,
  buildSeededBracketPlan,
  parseLegacyCoinPool,
  SeedCandidate,
} from './domain/tournament';

export const NO_SHOW_TIMEOUT_MS = 180_000; // 3 minutos de tolerancia para presentarse

interface ActiveWaitEntry {
  timer: NodeJS.Timeout;
  waitingPlayerId: string;
}

const activeWaitTimers = new Map<string, ActiveWaitEntry>();
const startingEventsLock = new Set<string>();

function generateTournamentRoomId(): string {
  return 'T' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
}

/**
 * Verifica que un jugador que intenta entrar como participante a una sala de torneo
 * sea efectivamente `player1_id` o `player2_id` de ese encuentro y que no haya terminado.
 */
export async function verifyTournamentRoomParticipant(
  gameRoomId: string,
  userId: string
): Promise<{ allowed: boolean; error?: string; match?: any }> {
  const { data: match, error } = await supabase
    .from('tournament_matches')
    .select('id, event_id, player1_id, player2_id, status, winner_id')
    .eq('game_room_id', gameRoomId)
    .maybeSingle();

  if (error || !match) {
    return { allowed: false, error: 'No se encontró una partida de torneo válida para esta sala.' };
  }

  if (match.status === 'completed' || match.winner_id) {
    return { allowed: false, error: 'Esta partida de torneo ya ha finalizado.' };
  }

  if (match.player1_id !== userId && match.player2_id !== userId) {
    return { allowed: false, error: 'No eres participante de este encuentro de torneo. Puedes ingresar como espectador.' };
  }

  return { allowed: true, match };
}

/**
 * Emite `tournament_ready` a las salas personales `user:<id>` de ambos rivales
 * (funciona tanto en Lobby/EventsPage como dentro de cualquier sala).
 */
export function notifyTournamentPlayers(
  io: Server,
  roomStore: RoomStore,
  gameRoomId: string,
  eventId: string,
  player1Id?: string | null,
  player2Id?: string | null
) {
  const targetIds = Array.from(new Set([player1Id, player2Id].filter((id): id is string => Boolean(id))));
  if (targetIds.length === 0) return;

  for (const pid of targetIds) {
    io.to(`user:${pid}`).emit('tournament_ready', { gameRoomId, eventId });
  }

  // Fallback adicional sobre sockets en salas locales por si algún socket antiguo no tuviera user room
  for (const [, room] of roomStore.getLocalEntries()) {
    for (const player of room.players) {
      if (targetIds.includes(player.userId)) {
        io.to(player.socketId).emit('tournament_ready', { gameRoomId, eventId });
      }
    }
  }
}

/**
 * Distribuye las recompensas al finalizar la Gran Final del torneo.
 * Utiliza la RPC idempotente `distribute_tournament_rewards` (Top 2 / Top 4 / Top 8 + XP + Cosméticos),
 * con fallback seguro a `award_tournament_prize` si la migración v3 aún no estuviera aplicada.
 */
export async function handleTournamentFinal(matchData: any, winnerId: string, io?: Server) {
  const eventId = matchData.event_id;
  if (!eventId || !winnerId) return;

  const { data: eventData } = await supabase
    .from('events')
    .select('id, title, prize_pool, is_championship, current_prize_coins, guaranteed_prize_coins, reward_store_item_id')
    .eq('id', eventId)
    .maybeSingle();

  // Si en el futuro se reactiva CASH_PRIZES_ENABLED para Championship legacy
  const isLegacyChampionship =
    CASH_PRIZES_ENABLED &&
    (eventData?.is_championship ||
      eventData?.title?.includes('El Gran Pool') ||
      eventData?.title?.includes('Championship'));

  if (isLegacyChampionship) {
    console.log(`[Championship] Calculando distribución en USD para evento ${eventId}...`);
    await supabase.rpc('calculate_championship_prize_distribution', { p_event_id: eventId });
    await supabase.rpc('award_tournament_prize', {
      event_id_param: eventId,
      winner_id_param: winnerId,
      prize_amount: 10000,
    });
    return;
  }

  // Motor Torneos 2.0: distribución escalonada real (Monedas + XP + Cosméticos + Podio)
  const { data: distData, error: distError } = await supabase.rpc('distribute_tournament_rewards', {
    p_event_id: eventId,
  });

  if (!distError && distData?.success) {
    if (distData.already_distributed) {
      console.log(`[Torneo 2.0] Premios del torneo ${eventId} ya habían sido distribuidos previamente.`);
      return;
    }

    const payouts: Array<{
      player_id: string;
      place: number;
      coins_awarded: number;
      xp_awarded: number;
      item_awarded_id?: string | null;
    }> = Array.isArray(distData.payouts) ? distData.payouts : [];

    console.log(
      `[Torneo 2.0] Premios distribuidos para "${eventData?.title || eventId}". Pozo: ${distData.total_pot} monedas (${payouts.length} jugadores procesados).`
    );

    if (io) {
      for (const payout of payouts) {
        io.to(`user:${payout.player_id}`).emit('tournament_rewards_distributed', {
          eventId,
          eventTitle: eventData?.title || 'Torneo Kasino21',
          place: payout.place,
          coinsAwarded: payout.coins_awarded,
          xpAwarded: payout.xp_awarded,
          itemAwardedId: payout.item_awarded_id || null,
          totalPot: distData.total_pot,
        });

        if (payout.place <= 4 && (payout.coins_awarded > 0 || payout.item_awarded_id)) {
          sendPushToUser(payout.player_id, {
            type: 'tournament_start',
            title: payout.place === 1 ? '🏆 ¡Campeón del Torneo!' : `🎖️ ¡Top ${payout.place} en Torneo!`,
            body: `Ganaste ${payout.coins_awarded.toLocaleString('es-ES')} monedas y +${payout.xp_awarded} XP en "${eventData?.title || 'Torneo'}".`,
            data: { eventId, isTournament: true },
          }).catch(() => {});
        }
      }

      io.emit('event_completed', {
        eventId,
        title: eventData?.title || 'Torneo',
        championId: winnerId,
      });
      io.emit('tournament_list_updated', { eventId });
    }
    return;
  }

  // Fallback legacy si `distribute_tournament_rewards` no existe aún en la BD
  console.warn(`[Torneo] Fallback a award_tournament_prize por error en RPC v3:`, distError?.message);
  const fallbackCoins =
    eventData?.current_prize_coins ||
    eventData?.guaranteed_prize_coins ||
    parseLegacyCoinPool(eventData?.prize_pool);

  if (fallbackCoins > 0) {
    await supabase.rpc('award_tournament_prize', {
      event_id_param: eventId,
      winner_id_param: winnerId,
      prize_amount: fallbackCoins,
    });
  }
  await supabase.from('events').update({ status: 'completed' }).eq('id', eventId);
  if (io) {
    io.emit('event_completed', { eventId, title: eventData?.title || 'Torneo', championId: winnerId });
    io.emit('tournament_list_updated', { eventId });
  }
}

/**
 * Genera las llaves en el servidor con seeding por ELO, auto-avance de Byes,
 * reembolso de ausentes sin Check-in (en torneos programados) y auto-recreación de mesas Sit & Go.
 */
export async function generateAndStartTournamentBracket(
  io: Server,
  roomStore: RoomStore,
  eventId: string,
  options: { triggeredBy?: 'auto_sit_and_go' | 'auto_scheduled' | 'admin'; skipCheckInFilter?: boolean } = {}
): Promise<{
  success: boolean;
  error?: string;
  matchesCount?: number;
  activePlayers?: number;
  recreatedEventId?: string | null;
  cancelled?: boolean;
}> {
  if (startingEventsLock.has(eventId)) {
    return { success: false, error: 'El torneo ya se está iniciando en este momento.' };
  }

  startingEventsLock.add(eventId);
  try {
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (eventErr || !event) {
      return { success: false, error: 'Torneo no encontrado.' };
    }

    // Verificar si ya existen llaves generadas
    const { count: existingMatchesCount } = await supabase
      .from('tournament_matches')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if ((existingMatchesCount ?? 0) > 0 && options.triggeredBy !== 'admin') {
      return { success: true, matchesCount: existingMatchesCount ?? 0 };
    }

    const format = event.tournament_format || 'scheduled';

    // 1. En torneos programados con check-in activo, reembolsar automáticamente a quienes no confirmaron
    if (format === 'scheduled' && event.check_in_enabled && !options.skipCheckInFilter) {
      const { data: refundRes, error: refundErr } = await supabase.rpc('refund_unchecked_tournament_entries', {
        p_event_id: eventId,
      });

      if (!refundErr && refundRes?.success && Array.isArray(refundRes.refunded_player_ids)) {
        for (const refundedUid of refundRes.refunded_player_ids) {
          io.to(`user:${refundedUid}`).emit('tournament_Entry_refunded', {
            eventId,
            eventTitle: event.title,
            reason: 'missed_check_in',
            amount: event.entry_fee || 0,
          });
        }
      }
    }

    // 2. Obtener participantes activos junto con su ELO para el seeding
    const { data: entries, error: entriesErr } = await supabase
      .from('event_entries')
      .select('player_id, checked_in, profiles:player_id(id, username, elo)')
      .eq('event_id', eventId);

    if (entriesErr) {
      return { success: false, error: `Error leyendo inscritos: ${entriesErr.message}` };
    }

    const candidates: SeedCandidate[] = (entries || []).map((row: any) => {
      const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.player_id,
        elo: prof?.elo ?? 1000,
        checkedIn: !!row.checked_in,
      };
    });

    // 3. Si hay menos de 2 jugadores activos, cancelar y reembolsar íntegramente
    if (candidates.length < 2) {
      console.log(`[Torneo 2.0] Torneo "${event.title}" tiene < 2 jugadores activos (${candidates.length}). Cancelando con reembolso.`);
      await supabase.rpc('cancel_and_refund_tournament', {
        p_event_id: eventId,
        p_reason: 'insufficient_players_refund',
      });

      let recreatedId: string | null = null;
      if (event.auto_recreate) {
        recreatedId = await cloneAutoRecreateEvent(event);
      }

      io.emit('tournament_cancelled', {
        eventId,
        title: event.title,
        reason: 'No se alcanzó el mínimo de 2 jugadores confirmados. Entradas reembolsadas.',
      });
      io.emit('tournament_list_updated', { eventId, recreatedEventId: recreatedId });

      return { success: true, cancelled: true, activePlayers: candidates.length, recreatedEventId: recreatedId };
    }

    // Si es regeneración explícita de Admin, limpiar llaves anteriores primero
    if ((existingMatchesCount ?? 0) > 0 && options.triggeredBy === 'admin') {
      await supabase.from('tournament_matches').delete().eq('event_id', eventId);
    }

    // 4. Construir plan de llaves con Seeding ELO + Auto-Byes
    const finalBestOf: 1 | 3 = event.final_best_of === 3 ? 3 : 1;
    const plan = buildSeededBracketPlan(candidates, event.max_participants || 8, finalBestOf);

    const seriesUuidMap = new Map<string, string>();
    const rowsToInsert = plan.matches.map((m) => {
      let seriesId: string | null = null;
      if (m.series_key) {
        if (!seriesUuidMap.has(m.series_key)) {
          seriesUuidMap.set(m.series_key, crypto.randomUUID());
        }
        seriesId = seriesUuidMap.get(m.series_key)!;
      }

      return {
        event_id: eventId,
        round_number: m.round_number,
        match_order: m.match_order,
        player1_id: m.player1_id,
        player2_id: m.player2_id,
        winner_id: m.winner_id,
        status: m.status,
        walkover_reason: m.walkover_reason,
        game_room_id: m.walkover_reason === 'bye' ? null : generateTournamentRoomId(),
        best_of: m.best_of,
        series_game: m.series_game,
        series_id: seriesId,
        completed_at: m.status === 'completed' ? new Date().toISOString() : null,
      };
    });

    const { data: insertedMatches, error: insertErr } = await supabase
      .from('tournament_matches')
      .insert(rowsToInsert)
      .select('id, round_number, match_order, player1_id, player2_id, status, game_room_id, series_game');

    if (insertErr) {
      console.error('[Torneo 2.0] Error insertando llaves:', insertErr);
      return { success: false, error: insertErr.message };
    }

    // 5. Poner el torneo en estado `live`
    await supabase
      .from('events')
      .update({
        status: 'live',
        participants_count: candidates.length,
      })
      .eq('id', eventId);

    // 6. Si es Sit & Go con `auto_recreate`, abrir inmediatamente una nueva mesa gemela `upcoming`
    let recreatedEventId: string | null = null;
    if (format === 'sit_and_go' && event.auto_recreate) {
      recreatedEventId = await cloneAutoRecreateEvent(event);
    }

    // 7. Notificar a todos los participantes por Socket y Push
    const participantIds = plan.seededPlayers.map((p) => p.id);
    for (const pid of participantIds) {
      io.to(`user:${pid}`).emit('tournament_started', {
        eventId,
        eventTitle: event.title,
        tournamentFormat: format,
      });

      sendPushToUser(pid, {
        type: 'tournament_start',
        title: '🏆 ¡Tu Torneo ha Comenzado!',
        body: `Las llaves de "${event.title}" están listas. ¡Entra a jugar tu partida!`,
        data: { eventId, isTournament: true },
      }).catch(() => {});
    }

    // 8. Enviar `tournament_ready` directo con `gameRoomId` a las parejas que ya pueden jugar
    for (const match of insertedMatches || []) {
      if (match.status === 'pending' && match.player1_id && match.player2_id && (match.series_game ?? 1) === 1 && match.game_room_id) {
        notifyTournamentPlayers(io, roomStore, match.game_room_id, eventId, match.player1_id, match.player2_id);
      }
    }

    io.emit('event_started', { eventId, title: event.title });
    io.emit('tournament_list_updated', { eventId, recreatedEventId });

    console.log(
      `[Torneo 2.0] Llaves iniciadas para "${event.title}" (${candidates.length} jugadores en cuadro de ${plan.bracketSize}, ${rowsToInsert.length} partidos).`
    );

    return {
      success: true,
      matchesCount: rowsToInsert.length,
      activePlayers: candidates.length,
      recreatedEventId,
    };
  } finally {
    startingEventsLock.delete(eventId);
  }
}

/**
 * Clona un torneo con `auto_recreate = true` para mantener siempre abierta una mesa Sit & Go.
 */
async function cloneAutoRecreateEvent(sourceEvent: any): Promise<string | null> {
  try {
    const now = Date.now();
    const guaranteed = sourceEvent.guaranteed_prize_coins || 0;
    const { data: created, error } = await supabase
      .from('events')
      .insert({
        title: sourceEvent.title,
        description: sourceEvent.description,
        rules: sourceEvent.rules,
        type: 'torneo',
        status: 'upcoming',
        tournament_format: sourceEvent.tournament_format || 'sit_and_go',
        auto_recreate: true,
        start_date: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
        entry_fee: sourceEvent.entry_fee || 0,
        guaranteed_prize_coins: guaranteed,
        current_prize_coins: guaranteed,
        entry_pool_percent: sourceEvent.entry_pool_percent ?? 90,
        prize_pool: `${guaranteed.toLocaleString('en-US')} Monedas`,
        prize_tiers: sourceEvent.prize_tiers,
        reward_xp_winner: sourceEvent.reward_xp_winner ?? 300,
        reward_xp_podium: sourceEvent.reward_xp_podium ?? 150,
        reward_xp_participation: sourceEvent.reward_xp_participation ?? 40,
        reward_store_item_id: sourceEvent.reward_store_item_id || null,
        final_best_of: sourceEvent.final_best_of ?? 1,
        min_elo: sourceEvent.min_elo || 0,
        max_participants: sourceEvent.max_participants || 8,
        participants_count: 0,
        image_url: sourceEvent.image_url || null,
        board_theme_url: sourceEvent.board_theme_url || null,
        is_sponsored: !!sourceEvent.is_sponsored,
        sponsor_name: sourceEvent.sponsor_name || null,
        sponsor_logo_url: sourceEvent.sponsor_logo_url || null,
        sponsor_banner_url: sourceEvent.sponsor_banner_url || null,
        brand_theme: sourceEvent.brand_theme || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Torneo 2.0] Error auto-recreando mesa Sit & Go:', error.message);
      return null;
    }
    console.log(`[Torneo 2.0] Nueva mesa Sit & Go abierta automáticamente: ${created.id}`);
    return created.id;
  } catch (err) {
    console.error('[Torneo 2.0] Excepción auto-recreando mesa Sit & Go:', err);
    return null;
  }
}

/**
 * Inicia el temporizador de incomparecencia (no-show) cuando un jugador entra a la sala
 * y está esperando a su oponente.
 */
export async function startNoShowTimer(
  io: Server,
  roomStore: RoomStore,
  gameRoomId: string,
  waitingPlayerId: string,
  waitingPlayerName: string
) {
  const existing = activeWaitTimers.get(gameRoomId);
  if (existing && existing.waitingPlayerId === waitingPlayerId) {
    return;
  }
  if (existing) {
    clearTimeout(existing.timer);
    activeWaitTimers.delete(gameRoomId);
  }

  const { data: matchData } = await supabase
    .from('tournament_matches')
    .select('id, event_id, player1_id, player2_id, status')
    .eq('game_room_id', gameRoomId)
    .maybeSingle();

  if (!matchData || matchData.status === 'completed' || matchData.status === 'playing') return;

  const opponentId = matchData.player1_id === waitingPlayerId ? matchData.player2_id : matchData.player1_id;
  if (!opponentId) return;

  const waitingSinceIso = new Date().toISOString();

  await supabase
    .from('tournament_matches')
    .update({
      waiting_player_id: waitingPlayerId,
      waiting_since: waitingSinceIso,
      status: 'ready',
    })
    .eq('id', matchData.id);

  console.log(`[Torneo No-Show] Temporizador iniciado para sala ${gameRoomId} (${waitingPlayerName} esperando a ${opponentId})`);

  io.to(`user:${opponentId}`).emit('tournament_opponent_waiting', {
    roomId: gameRoomId,
    eventId: matchData.event_id,
    waitingPlayerName,
    waitingSince: waitingSinceIso,
    timeoutSeconds: Math.floor(NO_SHOW_TIMEOUT_MS / 1000),
  });

  sendPushToUser(opponentId, {
    type: 'tournament_match_invite',
    title: '⚔️ ¡Tu rival te está esperando!',
    body: `¡${waitingPlayerName} ya está en la mesa de torneo! Tienes 3 minutos para entrar o perderás por incomparecencia.`,
    data: {
      roomId: gameRoomId,
      eventId: matchData.event_id,
      isTournament: true,
    },
  }).catch((err) => console.error(`[Torneo No-Show] Error enviando push a ${opponentId}:`, err));

  const timer = setTimeout(async () => {
    activeWaitTimers.delete(gameRoomId);

    const room = await roomStore.get(gameRoomId);
    // Verificar que la partida NO haya iniciado y que `waitingPlayerId` SIGA presente en la sala
    if (!room || room.state || room.players.length >= 2) {
      return;
    }

    const stillPresent = room.players.some((p) => p.userId === waitingPlayerId);
    if (!stillPresent) {
      console.log(`[Torneo No-Show] ${waitingPlayerId} ya no está en la sala ${gameRoomId}; walkover cancelado.`);
      return;
    }

    console.log(`[Torneo No-Show] Tiempo agotado en sala ${gameRoomId}. Declarando walkover a favor de ${waitingPlayerId}`);

    await supabase
      .from('tournament_matches')
      .update({
        winner_id: waitingPlayerId,
        status: 'completed',
        walkover_reason: 'opponent_no_show',
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchData.id);

    const payload = {
      matchId: matchData.id,
      eventId: matchData.event_id,
      roomId: gameRoomId,
      message: '¡Tu rival no se presentó a tiempo! Avanzaste a la siguiente ronda por Walkover.',
    };
    io.to(gameRoomId).emit('tournament_walkover_won', payload);
    io.to(`user:${waitingPlayerId}`).emit('tournament_walkover_won', payload);

    sendPushToUser(opponentId, {
      type: 'tournament_start',
      title: 'Eliminado por Incomparecencia',
      body: 'No te presentaste a tiempo a tu partida de torneo y quedaste eliminado por Walkover.',
      data: { eventId: matchData.event_id, isTournament: true },
    }).catch(() => {});

    await processTournamentAdvancement(io, roomStore, gameRoomId, waitingPlayerId, true);
  }, NO_SHOW_TIMEOUT_MS);

  activeWaitTimers.set(gameRoomId, { timer, waitingPlayerId });
}

/**
 * Cancela el temporizador de incomparecencia cuando el rival ingresa a la sala.
 */
export function clearNoShowTimer(gameRoomId: string) {
  const entry = activeWaitTimers.get(gameRoomId);
  if (entry) {
    clearTimeout(entry.timer);
    activeWaitTimers.delete(gameRoomId);
    console.log(`[Torneo No-Show] Temporizador cancelado para sala ${gameRoomId}`);
  }
}

/**
 * Limpia de forma segura el estado de espera si el jugador que esperaba se desconecta antes de iniciar.
 * Si otro jugador quedó esperando en la sala, transfiere el temporizador a ese jugador.
 */
export async function handlePlayerLeftTournamentWait(
  io: Server,
  roomStore: RoomStore,
  gameRoomId: string,
  leavingUserId: string
) {
  const entry = activeWaitTimers.get(gameRoomId);
  if (entry && entry.waitingPlayerId === leavingUserId) {
    clearTimeout(entry.timer);
    activeWaitTimers.delete(gameRoomId);
  }

  await supabase
    .from('tournament_matches')
    .update({
      waiting_player_id: null,
      waiting_since: null,
      status: 'pending',
    })
    .eq('game_room_id', gameRoomId)
    .eq('waiting_player_id', leavingUserId)
    .neq('status', 'completed');

  const room = await roomStore.get(gameRoomId);
  if (room && !room.state && room.players.length === 1) {
    const remaining = room.players[0];
    if (remaining && remaining.userId !== leavingUserId) {
      await startNoShowTimer(io, roomStore, gameRoomId, remaining.userId, remaining.name);
    }
  }
}

/**
 * Permite a un jugador reclamar manualmente el walkover si esperó los 3 minutos.
 */
export async function claimTournamentWalkover(
  io: Server,
  roomStore: RoomStore,
  matchId: string,
  userId: string
) {
  const { data, error } = await supabase.rpc('claim_tournament_walkover', {
    p_match_id: matchId,
    p_user_id: userId,
  });

  if (error || !data?.success) {
    return { success: false, error: data?.error || error?.message, remaining_seconds: data?.remaining_seconds };
  }

  const { data: matchData } = await supabase
    .from('tournament_matches')
    .select('game_room_id, event_id, round_number, match_order, best_of, series_game, series_id, player1_id, player2_id')
    .eq('id', matchId)
    .maybeSingle();

  if (matchData?.game_room_id) {
    clearNoShowTimer(matchData.game_room_id);
    // `claim_tournament_walkover` ya marcó el match como `completed`, así que avanzamos directamente
    await advanceCompletedMatch(matchData, userId, io, roomStore);
  }

  return { success: true, ...data };
}

export async function processTournamentAdvancement(
  io: Server,
  roomStore: RoomStore,
  roomId: string,
  winnerId: string,
  isTournament: boolean
) {
  if (!isTournament || !winnerId) return;

  console.log(`[Torneo] Procesando avance de torneo para la sala ${roomId}. Ganador: ${winnerId}`);
  const { data: matchData, error: matchError } = await supabase
    .from('tournament_matches')
    .select('id, event_id, round_number, match_order, status, best_of, series_game, series_id, player1_id, player2_id')
    .eq('game_room_id', roomId)
    .maybeSingle();

  if (matchError || !matchData) {
    if (matchError) console.error(`[Torneo] Error buscando match de sala ${roomId}:`, matchError);
    return;
  }

  // Si aún no estaba marcado como completado (ej. victoria normal de partida), actualizarlo
  if (matchData.status !== 'completed') {
    await supabase
      .from('tournament_matches')
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchData.id);
  }

  await advanceCompletedMatch(matchData, winnerId, io, roomStore);
}

async function advanceCompletedMatch(
  matchData: any,
  winnerId: string,
  io: Server,
  roomStore: RoomStore
) {
  if ((matchData.best_of ?? 1) > 1 && matchData.series_id) {
    await handleBestOfSeriesAdvancement(matchData, winnerId, io, roomStore);
  } else {
    await handleSingleMatchAdvancement(matchData, winnerId, io, roomStore);
  }
}

async function handleBestOfSeriesAdvancement(
  matchData: any,
  _winnerId: string,
  io: Server,
  roomStore: RoomStore
) {
  const { data: seriesMatches } = await supabase
    .from('tournament_matches')
    .select('winner_id, match_order')
    .eq('series_id', matchData.series_id)
    .not('winner_id', 'is', null);

  const p1Wins = seriesMatches?.filter((m) => m.winner_id === matchData.player1_id).length || 0;
  const p2Wins = seriesMatches?.filter((m) => m.winner_id === matchData.player2_id).length || 0;
  const requiredWins = Math.ceil((matchData.best_of || 3) / 2);

  console.log(`[Torneo] Serie ${matchData.series_id}: ${p1Wins}-${p2Wins} (meta: ${requiredWins})`);

  if (p1Wins >= requiredWins || p2Wins >= requiredWins) {
    const seriesWinner = p1Wins >= requiredWins ? matchData.player1_id : matchData.player2_id;
    // Verificar si existe una ronda posterior (por si Bo3 se usó en Semifinales) o si es la Gran Final
    const nextRound = matchData.round_number + 1;
    const { data: hasNextRoundMatch } = await supabase
      .from('tournament_matches')
      .select('id')
      .eq('event_id', matchData.event_id)
      .eq('round_number', nextRound)
      .limit(1);

    if (hasNextRoundMatch && hasNextRoundMatch.length > 0) {
      await handleSingleMatchAdvancement({ ...matchData, match_order: 1 }, seriesWinner, io, roomStore);
    } else {
      await handleTournamentFinal(matchData, seriesWinner, io);
    }
  } else {
    const nextGame = (matchData.series_game || 1) + 1;
    const { data: nextGameMatch } = await supabase
      .from('tournament_matches')
      .select('id, game_room_id')
      .eq('series_id', matchData.series_id)
      .eq('series_game', nextGame)
      .maybeSingle();

    if (nextGameMatch) {
      await supabase
        .from('tournament_matches')
        .update({
          player1_id: matchData.player1_id,
          player2_id: matchData.player2_id,
        })
        .eq('id', nextGameMatch.id);

      if (nextGameMatch.game_room_id) {
        notifyTournamentPlayers(
          io,
          roomStore,
          nextGameMatch.game_room_id,
          matchData.event_id,
          matchData.player1_id,
          matchData.player2_id
        );
      }
    }
  }
}

async function handleSingleMatchAdvancement(
  matchData: any,
  winnerId: string,
  io: Server,
  roomStore: RoomStore
) {
  const nextRound = matchData.round_number + 1;
  const nextOrder = Math.ceil(matchData.match_order / 2);

  // Nota: si la ronda siguiente es una Final Bo3, el juego 1 tiene `match_order = 1` (y `series_game = 1`)
  const { data: nextMatch } = await supabase
    .from('tournament_matches')
    .select('id, player1_id, player2_id, game_room_id, best_of, series_id')
    .eq('event_id', matchData.event_id)
    .eq('round_number', nextRound)
    .eq('match_order', nextOrder)
    .maybeSingle();

  if (nextMatch) {
    const filledSlot = matchData.match_order % 2 !== 0 ? 'player1_id' : 'player2_id';
    const otherSlot = filledSlot === 'player1_id' ? 'player2_id' : 'player1_id';

    await supabase
      .from('tournament_matches')
      .update({ [filledSlot]: winnerId })
      .eq('id', nextMatch.id);

    console.log(`[Torneo] Jugador ${winnerId} avanzado a ronda ${nextRound}, partido ${nextMatch.id}`);

    const opponentId = (nextMatch as any)[otherSlot];
    if (opponentId && nextMatch.game_room_id) {
      const p1Id = filledSlot === 'player1_id' ? winnerId : opponentId;
      const p2Id = filledSlot === 'player2_id' ? winnerId : opponentId;
      notifyTournamentPlayers(io, roomStore, nextMatch.game_room_id, matchData.event_id, p1Id, p2Id);
    }
  } else {
    await handleTournamentFinal(matchData, winnerId, io);
  }
}

/**
 * Resolución administrativa de un partido de torneo (Forzar ganador P1/P2 o Reiniciar sala)
 * garantizando que el avance de llave y la distribución final de premios se ejecuten en el servidor.
 */
export async function adminResolveTournamentMatch(
  io: Server,
  roomStore: RoomStore,
  matchId: string,
  action: 'force_p1' | 'force_p2' | 'reset'
): Promise<{ success: boolean; error?: string }> {
  const { data: match, error } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (error || !match) {
    return { success: false, error: 'Partido no encontrado.' };
  }

  if (action === 'reset') {
    if (match.game_room_id) {
      clearNoShowTimer(match.game_room_id);
    }
    const newRoomId = generateTournamentRoomId();
    await supabase
      .from('tournament_matches')
      .update({
        status: 'pending',
        winner_id: null,
        walkover_reason: null,
        waiting_player_id: null,
        waiting_since: null,
        completed_at: null,
        game_room_id: newRoomId,
      })
      .eq('id', matchId);

    if (match.player1_id && match.player2_id) {
      notifyTournamentPlayers(io, roomStore, newRoomId, match.event_id, match.player1_id, match.player2_id);
    }
    return { success: true };
  }

  const forcedWinnerId = action === 'force_p1' ? match.player1_id : match.player2_id;
  if (!forcedWinnerId) {
    return { success: false, error: 'El jugador seleccionado no está definido en este partido.' };
  }

  if (match.game_room_id) {
    clearNoShowTimer(match.game_room_id);
  }

  await supabase
    .from('tournament_matches')
    .update({
      winner_id: forcedWinnerId,
      status: 'completed',
      walkover_reason: 'admin_decision',
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  await advanceCompletedMatch(match, forcedWinnerId, io, roomStore);
  return { success: true };
}

/**
 * Tick periódico del planificador de torneos programados (`checkScheduledEvents`):
 * 1. Abre automáticamente la ventana de Check-in N minutos antes de `start_date`.
 * 2. Al cumplirse `start_date`, genera las llaves con los jugadores confirmados e inicia el torneo.
 */
export async function processScheduledTournamentTick(io: Server, roomStore: RoomStore) {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Consultar todos los torneos `upcoming` de tipo `scheduled`
  const { data: upcomingScheduled, error } = await supabase
    .from('events')
    .select('id, title, start_date, tournament_format, check_in_enabled, check_in_window_minutes, is_championship')
    .eq('status', 'upcoming')
    .eq('type', 'torneo');

  if (error || !upcomingScheduled) {
    if (error) console.error('[Torneo Scheduler] Error consultando eventos upcoming:', error.message);
    return;
  }

  for (const ev of upcomingScheduled) {
    if (!CASH_PRIZES_ENABLED && ev.is_championship) continue;
    const format = ev.tournament_format || 'scheduled';
    if (format !== 'scheduled') continue;

    const startMs = new Date(ev.start_date).getTime();
    if (Number.isNaN(startMs)) continue;

    const windowMinutes = ev.check_in_window_minutes ?? 15;
    const checkInOpenMs = startMs - windowMinutes * 60 * 1000;

    // A) Si ya llegó la hora de inicio, generar llaves e iniciar automáticamente
    if (now.getTime() >= startMs) {
      console.log(`[Torneo Scheduler] Hora de inicio alcanzada para "${ev.title}". Generando llaves automáticamente...`);
      await generateAndStartTournamentBracket(io, roomStore, ev.id, {
        triggeredBy: 'auto_scheduled',
      });
      continue;
    }

    // B) Si estamos dentro de la ventana previa y el check-in aún no estaba abierto, abrirlo y avisar
    if (!ev.check_in_enabled && windowMinutes > 0 && now.getTime() >= checkInOpenMs) {
      await supabase
        .from('events')
        .update({
          check_in_enabled: true,
          check_in_deadline: ev.start_date,
        })
        .eq('id', ev.id);

      console.log(`[Torneo Scheduler] Check-in abierto para "${ev.title}" (${windowMinutes}m antes del inicio)`);

      const { data: entries } = await supabase
        .from('event_entries')
        .select('player_id')
        .eq('event_id', ev.id);

      for (const entry of entries || []) {
        io.to(`user:${entry.player_id}`).emit('tournament_checkin_open', {
          eventId: ev.id,
          eventTitle: ev.title,
          deadline: ev.start_date,
        });

        sendPushToUser(entry.player_id, {
          type: 'tournament_start',
          title: '✅ ¡Check-in Abierto!',
          body: `Confirma tu asistencia para "${ev.title}" antes de que inicien las llaves.`,
          data: { eventId: ev.id, isTournament: true },
        }).catch(() => {});
      }

      io.emit('tournament_list_updated', { eventId: ev.id });
    }
  }

  // 2. Cerrar eventos no-torneo cuya `end_date` haya expirado (sin tocar torneos con llaves activas salvo expiración real)
  const { data: expiredNonTournaments } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .eq('status', 'live')
    .neq('type', 'torneo')
    .lte('end_date', nowIso)
    .select('id, title');

  for (const ev of expiredNonTournaments || []) {
    io.emit('event_completed', { eventId: ev.id, title: ev.title });
  }
}
