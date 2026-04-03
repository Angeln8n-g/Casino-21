import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Lazy-initialized singleton client
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

function mapErrorToSpanish(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('wrong password') ||
    lower.includes('email not confirmed') ||
    lower.includes('invalid email or password')
  ) {
    return 'Email o contraseña incorrectos';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already registered') ||
    lower.includes('email already in use') ||
    lower.includes('already exists')
  ) {
    return 'Este email ya está registrado';
  }
  return 'Error de autenticación. Intenta de nuevo.';
}

function validateCredentials(email: string, password: string): string | null {
  if (!email || email.trim() === '') {
    return 'El email no puede estar vacío';
  }
  if (!password || password.trim() === '') {
    return 'La contraseña no puede estar vacía';
  }
  return null;
}

export interface AuthService {
  signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }>;
  signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  refreshSession(): Promise<Session | null>;
}

class AuthServiceImpl implements AuthService {
  async signIn(
    email: string,
    password: string,
  ): Promise<{ user: User | null; error: string | null }> {
    const validationError = validateCredentials(email, password);
    if (validationError) {
      return { user: null, error: validationError };
    }

    const { data, error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) {
      return { user: null, error: mapErrorToSpanish(error.message) };
    }
    return { user: data.user, error: null };
  }

  async signUp(
    email: string,
    password: string,
  ): Promise<{ user: User | null; error: string | null }> {
    const validationError = validateCredentials(email, password);
    if (validationError) {
      return { user: null, error: validationError };
    }

    const { data, error } = await getClient().auth.signUp({ email, password });
    if (error) {
      return { user: null, error: mapErrorToSpanish(error.message) };
    }
    return { user: data.user, error: null };
  }

  async signOut(): Promise<void> {
    await getClient().auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const { data } = await getClient().auth.getSession();
    return data.session;
  }

  async refreshSession(): Promise<Session | null> {
    const { data } = await getClient().auth.refreshSession();
    return data.session;
  }
}

export const authService: AuthService = new AuthServiceImpl();
