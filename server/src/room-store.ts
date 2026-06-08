import { Redis } from 'ioredis';
import { DefaultGameEngine } from './application/game-engine';
import type { GameState } from './domain/game-state';
import type { BotDifficulty } from './bot/bot-player';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const ROOM_KEY_PREFIX = 'cs21:room:';
const INVALIDATE_CHANNEL = 'cs21:room-invalidate';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSpectator: boolean;
  isSystem?: boolean;
}

export class RingBuffer<T> {
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

  toJSON(): T[] {
    return this.toArray();
  }

  static fromArray<T>(items: T[], capacity: number): RingBuffer<T> {
    const rb = new RingBuffer<T>(capacity);
    for (const item of items) {
      rb.push(item);
    }
    return rb;
  }
}

export interface Room {
  engine: DefaultGameEngine;
  state: GameState | null;
  players: { socketId: string; playerId: string; name: string; userId: string; team?: 1 | 2 }[];
  spectators: { socketId: string; userId: string; name: string }[];
  maxPlayers: number;
  chatHistory: RingBuffer<ChatMessage>;
  betAmount?: number;
  prizePool?: number;
  isTournament?: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
  lastActionTime?: number;
  isResultSaved?: boolean;
}

interface SerializableRoom {
  players: { socketId: string; playerId: string; name: string; userId: string; team?: 1 | 2 }[];
  spectators: { socketId: string; userId: string; name: string }[];
  maxPlayers: number;
  chatHistory: ChatMessage[];
  betAmount?: number;
  prizePool?: number;
  isTournament?: boolean;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
  state: GameState | null;
  lastActionTime?: number;
  isResultSaved?: boolean;
}

function roomToSerializable(room: Room): SerializableRoom {
  return {
    players: room.players,
    spectators: room.spectators,
    maxPlayers: room.maxPlayers,
    chatHistory: room.chatHistory.toArray(),
    betAmount: room.betAmount,
    prizePool: room.prizePool,
    isTournament: room.isTournament,
    isBot: room.isBot,
    botDifficulty: room.botDifficulty,
    state: room.state,
    lastActionTime: room.lastActionTime,
    isResultSaved: room.isResultSaved,
  };
}

function serializableToRoom(data: SerializableRoom): Room {
  const chatHistory = RingBuffer.fromArray(data.chatHistory, 100);

  return {
    engine: new DefaultGameEngine(),
    state: data.state,
    players: data.players,
    spectators: data.spectators,
    maxPlayers: data.maxPlayers,
    chatHistory,
    betAmount: data.betAmount,
    prizePool: data.prizePool,
    isTournament: data.isTournament,
    isBot: data.isBot,
    botDifficulty: data.botDifficulty,
    lastActionTime: data.lastActionTime,
    isResultSaved: data.isResultSaved,
  };
}

export class RoomStore {
  private cache: Map<string, Room> = new Map();
  private redis: Redis;
  private subscriber: Redis;
  private instanceId: string;

  constructor() {
    this.instanceId = `i_${process.pid}_${Math.random().toString(36).substring(2, 6)}`;
    this.redis = new Redis(REDIS_URL);
    this.subscriber = new Redis(REDIS_URL);

    this.subscriber.subscribe(INVALIDATE_CHANNEL, (err) => {
      if (err) console.error('[RoomStore] Error subscribing to invalidation channel:', err);
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === INVALIDATE_CHANNEL) {
        try {
          const { roomId, source } = JSON.parse(message);
          if (source !== this.instanceId) {
            const deleted = this.cache.delete(roomId);
            if (deleted) {
              console.log(`[RoomStore] Cache invalidated for room ${roomId} (remote change)`);
            }
          }
        } catch {}
      }
    });
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  async get(roomId: string): Promise<Room | undefined> {
    const cached = this.cache.get(roomId);
    if (cached) return cached;

    const key = ROOM_KEY_PREFIX + roomId;
    const raw = await this.redis.get(key);
    if (!raw) return undefined;

    try {
      const data: SerializableRoom = JSON.parse(raw);
      const room = serializableToRoom(data);
      this.cache.set(roomId, room);
      return room;
    } catch (err) {
      console.error(`[RoomStore] Error deserializing room ${roomId}:`, err);
      return undefined;
    }
  }

  async set(roomId: string, room: Room): Promise<void> {
    this.cache.set(roomId, room);

    const serializable = roomToSerializable(room);
    const key = ROOM_KEY_PREFIX + roomId;
    await this.redis.set(key, JSON.stringify(serializable));

    await this.redis.publish(INVALIDATE_CHANNEL, JSON.stringify({
      roomId,
      source: this.instanceId,
    }));
  }

  async delete(roomId: string): Promise<void> {
    this.cache.delete(roomId);

    const key = ROOM_KEY_PREFIX + roomId;
    await this.redis.del(key);

    await this.redis.publish(INVALIDATE_CHANNEL, JSON.stringify({
      roomId,
      source: this.instanceId,
    }));
  }

  getLocalEntries(): Map<string, Room> {
    return this.cache;
  }

  getLocalRoomCount(): number {
    return this.cache.size;
  }

  getLocalRoomIds(): string[] {
    return Array.from(this.cache.keys());
  }

  async getGlobalRoomCount(): Promise<number> {
    try {
      const keys = await this.redis.keys(ROOM_KEY_PREFIX + '*');
      return keys.length;
    } catch {
      return this.cache.size;
    }
  }

  async destroy(): Promise<void> {
    await this.subscriber.unsubscribe(INVALIDATE_CHANNEL);
    this.subscriber.disconnect();
    this.redis.disconnect();
  }
}
