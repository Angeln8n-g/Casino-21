import { Redis } from 'ioredis';

const REDIS_URL = (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') ? process.env.REDIS_URL.trim() : null;
const QUEUE_KEY = 'cs21:matchmaking:queue';
const LOCK_KEY = 'cs21:matchmaking:lock';
const LOCK_TTL = 5;

export interface MatchmakingPlayer {
  socketId: string;
  userId: string;
  name: string;
  elo: number;
  joinedAt: number;
}

export class MatchmakingStore {
  private redis: Redis | null = null;
  private isRedisReady: boolean = false;
  private memoryQueue: Map<string, MatchmakingPlayer> = new Map();

  constructor() {
    if (REDIS_URL) {
      try {
        const client = new Redis(REDIS_URL, {
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 300, 2000);
          },
          lazyConnect: true,
          enableOfflineQueue: false,
        });

        client.on('error', () => {
          this.isRedisReady = false;
        });

        client.on('connect', () => {
          this.isRedisReady = true;
          console.log('[MatchmakingStore] Conectado a Redis');
        });

        this.redis = client;

        client.connect().catch((err: any) => {
          console.warn('[MatchmakingStore] Redis no disponible, operando en memoria:', err.message);
        });
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error inicializando Redis, operando en memoria:', err.message);
        this.redis = null;
      }
    } else {
      console.log('[MatchmakingStore] Modo en memoria activo (REDIS_URL no definido)');
    }
  }

  async addPlayer(player: MatchmakingPlayer): Promise<void> {
    this.memoryQueue.set(player.userId, player);
    if (this.redis && this.isRedisReady) {
      try {
        await this.redis.hset(QUEUE_KEY, player.userId, JSON.stringify(player));
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis addPlayer:', err.message);
      }
    }
  }

  async removePlayer(userId: string): Promise<void> {
    this.memoryQueue.delete(userId);
    if (this.redis && this.isRedisReady) {
      try {
        await this.redis.hdel(QUEUE_KEY, userId);
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis removePlayer:', err.message);
      }
    }
  }

  async getPlayer(userId: string): Promise<MatchmakingPlayer | null> {
    if (this.redis && this.isRedisReady) {
      try {
        const raw = await this.redis.hget(QUEUE_KEY, userId);
        if (raw) return JSON.parse(raw);
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis getPlayer:', err.message);
      }
    }
    return this.memoryQueue.get(userId) || null;
  }

  async getAllPlayers(): Promise<MatchmakingPlayer[]> {
    if (this.redis && this.isRedisReady) {
      try {
        const all = await this.redis.hgetall(QUEUE_KEY);
        const players: MatchmakingPlayer[] = [];
        for (const raw of Object.values(all)) {
          try {
            players.push(JSON.parse(raw));
          } catch {}
        }
        return players;
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis getAllPlayers:', err.message);
      }
    }
    return Array.from(this.memoryQueue.values());
  }

  async removePlayers(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    for (const uid of userIds) {
      this.memoryQueue.delete(uid);
    }
    if (this.redis && this.isRedisReady) {
      try {
        await this.redis.hdel(QUEUE_KEY, ...userIds);
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis removePlayers:', err.message);
      }
    }
  }

  async getSize(): Promise<number> {
    if (this.redis && this.isRedisReady) {
      try {
        return await this.redis.hlen(QUEUE_KEY);
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis getSize:', err.message);
      }
    }
    return this.memoryQueue.size;
  }

  async clear(): Promise<void> {
    this.memoryQueue.clear();
    if (this.redis && this.isRedisReady) {
      try {
        await this.redis.del(QUEUE_KEY);
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis clear:', err.message);
      }
    }
  }

  async tryAcquireLock(): Promise<boolean> {
    if (this.redis && this.isRedisReady) {
      try {
        const result = await this.redis.set(LOCK_KEY, '1', 'PX', LOCK_TTL * 1000, 'NX');
        return result === 'OK';
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis tryAcquireLock:', err.message);
      }
    }
    return true;
  }

  async releaseLock(): Promise<void> {
    if (this.redis && this.isRedisReady) {
      try {
        await this.redis.del(LOCK_KEY);
      } catch (err: any) {
        console.warn('[MatchmakingStore] Error en Redis releaseLock:', err.message);
      }
    }
  }

  async destroy(): Promise<void> {
    try {
      if (this.redis) {
        this.redis.disconnect();
      }
    } catch {}
  }
}
