/**
 * Integration tests: complete flow
 * auth → socket connect → join room → game state update → play action
 *
 * Validates: Requirements 5.1, 5.7, 7.4
 *
 * Strategy: test at the service/store level without rendering React components.
 * All external I/O (Supabase, socket.io-client, AsyncStorage) is mocked.
 */

// ─── Mock @supabase/supabase-js ──────────────────────────────────────────────

const mockSignInWithPassword = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: mockGetSession,
      refreshSession: jest.fn(),
    },
  })),
}));

// ─── Mock AsyncStorage ───────────────────────────────────────────────────────

const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    asyncStorageStore[key] = value;
  }),
  getItem: jest.fn(async (key: string) => asyncStorageStore[key] ?? null),
  removeItem: jest.fn(async (key: string) => {
    delete asyncStorageStore[key];
  }),
}));

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

jest.mock('socket.io-client', () => ({ io: mockIo }));

// ─── Mock react-native ───────────────────────────────────────────────────────

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Make the mock socket auto-resolve the connect event synchronously. */
function makeSocketAutoConnect() {
  mockSocketOn.mockImplementation((event: string, handler: () => void) => {
    if (event === 'connect') {
      mockSocketConnected = true;
      handler();
    }
    return mockSocket;
  });
}

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import type { AuthService } from '../../services/authService';
import type { MobileSocketService } from '../../services/socketService';
import type { PersistenceService } from '../../services/persistenceService';
import { gameReducer, initialGameState } from '../../store/gameReducer';
import type { GameState } from '../../../domain/game-state';

// ─── Setup / Teardown ────────────────────────────────────────────────────────

let authService: AuthService;
let socketService: MobileSocketService;
let persistenceService: PersistenceService;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockSocketConnected = false;
  // Clear in-memory AsyncStorage
  Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);

  authService = require('../../services/authService').authService;
  socketService = require('../../services/socketService').socketService;
  persistenceService = require('../../services/persistenceService').persistenceService;
});

// ─── 1. Authentication flow ──────────────────────────────────────────────────

describe('Integration: authentication flow', () => {
  it('signIn returns a user and the session is retrievable afterwards', async () => {
    const fakeUser = { id: 'user-1', email: 'player@example.com' };
    const fakeSession = { access_token: 'tok-abc', user: fakeUser };

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: fakeUser, session: fakeSession },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession }, error: null });

    const signInResult = await authService.signIn('player@example.com', 'pass123');
    expect(signInResult.user).toEqual(fakeUser);
    expect(signInResult.error).toBeNull();

    const session = await authService.getSession();
    expect(session?.access_token).toBe('tok-abc');
  });

  it('signIn returns an error when credentials are invalid', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await authService.signIn('bad@example.com', 'wrong');
    expect(result.user).toBeNull();
    expect(result.error).toBe('Email o contraseña incorrectos');
  });
});

// ─── 2. Socket connection flow ───────────────────────────────────────────────

describe('Integration: socket connection flow', () => {
  it('connects to the socket server using the auth token', async () => {
    makeSocketAutoConnect();

    await socketService.connect('tok-abc');

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'tok-abc' } }),
    );
  });

  it('full auth → socket connect sequence works end-to-end', async () => {
    const fakeUser = { id: 'user-1', email: 'player@example.com' };
    const fakeSession = { access_token: 'tok-abc', user: fakeUser };

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: fakeUser, session: fakeSession },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession }, error: null });
    makeSocketAutoConnect();

    // Step 1: authenticate
    const signInResult = await authService.signIn('player@example.com', 'pass123');
    expect(signInResult.user).not.toBeNull();

    // Step 2: get session token
    const session = await authService.getSession();
    expect(session?.access_token).toBe('tok-abc');

    // Step 3: connect socket with that token
    const socket = await socketService.connect(session!.access_token);
    expect(socket).toBe(mockSocket);
    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'tok-abc' } }),
    );
  });
});

// ─── 3. Join room flow ───────────────────────────────────────────────────────

describe('Integration: join room flow', () => {
  it('emits join_room with the roomId and persists the roomId', async () => {
    makeSocketAutoConnect();
    mockSocketOnce.mockImplementation(() => mockSocket);

    await socketService.connect('tok-abc');

    const roomId = 'room-xyz';
    socketService.emit('join_room', { roomId });
    await persistenceService.saveRoomId(roomId);

    expect(mockSocketEmit).toHaveBeenCalledWith('join_room', { roomId });

    const savedRoomId = await persistenceService.getRoomId();
    expect(savedRoomId).toBe(roomId);
  });

  it('full auth → connect → join_room sequence', async () => {
    const fakeSession = { access_token: 'tok-abc', user: { id: 'u1' } };
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: fakeSession.user, session: fakeSession },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession }, error: null });
    makeSocketAutoConnect();
    mockSocketOnce.mockImplementation(() => mockSocket);

    await authService.signIn('player@example.com', 'pass123');
    const session = await authService.getSession();
    await socketService.connect(session!.access_token);

    const roomId = 'room-42';
    socketService.emit('join_room', { roomId });
    await persistenceService.saveRoomId(roomId);

    expect(mockSocketEmit).toHaveBeenCalledWith('join_room', { roomId });
    expect(await persistenceService.getRoomId()).toBe(roomId);
  });
});

// ─── 4. Game state update flow ───────────────────────────────────────────────

describe('Integration: game state update flow', () => {
  it('gameReducer processes a SET_GAME_STATE action and reflects the new state', () => {
    const serverGameState = {
      id: 'game-1',
      phase: 'playing',
      players: [{ id: 'u1', score: 0 }],
    } as unknown as GameState;

    const newState = gameReducer(initialGameState, {
      type: 'SET_GAME_STATE',
      payload: serverGameState,
    });

    expect(newState.gameState).toBe(serverGameState);
    expect(newState.gameState?.id).toBe('game-1');
  });

  it('sequential game state updates reflect the latest server state', () => {
    const firstUpdate = { id: 'game-1', phase: 'dealing' } as unknown as GameState;
    const secondUpdate = { id: 'game-1', phase: 'playing' } as unknown as GameState;

    let state = gameReducer(initialGameState, { type: 'SET_GAME_STATE', payload: firstUpdate });
    expect(state.gameState?.phase).toBe('dealing');

    state = gameReducer(state, { type: 'SET_GAME_STATE', payload: secondUpdate });
    expect(state.gameState?.phase).toBe('playing');
  });

  it('game_state_update handler registered via socketService.on dispatches to reducer', async () => {
    makeSocketAutoConnect();
    await socketService.connect('tok-abc');

    // Capture the handler registered for 'game_state_update'
    const registeredHandlers: Record<string, (data: unknown) => void> = {};
    mockSocketOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'connect') {
        mockSocketConnected = true;
        (handler as () => void)();
      } else {
        registeredHandlers[event] = handler as (data: unknown) => void;
      }
      return mockSocket;
    });

    // Register a game_state_update listener (simulating GameContext behaviour)
    let capturedState = initialGameState;
    socketService.on('game_state_update', (data) => {
      capturedState = gameReducer(capturedState, {
        type: 'SET_GAME_STATE',
        payload: data as GameState,
      });
    });

    // Simulate server emitting game_state_update
    const serverUpdate = { id: 'game-1', phase: 'playing' } as unknown as GameState;
    const handler = mockSocketOn.mock.calls.find(
      ([event]: [string]) => event === 'game_state_update',
    )?.[1] as ((data: unknown) => void) | undefined;

    expect(handler).toBeDefined();
    handler!(serverUpdate);

    expect(capturedState.gameState).toEqual(serverUpdate);
  });
});

// ─── 5. Play action flow ─────────────────────────────────────────────────────

describe('Integration: play action flow', () => {
  it('emits play_action with the action data', async () => {
    makeSocketAutoConnect();
    await socketService.connect('tok-abc');

    const actionData = { type: 'play', cardId: 'card-5', targetId: null };
    socketService.emit('play_action', actionData);

    expect(mockSocketEmit).toHaveBeenCalledWith('play_action', actionData);
  });

  it('full flow: auth → connect → join_room → game_state_update → play_action', async () => {
    // 1. Auth
    const fakeSession = { access_token: 'tok-abc', user: { id: 'u1' } };
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: fakeSession.user, session: fakeSession },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession }, error: null });
    makeSocketAutoConnect();
    mockSocketOnce.mockImplementation(() => mockSocket);

    const signInResult = await authService.signIn('player@example.com', 'pass123');
    expect(signInResult.error).toBeNull();

    // 2. Connect socket
    const session = await authService.getSession();
    await socketService.connect(session!.access_token);
    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'tok-abc' } }),
    );

    // 3. Join room
    const roomId = 'room-99';
    socketService.emit('join_room', { roomId });
    await persistenceService.saveRoomId(roomId);
    expect(mockSocketEmit).toHaveBeenCalledWith('join_room', { roomId });
    expect(await persistenceService.getRoomId()).toBe(roomId);

    // 4. Simulate game_state_update from server → reducer processes it
    const serverGameState = { id: 'game-1', phase: 'playing' } as unknown as GameState;
    let gameState = gameReducer(initialGameState, {
      type: 'SET_GAME_STATE',
      payload: serverGameState,
    });
    expect(gameState.gameState?.id).toBe('game-1');

    // 5. Play action
    const actionData = { type: 'play', cardId: 'card-3', targetId: 'formation-1' };
    socketService.emit('play_action', actionData);
    expect(mockSocketEmit).toHaveBeenCalledWith('play_action', actionData);
  });
});
