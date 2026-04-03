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
import { chatManager, friendsManager, tournamentManager, notificationManager } from './managers';

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST"] }));

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
    (socket as any).user = decoded;
    (socket as any).userId = extractUserIdFromTokenPayload(decoded);
    next();
  } catch (err: any) {
    console.error('Error verificando token:', err.message);
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

const rooms: Record<string, {
  engine: DefaultGameEngine;
  state: GameState | null;
  players: { socketId: string, playerId: string, name: string, userId: string }[];
  maxPlayers: number;
  timerInterval?: NodeJS.Timeout;
  lastActionTime?: number;
}> = {};

const TURN_TIME_LIMIT_MS = 30000;
const connectedPlayers: Map<string, { socketId: string, playerId: string }> = new Map();

io.on('connection', (socket) => {
  const userId = (socket as any).userId || (socket as any).user?.sub;
  console.log(`Usuario autenticado conectado: ${socket.id} (User: ${userId})`);

  connectedPlayers.set(userId, { socketId: socket.id, playerId: userId });
  friendsManager.updateFriendStatus(userId, 'online');

  // ============================================
  // EVENTOS DE SALA DE JUEGO
  // ============================================

  socket.on('create_room', ({ playerName, mode }: { playerName: string, mode: '1v1' | '2v2' }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const maxPlayers = mode === '1v1' ? 2 : 4;

    rooms[roomId] = {
      engine: new DefaultGameEngine(),
      state: null,
      players: [{ socketId: socket.id, playerId: userId, name: playerName, userId }],
      maxPlayers
    };

    socket.join(roomId);
    socket.emit('room_created', { roomId, playerId: userId });
    console.log(`Sala ${roomId} creada por ${playerName}`);

    // Lobby timeout: notify at 30s, delete at 60s if game hasn't started
    const WARN_MS = 30_000;
    const DELETE_MS = 60_000;

    const warnTimer = setTimeout(() => {
      const room = rooms[roomId];
      if (room && !room.state) {
        io.to(roomId).emit('lobby_expiring', {
          roomId,
          message: 'La sala se eliminará en 30 segundos si no se completan los jugadores.',
          secondsLeft: 30,
        });
      }
    }, WARN_MS);

    const deleteTimer = setTimeout(() => {
      const room = rooms[roomId];
      if (room && !room.state) {
        io.to(roomId).emit('lobby_expired', {
          roomId,
          message: 'La sala fue eliminada por inactividad.',
        });
        delete rooms[roomId];
        console.log(`Sala ${roomId} eliminada por timeout de lobby`);
      }
    }, DELETE_MS);

    // Store timers so we can cancel them if the game starts or room is deleted
    (rooms[roomId] as any)._lobbyWarnTimer = warnTimer;
    (rooms[roomId] as any)._lobbyDeleteTimer = deleteTimer;
  });

  socket.on('delete_room', ({ roomId }: { roomId: string }) => {
    const room = rooms[roomId];
    if (!room) { socket.emit('error', 'La sala no existe'); return; }
    const isOwner = room.players[0]?.userId === userId;
    if (!isOwner) { socket.emit('error', 'Solo el creador puede eliminar la sala'); return; }

    clearTimeout((room as any)._lobbyWarnTimer);
    clearTimeout((room as any)._lobbyDeleteTimer);
    io.to(roomId).emit('room_deleted', { roomId, message: 'El creador eliminó la sala.' });
    delete rooms[roomId];
    socket.emit('room_deleted_ok', { roomId });
    console.log(`Sala ${roomId} eliminada manualmente por ${userId}`);
  });

  socket.on('get_my_rooms', () => {
    const myRooms = Object.entries(rooms)
      .filter(([, room]) => room.players[0]?.userId === userId && !room.state)
      .map(([roomId, room]) => ({
        roomId,
        mode: room.maxPlayers === 2 ? '1v1' : '2v2',
        players: room.players.length,
        maxPlayers: room.maxPlayers,
      }));
    socket.emit('my_rooms', myRooms);
  });

  socket.on('join_room', ({ roomId, playerName }: { roomId: string, playerName: string }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('error', 'La sala no existe');
      return;
    }

    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      socket.join(roomId);
      socket.emit('room_joined', { roomId, playerId: existingPlayer.userId });

      if (room.state) {
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

      io.to(roomId).emit('player_reconnected', { message: `${existingPlayer.name} se ha reconectado.` });
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
    socket.emit('room_joined', { roomId, playerId: userId });
    io.to(roomId).emit('player_joined', { players: room.players.map(p => p.name) });

    if (room.players.length === room.maxPlayers) {
      // Cancel lobby expiry timers — game is starting
      clearTimeout((room as any)._lobbyWarnTimer);
      clearTimeout((room as any)._lobbyDeleteTimer);

      const playerNames = room.players.map(p => p.name);
      const mode = room.maxPlayers === 2 ? '1v1' : '2v2';
      const result = room.engine.startNewGame(mode, playerNames);

      if (result.success && result.value) {
        room.state = result.value;
        room.state.players.forEach((p, index) => {
          (p as any).id = room.players[index].userId;
        });
        startTurnTimer(roomId, room);
        broadcastGameState(roomId, room);
      }
    }
  });

  socket.on('play_action', (action: Action) => {
    const roomId = Object.keys(rooms).find(id => rooms[id]?.players.some(p => p.socketId === socket.id));
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room || !room.state) return;

    if (action.playerId !== userId) {
      socket.emit('action_error', 'Intento de falsificación de identidad');
      return;
    }

    const result = room.engine.playCard(room.state, action);

    if (result.success) {
      room.state = result.value;
      startTurnTimer(roomId, room);
      broadcastGameState(roomId, room);

      if (room.state.phase === 'completed') {
        if (room.timerInterval) clearInterval(room.timerInterval);
        saveMatchResult(room);
      }
    } else {
      socket.emit('action_error', (result as any).error || 'Acción inválida');
    }
  });

  socket.on('continue_round', () => {
    const roomId = Object.keys(rooms).find(id => rooms[id]?.players.some(p => p.socketId === socket.id));
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room || !room.state || room.state.phase !== 'scoring') return;

    const result = room.engine.continueToNextRound(room.state);
    if (result.success && result.value) {
      room.state = result.value;
      startTurnTimer(roomId, room);
      broadcastGameState(roomId, room);
    }
  });

  // ============================================
  // EVENTOS DE TORNEOS
  // ============================================

  socket.on('create_tournament', async ({ name, maxPlayers }: { name: string, maxPlayers: 4 | 8 | 16 | 32 }) => {
    try {
      const tournament = await tournamentManager.createTournament(userId, { name, maxPlayers });
      socket.emit('tournament_created', tournament);
      socket.join(`tournament:${tournament.id}`);
    } catch (err: any) {
      socket.emit('error', err.message);
    }
  });

  socket.on('join_tournament', async ({ tournamentCode }: { tournamentCode: string }) => {
    try {
      await tournamentManager.joinTournament(tournamentCode, userId);
      const tournament = await tournamentManager.getTournamentByCode(tournamentCode);
      if (!tournament) {
        socket.emit('error', 'Torneo no encontrado');
        return;
      }
      socket.join(`tournament:${tournament.id}`);
      socket.emit('tournament_joined', tournament);
      io.to(`tournament:${tournament.id}`).emit('tournament_player_joined', { playerId: userId, tournament });

      if (tournament.status === 'in_progress') {
        io.to(`tournament:${tournament.id}`).emit('tournament_started', tournament);
      }
    } catch (err: any) {
      socket.emit('error', err.message);
    }
  });

  socket.on('get_tournament', async ({ tournamentId }: { tournamentId: string }) => {
    try {
      const tournament = await tournamentManager.getTournament(tournamentId);
      socket.emit('tournament_data', tournament);
    } catch (err: any) {
      socket.emit('error', err.message);
    }
  });

  socket.on('record_match_result', async ({ tournamentId, matchId, winnerId }: { tournamentId: string, matchId: string, winnerId: string }) => {
    try {
      await tournamentManager.recordMatchResult(tournamentId, matchId, winnerId);
      const tournament = await tournamentManager.getTournament(tournamentId);
      io.to(`tournament:${tournamentId}`).emit('tournament_match_ready', { tournamentId, matchId, winnerId });
      if (tournament?.status === 'completed') {
        io.to(`tournament:${tournamentId}`).emit('tournament_completed', { tournamentId, winnerId });
      }
    } catch (err: any) {
      socket.emit('error', err.message);
    }
  });

  // ============================================
  // EVENTOS DE CHAT
  // ============================================

  socket.on('send_message', async ({ roomId, content }: { roomId: string, content: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    const playerName = profile?.username || 'Unknown';
    const result = await chatManager.sendMessage(roomId, userId, playerName, content);

    if (result.success) {
      socket.emit('message_sent', result.value);
      io.to(roomId).emit('new_message', result.value);
    } else {
      if (result.error === 'RATE_LIMIT_EXCEEDED') {
        socket.emit('chat_rate_limited', { retryAfter: 30 });
      } else {
        socket.emit('error', result.error);
      }
    }
  });

  socket.on('get_chat_history', async ({ roomId }: { roomId: string }) => {
    const messages = await chatManager.getMessageHistory(roomId, 50);
    socket.emit('chat_history', messages);
  });

  socket.on('report_message', async ({ messageId, reason }: { messageId: string, reason: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const result = await chatManager.reportMessage(messageId, userId, reason);

    if (result.success) {
      socket.emit('report_sent', result.value);
    } else {
      socket.emit('error', result.error);
    }
  });

  // ============================================
  // EVENTOS DE CHAT DIRECTO (DM)
  // ============================================

  // room_id para DMs: dm_<menor_id>_<mayor_id> (orden lexicográfico para consistencia)
  const getDmRoomId = (a: string, b: string) =>
    `dm_${[a, b].sort().join('_')}`;

  socket.on('send_dm', async ({ receiverId, content }: { receiverId: string; content: string }) => {
    if (!userId) { socket.emit('error', 'No autenticado'); return; }

    const roomId = getDmRoomId(userId, receiverId);
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).single();
    const senderName = profile?.username || 'Unknown';

    const result = await chatManager.sendMessage(roomId, userId, senderName, content);
    if (result.success) {
      // Enriquecer el mensaje con sender_name para el cliente
      const enriched = { ...result.value, sender_name: senderName };
      // Enviar al destinatario si está conectado
      const receiverSocket = connectedPlayers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('dm_message', enriched);
      }
      // Confirmar al sender con el mensaje guardado
      socket.emit('dm_message', enriched);
    } else {
      if (result.error === 'RATE_LIMIT_EXCEEDED') {
        socket.emit('chat_rate_limited', { retryAfter: 30 });
      } else {
        socket.emit('error', result.error);
      }
    }
  });

  socket.on('get_dm_history', async ({ friendId }: { friendId: string }) => {
    if (!userId) { socket.emit('error', 'No autenticado'); return; }
    const roomId = getDmRoomId(userId, friendId);
    const messages = await chatManager.getMessageHistory(roomId, 50);
    socket.emit('dm_history', { friendId, messages });
  });

  // ============================================
  // EVENTOS DE AMISTADES
  // ============================================

  socket.on('search_players', async ({ query, excludePlayerId }: { query: string, excludePlayerId?: string }) => {
    const results = await friendsManager.searchPlayers(query, excludePlayerId);
    socket.emit('players_search_results', results);
  });

  socket.on('send_friend_request', async ({ receiverId }: { receiverId: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const result = await friendsManager.sendFriendRequest(userId, receiverId);

    if (result.success) {
      socket.emit('friend_request_sent', result.value);
      const receiverSocket = connectedPlayers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('friend_request_received', { senderId: userId });
      }
      await notificationManager.sendNotification(receiverId, 'friend_request', `${userId} te ha enviado una solicitud de amistad`, io);
    } else {
      socket.emit('error', result.error);
    }
  });

  socket.on('accept_friend_request', async ({ requestId }: { requestId: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const result = await friendsManager.acceptFriendRequest(requestId, userId);

    if (result.success) {
      socket.emit('friend_request_accepted', result.value);
    } else {
      socket.emit('error', result.error);
    }
  });

  socket.on('reject_friend_request', async ({ requestId }: { requestId: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const result = await friendsManager.rejectFriendRequest(requestId, userId);

    if (result.success) {
      socket.emit('friend_request_rejected', result.value);
    } else {
      socket.emit('error', result.error);
    }
  });

  socket.on('get_pending_requests', async () => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const requests = await friendsManager.getPendingRequests(userId);
    socket.emit('pending_requests', requests);
  });

  socket.on('remove_friend', async ({ friendId }: { friendId: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const result = await friendsManager.removeFriend(userId, friendId);

    if (result.success) {
      socket.emit('friend_removed', result.value);
    } else {
      socket.emit('error', result.error);
    }
  });

  socket.on('get_friends_list', async () => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const friends = await friendsManager.getFriendsList(userId);
    socket.emit('friends_list', friends);
  });

  socket.on('send_game_invitation', async ({ receiverId, tournamentId, roomId }: { receiverId: string, tournamentId?: string, roomId?: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const result = await friendsManager.sendGameInvitation(userId, receiverId, tournamentId, roomId);

    if (result.success) {
      socket.emit('game_invitation_sent', result.value);
      const receiverSocket = connectedPlayers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit('game_invitation_received', {
          id: result.value.id,
          sender_id: userId,
          sender_username: result.value.sender_username,
          room_id: result.value.room_id,
          created_at: result.value.created_at,
          tournamentId,
        });
      }
      await notificationManager.sendNotification(
        receiverId,
        'game_invitation',
        `${result.value.sender_username} te ha invitado a una partida`,
        io,
        { invitationId: result.value.id, senderId: userId, senderUsername: result.value.sender_username }
      );
    } else {
      socket.emit('error', result.error);
    }
  });

  socket.on('accept_game_invitation', async ({ invitationId }: { invitationId: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const result = await friendsManager.acceptGameInvitation(invitationId, userId);

    if (result.success) {
      const invitation = result.value;
      const senderId = invitation.sender_id;

      // Crear sala nueva para la partida
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[roomId] = {
        engine: new DefaultGameEngine(),
        state: null,
        players: [],
        maxPlayers: 2,
      };

      // Unir al receptor (quien aceptó)
      const receiverName = (await friendsManager.getUsername(userId)) || userId;
      rooms[roomId].players.push({ socketId: socket.id, playerId: userId, name: receiverName, userId });
      socket.join(roomId);
      socket.emit('room_joined', { roomId, playerId: userId });

      // Notificar al sender para que se una automáticamente
      const senderSocket = connectedPlayers.get(senderId);
      if (senderSocket) {
        io.to(senderSocket.socketId).emit('game_invitation_accepted', { roomId, invitationId });
      }
    } else {
      socket.emit('error', result.error);
    }
  });

  socket.on('reject_game_invitation', async ({ invitationId }: { invitationId: string }) => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }

    const result = await friendsManager.rejectGameInvitation(invitationId, userId);

    if (result.success) {
      socket.emit('game_invitation_rejected', result.value);
    } else {
      socket.emit('error', result.error);
    }
  });

  // ============================================
  // EVENTOS DE NOTIFICACIONES
  // ============================================

  socket.on('get_notifications', async () => {
    if (!userId) {
      socket.emit('error', 'No autenticado');
      return;
    }
    const notifications = await notificationManager.getNotifications(userId);
    socket.emit('notifications', notifications);
  });

  socket.on('mark_notification_read', async ({ notificationId }: { notificationId: string }) => {
    await notificationManager.markAsRead(notificationId);
    socket.emit('notification_marked_read', { notificationId });
  });

  socket.on('mark_all_notifications_read', async () => {
    if (!userId) return;
    await notificationManager.markAllAsRead(userId);
    socket.emit('all_notifications_read');
  });

  socket.on('delete_notification', async ({ notificationId }: { notificationId: string }) => {
    if (!userId) return;
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId).eq('player_id', userId);
    if (!error) socket.emit('notification_deleted', { notificationId });
  });

  // ============================================
  // DESCONEXIÓN
  // ============================================

  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);

    connectedPlayers.delete(userId);
    friendsManager.updateFriendStatus(userId, 'offline');

    const roomId = Object.keys(rooms).find(id => rooms[id]?.players.some(p => p.socketId === socket.id));
    if (roomId) {
      io.to(roomId).emit('player_disconnected', {
        userId: userId,
        message: 'El oponente se ha desconectado. Esperando reconexión...'
      });
    }
  });
});

// ============================================
// HELPERS
// ============================================

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

      if (!currentPlayer || !Array.isArray(currentPlayer.hand)) return;

      if (currentPlayer.hand.length === 0) {
        room.state.currentTurnPlayerIndex = (room.state.currentTurnPlayerIndex + 1) % room.state.players.length;
        startTurnTimer(roomId, room);
        broadcastGameState(roomId, room);
        return;
      }

      const lowestValueCard = currentPlayer.hand.reduce((minCard: any, currentCard: any) => {
        return currentCard.value < minCard.value ? currentCard : minCard;
      }, currentPlayer.hand[0]);

      const action: Action = { type: 'botar', playerId: currentPlayer.id, cardId: lowestValueCard.id };
      let result = room.engine.playCard(room.state, action, true);

      if (!result.success) {
        const fallbackAction: Action = { type: 'colocar', playerId: currentPlayer.id, cardId: lowestValueCard.id };
        result = room.engine.playCard(room.state, fallbackAction, true);
      }

      if (result.success) {
        room.state = result.value;
        startTurnTimer(roomId, room);
        broadcastGameState(roomId, room);

        if (room.state.phase === 'completed') {
          if (room.timerInterval) clearInterval(room.timerInterval);
          saveMatchResult(room);
        }
      } else {
        console.error(`Error al aplicar descarte automático por timeout:`, result.error);
      }
    }
  }, 1000);
}

async function saveMatchResult(room: any) {
  if (!room.state || room.state.phase !== 'completed') return;

  let winnerId = null;
  const p1 = room.state.players[0];
  const p2 = room.state.players[1];

  if (p1.score > p2.score) winnerId = p1.id;
  else if (p2.score > p1.score) winnerId = p2.id;

  try {
    await supabase.from('matches').insert({
      player1_id: room.players[0].userId,
      player2_id: room.players[1].userId,
      winner_id: winnerId,
      status: 'completed'
    });
    console.log('Resultado de partida guardado en DB');

    if (winnerId) {
      const loserId = winnerId === p1.id ? p2.id : p1.id;

      const updateProfile = async (id: string, isWinner: boolean) => {
        const { data: profile } = await supabase.from('profiles').select('elo, wins, losses').eq('id', id).single();
        if (profile) {
          const eloChange = 25;
          await supabase.from('profiles').update({
            elo: profile.elo + (isWinner ? eloChange : -eloChange),
            wins: profile.wins + (isWinner ? 1 : 0),
            losses: profile.losses + (isWinner ? 0 : 1)
          }).eq('id', id);
        }
      };

      await updateProfile(winnerId, true);
      await updateProfile(loserId, false);
      console.log('Estadísticas y ELO actualizados');
    }
  } catch (err) {
    console.error('Error guardando partida:', err);
  }
}

function broadcastGameState(roomId: string, room: any) {
  if (!room.state) return;
  const fullState = room.state;

  room.players.forEach((p: any) => {
    const safeState: GameState = JSON.parse(JSON.stringify(fullState));

    safeState.players.forEach(statePlayer => {
      if (statePlayer.id !== p.playerId) {
        (statePlayer as any).hand = Array(statePlayer.hand.length).fill({ id: 'hidden', rank: '?', suit: 'hidden', value: 0 });
      }
    });

    io.to(p.socketId).emit('game_state_update', safeState);
  });
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Servidor Casino 21 corriendo en el puerto ${PORT}`);
});
