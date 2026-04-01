export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: Date;
  isReported: boolean;
  isFiltered: boolean;
}

export interface ChatRateLimit {
  playerId: string;
  timestamps: Date[];
}

export interface MutedPlayer {
  playerId: string;
  mutedUntil: Date;
  reason: string;
  mutedBy: string;
}

export interface ChatReport {
  id: string;
  messageId: string;
  reportedBy: string;
  reason: string;
  timestamp: Date;
  status: 'pending' | 'reviewed' | 'dismissed';
}
