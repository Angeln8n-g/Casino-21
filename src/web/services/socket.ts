import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';

const SOCKET_URL = 'http://localhost:4000'; // Asegúrate de que coincida con el puerto de tu servidor

class SocketService {
  private socket: Socket | null = null;

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
          }
        });

        this.socket.on('connect', () => {
          resolve(this.socket!);
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
