import { Server } from 'socket.io';
import { supabase } from './supabase';
import { RoomStore } from './room-store';
import { sendPushToUser, PushPayload } from './web-push';

const CHAMPIONSHIP_CHECK_INTERVAL_MS = 60_000; // 1 minuto

export function initChampionshipTimers(io: Server, roomStore: RoomStore) {
  console.log('[Championship] Timers de monitoreo de fases iniciados.');

  let previousTop32UserIds: string[] = [];

  setInterval(async () => {
    try {
      const { data: activeEvents } = await supabase
        .from('events')
        .select('id, title, end_date, championship_phase, is_championship, final_datetime, status, current_prize_usd')
        .eq('is_championship', true)
        .in('championship_phase', ['league', 'cut']);

      if (!activeEvents || activeEvents.length === 0) return;

      const now = new Date();

      for (const event of activeEvents) {
        // Monitoreo continuo durante la liga para alertar si alguien cae del Top 32
        if (event.championship_phase === 'league' && event.status === 'live') {
          const { data: currentTop32 } = await supabase
            .from('championship_participants')
            .select('user_id, rank_position')
            .eq('event_id', event.id)
            .order('points', { ascending: false })
            .limit(32);

          if (currentTop32 && currentTop32.length > 0) {
            const currentIds = currentTop32.map(p => p.user_id);
            if (previousTop32UserIds.length > 0) {
              const droppedIds = previousTop32UserIds.filter(id => !currentIds.includes(id));
              for (const droppedUserId of droppedIds) {
                sendPushToUser(droppedUserId, {
                  type: 'tournament_start',
                  title: '⚠️ ¡Alerta Kasino21 Championship!',
                  body: '¡Has caído fuera del Top 32! Ve más anuncios ahora para recuperar tu lugar en la Gran Final.',
                  data: { eventId: event.id, isTournament: true }
                }).catch(err => console.error(`[Championship] Error enviando push a ${droppedUserId}:`, err));
              }
            }
            previousTop32UserIds = currentIds;
          }

          // Auto-freeze: si la liga acabó y sigue en fase 'league'
          const endDate = new Date(event.end_date);
          if (endDate <= now) {
            console.log(`[Championship] Liga del evento ${event.id} expirada. Ejecutando freeze automático...`);
            const { data, error } = await supabase.rpc('freeze_championship_league', {
              p_event_id: event.id
            });
            if (error) {
              console.error(`[Championship] Error en freeze automático:`, error);
            } else {
              console.log(`[Championship] Freeze exitoso. Top ${data?.qualified_count} clasificados. Pozo: $${data?.current_prize_usd}`);
              
              // 1. Publicar automáticamente el torneo "El Gran Pool - Top 32 Clasificados"
              const prizeFormatted = `$${event.current_prize_usd || 100} USD`;
              const { data: existingPool } = await supabase
                .from('events')
                .select('id')
                .eq('title', 'El Gran Pool - Top 32 Clasificados')
                .maybeSingle();

              if (existingPool) {
                await supabase.from('events').update({
                  prize_pool: prizeFormatted,
                  status: 'live',
                  max_participants: 32,
                  updated_at: new Date().toISOString(),
                }).eq('id', existingPool.id);
              } else {
                await supabase.from('events').insert({
                  title: 'El Gran Pool - Top 32 Clasificados',
                  description: 'Torneo exclusivo reservado únicamente para los 32 jugadores clasificados en el ranking de la Liga Championship. ¡El premio total acumulado se disputará en brackets eliminatorios!',
                  rules: 'Exclusivo para Top 32 Clasificados. Eliminación directa. Se juega a 1 partida por ronda.',
                  type: 'torneo',
                  status: 'live',
                  start_date: new Date().toISOString(),
                  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  entry_fee: 0,
                  prize_pool: prizeFormatted,
                  min_elo: 0,
                  participants_count: 0,
                  max_participants: 32,
                  is_championship: true,
                });
              }

              // 2. Generar el bracket de 32 automáticamente
              await generateChampionshipBracket(event.id);

              // 3. Notificar a todos los conectados que la fase cambió
              io.emit('championship_phase_changed', {
                eventId: event.id,
                phase: 'cut',
                qualifiedCount: data?.qualified_count,
                currentPrizeUsd: data?.current_prize_usd
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[Championship] Error en timer de monitoreo de fases:', err);
    }
  }, CHAMPIONSHIP_CHECK_INTERVAL_MS);
}

/**
 * Emite la actualización del pozo en tiempo real a todos los clientes conectados.
 */
export function broadcastPrizePoolUpdate(io: Server, eventId: string, data: Record<string, unknown>) {
  io.emit('championship_pool_update', { eventId, ...data });
}

/**
 * Procesa la vista/clic de un ad en el championship.
 * Llama a la RPC `record_championship_ad_activity` y emite la actualización del pozo.
 */
export async function handleChampionshipAdCompleted(
  io: Server,
  userId: string,
  eventId: string,
  type: 'view' | 'click'
) {
  try {
    const { data, error } = await supabase.rpc('record_championship_ad_activity', {
      p_user_id: userId,
      p_event_id: eventId,
      p_type: type
    });

    if (error) {
      console.error('[Championship] Error procesando actividad de ad:', error);
      return { success: false, error: error.message };
    }

    if (data?.success) {
      broadcastPrizePoolUpdate(io, eventId, {
        currentPrizeUsd: data.current_prize_usd,
        globalAdViews: data.global_ad_views,
        pointsAdded: data.points_added,
        dailyCap: data.daily_cap,
        adsToday: data.ads_today
      });
    }

    return data;
  } catch (err) {
    console.error('[Championship] Excepción en handleChampionshipAdCompleted:', err);
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * Genera el bracket de eliminación directa para los 32 clasificados.
 * Construye las filas en `tournament_matches` de la misma forma que AdminPanel.handleGenerateBracket.
 */
export async function generateChampionshipBracket(eventId: string) {
  try {
    console.log(`[Championship] Generando bracket para evento ${eventId}`);

    // 1. Eliminar matches previos si existen
    await supabase.from('tournament_matches').delete().eq('event_id', eventId);

    // 2. Obtener los 32 clasificados ordenados por rank_position
    const { data: qualified, error: fetchError } = await supabase
      .from('championship_participants')
      .select('user_id, rank_position')
      .eq('event_id', eventId)
      .eq('is_qualified', true)
      .eq('kyc_status', 'approved')
      .order('rank_position', { ascending: true });

    if (fetchError) {
      console.error('[Championship] Error obteniendo clasificados:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const players = qualified?.map(p => p.user_id) || [];
    const maxP = 32;
    const totalRounds = Math.log2(maxP); // 5 rondas: 0,1,2,3,4

    // La UI espera que la Final sea siempre la Ronda 4
    // 32 jugadores (5 rondas): startRound = 0
    const startRound = 4 - totalRounds + 1;

    const matchesPayload: Array<Record<string, unknown>> = [];

    // 3. Generar la primera ronda con emparejamiento por seed
    const firstRoundMatchCount = maxP / 2;
    for (let i = 0; i < firstRoundMatchCount; i++) {
      matchesPayload.push({
        event_id: eventId,
        round_number: startRound,
        match_order: i + 1,
        player1_id: players[i * 2] || null,
        player2_id: players[i * 2 + 1] || null,
        status: (players[i * 2] && players[i * 2 + 1]) ? 'pending' : 'bye',
        best_of: 1
      });
    }

    // 4. Generar rondas vacías siguientes hasta la final (ronda 4)
    let matchesInRound = firstRoundMatchCount / 2;
    for (let round = startRound + 1; round <= 4; round++) {
      for (let i = 0; i < matchesInRound; i++) {
        matchesPayload.push({
          event_id: eventId,
          round_number: round,
          match_order: i + 1,
          player1_id: null,
          player2_id: null,
          status: 'pending',
          best_of: 1
        });
      }
      matchesInRound = matchesInRound / 2;
    }

    // 5. Insertar todos los matches
    const { error: insertError } = await supabase
      .from('tournament_matches')
      .insert(matchesPayload);

    if (insertError) {
      console.error('[Championship] Error insertando bracket:', insertError);
      return { success: false, error: insertError.message };
    }

    // 6. Auto-resolver byes (avanzar jugadores sin oponente)
    for (const match of matchesPayload) {
      if (match.status === 'bye') {
        const winnerId = match.player1_id || match.player2_id;
        if (winnerId) {
          // Marcar como completado con ganador
          await supabase.from('tournament_matches')
            .update({ winner_id: winnerId, status: 'completed' })
            .eq('event_id', eventId)
            .eq('round_number', match.round_number)
            .eq('match_order', match.match_order);
        }
      }
    }

    console.log(`[Championship] Bracket generado: ${matchesPayload.length} matches para ${players.length} jugadores`);
    return { success: true, matchCount: matchesPayload.length, playerCount: players.length };
  } catch (err) {
    console.error('[Championship] Excepción generando bracket:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Inicia la fase final del championship.
 * Cambia la fase a 'final' y notifica a todos los clasificados por push.
 */
export async function startChampionshipFinal(io: Server, eventId: string) {
  try {
    console.log(`[Championship] Iniciando la gran final del evento ${eventId}`);

    const { error } = await supabase
      .from('events')
      .update({ championship_phase: 'final', is_final_paused: false, updated_at: new Date().toISOString() })
      .eq('id', eventId);

    if (error) {
      console.error('[Championship] Error iniciando final:', error);
      return { success: false, error: error.message };
    }

    // Notificar a todos los conectados
    io.emit('championship_final_started', { eventId });

    // Enviar push a los clasificados aprobados
    const { data: topPlayers } = await supabase
      .from('championship_participants')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('is_qualified', true)
      .eq('kyc_status', 'approved');

    if (topPlayers && topPlayers.length > 0) {
      const pushPayload: PushPayload = {
        type: 'tournament_start',
        title: '🏆 ¡La Gran Final ha comenzado!',
        body: '¡El KASINO21 CHAMPIONSHIP Final acaba de iniciar! Entra ya a jugar tu partida.',
        data: {
          eventId,
          isTournament: true
        }
      };

      const pushPromises = topPlayers.map(p =>
        sendPushToUser(p.user_id, pushPayload).catch(err =>
          console.error(`[Championship] Error enviando push a ${p.user_id}:`, err)
        )
      );
      await Promise.all(pushPromises);

      console.log(`[Championship] Push enviado a ${topPlayers.length} finalistas.`);
    }

    return { success: true };
  } catch (err) {
    console.error('[Championship] Excepción en startChampionshipFinal:', err);
    return { success: false, error: String(err) };
  }
}
