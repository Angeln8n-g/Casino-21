import { supabase } from './supabase';
import { socketService } from './socket';

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Handles self-service permanent account deletion / unsubscription (GDPR / Right to be forgotten).
 * 1. Executes PostgreSQL RPC delete_user_account() (with cascaded foreign-key unlinking)
 * 2. Falls back to backend endpoint /api/user/delete-account if RPC fails
 * 3. Cleans up socket connections, local storage tokens, and Supabase auth session
 */
export async function requestAccountDeletion(feedbackReason?: string): Promise<DeleteAccountResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No hay una sesión de usuario activa');
    }

    // 1. Intentar llamar al procedimiento RPC en Supabase
    const { error: rpcError } = await supabase.rpc('delete_user_account');

    if (rpcError) {
      // 2. Si falla el RPC (ej. versión de DB o permisos de red), recurrir al backend Node.js
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const baseUrl =
        import.meta.env.VITE_SOCKET_URL ||
        (import.meta.env.PROD && typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:4000');

      const res = await fetch(`${baseUrl}/api/user/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: feedbackReason }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || rpcError.message || 'Error al procesar la baja de usuario');
      }
    }

    // 3. Desconectar WebSockets de partidas/chat en vivo
    try {
      socketService.disconnect();
    } catch (_) {}

    // 4. Limpieza estricta de local storage y tokens de sesión
    try {
      localStorage.removeItem('casino21_roomId');
      localStorage.removeItem('casino21_token');
      localStorage.removeItem('casino21_sound_settings');
      sessionStorage.clear();
    } catch (_) {}

    // 5. Cerrar sesión de Supabase Auth en el cliente
    try {
      await supabase.auth.signOut();
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error inesperado al darse de baja',
    };
  }
}
