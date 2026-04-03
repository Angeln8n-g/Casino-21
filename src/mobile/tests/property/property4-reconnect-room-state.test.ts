// Feature: react-native-game-migration, Property 4: Reconexión restaura el estado de sala

import * as fc from 'fast-check';

// --- Mock socket.io-client ---
const mockSocketEmit = jest.fn();
const mockSocketOn = jest.fn();
const mockSocketOff = jest.fn();
const mockSocketDisconnect = jest.fn();

const mockSocketOnce = jest.fn();

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
}));

// --- Mock react-native AppState ---
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
}));

// --- Mock authService ---
jest.mock('../../services/authService', () => ({
  authService: {
    getSession: jest.fn(),
  },
}));

// --- Mock persistenceService ---
jest.mock('../../services/persistenceService', () => ({
  persistenceService: {
    getRoomId: jest.fn(),
  },
}));

import { authService } from '../../services/authService';
import { persistenceService } from '../../services/persistenceService';

describe('Property 4: Reconexión restaura el estado de sala', () => {
  // **Validates: Requirements 9.3, 5.5**

  beforeEach(() => {
    jest.clearAllMocks();

    // Make mockSocket.on call the 'connect' handler synchronously
    mockSocketOn.mockImplementation((event: string, handler: () => void) => {
      if (event === 'connect') {
        handler();
      }
    });

    // Reset connected state
    mockSocket.connected = false;
  });

  it('emite join_room con el roomId correcto tras reconexión para roomIds arbitrarios', async () => {
    // **Validates: Requirements 9.3, 5.5**
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (roomId) => {
          jest.clearAllMocks();

          // Restore synchronous connect handler after clearAllMocks
          mockSocketOn.mockImplementation((event: string, handler: () => void) => {
            if (event === 'connect') {
              handler();
            }
          });
          mockSocket.connected = false;

          // Mock session with access_token
          (authService.getSession as jest.Mock).mockResolvedValue({
            access_token: 'test-token-abc',
          });

          // Mock persistenceService.getRoomId (not used by reconnect directly, but available)
          (persistenceService.getRoomId as jest.Mock).mockResolvedValue(roomId);

          // Import socketService fresh via require to get the singleton
          // We need to reset the internal socket state between runs
          // Since it's a singleton, we call disconnect first via the service
          const { socketService } = require('../../services/socketService');

          // Call reconnect with the arbitrary roomId
          await socketService.reconnect(roomId);

          // Verify join_room was emitted with the correct roomId
          expect(mockSocketEmit).toHaveBeenCalledWith('join_room', { roomId });
        }
      ),
      { numRuns: 100 }
    );
  });
});
