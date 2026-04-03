/**
 * Unit tests for SocketService
 * Validates: Requirements 5.1, 5.3
 */

// ─── Mock socket.io-client ───────────────────────────────────────────────────

const mockSocketOn = jest.fn();
const mockSocketOff = jest.fn();
const mockSocketEmit = jest.fn();
const mockSocketDisconnect = jest.fn();
const mockSocketOnce = jest.fn();

let mockSocketConnected = false;

const mockSocket = {
  get connected() {
    return mockSocketConnected;
  },
  on: mockSocketOn,
  off: mockSocketOff,
  emit: mockSocketEmit,
  disconnect: mockSocketDisconnect,
  once: mockSocketOnce,
};

const mockIo = jest.fn(() => mockSocket);

jest.mock('socket.io-client', () => ({
  io: mockIo,
}));

// ─── Mock react-native ───────────────────────────────────────────────────────

const mockAddEventListener = jest.fn(() => ({ remove: jest.fn() }));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: mockAddEventListener,
    currentState: 'active',
  },
}));

// ─── Mock authService ────────────────────────────────────────────────────────

const mockGetSession = jest.fn();

jest.mock('../../services/authService', () => ({
  authService: {
    getSession: mockGetSession,
  },
}));

// ─── Mock persistenceService ─────────────────────────────────────────────────

const mockGetRoomId = jest.fn();
const mockClearRoomId = jest.fn();

jest.mock('../../services/persistenceService', () => ({
  persistenceService: {
    getRoomId: mockGetRoomId,
    clearRoomId: mockClearRoomId,
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Configure mockSocketOn so that calling on('connect', handler) immediately
 * invokes the handler synchronously, allowing connect() to resolve.
 */
function makeSocketAutoConnect() {
  mockSocketOn.mockImplementation((event: string, handler: () => void) => {
    if (event === 'connect') {
      mockSocketConnected = true;
      handler();
    }
    return mockSocket;
  });
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

let socketService: import('../../services/socketService').MobileSocketService;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockSocketConnected = false;

  // Re-import to get a fresh SocketServiceImpl instance (resets private state)
  socketService = require('../../services/socketService').socketService;
});

// ─── connect() ───────────────────────────────────────────────────────────────

describe('SocketService.connect', () => {
  it('creates a socket with the correct auth token', async () => {
    makeSocketAutoConnect();

    await socketService.connect('my-token');

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'my-token' } }),
    );
  });

  it('resolves with the socket when the connect event fires', async () => {
    makeSocketAutoConnect();

    const result = await socketService.connect('tok-123');

    expect(result).toBe(mockSocket);
  });

  it('returns the existing socket if already connected', async () => {
    makeSocketAutoConnect();

    await socketService.connect('tok-1');
    mockIo.mockClear();

    // socket is now "connected" — second call should short-circuit
    const result = await socketService.connect('tok-2');

    expect(mockIo).not.toHaveBeenCalled();
    expect(result).toBe(mockSocket);
  });
});

// ─── emit() ──────────────────────────────────────────────────────────────────

describe('SocketService.emit', () => {
  it('sends the event and data to the socket', async () => {
    makeSocketAutoConnect();
    await socketService.connect('tok');

    socketService.emit('test_event', { value: 42 });

    expect(mockSocketEmit).toHaveBeenCalledWith('test_event', { value: 42 });
  });

  it('throws if socket is not connected', () => {
    expect(() => socketService.emit('test_event', {})).toThrow(
      'Socket not connected. Call connect() first.',
    );
  });
});

// ─── on() ────────────────────────────────────────────────────────────────────

describe('SocketService.on', () => {
  it('registers an event handler on the socket', async () => {
    makeSocketAutoConnect();
    await socketService.connect('tok');

    const handler = jest.fn();
    socketService.on('game_update', handler);

    expect(mockSocketOn).toHaveBeenCalledWith('game_update', handler);
  });

  it('throws if socket is not connected', () => {
    expect(() => socketService.on('game_update', jest.fn())).toThrow(
      'Socket not connected. Call connect() first.',
    );
  });
});

// ─── off() ───────────────────────────────────────────────────────────────────

describe('SocketService.off', () => {
  it('removes an event handler from the socket', async () => {
    makeSocketAutoConnect();
    await socketService.connect('tok');

    socketService.off('game_update');

    expect(mockSocketOff).toHaveBeenCalledWith('game_update');
  });

  it('throws if socket is not connected', () => {
    expect(() => socketService.off('game_update')).toThrow(
      'Socket not connected. Call connect() first.',
    );
  });
});

// ─── disconnect() ────────────────────────────────────────────────────────────

describe('SocketService.disconnect', () => {
  it('disconnects the socket and clears it', async () => {
    makeSocketAutoConnect();
    await socketService.connect('tok');

    socketService.disconnect();

    expect(mockSocketDisconnect).toHaveBeenCalledTimes(1);

    // After disconnect, emit should throw (socket is null)
    expect(() => socketService.emit('any', {})).toThrow(
      'Socket not connected. Call connect() first.',
    );
  });
});

// ─── reconnect() ─────────────────────────────────────────────────────────────

describe('SocketService.reconnect', () => {
  it('calls connect() and emits join_room with the roomId', async () => {
    makeSocketAutoConnect();
    mockGetSession.mockResolvedValue({ access_token: 'fresh-token' });
    // once() should not interfere
    mockSocketOnce.mockImplementation(() => mockSocket);

    await socketService.reconnect('room-42');

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'fresh-token' } }),
    );
    expect(mockSocketEmit).toHaveBeenCalledWith('join_room', { roomId: 'room-42' });
  });

  it('throws when there is no active session', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(socketService.reconnect('room-42')).rejects.toThrow('No active session');
  });
});

// ─── connect_error handling ──────────────────────────────────────────────────

describe('SocketService connect_error', () => {
  it('registers a connect_error handler that logs the error (socket.io auto-retries)', async () => {
    makeSocketAutoConnect();

    await socketService.connect('tok');

    // Verify connect_error was registered (socket.io will auto-retry)
    const connectErrorCall = mockSocketOn.mock.calls.find(
      ([event]: [string]) => event === 'connect_error',
    );
    expect(connectErrorCall).toBeDefined();

    // Calling the handler should not throw
    const handler = connectErrorCall![1] as (err: Error) => void;
    expect(() => handler(new Error('network error'))).not.toThrow();
  });
});

// ─── player_disconnected ─────────────────────────────────────────────────────

describe('SocketService player_disconnected', () => {
  it('can be listened to via on()', async () => {
    makeSocketAutoConnect();
    await socketService.connect('tok');

    const handler = jest.fn();
    socketService.on('player_disconnected', handler);

    expect(mockSocketOn).toHaveBeenCalledWith('player_disconnected', handler);
  });
});
