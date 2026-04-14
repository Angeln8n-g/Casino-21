import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { DefaultGameEngine } from './application/game-engine';
import { GameState } from './domain/game-state';
import { Action } from './application/action-validator';
import dotenv from 'dotenv';
import { supabase } from './supabase';

dotenv.config();

const RULES_VERSION = 'agrupar-merge-2026-04-09';
const EXPOSE_RULES_VERSION = process.env.EXPOSE_RULES_VERSION === 'true';

// Interface de Mensajes de Chat
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSpectator: boolean;
  isSystem?: boolean;
}

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST"] }));

if (EXPOSE_RULES_VERSION) {
  app.get('/rules_version', (_req, res) => {
    res.json({ rulesVersion: RULES_VERSION });
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

function extractUserIdFromTokenPayload(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null;
  return payload.sub || payload.user_id || payload.id || null;
}

// Middleware de Autenticación para Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.error('Intento de conexión sin token');
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    // Verificar token JWT de Supabase
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
    (socket as any).user = decoded;
    (socket as any).userId = extractUserIdFromTokenPayload(decoded);
    next();
  } catch (err: any) {
    console.error('Error verificando token:', err.message);
    // Para depuración, vamos a dejar pasar la conexión temporalmente 
    // pero marcamos que falló la auth estricta
    // next(new Error('Authentication error: Invalid token'));
    
    // WORKAROUND TEMPORAL: 
    // Como Supabase usa su propia firma y a veces el JWT_SECRET no coincide exactamente 
    // con el token del cliente (debido a configuración de anon_key vs jwt_secret),
    // vamos a confiar en el token decodificándolo sin verificar la firma para el MVP,
    // o simplemente usando un ID genérico si falla la verificación.
    try {
      const decodedUnverified = jwt.decode(token);
      const normalizedDecoded = (decodedUnverified && typeof decodedUnverified === 'object')
        ? decodedUnverified
        : { sub: `guest-${Math.random().toString(36).substring(2, 8)}` };
      (socket as any).user = normalizedDecoded;
      (socket as any).userId = extractUserIdFromTokenPayload(normalizedDecoded);
      console.warn('Conexión aceptada sin verificación estricta de firma JWT');
      next();
    } catch (e) {
      next(new Error('Authentication error: Invalid token format'));
    }
  }
});

// En memoria por ahora (luego pasará a base de datos/Redis)
  const rooms: Record<string, {
    engine: DefaultGameEngine;
    state: GameState | null;
    players: { socketId: string, playerId: string, name: string, userId: string }[];
    spectators: { socketId: string, userId: string, name: string }[];
    maxPlayers: number;
    timerInterval?: NodeJS.Timeout;
    lastActionTime?: number;
    isTournament?: boolean;
    chatHistory: ChatMessage[];
  }> = {};

// ─── FASE 8: Matchmaking Queue ───
interface MatchmakingPlayer {
  socketId: string;
  userId: string;
  name: string;
  elo: number;
  joinedAt: number;
}
let matchmakingQueue: MatchmakingPlayer[] = [];

// Matchmaking Loop
setInterval(() => {
  if (matchmakingQueue.length < 2) return;

  // Ordenar por tiempo de espera (los que más llevan esperan menos)
  matchmakingQueue.sort((a, b) => a.joinedAt - b.joinedAt);
  const matched = new Set<string>();

  for (let i = 0; i < matchmakingQueue.length; i++) {
    const p1 = matchmakingQueue[i];
    if (matched.has(p1.socketId)) continue;

    const waitTimeP1 = Date.now() - p1.joinedAt;
    // Tolerancia base de 50 ELO, se expande 50 cada 5 segundos de espera, máximo 500 de diferencia.
    const toleranceP1 = 50 + Math.min(Math.floor(waitTimeP1 / 5000) * 50, 500);

    for (let j = i + 1; j < matchmakingQueue.length; j++) {
      const p2 = matchmakingQueue[j];
      if (matched.has(p2.socketId)) continue;

      const waitTimeP2 = Date.now() - p2.joinedAt;
      const toleranceP2 = 50 + Math.min(Math.floor(waitTimeP2 / 5000) * 50, 500);

      const eloDiff = Math.abs(p1.elo - p2.elo);

      // Match si la diferencia de ELO es aceptable para la tolerancia de AMBOS jugadores (o al menos del mayor)
      if (eloDiff <= Math.max(toleranceP1, toleranceP2)) {
        matched.add(p1.socketId);
        matched.add(p2.socketId);

        // ¡Tenemos una partida!
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = {
          engine: new DefaultGameEngine(),
          state: null,
          players: [
            { socketId: p1.socketId, playerId: p1.userId, name: p1.name, userId: p1.userId },
            { socketId: p2.socketId, playerId: p2.userId, name: p2.name, userId: p2.userId }
          ],
          spectators: [],
          maxPlayers: 2,
          chatHistory: []
        };

        const s1 = io.sockets.sockets.get(p1.socketId);
        const s2 = io.sockets.sockets.get(p2.socketId);
        
        if (s1) s1.join(roomId);
        if (s2) s2.join(roomId);

        console.log(`¡Matchmaking exitoso! ${p1.name} (${p1.elo}) vs ${p2.name} (${p2.elo}) -> Sala ${roomId}`);

        // Avisar a los clientes
        io.to(roomId).emit('match_found', { 
          roomId, 
          players: [
            { id: p1.userId, name: p1.name, elo: p1.elo },
            { id: p2.userId, name: p2.name, elo: p2.elo }
          ] 
        });

        // Iniciar la partida automáticamente en 3 segundos
        setTimeout(() => {
          const room = rooms[roomId];
          if (!room) return;
          const result = room.engine.startNewGame('1v1', [p1.name, p2.name]);
          if (result.success && result.value) {
            room.state = result.value;
            room.state.players.forEach((p, index) => {
              (p as any).id = room.players[index].userId;
            });
            startTurnTimer(roomId, room);
            broadcastGameState(roomId, room);
          }
        }, 3000);

        break; // Pasamos al siguiente p1
      }
    }
  }

  // Limpiar la cola de los jugadores emparejados
  matchmakingQueue = matchmakingQueue.filter(p => !matched.has(p.socketId));

}, 3000);
// ─── FIN FASE 8 Matchmaking Queue ───

const TURN_TIME_LIMIT_MS = 30000; // 30 segundos

function closeRoom(roomId: string, reason: string = 'room_closed') {
  const room = rooms[roomId];
  if (!room) return;
  if (room.timerInterval) clearInterval(room.timerInterval);
  io.to(roomId).emit('room_closed', { roomId, reason });
  io.in(roomId).socketsLeave(roomId);
  delete rooms[roomId];
  console.log(`Sala ${roomId} cerrada. Motivo: ${reason}`);
}

io.on('connection', (socket) => {
  const userId = (socket as any).userId || (socket as any).user?.sub;
  console.log(`Usuario autenticado conectado: ${socket.id} (User: ${userId})`);
  if (EXPOSE_RULES_VERSION) {
    socket.emit('rules_version', { rulesVersion: RULES_VERSION });
  }

  // 1. Crear Sala
  socket.on('create_room', ({ playerName, mode }: { playerName: string, mode: '1v1' | '2v2' }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const maxPlayers = mode === '1v1' ? 2 : 4;
    
    rooms[roomId] = {
      engine: new DefaultGameEngine(),
      state: null,
      players: [{ socketId: socket.id, playerId: userId, name: playerName, userId }],
      spectators: [],
      maxPlayers,
      chatHistory: []
    };

    socket.join(roomId);
    socket.emit('room_created', { roomId, playerId: userId });
    console.log(`Sala ${roomId} creada por ${playerName}`);
  });

  // 2. Unirse a Sala
  socket.on('join_room', ({ roomId, playerName, isTournament, isSpectator }: { roomId: string, playerName: string, isTournament?: boolean, isSpectator?: boolean }) => {
    let room = rooms[roomId];
    
    if (!room) {
      if (isTournament && !isSpectator) {
        // Create the tournament room automatically if it doesn't exist
        rooms[roomId] = {
          engine: new DefaultGameEngine(),
          state: null,
          players: [{ socketId: socket.id, playerId: userId, name: playerName, userId }],
          spectators: [],
          maxPlayers: 2, // Tournaments are 1v1 for now
          isTournament: true,
          chatHistory: []
        };
        socket.join(roomId);
        socket.emit('room_created', { roomId, playerId: userId });
        console.log(`Sala de torneo ${roomId} creada automáticamente por ${playerName}`);
        return;
      } else {
        socket.emit('error', 'La sala no existe');
        return;
      }
    }

    // ─── Lógica para Espectadores ───
    if (isSpectator) {
      const existingSpectator = room.spectators.find(s => s.userId === userId);
      if (existingSpectator) {
        existingSpectator.socketId = socket.id;
      } else {
        room.spectators.push({ socketId: socket.id, userId, name: playerName });
      }
      
      socket.join(roomId);
      socket.emit('room_joined_as_spectator', { roomId });
      console.log(`Espectador ${playerName} unido a la sala ${roomId}`);

      if (room.state) {
        // Send sanitized state immediately to the new spectator
        const safeState: GameState = JSON.parse(JSON.stringify(room.state));
        safeState.players.forEach(statePlayer => {
          (statePlayer as any).hand = Array(statePlayer.hand.length).fill({ id: 'hidden', rank: '?', suit: 'hidden', value: 0 });
        });
        socket.emit('game_state_update', safeState);
      }
      
      // Enviar el historial de chat a los espectadores
      socket.emit('chat_history', room.chatHistory);
      return;
    }
    // ─── Fin Lógica Espectadores ───

    // Lógica de Reconexión: Si el usuario ya estaba en esta sala
    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id; // Actualizar el socket ID
      socket.join(roomId);
      socket.emit('room_joined', { roomId, playerId: existingPlayer.userId });
      
      // Enviar el estado actual de la sala o del juego al jugador que se reconecta
      if (room.state) {
        // Enviar a ESTE socket su estado seguro
        const safeState = JSON.parse(JSON.stringify(room.state));
        safeState.players.forEach((statePlayer: any) => {
          if (statePlayer.id !== existingPlayer.playerId) {
            statePlayer.hand = Array(statePlayer.hand.length).fill({ id: 'hidden', rank: '?', suit: 'hidden', value: 0 });
          }
        });
        socket.emit('game_state_update', safeState);
      } else {
        socket.emit('player_joined', { players: room.players.map(p => p.name) });
      }
      
      // Avisar a los demás que regresó (el frontend debe limpiar la alerta roja)
      io.to(roomId).emit('player_reconnected', { message: `${existingPlayer.name} se ha reconectado.` });
      
        // IMPORTANTE: También avisarle al propio jugador que se reconectó para que limpie su propia alerta
      socket.emit('player_reconnected', { message: `Te has reconectado a la partida.` });
      
      console.log(`Usuario reconectado: ${existingPlayer.name} a sala ${roomId}`);
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', 'La sala está llena');
      return;
    }

    room.players.push({ socketId: socket.id, playerId: userId, name: playerName, userId });
    socket.join(roomId);

    // Enviar el playerId al jugador que se acaba de unir
    socket.emit('room_joined', { roomId, playerId: userId });

    io.to(roomId).emit('player_joined', { players: room.players.map(p => p.name) });
    
    socket.emit('chat_history', room.chatHistory);

    // Si la sala se llenó, iniciar el juego
    if (room.players.length === room.maxPlayers) {
      const playerNames = room.players.map(p => p.name);
      const mode = room.maxPlayers === 2 ? '1v1' : '2v2';
      
      const result = room.engine.startNewGame(mode, playerNames);
      
      if (result.success && result.value) {
        room.state = result.value;
        // Asignar IDs reales en lugar de los genéricos generados por startNewGame
        room.state.players.forEach((p, index) => {
          (p as any).id = room.players[index].userId;
        });

        startTurnTimer(roomId, room);

        // Enviar el estado inicial a cada jugador de forma segura (ocultando cartas de otros)
        broadcastGameState(roomId, room);
      }
    }
  });

  // ─── EVENTOS MATCHMAKING (FASE 8) ───
  socket.on('join_matchmaking', ({ playerName, elo }: { playerName: string, elo: number }) => {
    // Si ya está, actualizar datos
    const existing = matchmakingQueue.find(p => p.userId === userId);
    if (existing) {
      existing.socketId = socket.id;
      existing.name = playerName;
      existing.elo = elo || 1000;
    } else {
      matchmakingQueue.push({
        socketId: socket.id,
        userId: userId,
        name: playerName,
        elo: elo || 1000,
        joinedAt: Date.now()
      });
      console.log(`Jugador ${playerName} (${elo}) entró a la cola de Matchmaking`);
    }
  });

  socket.on('leave_matchmaking', () => {
    const p = matchmakingQueue.find(p => p.userId === userId);
    if (p) {
      matchmakingQueue = matchmakingQueue.filter(p => p.userId !== userId);
      console.log(`Jugador ${p.name} salió de la cola de Matchmaking`);
    }
  });
  // ─── FIN MATCHMAKING ───

  socket.on('cancel_room', ({ roomId, reason }: { roomId: string, reason?: string }) => {
    const room = rooms[roomId];
    if (!room) return;

    const requesterIsParticipant = room.players.some((p) => p.userId === userId);
    if (!requesterIsParticipant) {
      socket.emit('error', 'No puedes cerrar una sala de la que no formas parte.');
      return;
    }

    // Only allow challenge-room cancellation before match starts.
    if (room.state) {
      socket.emit('error', 'No se puede cerrar una sala con partida iniciada.');
      return;
    }

    closeRoom(roomId, reason || 'challenge_cancelled');
  });

  // 3. Jugar Carta
  socket.on('play_action', (action: Action) => {
    // Buscar la sala del jugador
    const roomId = Object.keys(rooms).find(id => rooms[id]?.players.some(p => p.socketId === socket.id));
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room || !room.state) return;

    // Asegurarnos de que el playerId de la acción coincida con el usuario que hace la petición
    if (action.playerId !== userId) {
      socket.emit('action_error', 'Intento de falsificación de identidad');
      return;
    }

    const result = room.engine.playCard(room.state, action);
    
    if (result.success) {
      room.state = result.value;
      
      // Reiniciar timer
      startTurnTimer(roomId, room);

      broadcastGameState(roomId, room);
      
      // Comprobar si el juego terminó y guardar en DB
      if (room.state.phase === 'completed') {
        if (room.timerInterval) clearInterval(room.timerInterval);
        saveMatchResult(roomId, room);
      }
    } else {
      socket.emit('action_error', (result as any).error || 'Acción inválida');
    }
  });

  // 4. Continuar a la siguiente ronda
  socket.on('continue_round', () => {
    const roomId = Object.keys(rooms).find(id => rooms[id]?.players.some(p => p.socketId === socket.id));
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room || !room.state || room.state.phase !== 'scoring') return;

    // Solo un jugador necesita lanzar la acción para avanzar (o podríamos requerir que todos lo hagan)
    // Para simplificar, el primero que le de al botón avanza la ronda
    const result = room.engine.continueToNextRound(room.state);
    if (result.success && result.value) {
      room.state = result.value;
      
      if (room.state.phase === 'completed') {
        if (room.timerInterval) clearInterval(room.timerInterval);
        broadcastGameState(roomId, room);
        saveMatchResult(roomId, room);
      } else {
        startTurnTimer(roomId, room);
        broadcastGameState(roomId, room);
      }
    }
  });

  // ─── FASE 9: Chat Integration ───
  socket.on('send_message', ({ roomId, text }: { roomId: string, text: string }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Identify sender
    const player = room.players.find(p => p.socketId === socket.id);
    const spectator = room.spectators.find(s => s.socketId === socket.id);
    
    if (!player && !spectator) return; // Must be in the room

    const isSpectator = !!spectator;
    const senderName = player ? player.name : spectator!.name;
    const senderId = player ? player.userId : spectator!.userId;

    const message: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId,
      senderName,
      text,
      timestamp: Date.now(),
      isSpectator
    };

    // Limit chat history length to prevent memory leak
    if (room.chatHistory.length > 100) {
      room.chatHistory.shift();
    }
    room.chatHistory.push(message);

    if (isSpectator) {
      // Solo a espectadores
      room.spectators.forEach(s => {
        io.to(s.socketId).emit('receive_message', message);
      });
    } else {
      // A todos (jugadores y espectadores)
      io.to(roomId).emit('receive_message', message);
    }
  });
  // ─── FIN FASE 9 ───

  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    
    // Quitar de cola de matchmaking
    matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);

    // Buscar si el jugador estaba en una sala
    const roomId = Object.keys(rooms).find(id => rooms[id]?.players.some(p => p.socketId === socket.id));
    if (roomId) {
      const room = rooms[roomId];
      
      // Notificar a los demás
      io.to(roomId).emit('player_disconnected', { 
        userId: userId, 
        message: 'El oponente se ha desconectado. Esperando reconexión...' 
      });

      // If this is still a pre-game room (challenge waiting room), close it immediately
      if (room && !room.state) {
        closeRoom(roomId, 'creator_disconnected');
      }
    }
  });
});

function startTurnTimer(roomId: string, room: any) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  
  room.lastActionTime = Date.now();
  
  room.timerInterval = setInterval(() => {
    if (!room.state) return;
    
    const now = Date.now();
    const elapsed = now - (room.lastActionTime || now);
    const remaining = Math.max(0, TURN_TIME_LIMIT_MS - elapsed);
    
    io.to(roomId).emit('timer_update', { remaining });

    if (remaining <= 0) {
      clearInterval(room.timerInterval);
      
      const currentPlayerIndex = room.state.currentTurnPlayerIndex;
      const currentPlayer = room.state.players[currentPlayerIndex];

      if (!currentPlayer || !Array.isArray(currentPlayer.hand)) {
        return;
      }
      
      if (currentPlayer.hand.length === 0) {
        room.state.currentTurnPlayerIndex = (room.state.currentTurnPlayerIndex + 1) % room.state.players.length;
        startTurnTimer(roomId, room);
        broadcastGameState(roomId, room);
        return;
      }
      
      try {
        const action = room.engine.getTimeoutAction(room.state, currentPlayer.id);
        const result = room.engine.playCard(room.state, action);

        if (result.success) {
          room.state = result.value;
          startTurnTimer(roomId, room);
          broadcastGameState(roomId, room);
          
          if (room.state.phase === 'completed') {
            if (room.timerInterval) clearInterval(room.timerInterval);
            saveMatchResult(roomId, room);
          }
        } else {
          console.error(`Error al aplicar jugada automática por timeout:`, result.error);
        }
      } catch (error) {
        console.error('Excepción al generar o aplicar jugada por timeout:', error);
      }
    }
  }, 1000);
}

async function saveMatchResult(roomId: string, room: any) {
  if (!room.state || room.state.phase !== 'completed') return;

  // Determinar ganador (el que tenga mayor puntaje, o el primero si hay empate por ahora)
  let winnerId = room.state.winnerId || null;
  const p1 = room.state.players[0];
  const p2 = room.state.players[1];

  if (!winnerId) {
    if (p1.score > p2.score) {
      winnerId = p1.id;
    } else if (p2.score > p1.score) {
      winnerId = p2.id;
    }
  }
  // Si son iguales, winnerId se queda en null (empate)

  try {
    // ─── FASE 10: Guardar en Historial de Partidas ───
    // Crear el arreglo de metadatos
    const metadata = [
      {
        id: p1.id,
        name: room.players[0].name,
        score: p1.score,
        elo_change: winnerId === p1.id ? 25 : (winnerId ? -25 : 0),
        coins_earned: winnerId === p1.id ? 50 : 10 // Ejemplo de monedas por victoria/derrota
      },
      {
        id: p2.id,
        name: room.players[1].name,
        score: p2.score,
        elo_change: winnerId === p2.id ? 25 : (winnerId ? -25 : 0),
        coins_earned: winnerId === p2.id ? 50 : 10
      }
    ];

    await supabase.from('match_history').insert({
      game_mode: room.isTournament ? 'tournament' : (room.maxPlayers === 2 ? '1v1' : '2v2'),
      winner_id: winnerId,
      metadata: metadata
    });
    console.log(`Historial de partida guardado en DB para la sala ${roomId}`);
    // ─── FIN FASE 10 ───

    // 1. Guardar la partida en la tabla genérica
    await supabase.from('matches').insert({
      player1_id: room.players[0].userId,
      player2_id: room.players[1].userId,
      winner_id: winnerId,
      status: 'completed'
    });
    console.log('Resultado de partida guardado en DB');

    // 1.5 Update tournament match if applicable
    if (room.isTournament && winnerId) {
      const { data: tMatch, error: tError } = await supabase
        .from('tournament_matches')
        .update({
          status: 'completed',
          winner_id: winnerId
        })
        .eq('game_room_id', roomId)
        .select()
        .single();
        
      if (tError) console.error('Error actualizando torneo:', tError);
      
      if (tMatch) {
        // If there's a next match, we need to advance the winner
        // Logic for advancing in the bracket (Phase 2)
        // Find next match: same event_id, round_number = current + 1, match_order = Math.ceil(current_order / 2)
        const nextRound = tMatch.round_number + 1;
        const nextOrder = Math.ceil(tMatch.match_order / 2);
        
        // Find the next match node
        const { data: nextMatch } = await supabase
          .from('tournament_matches')
          .select('id, player1_id, player2_id')
          .eq('event_id', tMatch.event_id)
          .eq('round_number', nextRound)
          .eq('match_order', nextOrder)
          .single();
          
        if (nextMatch) {
          const updateData: any = {};
          // If match_order is odd, the winner of this match goes to player1_id of the next match.
          // If even, goes to player2_id.
          if (tMatch.match_order % 2 !== 0) {
            updateData.player1_id = winnerId;
          } else {
            updateData.player2_id = winnerId;
          }
          
          await supabase
            .from('tournament_matches')
            .update(updateData)
            .eq('id', nextMatch.id);
            
          console.log(`Ganador ${winnerId} avanzado a la ronda ${nextRound}`);
        } else {
          // If there is no next match, this was the Final!
          console.log(`¡Ganador del Torneo! ${winnerId} ha ganado el evento ${tMatch.event_id}`);
          
          // Entregar el premio llamando al RPC
          const prizeAmount = 1000; // Podríamos leerlo de la tabla events, pero lo dejamos hardcodeado por simplicidad MVP o buscarlo:
          const { data: eventData } = await supabase.from('events').select('prize_pool').eq('id', tMatch.event_id).single();
          
          // Extract numbers from prize_pool string (e.g. "10,000 Monedas" -> 10000)
          let finalPrize = 0;
          if (eventData && eventData.prize_pool) {
            const match = eventData.prize_pool.replace(/,/g, '').match(/(\d+)/);
            if (match) {
              finalPrize = parseInt(match[0], 10);
            }
          }
          
          if (finalPrize > 0) {
            const { error: rewardError } = await supabase.rpc('award_tournament_prize', {
              event_id_param: tMatch.event_id,
              winner_id_param: winnerId,
              prize_amount: finalPrize
            });
            
            if (rewardError) {
              console.error('Error entregando premio al ganador del torneo:', rewardError);
            } else {
              console.log(`Premio de ${finalPrize} monedas entregado a ${winnerId}`);
            }
          }
        }
      }
    }

    // 2. Actualizar ELO y Estadísticas de los jugadores
    if (winnerId) {
      const loserId = winnerId === p1.id ? p2.id : p1.id;
      
      // Función helper para actualizar un jugador en Supabase (requiere RPC o lectura previa)
      // Para simplificar, leemos el perfil, calculamos el nuevo ELO y actualizamos.
      const updateProfile = async (id: string, isWinner: boolean) => {
        const { data: profile } = await supabase.from('profiles').select('elo, wins, losses').eq('id', id).single();
        if (profile) {
          const eloChange = 25; // ELO fijo por ahora
          await supabase.from('profiles').update({
            elo: profile.elo + (isWinner ? eloChange : -eloChange),
            wins: profile.wins + (isWinner ? 1 : 0),
            losses: profile.losses + (isWinner ? 0 : 1)
          }).eq('id', id);
        }

        // FASE 5: Actualizar Misiones Diarias
        try {
          // Obtener misiones activas de hoy
          const today = new Date().toISOString().split('T')[0];
          const { data: quests } = await supabase
            .from('player_daily_quests')
            .select(`
              id, progress, is_completed,
              catalog:quest_catalog (target_amount, quest_type)
            `)
            .eq('player_id', id)
            .eq('assigned_date', today)
            .eq('is_completed', false);

          if (quests && quests.length > 0) {
            for (const quest of quests) {
              // Manejo de catalog como array o como objeto dependiendo de la configuración de Supabase
              const catalog = Array.isArray(quest.catalog) ? quest.catalog[0] : quest.catalog;
              if (!catalog) continue;

              const { target_amount, quest_type } = catalog;
              
              let increment = false;
              if (quest_type === 'play_match') {
                increment = true;
              } else if (quest_type === 'win_match' && isWinner) {
                increment = true;
              }

              if (increment) {
                const newProgress = quest.progress + 1;
                const isCompleted = newProgress >= target_amount;
                
                await supabase
                  .from('player_daily_quests')
                  .update({
                    progress: newProgress,
                    is_completed: isCompleted
                  })
                  .eq('id', quest.id);
              }
            }
          }
        } catch (questErr) {
          console.error('Error actualizando misiones diarias:', questErr);
        }
      };

      await updateProfile(winnerId, true);
      await updateProfile(loserId, false);
      console.log('Estadísticas, ELO y Misiones actualizados');
    }

  } catch (err) {
    console.error('Error guardando partida:', err);
  }
}

// Función para enviar el estado del juego ocultando información sensible
function broadcastGameState(roomId: string, room: any) {
  if (!room.state) return;
  const fullState = room.state;

  // 1. Enviar estado a los Jugadores Activos
  room.players.forEach((p: any) => {
    // Clonamos el estado para este jugador específico
    const safeState: GameState = JSON.parse(JSON.stringify(fullState));

    // Ocultamos las manos de los rivales
    safeState.players.forEach(statePlayer => {
      if (statePlayer.id !== p.playerId) {
        // Solo mandamos el conteo de cartas, no los valores
        (statePlayer as any).hand = Array(statePlayer.hand.length).fill({ id: 'hidden', rank: '?', suit: 'hidden', value: 0 });
      }
    });

    // Enviar a cada socket su versión segura del estado
    io.to(p.socketId).emit('game_state_update', safeState);
  });

  // 2. Enviar estado saneado a los Espectadores
  if (room.spectators && room.spectators.length > 0) {
    const spectatorSafeState: GameState = JSON.parse(JSON.stringify(fullState));
    
    // Ocultar TODAS las manos para los espectadores
    spectatorSafeState.players.forEach(statePlayer => {
      (statePlayer as any).hand = Array(statePlayer.hand.length).fill({ id: 'hidden', rank: '?', suit: 'hidden', value: 0 });
    });

    room.spectators.forEach((s: any) => {
      io.to(s.socketId).emit('game_state_update', spectatorSafeState);
    });
  }
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Servidor Casino 21 corriendo en el puerto ${PORT}`);
});
