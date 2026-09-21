import { supabase } from './supabase';
import { Server } from 'socket.io';
import { RoomStore } from './room-store';
import { sendPushToUser } from './web-push';

export const NO_SHOW_TIMEOUT_MS = 180_000; // 3 minutos de tolerancia para presentarse
const activeWaitTimers = new Map<string, NodeJS.Timeout>();

export async function handleTournamentFinal(matchData: any, winnerId: string) {
  const { data: eventData } = await supabase
    .from('events')
    .select('id, title, prize_pool, is_championship, is_sponsored')
    .eq('id', matchData.event_id)
    .single();

  const isChampionship = eventData?.is_championship || 
    eventData?.title?.includes('El Gran Pool') || 
    eventData?.title?.includes('Championship');

  if (isChampionship) {
    console.log(`[Championship] Gran Final de Championship completada. Invocando distribución de premios en $USD...`);
    const { data: distRes, error: distErr } = await supabase.rpc('calculate_championship_prize_distribution', {
      p_event_id: matchData.event_id
    });
    if (distErr) {
      console.error('[Championship] Error calculando distribución de premios:', distErr);
    } else {
      console.log(`[Championship] Distribución completada. Reclamos creados: ${distRes?.claims_created || 0}`);
    }

    // Recompensa complementaria en monedas fijas para el campeón del Championship (10,000 monedas)
    const CHAMPIONSHIP_COIN_BONUS = 10000;
    const { error: bonusError } = await supabase.rpc('award_tournament_prize', {
      event_id_param: matchData.event_id,
      winner_id_param: winnerId,
      prize_amount: CHAMPIONSHIP_COIN_BONUS
    });
    if (bonusError) {
      console.error(`[Championship] Error entregando bonus de monedas al campeón:`, bonusError);
    } else {
      console.log(`[Championship] Bonus de ${CHAMPIONSHIP_COIN_BONUS} monedas entregado al campeón ${winnerId}`);
    }
    return;
  }

  // Torneo estándar o patrocinado regular (premios en monedas)
  let finalPrize = 0;
  if (eventData?.prize_pool) {
    // Si contiene USD, es premio en dólares (no sumarlo como monedas arbitrarias)
    if (!eventData.prize_pool.toUpperCase().includes('USD')) {
      const matchAmount = eventData.prize_pool.match(/\d[\d,.]*/);
      if (matchAmount) finalPrize = parseInt(matchAmount[0].replace(/,/g, ''), 10);
    }
  }

  console.log(`[Torneo] Final del torneo completada. Entregando premio de ${finalPrize} a ${winnerId}`);
  const { error: rewardError } = await supabase.rpc('award_tournament_prize', {
    event_id_param: matchData.event_id, winner_id_param: winnerId, prize_amount: finalPrize
  });
  if (rewardError) {
    console.error(`[Torneo] Error entregando premio final:`, rewardError);
  } else {
    console.log(`[Torneo] Premio entregado exitosamente.`);
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
  if (activeWaitTimers.has(gameRoomId)) return;

  const { data: matchData } = await supabase
    .from('tournament_matches')
    .select('id, event_id, player1_id, player2_id, status, events(title)')
    .eq('game_room_id', gameRoomId)
    .single();

  if (!matchData || matchData.status === 'completed' || matchData.status === 'playing') return;

  const opponentId = matchData.player1_id === waitingPlayerId ? matchData.player2_id : matchData.player1_id;
  if (!opponentId) return;

  // Registrar en base de datos la marca de tiempo de espera
  await supabase
    .from('tournament_matches')
    .update({
      waiting_player_id: waitingPlayerId,
      waiting_since: new Date().toISOString(),
      status: 'ready'
    })
    .eq('id', matchData.id);

  console.log(`[Torneo No-Show] Temporizador iniciado para sala ${gameRoomId} (${waitingPlayerName} esperando a ${opponentId})`);

  // Enviar push al oponente advirtiendo del límite de tiempo
  sendPushToUser(opponentId, {
    type: 'tournament_match_invite',
    title: '⚔️ ¡Tu rival te está esperando!',
    body: `¡${waitingPlayerName} ya está en la mesa de torneo! Tienes 3 minutos para entrar o perderás por incomparecencia.`,
    data: {
      roomId: gameRoomId,
      eventId: matchData.event_id,
      isTournament: true
    }
  }).catch(err => console.error(`[Torneo No-Show] Error enviando push a ${opponentId}:`, err));

  const timer = setTimeout(async () => {
    activeWaitTimers.delete(gameRoomId);

    const room = await roomStore.get(gameRoomId);
    // Si la sala ya inició la partida o ya tiene 2 jugadores, no ejecutar walkover
    if (room && (room.state || room.players.length >= 2)) {
      return;
    }

    console.log(`[Torneo No-Show] Tiempo agotado en sala ${gameRoomId}. Declarando walkover a favor de ${waitingPlayerId}`);

    // Declarar victoria por walkover
    await supabase
      .from('tournament_matches')
      .update({
        winner_id: waitingPlayerId,
        status: 'completed',
        walkover_reason: 'opponent_no_show',
        completed_at: new Date().toISOString()
      })
      .eq('id', matchData.id);

    // Notificar al ganador
    io.to(gameRoomId).emit('tournament_walkover_won', {
      matchId: matchData.id,
      message: '¡Tu rival no se presentó a tiempo! Has avanzado a la siguiente ronda por incomparecencia (Walkover).'
    });

    // Notificar al ausente por push
    sendPushToUser(opponentId, {
      type: 'tournament_start',
      title: '❌ Eliminado por Incomparecencia',
      body: 'No te presentaste a tiempo a tu partida de torneo y has quedado eliminado por Walkover.',
      data: { eventId: matchData.event_id, isTournament: true }
    }).catch(err => console.error(`[Torneo No-Show] Error avisando eliminación a ${opponentId}:`, err));

    // Procesar avance de ronda para el ganador
    await processTournamentAdvancement(io, roomStore, gameRoomId, waitingPlayerId, true);
  }, NO_SHOW_TIMEOUT_MS);

  activeWaitTimers.set(gameRoomId, timer);
}

/**
 * Cancela el temporizador de incomparecencia cuando el rival ingresa a la sala.
 */
export function clearNoShowTimer(gameRoomId: string) {
  const timer = activeWaitTimers.get(gameRoomId);
  if (timer) {
    clearTimeout(timer);
    activeWaitTimers.delete(gameRoomId);
    console.log(`[Torneo No-Show] Temporizador cancelado para sala ${gameRoomId} (rival conectado)`);
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
    p_user_id: userId
  });

  if (error || !data?.success) {
    return { success: false, error: data?.error || error?.message };
  }

  // Si fue exitoso, avanzar ronda
  const { data: matchData } = await supabase
    .from('tournament_matches')
    .select('game_room_id')
    .eq('id', matchId)
    .single();

  if (matchData?.game_room_id) {
    clearNoShowTimer(matchData.game_room_id);
    await processTournamentAdvancement(io, roomStore, matchData.game_room_id, userId, true);
  }

  return { success: true, ...data };
}

export function notifyTournamentPlayers(
  io: Server,
  roomStore: RoomStore,
  gameRoomId: string,
  eventId: string,
  player1Id?: string,
  player2Id?: string
) {
  const targetIds = new Set([player1Id, player2Id].filter(Boolean));
  if (targetIds.size === 0) return;

  for (const [, room] of roomStore.getLocalEntries()) {
    for (const player of room.players) {
      if (targetIds.has(player.userId)) {
        io.to(player.socketId).emit('tournament_ready', { gameRoomId, eventId });
        console.log(`[Torneo] Notificación tournament_ready enviada a ${player.name} (sala ${gameRoomId})`);
      }
    }
  }
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
    .single();

  if (matchError) {
    console.error(`[Torneo] Error buscando tournament_match asociado a la sala ${roomId}:`, matchError);
  }

  if (matchError || !matchData) return;

  if (matchData.status === 'completed') {
    console.log(`[Torneo] Match ${matchData.id} ya estaba completado. Saltando reprocesamiento.`);
    return;
  }

  console.log(`[Torneo] Actualizando status a 'completed' para el match ${matchData.id}`);
  await supabase.from('tournament_matches')
    .update({ winner_id: winnerId, status: 'completed' })
    .eq('id', matchData.id);

  if (matchData.best_of > 1) {
    await handleBestOfSeriesAdvancement(matchData, winnerId, io, roomStore);
  } else {
    await handleSingleMatchAdvancement(matchData, winnerId, io, roomStore);
  }
}

async function handleBestOfSeriesAdvancement(
  matchData: any,
  winnerId: string,
  io: Server,
  roomStore: RoomStore
) {
  const { data: seriesMatches } = await supabase
    .from('tournament_matches')
    .select('winner_id')
    .eq('series_id', matchData.series_id)
    .not('winner_id', 'is', null);

  const p1Wins = seriesMatches?.filter(m => m.winner_id === matchData.player1_id).length || 0;
  const p2Wins = seriesMatches?.filter(m => m.winner_id === matchData.player2_id).length || 0;
  const requiredWins = Math.ceil(matchData.best_of / 2);

  console.log(`[Torneo] Serie: ${p1Wins}-${p2Wins} (necesario: ${requiredWins})`);

  if (p1Wins >= requiredWins || p2Wins >= requiredWins) {
    const seriesWinner = p1Wins >= requiredWins ? matchData.player1_id : matchData.player2_id;
    console.log(`[Torneo] Serie completada. Ganador: ${seriesWinner} (${p1Wins}-${p2Wins})`);
    await handleTournamentFinal(matchData, seriesWinner);
  } else {
    const nextGame = matchData.series_game + 1;
    const { data: nextGameMatch } = await supabase
      .from('tournament_matches')
      .select('id, player1_id, player2_id, game_room_id')
      .eq('series_id', matchData.series_id)
      .eq('series_game', nextGame)
      .single();

    if (nextGameMatch) {
      await supabase.from('tournament_matches')
        .update({
          player1_id: matchData.player1_id,
          player2_id: matchData.player2_id
        })
        .eq('id', nextGameMatch.id);

      console.log(`[Torneo] Avanzado a game ${nextGame} de la serie (${nextGameMatch.id})`);
      notifyTournamentPlayers(io, roomStore, nextGameMatch.game_room_id, matchData.event_id, matchData.player1_id, matchData.player2_id);
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

  const { data: nextMatch } = await supabase
    .from('tournament_matches')
    .select('id, player1_id, player2_id, game_room_id')
    .eq('event_id', matchData.event_id)
    .eq('round_number', nextRound)
    .eq('match_order', nextOrder)
    .single();

  if (nextMatch) {
    const updateData: any = {};
    if (matchData.match_order % 2 !== 0) {
      updateData.player1_id = winnerId;
    } else {
      updateData.player2_id = winnerId;
    }

    await supabase.from('tournament_matches')
      .update(updateData)
      .eq('id', nextMatch.id);

    console.log(`[Torneo] Jugador ${winnerId} avanzado a ronda ${nextRound}, match ${nextMatch.id}`);

    const filledSlot = matchData.match_order % 2 !== 0 ? 'player1_id' : 'player2_id';
    const otherSlot = filledSlot === 'player1_id' ? 'player2_id' : 'player1_id';

    if (nextMatch[otherSlot]) {
      const p1Id = filledSlot === 'player1_id' ? winnerId : nextMatch[otherSlot];
      const p2Id = filledSlot === 'player2_id' ? winnerId : nextMatch[otherSlot];
      notifyTournamentPlayers(io, roomStore, nextMatch.game_room_id, matchData.event_id, p1Id, p2Id);
    }
  } else {
    await handleTournamentFinal(matchData, winnerId);
  }
}
