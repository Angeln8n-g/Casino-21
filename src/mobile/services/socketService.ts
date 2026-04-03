import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { authService } from './authService';
import { persistenceService } from './persistenceService';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:4000';
const RECONNECTION_DELAY = 1500;
const BACKGROUND_DISCONNECT_TIMEOUT = 30000; // 30 seconds

export interface MobileSocketService {
  connect(token: string): Promise<Socket>;
  disconnect(): void;
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string): void;
  reconnect(roomId: string): Promise<void>;
}

class SocketServiceImpl implements MobileSocketService {
  private socket: Socket | null = null;
  private backgroundTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  constructor() {
    this.setupAppStateListener();
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background') {
      // Start 30s timer before disconnecting
      this.backgroundTimer = setTimeout(() => {
        if (AppState.currentState === 'background') {
          this.disconnect();
        }
      }, BACKGROUND_DISCONNECT_TIMEOUT);
    } else if (nextAppState === 'active') {
      // Clear background timer if returning to foreground
      if (this.backgroundTimer) {
        clearTimeout(this.backgroundTimer);
        this.backgroundTimer = null;
      }

      // Reconnect if socket is disconnected
      if (!this.socket || !this.socket.connected) {
        this.handleForegroundReconnect();
      }
    }
  }

  private async handleForegroundReconnect(): Promise<void> {
    try {
      const session = await authService.getSession();
      if (!session?.access_token) return;

      const roomId = await persistenceService.getRoomId();
      if (!roomId) return; // No saved room — nothing to reconnect to

      await this.reconnect(roomId);
    } catch {
      // Silently ignore — user can rejoin manually
    }
  }

  async connect(token: string): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Clean up existing disconnected socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    return new Promise<Socket>((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        reconnectionDelay: RECONNECTION_DELAY,
        // Disable auto-reconnection — we handle it manually
        reconnection: false,
      });

      const timeout = setTimeout(() => {
        if (!this.socket?.connected) {
          this.socket?.disconnect();
          this.socket = null;
          reject(new Error('Connection timeout'));
        }
      }, 5000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        resolve(this.socket!);
      });

      // Suppress connect_error from appearing as red errors in the console
      this.socket.on('connect_error', () => {
        // intentionally silent — timeout above handles the failure
      });
    });
  }

  disconnect(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: unknown): void {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }
    this.socket.emit(event, data);
  }

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }
    this.socket.on(event, handler);
  }

  off(event: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }
    this.socket.off(event);
  }

  async reconnect(roomId: string): Promise<void> {
    // Disconnect existing socket
    this.disconnect();

    // Get fresh token
    const session = await authService.getSession();
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    // Reconnect with fresh token
    await this.connect(session.access_token);

    // Emit join_room with saved roomId
    this.emit('join_room', { roomId });

    // Listen for join_room_error: if server rejects, clear the saved roomId
    this.socket!.once('join_room_error', async () => {
      await persistenceService.clearRoomId();
    });
  }

  // Cleanup method for when service is destroyed
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.disconnect();
  }
}

export const socketService: MobileSocketService = new SocketServiceImpl();
