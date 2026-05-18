import { supabase } from './supabase';
import { Server } from 'socket.io';

export async function handleTournamentFinal(matchData: any, winnerId: string) {
  const { data: eventData } = await supabase
    .from('events')
    .select('prize_pool')
    .eq('id', matchData.event_id)
    .single();

  let finalPrize = 0;
  if (eventData?.prize_pool) {
    const matchAmount = eventData.prize_pool.match(/\d[\d,.]*/);
    if (matchAmount) finalPrize = parseInt(matchAmount[0].replace(/,/g, ''), 10);
  }

  if (finalPrize > 0) {
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
}

export function notifyTournamentPlayers(
  io: Server,
  rooms: Record<string, any>,
  gameRoomId: string,
  eventId: string,
  player1Id?: string,
  player2Id?: string
) {
  const targetIds = new Set([player1Id, player2Id].filter(Boolean));
  if (targetIds.size === 0) return;

  for (const [, room] of Object.entries(rooms)) {
    for (const player of room.players) {
      if (targetIds.has(player.userId)) {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.emit('tournament_ready', { gameRoomId, eventId });
          console.log(`[Torneo] Notificación tournament_ready enviada a ${player.name} (sala ${gameRoomId})`);
        }
      }
    }
  }
}

export async function processTournamentAdvancement(
  io: Server,
  rooms: Record<string, any>,
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
    await handleBestOfSeriesAdvancement(matchData, winnerId, io, rooms);
  } else {
    await handleSingleMatchAdvancement(matchData, winnerId, io, rooms);
  }
}

async function handleBestOfSeriesAdvancement(
  matchData: any,
  winnerId: string,
  io: Server,
  rooms: Record<string, any>
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
      notifyTournamentPlayers(io, rooms, nextGameMatch.game_room_id, matchData.event_id, matchData.player1_id, matchData.player2_id);
    }
  }
}

async function handleSingleMatchAdvancement(
  matchData: any,
  winnerId: string,
  io: Server,
  rooms: Record<string, any>
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
      notifyTournamentPlayers(io, rooms, nextMatch.game_room_id, matchData.event_id, p1Id, p2Id);
    }
  } else {
    await handleTournamentFinal(matchData, winnerId);
  }
}
