import EventEmitter from 'eventemitter3';

export interface SocialTabFriendPreview {
  id: string;
  username: string;
  avatar_url?: string | null;
  equipped_avatar?: string | null;
  elo?: number;
  level?: number;
}

export interface SocialTabIntent {
  tab?: 'friends' | 'search' | 'chat' | 'requests';
  friendId?: string;
  friendProfile?: SocialTabFriendPreview;
}

/**
 * Global App Event Bus for Mobile.
 * Emulates window.dispatchEvent / window.addEventListener in React Native.
 */
export const appEvents = new EventEmitter();

let pendingSocialTabIntent: SocialTabIntent | null = null;
let pendingSocialTabTimestamp = 0;

// Guardar temporalmente cualquier navegación pendiente hacia la pestaña Social
// por si SocialScreen aún no está montada al momento de navegar desde un toast o modal.
appEvents.on('open_social_tab', (payload?: SocialTabIntent) => {
  if (payload && (payload.tab || payload.friendId)) {
    pendingSocialTabIntent = payload;
    pendingSocialTabTimestamp = Date.now();
  }
});

export function consumePendingSocialTabIntent(): SocialTabIntent | null {
  if (!pendingSocialTabIntent) return null;
  const isFresh = Date.now() - pendingSocialTabTimestamp <= 10000;
  const intent = isFresh ? pendingSocialTabIntent : null;
  pendingSocialTabIntent = null;
  pendingSocialTabTimestamp = 0;
  return intent;
}

export function clearPendingSocialTabIntent() {
  pendingSocialTabIntent = null;
  pendingSocialTabTimestamp = 0;
}
