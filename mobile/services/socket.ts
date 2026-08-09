import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';
import EventEmitter from 'eventemitter3';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || process.env.VITE_SOCKET_URL || 'http://localhost:4000';

export const socketEvents = new EventEmitter();

class MobileSocketService {
  private socket: Socket | null = null;
  private connectingPromise: Promise<Socket> | null = null;
  public currentRoomId: string | null = null;

  async connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      console.error("No se encontró token JWT en Mobile.");
      throw new Error("No autenticado");
    }

    if (this.socket) {
      this.socket.auth = { token };
      this.connectingPromise = new Promise<Socket>((resolve, reject) => {
        const onConnect = () => {
          cleanup();
          resolve(this.socket!);
        };
        const onConnectError = (err: any) => {
          cleanup();
          reject(err);
        };
        const cleanup = () => {
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onConnectError);
          this.connectingPromise = null;
        };

        this.socket!.once('connect', onConnect);
        this.socket!.once('connect_error', onConnectError);
        this.socket!.connect();
      });
      return this.connectingPromise;
    }

    this.connectingPromise = new Promise<Socket>((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
      });

      const onConnect = () => {
        cleanup();
        resolve(this.socket!);
      };
      const onConnectError = (err: any) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onConnectError);
        this.connectingPromise = null;
      };

      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onConnectError);

      this.socket.on('room_joined', ({ roomId }: { roomId?: string }) => {
        if (roomId) {
          this.currentRoomId = roomId;
          socketEvents.emit('room_joined', { roomId });
        }
      });
      this.socket.on('game_over', () => {
        this.currentRoomId = null;
        socketEvents.emit('game_over');
      });
      this.socket.on('disconnect', () => {
        this.currentRoomId = null;
        socketEvents.emit('disconnect');
      });
    });

    return this.connectingPromise;
  }

  getSocket() {
    if (!this.socket) {
      throw new Error("Socket no conectado en Mobile.");
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new MobileSocketService();
