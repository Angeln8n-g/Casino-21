import { supabase } from './supabase';
import { appEvents } from '../utils/events';

export function getBackendBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }
  if (process.env.VITE_SOCKET_URL) {
    return process.env.VITE_SOCKET_URL;
  }
  if (typeof window !== 'undefined' && (window as any).location?.origin && !(window as any).location.origin.includes(':3000')) {
    return (window as any).location.origin;
  }
  return 'http://localhost:4000';
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function joinTournamentEvent(eventId: string): Promise<{
  success: boolean;
  error?: string;
  new_pot?: number;
  participants_count?: number;
  should_start?: boolean;
  bracketStarted?: boolean;
  recreatedEventId?: string | null;
}> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/tournament/event/${eventId}/join`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'No se pudo completar la inscripción' };
    }
    appEvents.emit('coins_updated');
    appEvents.emit('tournament_refresh');
    return { ...data, success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión con el servidor' };
  }
}

export async function leaveTournamentEvent(eventId: string): Promise<{
  success: boolean;
  error?: string;
  refunded_coins?: number;
  new_pot?: number;
}> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/tournament/event/${eventId}/leave`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'No se pudo cancelar la inscripción' };
    }
    appEvents.emit('coins_updated');
    appEvents.emit('tournament_refresh');
    return { ...data, success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión con el servidor' };
  }
}

export async function checkInTournamentEvent(eventId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/tournament/event/${eventId}/check-in`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'No se pudo confirmar el Check-in' };
    }
    appEvents.emit('tournament_refresh');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión con el servidor' };
  }
}

export async function claimTournamentWalkoverApi(matchId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/tournament/match/${matchId}/claim-walkover`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'Aún no se cumple el tiempo reglamentario' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de conexión al reclamar Walkover' };
  }
}

export async function inviteTournamentOpponentApi(payload: {
  opponentId: string;
  roomId: string;
  eventTitle: string;
  senderName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/tournament/invite-opponent`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error || 'No se pudo enviar el aviso' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de red al enviar el aviso' };
  }
}
