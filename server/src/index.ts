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
import { BOT_USER_ID, BOT_NAMES, BOT_THINK_DELAY_MS, getBotAction } from './bot/bot-player';
import type { BotDifficulty } from './bot/bot-player';

class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private _size = 0;
  readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  get size() { return this._size; }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this._size < this.capacity) {
      this._size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity] as T);
    }
    return result;
  }
}

dotenv.config();

const RULES_VERSION = 'agrupar-merge-2026-04-09';
const EXPOSE_RULES_VERSION = process.env.EXPOSE_RULES_VERSION === 'true';
const ALLOW_INSECURE_JWT_FALLBACK = process.env.ALLOW_INSECURE_JWT_FALLBACK === 'true';
const APP_ENV = process.env.NODE_ENV || 'development';
const startedAt = Date.now();

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
app.set('trust proxy', 1);
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST"] }));
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: APP_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(startedAt).toISOString(),
    rooms: Object.keys(rooms).length,
    matchmakingQueue: matchmakingQueue.length,
    insecureJwtFallback: ALLOW_INSECURE_JWT_FALLBACK,
  });
});

if (EXPOSE_RULES_VERSION) {
  app.get('/rules_version', (_req, res) => {
    res.json({ rulesVersion: RULES_VERSION });
  });
}

const httpServer = createServer(app);

let io: Server;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

if (process.env.NODE_ENV === 'production' || process.env.USE_REDIS_ADAPTER === 'true') {
  const { createAdapter } = require('@socket.io/redis-adapter');
  const { Redis } = require('ioredis');
  const pubClient = new Redis(REDIS_URL);
  const subClient = pubClient.duplicate();
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
    adapter: createAdapter(pubClient, subClient),
    maxHttpBufferSize: 1e5,
    pingInterval: 25000,
    pingTimeout: 20000,
  });
} else {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e5,
    pingInterval: 25000,
    pingTimeout: 20000,
  });
}
function extractUserIdFromTokenPayload(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null;
  return payload.sub || payload.user_id || payload.id || null;
}

// Middleware de Autenticación para Socket.io
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.error('Intento de conexión sin token');
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    // IMPORTANTE: Se usa la API oficial de Supabase para soportar nativamente 
    // tokens asimétricos RS256 (nuevos proyectos de Supabase) o HS256 antiguo, 
    // previniendo el crasheo de "invalid algorithm" de la librería jsonwebtoken.
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw error || new Error("User not found via token");
    }

    (socket as any).user = user;
    (socket as any).userId = user.id;
    next();
  } catch (err: any) {
    console.error('Error verificando token:', err.message);
    if (!ALLOW_INSECURE_JWT_FALLBACK) {
      return next(new Error('Authentication error: Invalid token'));
    }

    // Solo habilitar esta vía de diagnóstico explícitamente fuera de producción.
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
    players: { socketId: string, playerId: string, name: string, userId: string, team?: 1 | 2 }[];
    spectators: { socketId: string, userId: string, name: string }[];
    maxPlayers: number;
    timerInterval?: NodeJS.Timeout;
    lastActionTime?: number;
    isTournament?: boolean;
    chatHistory: RingBuffer<ChatMessage>;
    betAmount?: number;
    prizePool?: number;
    isBot?: boolean;
    botDifficulty?: BotDifficulty;
  }> = {};

const socketToRoomMap = new Map<string, string>();

const actionTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 500;

function isRateLimited(socketId: string): boolean {
  const lastAction = actionTimestamps.get(socketId);
  const now = Date.now();
  if (lastAction && (now - lastAction) < RATE_LIMIT_MS) return true;
  actionTimestamps.set(socketId, now);
  return false;
}

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
          chatHistory: new RingBuffer<ChatMessage>(100)
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
  if (room.timerInterval) clearTimeout(room.timerInterval);
  room.players.forEach(p => socketToRoomMap.delete(p.socketId));
  room.spectators.forEach(s => socketToRoomMap.delete(s.socketId));
  io.to(roomId).emit('room_closed', { roomId, reason });
  io.in(roomId).socketsLeave(roomId);
  delete rooms[roomId];
  console.log(`Sala ${roomId} cerrada. Motivo: ${reason}`);
}

function notifyTournamentPlayers(gameRoomId: string, eventId: string, player1Id?: string, player2Id?: string) {
  const targetIds = new Set([player1Id, player2Id].filter(Boolean));
  if (targetIds.size === 0) return;

  for (const [, room] of Object.entries(rooms)) {
    for (const player of room.players) {
      if (targetIds.has(player.userId)) {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.emit('tournament_ready', {
            gameRoomId,
            eventId
          });
          console.log(`[Torneo] Notificación tournament_ready enviada a ${player.name} (sala ${gameRoomId})`);
        }
      }
    }
  }
}

function scheduleBotTurnIfNeeded(roomId: string, room: any) {
  if (!room.isBot || !room.state) return;

  // ── Scoring phase: auto-continue after a delay ──
  if (room.state.phase === 'scoring') {
    if (room.timerInterval) clearTimeout(room.timerInterval);
    setTimeout(() => {
      if (!rooms[roomId] || !rooms[roomId].state) return;
      if (rooms[roomId].state.phase !== 'scoring') return; // already advanced
      
      const result = rooms[roomId].engine.markPlayerReady(rooms[roomId].state, BOT_USER_ID);
      if (result.success && result.value) {
        rooms[roomId].state = result.value;
        broadcastGameState(roomId, rooms[roomId]);
        
        if (rooms[roomId].state.phase === 'completed') {
          if (rooms[roomId].timerInterval) clearTimeout(rooms[roomId].timerInterval);
          saveMatchResult(roomId, rooms[roomId]);
        } else if (rooms[roomId].state.phase === 'playing') {
          startTurnTimer(roomId, rooms[roomId]);
          scheduleBotTurnIfNeeded(roomId, rooms[roomId]);
        }
      }
    }, BOT_THINK_DELAY_MS * 2); // 3s — let human see the score screen
    return;
  }

  // ── Only play during the 'playing' phase ──
  if (room.state.phase !== 'playing') return;

  const currentPlayer = room.state.players[room.state.currentTurnPlayerIndex];
  if (currentPlayer && currentPlayer.id === BOT_USER_ID) {
    setTimeout(() => {
      if (!rooms[roomId] || !rooms[roomId].state) return;
      if (rooms[roomId].state.phase !== 'playing') return;
      const difficulty: BotDifficulty = rooms[roomId].botDifficulty || 'easy';
      const action = getBotAction(rooms[roomId].engine, rooms[roomId].state, BOT_USER_ID, difficulty);
      if (action) {
        const result = rooms[roomId].engine.playCard(rooms[roomId].state, action);
        if (result.success) {
          rooms[roomId].state = result.value;
          broadcastGameState(roomId, rooms[roomId]);
          if (rooms[roomId].state.phase === 'completed') {
            if (rooms[roomId].timerInterval) clearTimeout(rooms[roomId].timerInterval);
            saveMatchResult(roomId, rooms[roomId]);
          } else if (rooms[roomId].state.phase === 'scoring') {
            if (rooms[roomId].timerInterval) clearTimeout(rooms[roomId].timerInterval);
            scheduleBotTurnIfNeeded(roomId, rooms[roomId]); // triggers auto-continue
          } else {
            startTurnTimer(roomId, rooms[roomId]);
            scheduleBotTurnIfNeeded(roomId, rooms[roomId]);
          }
        }
      }
    }, BOT_THINK_DELAY_MS);
  }
}

io.on('connection', (socket) => {
  const userId = (socket as any).userId || (socket as any).user?.sub;
  console.log(`Usuario autenticado conectado: ${socket.id} (User: ${userId})`);
  if (EXPOSE_RULES_VERSION) {
    socket.emit('rules_version', { rulesVersion: RULES_VERSION });
  }

  // 1. Crear Sala
  socket.on('create_room', (data: { playerName: string, mode: '1v1' | '2v2', betAmount?: number }) => {
    const { playerName, mode, betAmount } = data;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const maxPlayers = mode === '1v1' ? 2 : 4;
    
    rooms[roomId] = {
      engine: new DefaultGameEngine(),
      state: null,
      players: [{ socketId: socket.id, playerId: userId, name: playerName, userId, team: mode === '2v2' ? 1 : undefined }],
      spectators: [],
      maxPlayers,
      chatHistory: new RingBuffer<ChatMessage>(100),
      betAmount: data.betAmount || 0, // Guardar monto de apuesta
      prizePool: 0
    };

    socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);
    socket.emit('room_created', { roomId, playerId: userId, betAmount: rooms[roomId].betAmount, mode });
    console.log(`Sala ${roomId} creada por ${playerName} con apuesta ${rooms[roomId].betAmount}`);
  });

  // 1.5 Crear Sala vs Bot
  socket.on('create_bot_room', (data: { playerName: string, difficulty?: BotDifficulty }) => {
    const { playerName } = data;
    const difficulty: BotDifficulty = data.difficulty || 'easy';
    const botName = BOT_NAMES[difficulty];
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    rooms[roomId] = {
      engine: new DefaultGameEngine(),
      state: null,
      players: [
        { socketId: socket.id, playerId: userId, name: playerName, userId },
        { socketId: 'bot', playerId: BOT_USER_ID, name: botName, userId: BOT_USER_ID }
      ],
      spectators: [],
      maxPlayers: 2,
      chatHistory: new RingBuffer<ChatMessage>(100),
      betAmount: 0,
      prizePool: 0,
      isBot: true,
      botDifficulty: difficulty
    };

    socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);
    socket.emit('room_created', { roomId, playerId: userId, betAmount: 0, mode: '1v1' });

    // Iniciar partida inmediatamente (la sala ya tiene 2 "jugadores")
    const result = rooms[roomId].engine.startNewGame('1v1', [playerName, botName]);
    if (result.success && result.value) {
      rooms[roomId].state = result.value;
      // Asignar IDs reales
      (rooms[roomId].state!.players[0] as any).id = userId;     // Humano
      (rooms[roomId].state!.players[1] as any).id = BOT_USER_ID; // Bot

      startTurnTimer(roomId, rooms[roomId]);
      broadcastGameState(roomId, rooms[roomId]);

      // Si el bot empieza primero, ejecutar su turno
      scheduleBotTurnIfNeeded(roomId, rooms[roomId]);
    }

    console.log(`Sala Bot [${difficulty}] ${roomId} creada por ${playerName}`);
  });

  // 2. Unirse a Sala
  socket.on('join_room', async ({ roomId, playerName, isTournament, isSpectator }: { roomId: string, playerName: string, isTournament?: boolean, isSpectator?: boolean }) => {
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
          chatHistory: new RingBuffer<ChatMessage>(100)
        };
        socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);
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
    socketToRoomMap.set(socket.id, roomId);
      socket.emit('room_joined_as_spectator', { roomId });
      console.log(`Espectador ${playerName} unido a la sala ${roomId}`);

      if (room.state) {
        // Send sanitized state immediately to the new spectator
        const safeState: GameState = JSON.parse(JSON.stringify(room.state));
        safeState.players.forEach(statePlayer => {
          (statePlayer as any).hand = Array.from({ length: statePlayer.hand.length }).map((_, i) => ({ 
            id: `hidden_${i}`, rank: '?', suit: 'hidden', value: 0 
          }));
        });
        socket.emit('game_state_update', safeState);
      }
      
      // Enviar el historial de chat a los espectadores
      socket.emit('chat_history', room.chatHistory.toArray());
      return;
    }
    // ─── Fin Lógica Espectadores ───

    // Lógica de Reconexión: Si el usuario ya estaba en esta sala
    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id; // Actualizar el socket ID
      socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);
      socket.emit('room_joined', { roomId, playerId: existingPlayer.userId });
      
      // Enviar el estado actual de la sala o del juego al jugador que se reconecta
      if (room.state) {
        // Enviar a ESTE socket su estado seguro
        const safeState = JSON.parse(JSON.stringify(room.state));
        safeState.players.forEach((statePlayer: any) => {
          if (statePlayer.id !== existingPlayer.playerId) {
            statePlayer.hand = Array.from({ length: statePlayer.hand.length }).map((_, i) => ({ 
              id: `hidden_${statePlayer.id}_${i}`, rank: '?', suit: 'hidden', value: 0 
            }));
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

    // ─── Validar Saldo para Apuestas ───
    if (room.betAmount && room.betAmount > 0 && !isSpectator) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coins')
          .eq('id', userId)
          .single();
        
        if (!profile || profile.coins < room.betAmount) {
          socket.emit('error', 'No tienes suficientes monedas para entrar a esta sala.');
          return;
        }
      } catch (error) {
        console.error('Error validando saldo:', error);
        socket.emit('error', 'Error al validar tu saldo.');
        return;
      }
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', 'La sala está llena');
      return;
    }

    let assignedTeam: 1 | 2 | undefined = undefined;
    if (room.maxPlayers === 4) {
      const team1Count = room.players.filter(p => p.team === 1).length;
      const team2Count = room.players.filter(p => p.team === 2).length;
      assignedTeam = team1Count <= team2Count ? 1 : 2;
    }

    room.players.push({ socketId: socket.id, playerId: userId, name: playerName, userId, team: assignedTeam });
    socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);

    // Enviar el playerId al jugador que se acaba de unir
    const mode = room.maxPlayers === 2 ? '1v1' : '2v2';
    socket.emit('room_joined', { roomId, playerId: userId, betAmount: room.betAmount, mode });

    // Mandar información completa para enriquecer avatares en el frontend
    io.to(roomId).emit('player_joined', { 
      players: room.players.map(p => p.name),
      playersData: room.players.map((p: any) => ({ id: p.userId, name: p.name, team: p.team }))
    });
    
    socket.emit('chat_history', room.chatHistory.toArray());

    // Si la sala se llenó, iniciar el juego
    if (room.players.length === room.maxPlayers) {
      // ─── FASE 1: SISTEMA DE ESCROW ───
      // Cobrar la apuesta a todos los jugadores ANTES de iniciar la partida
      if (room.betAmount && room.betAmount > 0) {
        let allPaid = true;
        let successfulPayments: string[] = [];
        
        for (const player of room.players) {
          try {
            // Descontar saldo verificando antes
            const { data: profile, error: profileError } = await supabase.from('profiles').select('coins').eq('id', player.userId).single();
            
            if (profileError || !profile) {
              console.error(`[ESCROW] Error obteniendo perfil de ${player.userId}:`, profileError);
              allPaid = false;
              break;
            }

            if (profile.coins < room.betAmount) {
              console.error(`[ESCROW] Saldo insuficiente para ${player.userId}. Tiene ${profile.coins}, necesita ${room.betAmount}`);
              allPaid = false;
              break;
            }

            const { error: updateError } = await supabase.from('profiles')
              .update({ coins: profile.coins - room.betAmount })
              .eq('id', player.userId);
            
            if (updateError) {
              console.error(`[ESCROW] Fallo cobro a ${player.userId}:`, updateError);
              allPaid = false;
              break;
            } else {
              successfulPayments.push(player.userId);
              // Intentar guardar el registro si existe la tabla, pero sin romper si falla
              try {
                await supabase.from('wallet_transactions').insert({
                  player_id: player.userId,
                  amount: -room.betAmount,
                  reason: `Room Escrow: ${roomId}`
                });
              } catch(e) {}
            }
          } catch (e) {
            console.error(`[ESCROW] Exception cobro a ${player.userId}:`, e);
            allPaid = false;
            break;
          }
        }

        if (!allPaid) {
          console.log(`[ESCROW] Fallo masivo en sala ${roomId}. Revirtiendo cobros a:`, successfulPayments);
          // Devolver el dinero a los que sí pagaron antes de que fallara
          for (const userId of successfulPayments) {
            try {
               const { data: p } = await supabase.from('profiles').select('coins').eq('id', userId).single();
               if (p) {
                 await supabase.from('profiles').update({ coins: p.coins + room.betAmount }).eq('id', userId);
                 try {
                   await supabase.from('wallet_transactions').insert({
                     player_id: userId, amount: room.betAmount, reason: `Refund Escrow Failed: ${roomId}`
                   });
                 } catch(e) {}
               }
            } catch(e) {
               console.error(`[ESCROW] CRÍTICO: No se pudo reembolsar a ${userId}`);
            }
          }
          
          io.to(roomId).emit('error', 'Error al procesar las apuestas. Alguien no tiene saldo. La sala se cerrará.');
          closeRoom(roomId, 'escrow_failed');
          return;
        }
        
        room.prizePool = room.betAmount * room.maxPlayers;
        console.log(`[ESCROW] Sala ${roomId} recaudó ${room.prizePool} monedas en total.`);
      }

      const playerNames = room.players.map(p => p.name);
      const mode = room.maxPlayers === 2 ? '1v1' : '2v2';
      
      // En 2v2 ordenar los jugadores por equipo para que el motor del juego asigne correctamente
      if (mode === '2v2') {
        const team1 = room.players.filter(p => p.team === 1);
        const team2 = room.players.filter(p => p.team === 2);
        // Motor espera [Equipo1P1, Equipo2P1, Equipo1P2, Equipo2P2] o similar?
        // Wait, en create2v2PlayersAndTeams (src/domain/team.ts):
        // team1: p1, p3 (indices 0 y 2)
        // team2: p2, p4 (indices 1 y 3)
        room.players = [
          team1[0],
          team2[0],
          team1[1],
          team2[1]
        ].filter(Boolean) as any;
      }
      
      const orderedPlayerNames = room.players.map(p => p.name);
      const result = room.engine.startNewGame(mode, orderedPlayerNames);
      
      if (result.success && result.value) {
        room.state = result.value;
        // Asignar IDs reales en lugar de los genéricos generados por startNewGame
        room.state.players.forEach((p, index) => {
          (p as any).id = room.players[index].userId;
        });

        startTurnTimer(roomId, room);

        // Actualizar status del match de torneo a 'playing'
        if (room.isTournament) {
          supabase.from('tournament_matches')
            .update({ status: 'playing' })
            .eq('game_room_id', roomId)
            .then(({ error }) => {
              if (error) console.warn(`[Torneo] No se pudo actualizar status a playing para ${roomId}:`, error.message);
            });
        }

        // Enviar el estado inicial a cada jugador de forma segura (ocultando cartas de otros)
        broadcastGameState(roomId, room);
      }
    }
  });

  socket.on('switch_team', ({ roomId, team }: { roomId: string, team: 1 | 2 }) => {
    const room = rooms[roomId];
    if (!room || room.state) return; // No se puede cambiar si ya empezó

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const teamCount = room.players.filter(p => p.team === team).length;
    if (teamCount < 2 && player.team !== team) {
      player.team = team;
      io.to(roomId).emit('player_joined', { 
        players: room.players.map(p => p.name),
        playersData: room.players.map((p: any) => ({ id: p.userId, name: p.name, team: p.team }))
      });
    }
  });

  socket.on('request_game_state', ({ roomId }: { roomId: string }) => {
    const room = rooms[roomId];
    if (!room || !room.state) return;

    const isPlayer = room.players?.some((p: any) => p.userId === userId);
    const isSpectator = room.spectators?.some((s: any) => s.userId === userId);
    if (!isPlayer && !isSpectator) return;

    if (isSpectator) {
      const spectatorSafeState: GameState = JSON.parse(JSON.stringify(room.state));
      spectatorSafeState.players.forEach((statePlayer: any) => {
        statePlayer.hand = Array.from({ length: statePlayer.hand.length }).map((_, i) => ({
          id: `hidden_${statePlayer.id}_${i}`, rank: '?', suit: 'hidden', value: 0
        }));
      });
      io.to(socket.id).emit('game_state_update', spectatorSafeState);
      return;
    }

    const playerEntry = room.players.find((p: any) => p.userId === userId);
    const safeState: GameState = JSON.parse(JSON.stringify(room.state));
    safeState.players.forEach((statePlayer: any) => {
      if (statePlayer.id !== playerEntry.playerId) {
        statePlayer.hand = Array.from({ length: statePlayer.hand.length }).map((_, i) => ({
          id: `hidden_${statePlayer.id}_${i}`, rank: '?', suit: 'hidden', value: 0
        }));
      }
    });
    io.to(socket.id).emit('game_state_update', safeState);
  });

  // 3. Cancelar Sala
  socket.on('cancel_room', ({ roomId }: { roomId: string }) => {
    const room = rooms[roomId];
    if (room && room.players[0].socketId === socket.id && !room.state) { // Solo el creador puede cancelarla si no ha empezado
      closeRoom(roomId, 'room_cancelled');
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
    if (isRateLimited(socket.id)) return;
    // Buscar la sala del jugador
    const roomId = socketToRoomMap.get(socket.id);
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
      broadcastGameState(roomId, room);
      
      // Comprobar fase del juego
      if (room.state.phase === 'completed') {
        if (room.timerInterval) clearTimeout(room.timerInterval);
        saveMatchResult(roomId, room);
      } else if (room.state.phase === 'scoring') {
        // No iniciar timer durante scoring — el humano verá el resumen
        if (room.timerInterval) clearTimeout(room.timerInterval);
        // En partidas vs bot, auto-continuar después del delay
        scheduleBotTurnIfNeeded(roomId, room);
      } else {
        startTurnTimer(roomId, room);
        // Si es partida vs bot, verificar si le toca al bot
        scheduleBotTurnIfNeeded(roomId, room);
      }
    } else {
      socket.emit('action_error', (result as any).error || 'Acción inválida');
    }
  });

  // 3.5 Abandono de partida (Abandon Match)
  socket.on('abandon_match', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.state || room.state.phase === 'completed') return;

    const abandonerIndex = room.players.findIndex(p => p.socketId === socket.id);
    if (abandonerIndex === -1) return;

    const abandoner = room.players[abandonerIndex];
    
    // Determinar ganadores según el modo
    let winningTeamOrPlayer: string | undefined;
    if (room.maxPlayers === 4) {
      // 2v2: El equipo contrario al abandonador gana
      winningTeamOrPlayer = abandoner.team === 1 ? 't2' : 't1';
    } else {
      // 1v1: El jugador contrario gana
      const opponent = room.players.find(p => p.userId !== abandoner.userId);
      if (opponent) winningTeamOrPlayer = opponent.userId;
    }

    if (!winningTeamOrPlayer) return;

    room.state = {
      ...room.state,
      phase: 'completed',
      winnerId: winningTeamOrPlayer
    };

    // Save result mapping rewards to winner(s)
    saveMatchResult(roomId, room);

    // Calculate roughly what was earned for the UI broadcast
    const prizePool = room.prizePool || 0;
    const coinsEarned = room.maxPlayers === 4 ? Math.floor(prizePool / 2) : prizePool;
    const eloEarned = 25;

    // Notify room
    io.to(roomId).emit('match_abandoned', {
      winnerId: winningTeamOrPlayer,
      coinsEarned,
      eloEarned
    });
  });

  // 4. Continuar a la siguiente ronda
  socket.on('continue_round', () => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room || !room.state || room.state.phase !== 'scoring') return;

    const result = room.engine.markPlayerReady(room.state, userId);
    if (result.success && result.value) {
      room.state = result.value;
      
      if (room.state.phase === 'completed') {
        if (room.timerInterval) clearTimeout(room.timerInterval);
        broadcastGameState(roomId, room);
        saveMatchResult(roomId, room);
      } else if (room.state.phase === 'playing') {
        startTurnTimer(roomId, room);
        broadcastGameState(roomId, room);
        // Si es partida vs bot, verificar si le toca al bot en la nueva ronda
        scheduleBotTurnIfNeeded(roomId, room);
      } else {
        // Still in scoring phase, just broadcast updated ready state
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
    matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
    const roomId = socketToRoomMap.get(socket.id);
    socketToRoomMap.delete(socket.id);
    actionTimestamps.delete(socket.id);
    if (roomId) {
      const room = rooms[roomId];
      if (!room) return;

      // Verificar si es un espectador que se desconectó
      const spectatorIndex = room.spectators.findIndex(s => s.socketId === socket.id);
      if (spectatorIndex !== -1) {
        room.spectators.splice(spectatorIndex, 1);
        console.log(`Espectador ${socket.id} eliminado de sala ${roomId}`);
        return;
      }

      // Es un jugador — notificar a la sala
      io.to(roomId).emit('player_disconnected', { 
        userId: userId, 
        message: 'El oponente se ha desconectado. Esperando reconexión...' 
      });
      if (!room.state) {
        closeRoom(roomId, 'creator_disconnected');
      }
    }
  });
});

function startTurnTimer(roomId: string, room: any) {
  if (room.timerInterval) clearTimeout(room.timerInterval);
  room.lastActionTime = Date.now();

  room.timerInterval = setTimeout(() => {
    if (!room.state || room.state.phase !== 'playing') return;

    const elapsed = Date.now() - (room.lastActionTime || Date.now());
    const remaining = Math.max(0, TURN_TIME_LIMIT_MS - elapsed);

    if (remaining > 0) {
      startTurnTimer(roomId, room);
      return;
    }

    const currentPlayerIndex = room.state.currentTurnPlayerIndex;
    const currentPlayer = room.state.players[currentPlayerIndex];
    if (!currentPlayer || !Array.isArray(currentPlayer.hand)) return;

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
        if (room.state.phase === 'completed') {
          saveMatchResult(roomId, room);
        } else {
          startTurnTimer(roomId, room);
          scheduleBotTurnIfNeeded(roomId, room);
        }
        broadcastGameState(roomId, room);
      } else {
        console.error(`Error al aplicar jugada automática por timeout:`, result.error);
      }
    } catch (error) {
      console.error('Excepción al generar o aplicar jugada por timeout:', error);
    }
  }, TURN_TIME_LIMIT_MS);
}

async function saveMatchResult(roomId: string, room: any) {
  if (!room.state || room.state.phase !== 'completed') return;
  if (room.isResultSaved) {
    console.log(`[MatchResult] Partida ${roomId} ya fue guardada previamente. Ignorando.`);
    return;
  }
  room.isResultSaved = true;

  // Partidas vs bot: otorgar XP reducido al humano pero NO afectan ELO ni historial
  if (room.isBot) {
    const humanPlayer = room.players.find((p: any) => p.userId !== BOT_USER_ID);
    if (humanPlayer) {
      const humanState = room.state.players.find((p: any) => p.id === humanPlayer.userId);
      const botState   = room.state.players.find((p: any) => p.id === BOT_USER_ID);
      const humanWon   = room.state.winnerId === humanPlayer.userId ||
                         (!room.state.winnerId && humanState && botState && humanState.score > botState.score);
      const xpGain = humanWon ? 20 : 5;
      const { error: xpErr } = await supabase.rpc('add_player_xp', { p_player_id: humanPlayer.userId, p_xp: xpGain });
      if (xpErr) console.error('Error otorgando XP (bot):', xpErr);
      else console.log(`XP vs Bot: +${xpGain} XP → ${humanPlayer.name}`);
    }
    console.log(`Partida vs Bot ${roomId} finalizada — ELO e historial no se guardan`);
    return;
  }

  let winnerId = room.state.winnerId || null;

  // Si no hay winnerId claro, calcular por puntuación
  if (!winnerId) {
    if (room.maxPlayers === 4) {
      // Calcular puntuación por equipo en 2v2
      const t1Score = room.state.teams?.find((t: any) => t.id === 't1')?.score || 0;
      const t2Score = room.state.teams?.find((t: any) => t.id === 't2')?.score || 0;
      if (t1Score > t2Score) winnerId = 't1';
      else if (t2Score > t1Score) winnerId = 't2';
    } else {
      const p1 = room.state.players[0];
      const p2 = room.state.players[1];
      if (p1.score > p2.score) winnerId = p1.id;
      else if (p2.score > p1.score) winnerId = p2.id;
    }
  }

  try {
    const prizePool = room.prizePool || 0;
    const isTournament = !!room.isTournament;
    const mode = room.maxPlayers === 2 ? '1v1' : '2v2';
    
    const ELO_WIN = 25;
    const ELO_LOSS = -25;
    const XP_WIN = 50;
    const XP_LOSS = 15;

    const playersData = [];

    for (let i = 0; i < room.players.length; i++) {
      const playerInfo = room.players[i];
      const playerState = room.state.players.find((p: any) => p.id === playerInfo.userId);
      
      let isWinner = false;
      if (mode === '2v2') {
        const teamId = playerInfo.team === 1 ? 't1' : 't2';
        isWinner = winnerId === teamId;
      } else {
        isWinner = winnerId === playerInfo.userId;
      }

      let coinsEarned = 0;
      if (prizePool > 0 && isWinner) {
        coinsEarned = mode === '2v2' ? Math.floor(prizePool / 2) : prizePool;
      }

      playersData.push({
        id: playerInfo.userId,
        name: playerInfo.name,
        score: playerState?.score || 0,
        is_winner: isWinner,
        elo_change: isWinner ? ELO_WIN : ELO_LOSS,
        coins_earned: coinsEarned,
        xp_gained: isWinner ? XP_WIN : XP_LOSS
      });
    }

    console.log(`[MatchResult] Sala ${roomId}: ${playersData.length} jugadores, winnerId=${winnerId}`);

    // Fix #3: Asegurar que todos los jugadores tengan quests asignadas ANTES del RPC
    for (const pd of playersData) {
      try {
        await supabase.rpc('assign_daily_quests', { p_player_id: pd.id });
      } catch (questAssignErr) {
        console.warn(`[MatchResult] Error asignando quests a ${pd.id}:`, questAssignErr);
      }
    }

    // Validar winner_id para evitar error de UUID en equipos (t1, t2)
    const dbWinnerId = (mode === '2v2' && (winnerId === 't1' || winnerId === 't2')) ? null : winnerId;

    // Procesar todos los resultados de forma atómica en una sola llamada RPC
    const { error: atomicError } = await supabase.rpc('process_match_results', {
      p_room_id: roomId,
      p_game_mode: mode,
      p_winner_id: dbWinnerId,
      p_is_tournament: isTournament,
      p_players_data: playersData
    });

    if (atomicError) {
      console.error(`[MatchResult] Error guardando resultados atómicos de la sala ${roomId}:`, atomicError);
    } else {
      console.log(`[MatchResult] Resultados procesados y guardados en DB para la sala ${roomId}`);

      // Fix #2: Notificar a cada jugador que sus stats fueron actualizados en DB
      // El frontend escuchará este evento para refrescar el perfil con datos reales
      for (const pd of playersData) {
        const playerInRoom = room.players.find((p: any) => p.userId === pd.id);
        if (playerInRoom) {
          const playerSocket = io.sockets.sockets.get(playerInRoom.socketId);
          if (playerSocket) {
            playerSocket.emit('stats_updated', {
              playerId: pd.id,
              eloChange: pd.elo_change,
              coinsEarned: pd.coins_earned,
              xpGained: pd.xp_gained,
              isWinner: pd.is_winner
            });
          }
        }
      }
    }

    // Si es torneo, avanzar llave
    if (isTournament && winnerId) {
      console.log(`[Torneo] Procesando avance de torneo para la sala ${roomId}. Ganador: ${winnerId}`);
      const { data: matchData, error: matchError } = await supabase
        .from('tournament_matches')
        .select('id, event_id, round_number, match_order, status')
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

      // Calcular siguiente match usando round_number + match_order (igual que AdminPanel)
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
        // Asignar ganador al slot correcto (órdenes impares → player1, pares → player2)
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

        // Si el siguiente match ya tiene ambos jugadores, notificar
        const filledSlot = matchData.match_order % 2 !== 0 ? 'player1_id' : 'player2_id';
        const otherSlot = filledSlot === 'player1_id' ? 'player2_id' : 'player1_id';

        if (nextMatch[otherSlot]) {
          const p1Id = filledSlot === 'player1_id' ? winnerId : nextMatch[otherSlot];
          const p2Id = filledSlot === 'player2_id' ? winnerId : nextMatch[otherSlot];
          notifyTournamentPlayers(nextMatch.game_room_id, matchData.event_id, p1Id, p2Id);
        }
      } else {
        // No hay siguiente ronda → final del torneo, entregar premio
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
    }

  } catch (error) {
    console.error('Error general guardando resultado de partida:', error);
  }
}

function broadcastGameState(roomId: string, room: any) {
  if (!room.state) return;
  const fullState = room.state;

  room.players.forEach((p: any) => {
    const safeState = Object.assign({}, fullState, {
      players: fullState.players.map((sp: any) => {
        if (sp.id === p.playerId) return sp;
        return Object.assign({}, sp, {
          hand: sp.hand.map((_: any, i: number) => ({
            id: `hidden_${sp.id}_${i}`, rank: '?', suit: 'hidden', value: 0
          }))
        });
      })
    });
    io.to(p.socketId).emit('game_state_update', safeState);
  });

  if (room.spectators && room.spectators.length > 0) {
    const spectatorSafeState = Object.assign({}, fullState, {
      players: fullState.players.map((sp: any) => Object.assign({}, sp, {
        hand: sp.hand.map((_: any, i: number) => ({
          id: `hidden_${sp.id}_${i}`, rank: '?', suit: 'hidden', value: 0
        }))
      }))
    });
    room.spectators.forEach((s: any) => {
      io.to(s.socketId).emit('game_state_update', spectatorSafeState);
    });
  }
}

const CLUSTER_PORT = process.env.NODE_APP_INSTANCE
  ? parseInt(process.env.PORT || '4000', 10) + parseInt(process.env.NODE_APP_INSTANCE, 10)
  : parseInt(process.env.PORT || '4000', 10);
httpServer.listen(CLUSTER_PORT, () => {
  console.log(`Servidor Casino 21 corriendo en el puerto ${CLUSTER_PORT}`);
});
