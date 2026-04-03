// Feature: react-native-game-migration
// Requirements: 9.3, 11.3
import { useEffect } from 'react';
import { authService } from '../services/authService';
import { persistenceService } from '../services/persistenceService';
import { socketService } from '../services/socketService';

/**
 * On app start, if there is an active session and a saved roomId,
 * automatically reconnect the socket and rejoin the room.
 * If reconnection fails, clears the saved roomId silently.
 * Requirements: 9.3
 */
export function useAutoReconnect(): void {
  useEffect(() => {
    let cancelled = false;

    async function tryReconnect(): Promise<void> {
      try {
        const session = await authService.getSession();
        if (cancelled || !session?.access_token) return;

        const roomId = await persistenceService.getRoomId();
        if (cancelled || !roomId) return;

        await socketService.reconnect(roomId);
      } catch {
        // Reconnect failed (timeout, server down, etc.) — clear stale roomId silently
        try {
          await persistenceService.clearRoomId();
        } catch {
          // ignore
        }
      }
    }

    tryReconnect();

    return () => {
      cancelled = true;
    };
  }, []);
}
