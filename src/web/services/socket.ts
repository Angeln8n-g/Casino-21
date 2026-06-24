import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';
import { logger } from '../utils/logger';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.PROD && typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4000'
);

class SocketService {
  private socket: Socket | null = null;
  private connectingPromise: Promise<Socket> | null = null;
  /** Tracks the current room the user is in (for presence) */
  public currentRoomId: string | null = null;

  async connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    // Obtener el token JWT de Supabase
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      logger.error("No se encontró token JWT. El usuario debe iniciar sesión.");
      throw new Error("No autenticado");
    }

    // Si ya existe el socket pero está desconectado, actualizamos el token y reconectamos
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

    // Primera inicialización del socket
    this.connectingPromise = new Promise<Socket>((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        auth: {
          token
        },
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

      // Listeners globales persistentes
      this.socket.on('room_joined', ({ roomId }: { roomId?: string; playerId?: string }) => {
        if (roomId) {
          this.currentRoomId = roomId;
          window.dispatchEvent(new CustomEvent('room_joined_event', { detail: { roomId } }));
        }
      });
      this.socket.on('room_created', ({ roomId }: { roomId?: string }) => {
        if (roomId) {
          this.currentRoomId = roomId;
          window.dispatchEvent(new CustomEvent('room_joined_event', { detail: { roomId } }));
        }
      });
      this.socket.on('game_over', () => {
        this.currentRoomId = null;
        window.dispatchEvent(new CustomEvent('room_left_event'));
      });
      this.socket.on('disconnect', () => {
        this.currentRoomId = null;
        window.dispatchEvent(new CustomEvent('room_left_event'));
      });

      this.socket.on('connect_error', (err) => {
        logger.error("Error conectando el socket:", err.message);
      });
    });

    return this.connectingPromise;
  }

  getSocket() {
    if (!this.socket) {
      throw new Error("Socket not connected. Call connect() first.");
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

export const socketService = new SocketService();
