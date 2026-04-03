// Feature: react-native-game-migration
// Requirements: 8.5
import { useCallback } from 'react';
import { socketService } from '../services/socketService';

/**
 * Hook that provides stable references to socketService methods.
 * Wraps each method in useCallback so consumers don't re-render on every call.
 */
export function useSocket() {
  const emit = useCallback((event: string, data: unknown) => {
    socketService.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (data: unknown) => void) => {
    socketService.on(event, handler);
  }, []);

  const off = useCallback((event: string) => {
    socketService.off(event);
  }, []);

  const reconnect = useCallback((roomId: string) => {
    return socketService.reconnect(roomId);
  }, []);

  const connect = useCallback((token: string) => {
    return socketService.connect(token);
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  return { emit, on, off, reconnect, connect, disconnect };
}
