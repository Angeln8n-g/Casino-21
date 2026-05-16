# Scalability Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale from ~200 concurrent players to ~2000+ by adding Redis adapter, PM2 cluster mode, nginx sticky sessions, and optimizing in-memory data structures.

**Architecture:** Install Redis on the server, add `@socket.io/redis-adapter` for cross-process communication, switch PM2 to cluster mode (all CPU cores), configure nginx upstream with `ip_hash` for sticky sessions, and optimize the monolithic `server/src/index.ts` with O(1) room lookups, a ring buffer for chat, rate limiting, and reduced deep cloning overhead.

**Tech Stack:** Redis + @socket.io/redis-adapter + PM2 cluster mode + nginx ip_hash + Node.js V8 heap tuning

---

### Task 1: Install Redis and add Redis adapter

**Files:**
- Modify: `server/package.json` (add dependency)
- Modify: `server/src/index.ts` lines 59-65 (add Redis adapter setup)

- [ ] **Step 1: Install Redis on the server**

Run:
```bash
sudo apt update && sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping
```
Expected: `PONG`

- [ ] **Step 2: Add npm dependency**

```bash
npm install @socket.io/redis-adapter ioredis
```

- [ ] **Step 3: Configure Redis adapter in `server/src/index.ts`**

Replace the Socket.io initialization (lines 59-65):

```typescript
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
```

- [ ] **Step 4: Build and verify server compiles**

```bash
cd server && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/src/index.ts
git commit -m "feat: add Redis adapter for horizontal scaling"
```

### Task 2: Configure PM2 cluster mode

**Files:**
- Modify: `ecosystem.config.cjs`

- [ ] **Step 1: Rewrite ecosystem.config.cjs**

```javascript
module.exports = {
  apps: [
    {
      name: 'casino21-server',
      cwd: './server',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        ALLOW_INSECURE_JWT_FALLBACK: 'false',
        REDIS_URL: 'redis://127.0.0.1:6379',
      },
      node_args: '--max-old-space-size=1536',
    },
  ],
};
```

- [ ] **Step 2: Update PORT assignment in `server/src/index.ts` (line 1193)**

Replace:
```typescript
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Servidor Casino 21 corriendo en el puerto ${PORT}`);
});
```

With:
```typescript
const CLUSTER_PORT = process.env.NODE_APP_INSTANCE
  ? parseInt(process.env.PORT || '4000', 10) + parseInt(process.env.NODE_APP_INSTANCE, 10)
  : parseInt(process.env.PORT || '4000', 10);
httpServer.listen(CLUSTER_PORT, () => {
  console.log(`Worker ${process.env.NODE_APP_INSTANCE || '0'} en puerto ${CLUSTER_PORT}`);
});
```

- [ ] **Step 3: Build and verify**

```bash
cd server && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add ecosystem.config.cjs server/src/index.ts
git commit -m "feat: PM2 cluster mode with per-worker ports"
```

### Task 3: Update nginx config for sticky sessions

**Files:**
- Modify: `deploy/nginx/casino21.conf`

- [ ] **Step 1: Rewrite nginx config**

```nginx
upstream casino21_backend {
    ip_hash;
    server 127.0.0.1:4000;
    server 127.0.0.1:4001;
    server 127.0.0.1:4002;
    server 127.0.0.1:4003;
}

server {
    listen 80;
    listen [::]:80;
    server_name kasino21.com;

    root /var/www/casino21/current/dist;
    index index.html;

    access_log /var/log/nginx/casino21.access.log;
    error_log /var/log/nginx/casino21.error.log;

    location /socket.io/ {
        proxy_pass http://casino21_backend/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    location = /health {
        proxy_pass http://casino21_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /rules_version {
        proxy_pass http://casino21_backend/rules_version;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /assets/ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Adjust backend count to match CPU cores (`nproc`).

- [ ] **Step 2: Deploy config**

```bash
sudo cp deploy/nginx/casino21.conf /etc/nginx/sites-available/casino21.conf
sudo nginx -t && sudo systemctl reload nginx
```

- [ ] **Step 3: Deploy app and verify**

```bash
npm run build:server && pm2 reload ecosystem.config.cjs && pm2 status
```

- [ ] **Step 4: Commit**

```bash
git add deploy/nginx/casino21.conf
git commit -m "feat: nginx upstream with ip_hash sticky sessions"
```

### Task 4: Optimize room lookups with Map<socketId, roomId>

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add socketToRoomMap (after `rooms` declaration, line 129)**

```typescript
const socketToRoomMap = new Map<string, string>();
```

- [ ] **Step 2: Populate map when sockets join rooms**

In `create_room`, `join_room`, `join_as_spectator` handlers, after `socket.join(roomId)`:
```typescript
socketToRoomMap.set(socket.id, roomId);
```

- [ ] **Step 3: Replace O(n) lookup in play_action handler (line 731)**

Replace:
```typescript
const roomId = Object.keys(rooms).find(id => rooms[id]?.players.some(p => p.socketId === socket.id));
```
With:
```typescript
const roomId = socketToRoomMap.get(socket.id);
```

- [ ] **Step 4: Replace O(n) lookup in disconnect handler (line 883)**

Replace:
```typescript
const roomId = Object.keys(rooms).find(id => rooms[id]?.players.some(p => p.socketId === socket.id));
```
With:
```typescript
const roomId = socketToRoomMap.get(socket.id);
socketToRoomMap.delete(socket.id);
```

- [ ] **Step 5: Clean up in closeRoom function**

```typescript
room.players.forEach(p => socketToRoomMap.delete(p.socketId));
room.spectators.forEach(s => socketToRoomMap.delete(s.socketId));
```

- [ ] **Step 6: Build and commit**

```bash
cd server && npm run build
git add server/src/index.ts
git commit -m "perf: O(1) room lookups via socketToRoomMap"
```

### Task 5: Optimize chat history with ring buffer

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add RingBuffer class after imports (around line 13)**

```typescript
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
```

- [ ] **Step 2: Update chatHistory type in rooms Record (line 124)**

Change `chatHistory: ChatMessage[]` to `chatHistory: RingBuffer<ChatMessage>`.

- [ ] **Step 3: Update room initialization**

When creating new rooms, use `new RingBuffer<ChatMessage>(100)` instead of `[]`.

- [ ] **Step 4: Replace shift() logic (lines 863-866)**

Remove the `if (room.chatHistory.length > 100) { room.chatHistory.shift(); }` block — RingBuffer handles it automatically.

- [ ] **Step 5: Update any chatHistory reads for toArray()**

Wherever code reads `room.chatHistory` as a plain array (e.g., sending history to new joiners), call `.toArray()`:
```typescript
socket.emit('chat_history', room.chatHistory.toArray());
```

- [ ] **Step 6: Build and commit**

```bash
cd server && npm run build
git add server/src/index.ts
git commit -m "perf: ring buffer for chat replaces O(n) Array.shift"
```

### Task 6: Add rate limiting and security

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add rate limit maps after socketToRoomMap**

```typescript
const connectionCountByIP = new Map<string, number>();
const MAX_CONNECTIONS_PER_IP = 5;
const actionTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 500;
```

- [ ] **Step 2: Add connection rate limit in io.use middleware**

At the start of the `io.use(async (socket, next) => {` callback:
```typescript
const clientIP = socket.handshake.address;
const currentCount = connectionCountByIP.get(clientIP) || 0;
if (currentCount >= MAX_CONNECTIONS_PER_IP) {
  return next(new Error('Rate limit: demasiadas conexiones desde esta IP'));
}
connectionCountByIP.set(clientIP, currentCount + 1);
```

- [ ] **Step 3: Add event rate limiter helper after io.use**

```typescript
function isRateLimited(socketId: string): boolean {
  const lastAction = actionTimestamps.get(socketId);
  const now = Date.now();
  if (lastAction && (now - lastAction) < RATE_LIMIT_MS) return true;
  actionTimestamps.set(socketId, now);
  return false;
}
```

- [ ] **Step 4: Apply to play_action handler**

At the top of `socket.on('play_action', ...)`:
```typescript
if (isRateLimited(socket.id)) return;
```

- [ ] **Step 5: Clean up on disconnect**

In the disconnect handler, add:
```typescript
connectionCountByIP.delete(socket.handshake.address);
actionTimestamps.delete(socket.id);
```

- [ ] **Step 6: Build and commit**

```bash
cd server && npm run build
git add server/src/index.ts
git commit -m "feat: connection and event rate limiting"
```

### Task 7: Optimize timer (setTimeout instead of setInterval)

**Files:**
- Modify: `server/src/index.ts` lines 897-938

- [ ] **Step 1: Replace startTurnTimer with setTimeout-based approach**

```typescript
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
      }
    } catch (error) {
      console.error('Error en timeout automático:', error);
    }
  }, TURN_TIME_LIMIT_MS);
}
```

**Note:** This removes the 1-second `timer_update` emit. If the client needs server timer sync, add a `request_timer` event:

```typescript
socket.on('request_timer', () => {
  const roomId = socketToRoomMap.get(socket.id);
  const room = roomId ? rooms[roomId] : null;
  if (!room?.lastActionTime) return;
  const remaining = Math.max(0, TURN_TIME_LIMIT_MS - (Date.now() - room.lastActionTime));
  io.to(socket.id).emit('timer_update', { remaining });
});
```

- [ ] **Step 2: Build and commit**

```bash
cd server && npm run build
git add server/src/index.ts
git commit -m "perf: replace per-room setInterval with setTimeout at expiration"
```

### Task 8: Optimize broadcastGameState (reduce deep cloning)

**Files:**
- Modify: `server/src/index.ts` lines 1164-1191

- [ ] **Step 1: Replace JSON.parse(JSON.stringify) with Object.assign**

```typescript
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
```

- [ ] **Step 2: Build and commit**

```bash
cd server && npm run build
git add server/src/index.ts
git commit -m "perf: replace JSON.parse(JSON.stringify) with Object.assign"
```
