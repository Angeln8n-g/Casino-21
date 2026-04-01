export type FriendStatus = 'offline' | 'online' | 'in_game';

export interface Friend {
  id: string;
  playerId: string;
  friendId: string;
  status: FriendStatus;
  lastSeen: Date;
  createdAt: Date;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  expiresAt: Date;
}

export interface GameInvitation {
  id: string;
  senderId: string;
  receiverId: string;
  tournamentId?: string;
  roomId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  expiresAt: Date;
}

export interface PlayerSearchResult {
  id: string;
  username: string;
  elo: number;
  status: FriendStatus;
  isFriend: boolean;
}
