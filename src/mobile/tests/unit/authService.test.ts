/**
 * Unit tests for AuthService
 * Validates: Requirements 6.1, 6.3, 6.4
 */

// Mock @supabase/supabase-js before any imports
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();

const mockAuthClient = {
  signInWithPassword: mockSignInWithPassword,
  signUp: mockSignUp,
  signOut: mockSignOut,
  getSession: mockGetSession,
  refreshSession: mockRefreshSession,
};

const mockSupabaseClient = {
  auth: mockAuthClient,
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@react-native-async-storage/async-storage');

import type { AuthService } from '../../services/authService';

// Reset the lazy singleton between tests by re-requiring the module
let authService: AuthService;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  // Re-import to reset the lazy singleton _client
  authService = require('../../services/authService').authService;
});

// ─── signIn ──────────────────────────────────────────────────────────────────

describe('AuthService.signIn', () => {
  it('returns user when credentials are valid', async () => {
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: fakeUser, session: {} },
      error: null,
    });

    const result = await authService.signIn('test@example.com', 'password123');

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.user).toEqual(fakeUser);
    expect(result.error).toBeNull();
  });

  it('returns Spanish error message when credentials are invalid', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await authService.signIn('bad@example.com', 'wrongpass');

    expect(result.user).toBeNull();
    expect(result.error).toBe('Email o contraseña incorrectos');
  });

  it('returns error without calling Supabase when email is empty', async () => {
    const result = await authService.signIn('', 'password123');

    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(result.user).toBeNull();
    expect(result.error).toBe('El email no puede estar vacío');
  });

  it('returns error without calling Supabase when password is empty', async () => {
    const result = await authService.signIn('test@example.com', '');

    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(result.user).toBeNull();
    expect(result.error).toBe('La contraseña no puede estar vacía');
  });
});

// ─── signOut ─────────────────────────────────────────────────────────────────

describe('AuthService.signOut', () => {
  it('calls supabase auth.signOut', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });

    await authService.signOut();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

// ─── getSession ──────────────────────────────────────────────────────────────

describe('AuthService.getSession', () => {
  it('returns the current session', async () => {
    const fakeSession = { access_token: 'tok', user: { id: 'u1' } };
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession }, error: null });

    const session = await authService.getSession();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(session).toEqual(fakeSession);
  });

  it('returns null when there is no active session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    const session = await authService.getSession();

    expect(session).toBeNull();
  });
});

// ─── refreshSession ──────────────────────────────────────────────────────────

describe('AuthService.refreshSession', () => {
  it('calls auth.refreshSession and returns the new session', async () => {
    const newSession = { access_token: 'new-tok', user: { id: 'u1' } };
    mockRefreshSession.mockResolvedValueOnce({ data: { session: newSession }, error: null });

    const session = await authService.refreshSession();

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(session).toEqual(newSession);
  });
});

// ─── signUp ──────────────────────────────────────────────────────────────────

describe('AuthService.signUp', () => {
  it('returns user when registration succeeds with valid credentials', async () => {
    const fakeUser = { id: 'user-2', email: 'new@example.com' };
    mockSignUp.mockResolvedValueOnce({
      data: { user: fakeUser, session: null },
      error: null,
    });

    const result = await authService.signUp('new@example.com', 'securePass1');

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'securePass1',
    });
    expect(result.user).toEqual(fakeUser);
    expect(result.error).toBeNull();
  });

  it('returns Spanish error message when email is already registered', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const result = await authService.signUp('existing@example.com', 'pass123');

    expect(result.user).toBeNull();
    expect(result.error).toBe('Este email ya está registrado');
  });
});
