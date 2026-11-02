import { supabase } from './supabase';
import { socketService } from './socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Gestiona la baja permanente y eliminación de cuenta de usuario (GDPR).
 * 1. Ejecuta el RPC delete_user_account() en Supabase.
 * 2. Si falla, recurre al endpoint REST /api/user/delete-account del backend.
 * 3. Desconecta socket y limpia AsyncStorage y sesión de Supabase.
 */
export async function requestAccountDeletion(feedbackReason?: string): Promise<DeleteAccountResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No hay una sesión de usuario activa');
    }

    // 1. Procedimiento RPC en Supabase
    const { error: rpcError } = await supabase.rpc('delete_user_account');

    if (rpcError) {
      // 2. Fallback a la API backend
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const baseUrl =
        process.env.EXPO_PUBLIC_SOCKET_URL ||
        process.env.VITE_SOCKET_URL ||
        'http://localhost:4000';

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
        throw new Error(
          errorData.error || rpcError.message || 'Error al procesar la baja de usuario'
        );
      }
    }

    // 3. Desconectar socket
    try {
      socketService.disconnect();
    } catch (_) {}

    // 4. Limpieza de tokens y datos locales
    try {
      await AsyncStorage.multiRemove([
        'casino21_roomId',
        'casino21_token',
        'casino21_sound_settings',
        'k21_preferred_font',
      ]);
    } catch (_) {}

    // 5. Cerrar sesión de Supabase
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
