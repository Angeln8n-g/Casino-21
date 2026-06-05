import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
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
  private redis: Redis;

  constructor() {
    this.redis = new Redis(REDIS_URL);
  }

  async addPlayer(player: MatchmakingPlayer): Promise<void> {
    await this.redis.hset(QUEUE_KEY, player.userId, JSON.stringify(player));
  }

  async removePlayer(userId: string): Promise<void> {
    await this.redis.hdel(QUEUE_KEY, userId);
  }

  async getPlayer(userId: string): Promise<MatchmakingPlayer | null> {
    const raw = await this.redis.hget(QUEUE_KEY, userId);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async getAllPlayers(): Promise<MatchmakingPlayer[]> {
    const all = await this.redis.hgetall(QUEUE_KEY);
    const players: MatchmakingPlayer[] = [];
    for (const raw of Object.values(all)) {
      try {
        players.push(JSON.parse(raw));
      } catch {}
    }
    return players;
  }

  async removePlayers(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    await this.redis.hdel(QUEUE_KEY, ...userIds);
  }

  async getSize(): Promise<number> {
    return this.redis.hlen(QUEUE_KEY);
  }

  async clear(): Promise<void> {
    await this.redis.del(QUEUE_KEY);
  }

  async tryAcquireLock(): Promise<boolean> {
    const result = await this.redis.set(LOCK_KEY, '1', 'PX', LOCK_TTL * 1000, 'NX');
    return result === 'OK';
  }

  async releaseLock(): Promise<void> {
    await this.redis.del(LOCK_KEY);
  }

  async destroy(): Promise<void> {
    this.redis.disconnect();
  }
}
