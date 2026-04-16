import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.PROD && typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4000'
);

class SocketService {
  private socket: Socket | null = null;
  /** Tracks the current room the user is in (for presence) */
  public currentRoomId: string | null = null;

  async connect() {
    if (!this.socket || !this.socket.connected) {
      // Obtener el token JWT de Supabase
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        console.error("No se encontró token JWT. El usuario debe iniciar sesión.");
        throw new Error("No autenticado");
      }

      // Si ya hay un socket pero está desconectado, lo limpiamos
      if (this.socket) {
        this.socket.disconnect();
      }

      return new Promise<Socket>((resolve, reject) => {
        this.socket = io(SOCKET_URL, {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
        });

        this.socket.on('connect', () => {
          resolve(this.socket!);
        });

        // Track room changes for presence
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
          console.error("Error conectando el socket:", err.message);
          reject(err);
        });
      });
    }
    return this.socket;
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
