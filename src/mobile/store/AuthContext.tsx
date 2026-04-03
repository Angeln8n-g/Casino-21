import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '../services/authService';

// Feature: react-native-game-migration
// Requirements: 6.3, 6.4

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<{ error: string | null }>;
  signUp(email: string, password: string): Promise<{ error: string | null }>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore persisted session on mount
  useEffect(() => {
    let cancelled = false;

    authService.getSession().then((existingSession) => {
      if (!cancelled) {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const result = await authService.signIn(email, password);
      if (result.user) {
        const refreshed = await authService.getSession();
        setSession(refreshed);
        setUser(result.user);
      }
      return { error: result.error };
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const result = await authService.signUp(email, password);
      if (result.user) {
        const refreshed = await authService.getSession();
        setSession(refreshed);
        setUser(result.user);
      }
      return { error: result.error };
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    await authService.signOut();
    setSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the AuthContext from any component.
 * Throws if used outside of AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
