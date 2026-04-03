// Feature: react-native-game-migration, Property 7: Validación de entrada vacía en autenticación

import * as fc from 'fast-check';

// Mock @supabase/supabase-js before importing authService
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Import after mocks are set up
import { authService } from '../../services/authService';

describe('Property 7: Validación de entrada vacía en autenticación', () => {
  // **Validates: Requirements 6.5**

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signIn con email de solo espacios retorna error sin llamar a Supabase', async () => {
    // **Validates: Requirements 6.5**
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => s.trim() === ''),
        fc.string().filter((s) => s.trim() !== ''),
        async (whitespaceEmail, validPassword) => {
          mockSignInWithPassword.mockClear();

          const result = await authService.signIn(whitespaceEmail, validPassword);

          // Error must be returned, user must be null
          expect(result.error).not.toBeNull();
          expect(result.user).toBeNull();

          // Supabase must never be called
          expect(mockSignInWithPassword).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('signIn con contraseña de solo espacios retorna error sin llamar a Supabase', async () => {
    // **Validates: Requirements 6.5**
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => s.trim() !== ''),
        fc.string().filter((s) => s.trim() === ''),
        async (validEmail, whitespacePassword) => {
          mockSignInWithPassword.mockClear();

          const result = await authService.signIn(validEmail, whitespacePassword);

          // Error must be returned, user must be null
          expect(result.error).not.toBeNull();
          expect(result.user).toBeNull();

          // Supabase must never be called
          expect(mockSignInWithPassword).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
