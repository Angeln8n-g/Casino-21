// Feature: react-native-game-migration, Property 10: Limpieza de roomId ante fallo de reconexión

import * as fc from 'fast-check';

// --- Mock socket.io-client ---
const mockSocketEmit = jest.fn();
const mockSocketOff = jest.fn();
const mockSocketDisconnect = jest.fn();

// Registry for once() handlers keyed by event name
let onceHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};

const mockSocketOn = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
  if (event === 'connect') {
    // Resolve connect() immediately
    handler();
  }
});

const mockSocketOnce = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
  if (!onceHandlers[event]) onceHandlers[event] = [];
  onceHandlers[event].push(handler);
});

const mockSocket = {
  emit: mockSocketEmit,
  on: mockSocketOn,
  once: mockSocketOnce,
  off: mockSocketOff,
  disconnect: mockSocketDisconnect,
  connected: false,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}), { virtual: true });

// --- Mock react-native AppState ---
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
}), { virtual: true });

// --- Mock authService ---
jest.mock('../../services/authService', () => ({
  authService: {
    getSession: jest.fn(),
  },
}));

// --- Mock persistenceService ---
const mockClearRoomId = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/persistenceService', () => ({
  persistenceService: {
    getRoomId: jest.fn(),
    clearRoomId: mockClearRoomId,
  },
}));

import { authService } from '../../services/authService';
import { persistenceService } from '../../services/persistenceService';

// Helper: simulate the server emitting join_room_error
async function simulateJoinRoomError(): Promise<void> {
  const handlers = onceHandlers['join_room_error'] ?? [];
  for (const h of handlers) {
    await h({ message: 'Room not found' });
  }
  // Flush microtasks
  await Promise.resolve();
  await Promise.resolve();
}

describe('Property 10: Limpieza de roomId ante fallo de reconexión', () => {
  // **Validates: Requirements 9.5**

  let socketService: import('../../services/socketService').MobileSocketService;

  beforeAll(() => {
    // Import once — the singleton is created here
    socketService = require('../../services/socketService').socketService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockClearRoomId.mockResolvedValue(undefined);
    onceHandlers = {};
    mockSocket.connected = false;

    // Restore on() to trigger connect immediately
    mockSocketOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'connect') {
        handler();
      }
    });

    // Restore once() to register handlers
    mockSocketOnce.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (!onceHandlers[event]) onceHandlers[event] = [];
      onceHandlers[event].push(handler);
    });

    // Default: valid session
    (authService.getSession as jest.Mock).mockResolvedValue({
      access_token: 'test-token',
    });
  });

  it('llama a clearRoomId cuando el servidor responde con join_room_error para cualquier roomId', async () => {
    // **Validates: Requirements 9.5**
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (roomId) => {
          // Reset state for each run
          jest.clearAllMocks();
          mockClearRoomId.mockResolvedValue(undefined);
          onceHandlers = {};
          mockSocket.connected = false;

          mockSocketOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
            if (event === 'connect') {
              handler();
            }
          });

          mockSocketOnce.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
            if (!onceHandlers[event]) onceHandlers[event] = [];
            onceHandlers[event].push(handler);
          });

          (authService.getSession as jest.Mock).mockResolvedValue({
            access_token: 'test-token',
          });

          // Trigger reconnect — registers join_room_error once handler
          await socketService.reconnect(roomId);

          // Simulate server responding with error
          await simulateJoinRoomError();

          // clearRoomId must have been called
          expect(mockClearRoomId).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clearRoomId es invocado exactamente una vez por fallo de join_room', async () => {
    // **Validates: Requirements 9.5**
    const roomId = 'room-abc-123';

    await socketService.reconnect(roomId);
    await simulateJoinRoomError();

    expect(mockClearRoomId).toHaveBeenCalledTimes(1);
  });

  it('clearRoomId no es invocado si no hay error de join_room', async () => {
    // **Validates: Requirements 9.5**
    const roomId = 'room-xyz-456';

    await socketService.reconnect(roomId);
    // Do NOT simulate join_room_error

    await Promise.resolve();
    await Promise.resolve();

    expect(mockClearRoomId).not.toHaveBeenCalled();
  });
});
