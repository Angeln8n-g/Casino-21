export interface FriendData {
  id: string;
  friendship_id?: string;
  username: string;
  avatar_url?: string | null;
  equipped_avatar?: string | null;
  elo: number;
  level: number;
  wins?: number;
  losses?: number;
  xp?: number;
  last_seen_at?: string | null;
  current_room_id?: string | null;
}

export interface IncomingRequest {
  id: string;
  sender_id: string;
  sender: {
    id: string;
    username: string;
    avatar_url?: string | null;
    equipped_avatar?: string | null;
    elo: number;
    level: number;
    wins?: number;
    losses?: number;
    xp?: number;
  };
}

export interface SentRequest {
  id: string;
  receiver_id: string;
  receiver: {
    id: string;
    username: string;
    avatar_url?: string | null;
    equipped_avatar?: string | null;
    elo: number;
    level: number;
  };
}

export type RelationshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export interface SearchPlayerData {
  id: string;
  username: string;
  avatar_url?: string | null;
  equipped_avatar?: string | null;
  elo: number;
  level: number;
  wins?: number;
  losses?: number;
  xp?: number;
  relationshipStatus: RelationshipStatus;
  requestId?: string;
}

export function resolveAvatarUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/storage/v1/object/public/')) {
    const supaUrl = (
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      ''
    ).replace(/\/$/, '');
    return supaUrl ? `${supaUrl}${trimmed}` : trimmed;
  }
  if (trimmed.startsWith('/')) {
    const baseUrl = (
      process.env.EXPO_PUBLIC_SOCKET_URL ||
      process.env.VITE_SOCKET_URL ||
      'https://kasino21.com'
    ).replace(/\/$/, '');
    return `${baseUrl}${trimmed}`;
  }
  return trimmed;
}

export interface DivisionStyle {
  name: string;
  label: string;
  icon: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
}

export function getDivisionFromElo(elo: number): DivisionStyle {
  if (elo < 1200) {
    return {
      name: 'bronze',
      label: 'Bronce',
      icon: '🥉',
      borderClass: 'border-amber-700/50',
      textClass: 'text-amber-500',
      bgClass: 'bg-amber-950/70',
    };
  }
  if (elo < 1500) {
    return {
      name: 'silver',
      label: 'Plata',
      icon: '🥈',
      borderClass: 'border-slate-400/50',
      textClass: 'text-slate-200',
      bgClass: 'bg-slate-900/80',
    };
  }
  if (elo < 1800) {
    return {
      name: 'gold',
      label: 'Oro',
      icon: '🥇',
      borderClass: 'border-amber-400/60',
      textClass: 'text-amber-300',
      bgClass: 'bg-amber-950/80',
    };
  }
  if (elo < 2100) {
    return {
      name: 'platinum',
      label: 'Platino',
      icon: '💎',
      borderClass: 'border-cyan-400/60',
      textClass: 'text-cyan-300',
      bgClass: 'bg-cyan-950/80',
    };
  }
  return {
    name: 'diamond',
    label: 'Diamante',
    icon: '👑',
    borderClass: 'border-purple-400/60',
    textClass: 'text-purple-300',
    bgClass: 'bg-purple-950/80',
  };
}

export function calculateLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(isoString).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
