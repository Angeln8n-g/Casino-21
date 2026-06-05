import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { DefaultGameEngine } from './application/game-engine';
import { processTournamentAdvancement, handleTournamentFinal, notifyTournamentPlayers } from './tournament-service';
import { GameState } from './domain/game-state';
import { Action } from './application/action-validator';
import dotenv from 'dotenv';
import { supabase } from './supabase';
import { BOT_USER_ID, BOT_NAMES, BOT_THINK_DELAY_MS, getBotAction } from './bot/bot-player';
import type { BotDifficulty } from './bot/bot-player';
import { Redis } from 'ioredis';
import { RoomStore, RingBuffer, ChatMessage, Room } from './room-store';
import { MatchmakingStore, MatchmakingPlayer } from './matchmaking-store';

dotenv.config();

const RULES_VERSION = 'agrupar-merge-2026-04-09';
const EXPOSE_RULES_VERSION = process.env.EXPOSE_RULES_VERSION === 'true';
const ALLOW_INSECURE_JWT_FALLBACK = process.env.ALLOW_INSECURE_JWT_FALLBACK === 'true';
const APP_ENV = process.env.NODE_ENV || 'development';
const startedAt = Date.now();

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST"] }));
app.get('/health', async (_req, res) => {
  try {
    const globalRooms = await roomStore.getGlobalRoomCount();
    const queueLen = await matchmakingStore.getSize();
    res.status(200).json({
      status: 'ok',
      environment: APP_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: new Date(startedAt).toISOString(),
      rooms: roomStore.getLocalRoomCount(),
      roomsGlobal: globalRooms,
      matchmakingQueue: queueLen,
      insecureJwtFallback: ALLOW_INSECURE_JWT_FALLBACK,
      instanceId: roomStore.getInstanceId(),
    });
  } catch {
    res.status(200).json({
      status: 'ok',
      environment: APP_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: new Date(startedAt).toISOString(),
      rooms: roomStore.getLocalRoomCount(),
      matchmakingQueue: 0,
      insecureJwtFallback: ALLOW_INSECURE_JWT_FALLBACK,
    });
  }
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

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.error('Intento de conexión sin token');
    return next(new Error('Authentication error: Token missing'));
  }

  try {
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

const roomStore = new RoomStore();
const matchmakingStore = new MatchmakingStore();

const socketToRoomMap = new Map<string, string>();
const roomTimers = new Map<string, NodeJS.Timeout>();

const joinPub = new Redis(REDIS_URL);
const joinSub = new Redis(REDIS_URL);
joinSub.subscribe('cs21:join-room');
joinSub.on('message', (channel, message) => {
  if (channel === 'cs21:join-room') {
    try {
      const { socketId, roomId } = JSON.parse(message);
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(roomId);
        socketToRoomMap.set(socket.id, roomId);
      }
    } catch {}
  }
});

const actionTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 500;

function isRateLimited(socketId: string): boolean {
  const lastAction = actionTimestamps.get(socketId);
  const now = Date.now();
  if (lastAction && (now - lastAction) < RATE_LIMIT_MS) return true;
  actionTimestamps.set(socketId, now);
  return false;
}

const TURN_TIME_LIMIT_MS = 30000;

async function persistRoom(roomId: string, room: Room): Promise<void> {
  await roomStore.set(roomId, room);
}

async function closeRoom(roomId: string, reason: string = 'room_closed') {
  const room = await roomStore.get(roomId);
  if (!room) return;

  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomId);
  }

  room.players.forEach(p => socketToRoomMap.delete(p.socketId));
  room.spectators.forEach(s => socketToRoomMap.delete(s.socketId));
  io.to(roomId).emit('room_closed', { roomId, reason });
  io.in(roomId).socketsLeave(roomId);
  await roomStore.delete(roomId);
  console.log(`Sala ${roomId} cerrada. Motivo: ${reason}`);
}

async function scheduleBotTurnIfNeeded(roomId: string, room: Room) {
  if (!room.isBot || !room.state) return;

  if (room.state.phase === 'scoring') {
    const existingTimer = roomTimers.get(roomId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      const currentRoom = await roomStore.get(roomId);
      if (!currentRoom || !currentRoom.state) return;
      if (currentRoom.state.phase !== 'scoring') return;

      const result = currentRoom.engine.markPlayerReady(currentRoom.state, BOT_USER_ID);
      if (result.success && result.value) {
        currentRoom.state = result.value;
        await persistRoom(roomId, currentRoom);
        broadcastGameState(roomId, currentRoom);

        if (currentRoom.state.phase === 'completed') {
          const t = roomTimers.get(roomId);
          if (t) { clearTimeout(t); roomTimers.delete(roomId); }
          saveMatchResult(roomId, currentRoom);
        } else if (currentRoom.state.phase === 'playing') {
          startTurnTimer(roomId, currentRoom);
          scheduleBotTurnIfNeeded(roomId, currentRoom);
        }
      }
    }, BOT_THINK_DELAY_MS * 2);

    roomTimers.set(roomId, timer);
    return;
  }

  if (room.state.phase !== 'playing') return;

  const currentPlayer = room.state.players[room.state.currentTurnPlayerIndex];
  if (currentPlayer && currentPlayer.id === BOT_USER_ID) {
    const timer = setTimeout(async () => {
      const currentRoom = await roomStore.get(roomId);
      if (!currentRoom || !currentRoom.state) return;
      if (currentRoom.state.phase !== 'playing') return;
      const difficulty: BotDifficulty = currentRoom.botDifficulty || 'easy';
      const action = getBotAction(currentRoom.engine, currentRoom.state, BOT_USER_ID, difficulty);
      if (action) {
        const result = currentRoom.engine.playCard(currentRoom.state, action);
        if (result.success) {
          currentRoom.state = result.value;
          await persistRoom(roomId, currentRoom);
          broadcastGameState(roomId, currentRoom);
          if (currentRoom.state.phase === 'completed') {
            const t = roomTimers.get(roomId);
            if (t) { clearTimeout(t); roomTimers.delete(roomId); }
            saveMatchResult(roomId, currentRoom);
          } else if (currentRoom.state.phase === 'scoring') {
            const t = roomTimers.get(roomId);
            if (t) { clearTimeout(t); roomTimers.delete(roomId); }
            scheduleBotTurnIfNeeded(roomId, currentRoom);
          } else {
            startTurnTimer(roomId, currentRoom);
            scheduleBotTurnIfNeeded(roomId, currentRoom);
          }
        }
      }
    }, BOT_THINK_DELAY_MS);

    roomTimers.set(roomId, timer);
  }
}

// ─── Matchmaking Queue (Redis-backed) ───
setInterval(async () => {
  const locked = await matchmakingStore.tryAcquireLock();
  if (!locked) return;

  try {
    const players = await matchmakingStore.getAllPlayers();
    if (players.length < 2) return;

    players.sort((a, b) => a.joinedAt - b.joinedAt);
    const matched = new Set<string>();

    for (let i = 0; i < players.length; i++) {
      const p1 = players[i];
      if (matched.has(p1.userId)) continue;

      const waitTimeP1 = Date.now() - p1.joinedAt;
      const toleranceP1 = 50 + Math.min(Math.floor(waitTimeP1 / 5000) * 50, 500);

      for (let j = i + 1; j < players.length; j++) {
        const p2 = players[j];
        if (matched.has(p2.userId)) continue;

        const waitTimeP2 = Date.now() - p2.joinedAt;
        const toleranceP2 = 50 + Math.min(Math.floor(waitTimeP2 / 5000) * 50, 500);

        const eloDiff = Math.abs(p1.elo - p2.elo);

        if (eloDiff <= Math.max(toleranceP1, toleranceP2)) {
          matched.add(p1.userId);
          matched.add(p2.userId);

          const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
          const room: Room = {
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

          await persistRoom(roomId, room);

          await joinPub.publish('cs21:join-room', JSON.stringify({ socketId: p1.socketId, roomId }));
          await joinPub.publish('cs21:join-room', JSON.stringify({ socketId: p2.socketId, roomId }));

          console.log(`¡Matchmaking exitoso! ${p1.name} (${p1.elo}) vs ${p2.name} (${p2.elo}) -> Sala ${roomId}`);

          const matchFoundPayload = {
            roomId,
            players: [
              { id: p1.userId, name: p1.name, elo: p1.elo },
              { id: p2.userId, name: p2.name, elo: p2.elo }
            ]
          };

          io.to(p1.socketId).emit('match_found', matchFoundPayload);
          io.to(p2.socketId).emit('match_found', matchFoundPayload);

          setTimeout(async () => {
            const room = await roomStore.get(roomId);
            if (!room) return;
            const result = room.engine.startNewGame('1v1', [p1.name, p2.name]);
            if (result.success && result.value) {
              room.state = result.value;
              room.state.players.forEach((p, index) => {
                (p as any).id = room.players[index].userId;
              });
              await persistRoom(roomId, room);
              startTurnTimer(roomId, room);
              broadcastGameState(roomId, room);
            }
          }, 3000);

          break;
        }
      }
    }

    if (matched.size > 0) {
      await matchmakingStore.removePlayers(Array.from(matched));
    }
  } finally {
    await matchmakingStore.releaseLock();
  }
}, 3000);
// ─── FIN Matchmaking Queue ───

io.on('connection', (socket) => {
  const userId = (socket as any).userId || (socket as any).user?.sub;
  console.log(`Usuario autenticado conectado: ${socket.id} (User: ${userId})`);
  if (EXPOSE_RULES_VERSION) {
    socket.emit('rules_version', { rulesVersion: RULES_VERSION });
  }

  socket.on('create_room', async (data: { playerName: string, mode: '1v1' | '2v2', betAmount?: number }) => {
    const { playerName, mode } = data;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const maxPlayers = mode === '1v1' ? 2 : 4;
    const betAmount = data.betAmount || 0;

    const room: Room = {
      engine: new DefaultGameEngine(),
      state: null,
      players: [{ socketId: socket.id, playerId: userId, name: playerName, userId, team: mode === '2v2' ? 1 : undefined }],
      spectators: [],
      maxPlayers,
      chatHistory: new RingBuffer<ChatMessage>(100),
      betAmount,
      prizePool: 0
    };

    await persistRoom(roomId, room);

    socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);
    socket.emit('room_created', { roomId, playerId: userId, betAmount, mode });
    console.log(`Sala ${roomId} creada por ${playerName} con apuesta ${betAmount}`);
  });

  socket.on('create_bot_room', async (data: { playerName: string, difficulty?: BotDifficulty }) => {
    const { playerName } = data;
    const difficulty: BotDifficulty = data.difficulty || 'easy';
    const botName = BOT_NAMES[difficulty];
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const room: Room = {
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

    await persistRoom(roomId, room);

    socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);
    socket.emit('room_created', { roomId, playerId: userId, betAmount: 0, mode: '1v1' });

    const result = room.engine.startNewGame('1v1', [playerName, botName]);
    if (result.success && result.value) {
      room.state = result.value;
      (room.state!.players[0] as any).id = userId;
      (room.state!.players[1] as any).id = BOT_USER_ID;

      await persistRoom(roomId, room);

      startTurnTimer(roomId, room);
      broadcastGameState(roomId, room);
      scheduleBotTurnIfNeeded(roomId, room);
    }

    console.log(`Sala Bot [${difficulty}] ${roomId} creada por ${playerName}`);
  });

  socket.on('send_challenge', async (data: { receiverId: string, playerName: string, betAmount?: number }) => {
    const { receiverId, playerName, betAmount = 0 } = data;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const room: Room = {
      engine: new DefaultGameEngine(),
      state: null,
      players: [{ socketId: socket.id, playerId: userId, name: playerName, userId }],
      spectators: [],
      maxPlayers: 2,
      chatHistory: new RingBuffer<ChatMessage>(100),
      betAmount,
      prizePool: 0
    };

    await persistRoom(roomId, room);

    socket.join(roomId);
    socketToRoomMap.set(socket.id, roomId);

    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const { data: invitation, error: invError } = await supabase
      .from('game_invitations')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        room_id: roomId,
        bet_amount: betAmount,
        status: 'pending',
        expires_at: expiresAt
      })
      .select('id')
      .single();

    if (invError || !invitation) {
      console.error('Error creando game_invitation:', invError);
      await roomStore.delete(roomId);
      socket.emit('error', 'Error al crear el desafío');
      return;
    }

    const betText = betAmount > 0 ? ` por ${betAmount} 🪙` : '';
    const { error: notifError } = await supabase.rpc('create_notification', {
      p_player_id: receiverId,
      p_type: 'game_invitation',
      p_content: `¡${playerName} te ha desafiado${betText}!`,
      p_metadata: JSON.stringify({
        sender_id: userId,
        sender_name: playerName,
        invitation_id: invitation.id,
        room_id: roomId,
        bet_amount: betAmount,
        expires_at: expiresAt
      })
    });

    if (notifError) {
      console.error('Error creando notificación:', notifError);
    }

    socket.emit('room_created', {
      roomId,
      playerId: userId,
      betAmount,
      mode: '1v1'
    });

    socket.emit('challenge_sent', {
      roomId,
      invitationId: invitation.id,
      receiverId
    });
    console.log(`Desafío ${roomId} enviado por ${playerName} a ${receiverId}`);
  });

  socket.on('join_room', async ({ roomId, playerName, isTournament, isSpectator }: { roomId: string, playerName: string, isTournament?: boolean, isSpectator?: boolean }) => {
    let room = await roomStore.get(roomId);

    if (!room) {
      if (isTournament && !isSpectator) {
        const newRoom: Room = {
          engine: new DefaultGameEngine(),
          state: null,
          players: [{ socketId: socket.id, playerId: userId, name: playerName, userId }],
          spectators: [],
          maxPlayers: 2,
          isTournament: true,
          chatHistory: new RingBuffer<ChatMessage>(100)
        };
        await persistRoom(roomId, newRoom);
        room = newRoom;

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

      await persistRoom(roomId, room);

      if (room.state) {
        const safeState: GameState = JSON.parse(JSON.stringify(room.state));
        safeState.players.forEach(statePlayer => {
          (statePlayer as any).hand = Array.from({ length: statePlayer.hand.length }).map((_, i) => ({
            id: `hidden_${i}`, rank: '?', suit: 'hidden', value: 0
          }));
        });
        socket.emit('game_state_update', safeState);
      }

      socket.emit('chat_history', room.chatHistory.toArray());
      return;
    }

    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      socket.join(roomId);
      socketToRoomMap.set(socket.id, roomId);
      socket.emit('room_joined', { roomId, playerId: existingPlayer.userId });

      await persistRoom(roomId, room);

      if (room.state) {
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

      io.to(roomId).emit('player_reconnected', { message: `${existingPlayer.name} se ha reconectado.` });
      socket.emit('player_reconnected', { message: `Te has reconectado a la partida.` });

      console.log(`Usuario reconectado: ${existingPlayer.name} a sala ${roomId}`);
      return;
    }

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

    const mode = room.maxPlayers === 2 ? '1v1' : '2v2';
    socket.emit('room_joined', { roomId, playerId: userId, betAmount: room.betAmount, mode });

    io.to(roomId).emit('player_joined', {
      players: room.players.map(p => p.name),
      playersData: room.players.map((p: any) => ({ id: p.userId, name: p.name, team: p.team }))
    });

    socket.emit('chat_history', room.chatHistory.toArray());

    if (room.players.length === room.maxPlayers) {
      if (room.betAmount && room.betAmount > 0) {
        let allPaid = true;
        let successfulPayments: string[] = [];

        for (const player of room.players) {
          try {
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
          for (const uid of successfulPayments) {
            try {
               const { data: p } = await supabase.from('profiles').select('coins').eq('id', uid).single();
               if (p) {
                 await supabase.from('profiles').update({ coins: p.coins + room.betAmount }).eq('id', uid);
                 try {
                   await supabase.from('wallet_transactions').insert({
                     player_id: uid, amount: room.betAmount, reason: `Refund Escrow Failed: ${roomId}`
                   });
                 } catch(e) {}
               }
            } catch(e) {
               console.error(`[ESCROW] CRÍTICO: No se pudo reembolsar a ${uid}`);
            }
          }

          io.to(roomId).emit('error', 'Error al procesar las apuestas. Alguien no tiene saldo. La sala se cerrará.');
          await persistRoom(roomId, room);
          await closeRoom(roomId, 'escrow_failed');
          return;
        }

        room.prizePool = room.betAmount * room.maxPlayers;
        console.log(`[ESCROW] Sala ${roomId} recaudó ${room.prizePool} monedas en total.`);
      }

      const playerNames = room.players.map(p => p.name);
      const gameMode = room.maxPlayers === 2 ? '1v1' : '2v2';

      if (gameMode === '2v2') {
        const team1 = room.players.filter(p => p.team === 1);
        const team2 = room.players.filter(p => p.team === 2);
        room.players = [
          team1[0],
          team2[0],
          team1[1],
          team2[1]
        ].filter(Boolean) as any;
      }

      const orderedPlayerNames = room.players.map(p => p.name);
      const result = room.engine.startNewGame(gameMode, orderedPlayerNames);

      if (result.success && result.value) {
        room.state = result.value;
        room.state.players.forEach((p, index) => {
          (p as any).id = room.players[index].userId;
        });

        await persistRoom(roomId, room);

        startTurnTimer(roomId, room);

        if (room.isTournament) {
          supabase.from('tournament_matches')
            .update({ status: 'playing' })
            .eq('game_room_id', roomId)
            .then(({ error }) => {
              if (error) console.warn(`[Torneo] No se pudo actualizar status a playing para ${roomId}:`, error.message);
            });
        }

        broadcastGameState(roomId, room);
      }
    } else {
      await persistRoom(roomId, room);
    }
  });

  socket.on('switch_team', async ({ roomId, team }: { roomId: string, team: 1 | 2 }) => {
    const room = await roomStore.get(roomId);
    if (!room || room.state) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const teamCount = room.players.filter(p => p.team === team).length;
    if (teamCount < 2 && player.team !== team) {
      player.team = team;
      await persistRoom(roomId, room);
      io.to(roomId).emit('player_joined', {
        players: room.players.map(p => p.name),
        playersData: room.players.map((p: any) => ({ id: p.userId, name: p.name, team: p.team }))
      });
    }
  });

  socket.on('request_game_state', async ({ roomId }: { roomId: string }) => {
    const room = await roomStore.get(roomId);
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

  socket.on('cancel_room', async ({ roomId, reason }: { roomId: string, reason?: string }) => {
    const room = await roomStore.get(roomId);
    if (!room) return;

    const requesterIsParticipant = room.players.some((p) => p.userId === userId);
    if (!requesterIsParticipant) {
      socket.emit('error', 'No puedes cerrar una sala de la que no formas parte.');
      return;
    }

    if (room.state) {
      socket.emit('error', 'No se puede cerrar una sala con partida iniciada.');
      return;
    }

    await closeRoom(roomId, reason || 'challenge_cancelled');
  });

  socket.on('join_matchmaking', async ({ playerName, elo }: { playerName: string, elo: number }) => {
    const existing = await matchmakingStore.getPlayer(userId);
    await matchmakingStore.addPlayer({
      socketId: socket.id,
      userId: userId,
      name: playerName,
      elo: elo || 1000,
      joinedAt: existing?.joinedAt ?? Date.now()
    });
    console.log(`Jugador ${playerName} (${elo}) entró a la cola de Matchmaking`);
  });

  socket.on('leave_matchmaking', async () => {
    const p = await matchmakingStore.getPlayer(userId);
    if (p) {
      await matchmakingStore.removePlayer(userId);
      console.log(`Jugador ${p.name} salió de la cola de Matchmaking`);
    }
  });

  socket.on('play_action', async (action: Action) => {
    if (isRateLimited(socket.id)) return;
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return;
    const room = await roomStore.get(roomId);
    if (!room || !room.state) return;

    if (action.playerId !== userId) {
      socket.emit('action_error', 'Intento de falsificación de identidad');
      return;
    }

    const result = room.engine.playCard(room.state, action);

    if (result.success) {
      room.state = result.value;
      await persistRoom(roomId, room);
      broadcastGameState(roomId, room);

      if (room.state.phase === 'completed') {
        const timer = roomTimers.get(roomId);
        if (timer) { clearTimeout(timer); roomTimers.delete(roomId); }
        saveMatchResult(roomId, room);
      } else if (room.state.phase === 'scoring') {
        const timer = roomTimers.get(roomId);
        if (timer) { clearTimeout(timer); roomTimers.delete(roomId); }
        scheduleBotTurnIfNeeded(roomId, room);
      } else {
        startTurnTimer(roomId, room);
        scheduleBotTurnIfNeeded(roomId, room);
      }
    } else {
      socket.emit('action_error', (result as any).error || 'Acción inválida');
    }
  });

  socket.on('abandon_match', async ({ roomId }) => {
    const room = await roomStore.get(roomId);
    if (!room || !room.state || room.state.phase === 'completed') return;

    const abandonerIndex = room.players.findIndex(p => p.socketId === socket.id);
    if (abandonerIndex === -1) return;

    const abandoner = room.players[abandonerIndex];

    let winningTeamOrPlayer: string | undefined;
    if (room.maxPlayers === 4) {
      winningTeamOrPlayer = abandoner.team === 1 ? 't2' : 't1';
    } else {
      const opponent = room.players.find(p => p.userId !== abandoner.userId);
      if (opponent) winningTeamOrPlayer = opponent.userId;
    }

    if (!winningTeamOrPlayer) return;

    room.state = {
      ...room.state,
      phase: 'completed',
      winnerId: winningTeamOrPlayer
    };

    await persistRoom(roomId, room);

    saveMatchResult(roomId, room);

    const prizePool = room.prizePool || 0;
    const coinsEarned = room.maxPlayers === 4 ? Math.floor(prizePool / 2) : prizePool;
    const eloEarned = 25;

    io.to(roomId).emit('match_abandoned', {
      winnerId: winningTeamOrPlayer,
      coinsEarned,
      eloEarned
    });
  });

  socket.on('continue_round', async () => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return;
    const room = await roomStore.get(roomId);
    if (!room || !room.state || room.state.phase !== 'scoring') return;

    const result = room.engine.markPlayerReady(room.state, userId);
    if (result.success && result.value) {
      room.state = result.value;
      await persistRoom(roomId, room);

      if (room.state.phase === 'completed') {
        const timer = roomTimers.get(roomId);
        if (timer) { clearTimeout(timer); roomTimers.delete(roomId); }
        broadcastGameState(roomId, room);
        saveMatchResult(roomId, room);
      } else if (room.state.phase === 'playing') {
        startTurnTimer(roomId, room);
        broadcastGameState(roomId, room);
        scheduleBotTurnIfNeeded(roomId, room);
      } else {
        broadcastGameState(roomId, room);
      }
    }
  });

  socket.on('send_message', async ({ roomId, text }: { roomId: string, text: string }) => {
    const room = await roomStore.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    const spectator = room.spectators.find(s => s.socketId === socket.id);

    if (!player && !spectator) return;

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
    await persistRoom(roomId, room);

    if (isSpectator) {
      room.spectators.forEach(s => {
        io.to(s.socketId).emit('receive_message', message);
      });
    } else {
      io.to(roomId).emit('receive_message', message);
    }
  });

  socket.on('request_timer', async () => {
    const roomId = socketToRoomMap.get(socket.id);
    if (!roomId) return;
    const room = await roomStore.get(roomId);
    if (!room?.lastActionTime) return;
    const remaining = Math.max(0, TURN_TIME_LIMIT_MS - (Date.now() - room.lastActionTime));
    io.to(socket.id).emit('timer_update', { remaining });
  });

  socket.on('disconnect', async () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    await matchmakingStore.removePlayer(userId);
    const roomId = socketToRoomMap.get(socket.id);
    socketToRoomMap.delete(socket.id);
    actionTimestamps.delete(socket.id);
    if (roomId) {
      const room = await roomStore.get(roomId);
      if (!room) return;

      const spectatorIndex = room.spectators.findIndex(s => s.socketId === socket.id);
      if (spectatorIndex !== -1) {
        room.spectators.splice(spectatorIndex, 1);
        await persistRoom(roomId, room);
        console.log(`Espectador ${socket.id} eliminado de sala ${roomId}`);
        return;
      }

      io.to(roomId).emit('player_disconnected', {
        userId: userId,
        message: 'El oponente se ha desconectado. Esperando reconexión...'
      });
      if (!room.state) {
        await closeRoom(roomId, 'creator_disconnected');
      } else {
        await persistRoom(roomId, room);
      }
    }
  });
});

async function startTurnTimer(roomId: string, room: Room) {
  const existingTimer = roomTimers.get(roomId);
  if (existingTimer) clearTimeout(existingTimer);

  room.lastActionTime = Date.now();
  await persistRoom(roomId, room);

  const timer = setTimeout(async () => {
    const currentRoom = await roomStore.get(roomId);
    if (!currentRoom || !currentRoom.state || currentRoom.state.phase !== 'playing') {
      roomTimers.delete(roomId);
      return;
    }

    const elapsed = Date.now() - (currentRoom.lastActionTime || Date.now());
    const remaining = Math.max(0, TURN_TIME_LIMIT_MS - elapsed);

    if (remaining > 0) {
      startTurnTimer(roomId, currentRoom);
      return;
    }

    const currentPlayerIndex = currentRoom.state.currentTurnPlayerIndex;
    const currentPlayer = currentRoom.state.players[currentPlayerIndex];
    if (!currentPlayer || !Array.isArray(currentPlayer.hand)) {
      roomTimers.delete(roomId);
      return;
    }

    if (currentPlayer.hand.length === 0) {
      (currentRoom.state as any).currentTurnPlayerIndex = (currentRoom.state.currentTurnPlayerIndex + 1) % currentRoom.state.players.length;
      await persistRoom(roomId, currentRoom);
      startTurnTimer(roomId, currentRoom);
      broadcastGameState(roomId, currentRoom);
      return;
    }

    try {
      const action = currentRoom.engine.getTimeoutAction(currentRoom.state, currentPlayer.id);
      const result = currentRoom.engine.playCard(currentRoom.state, action);
      if (result.success) {
        currentRoom.state = result.value;
        await persistRoom(roomId, currentRoom);
        if (currentRoom.state.phase === 'completed') {
          roomTimers.delete(roomId);
          saveMatchResult(roomId, currentRoom);
        } else {
          startTurnTimer(roomId, currentRoom);
          scheduleBotTurnIfNeeded(roomId, currentRoom);
        }
        broadcastGameState(roomId, currentRoom);
      } else {
        console.error(`Error al aplicar jugada automática por timeout:`, (result as any).error);
        roomTimers.delete(roomId);
      }
    } catch (error) {
      console.error('Excepción al generar o aplicar jugada por timeout:', error);
      roomTimers.delete(roomId);
    }
  }, TURN_TIME_LIMIT_MS);

  roomTimers.set(roomId, timer);
}

async function saveMatchResult(roomId: string, room: Room) {
  if (!room.state || room.state.phase !== 'completed') return;
  if (room.isResultSaved) {
    console.log(`[MatchResult] Partida ${roomId} ya fue guardada previamente. Ignorando.`);
    return;
  }
  room.isResultSaved = true;

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

  if (!winnerId) {
    if (room.maxPlayers === 4) {
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

    for (const pd of playersData) {
      try {
        await supabase.rpc('assign_daily_quests', { p_player_id: pd.id });
      } catch (questAssignErr) {
        console.warn(`[MatchResult] Error asignando quests a ${pd.id}:`, questAssignErr);
      }
    }

    const dbWinnerId = (mode === '2v2' && (winnerId === 't1' || winnerId === 't2')) ? null : winnerId;

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

      for (const pd of playersData) {
        const playerInRoom = room.players.find((p: any) => p.userId === pd.id);
        if (playerInRoom) {
          io.to(playerInRoom.socketId).emit('stats_updated', {
            playerId: pd.id,
            eloChange: pd.elo_change,
            coinsEarned: pd.coins_earned,
            xpGained: pd.xp_gained,
            isWinner: pd.is_winner
          });
        }
      }
    }

    if (isTournament && winnerId) {
      await processTournamentAdvancement(io, roomStore, roomId, winnerId, true);
    }

  } catch (error) {
    console.error('Error general guardando resultado de partida:', error);
  }
}

function broadcastGameState(roomId: string, room: Room) {
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

setInterval(async () => {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_notifications', {
      p_days: 30
    });
    if (error) {
      console.error('Error en cleanup de notificaciones:', error);
    } else if (data && data > 0) {
      console.log(`Notificaciones limpiadas: ${data}`);
    }
  } catch (err) {
    console.error('Error en cleanup de notificaciones:', err);
  }
}, 60 * 60 * 1000);

setInterval(async () => {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_invitations');
    if (error) {
      console.error('Error en cleanup de invitaciones:', error);
    } else if (data && data > 0) {
      console.log(`Invitaciones expiradas limpiadas: ${data}`);
    }
  } catch (err) {
    console.error('Error en cleanup de invitaciones:', err);
  }
}, 5 * 60 * 1000);

async function checkScheduledEvents() {
  try {
    const { data: startedEvents, error: startError } = await supabase
      .from('events')
      .update({ status: 'live' })
      .eq('status', 'upcoming')
      .lte('start_date', new Date().toISOString())
      .select('id, title');

    if (startError) {
      console.error('[Eventos] Error auto-iniciando eventos:', startError);
    } else if (startedEvents && startedEvents.length > 0) {
      for (const event of startedEvents) {
        console.log(`[Eventos] Evento "${event.title}" iniciado automáticamente`);
        io.emit('event_started', { eventId: event.id, title: event.title });
      }
    }

    const { data: completedEvents, error: completeError } = await supabase
      .from('events')
      .update({ status: 'completed' })
      .eq('status', 'live')
      .lte('end_date', new Date().toISOString())
      .select('id, title');

    if (completeError) {
      console.error('[Eventos] Error auto-finalizando eventos:', completeError);
    } else if (completedEvents && completedEvents.length > 0) {
      for (const event of completedEvents) {
        console.log(`[Eventos] Evento "${event.title}" finalizado automáticamente`);
        io.emit('event_completed', { eventId: event.id, title: event.title });
      }
    }
  } catch (err) {
    console.error('[Eventos] Error en checkScheduledEvents:', err);
  }
}

const EVENT_CHECK_INTERVAL = 60 * 1000;
setInterval(checkScheduledEvents, EVENT_CHECK_INTERVAL);
checkScheduledEvents();

const CLUSTER_PORT = process.env.NODE_APP_INSTANCE
  ? parseInt(process.env.PORT || '4000', 10) + parseInt(process.env.NODE_APP_INSTANCE, 10)
  : parseInt(process.env.PORT || '4000', 10);
httpServer.listen(CLUSTER_PORT, () => {
  console.log(`Servidor Casino 21 corriendo en el puerto ${CLUSTER_PORT}`);
});
