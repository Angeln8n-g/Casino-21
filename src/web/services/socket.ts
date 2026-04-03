import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;

  async connect(signal?: AbortSignal) {
    if (this.socket?.connected) return this.socket;

    // Si ya hay un socket pero está desconectado, lo limpiamos
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Obtener el token JWT de Supabase
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("No autenticado");
    }

    // Si el caller ya canceló (componente desmontado), no conectar
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    return new Promise<Socket>((resolve, reject) => {
      const onAbort = () => {
        this.socket?.disconnect();
        this.socket = null;
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      this.socket = io(SOCKET_URL, { auth: { token } });

      this.socket.on('connect', () => {
        signal?.removeEventListener('abort', onAbort);
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (err) => {
        signal?.removeEventListener('abort', onAbort);
        console.error("Error conectando el socket:", err.message);
        reject(err);
      });
    });
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
