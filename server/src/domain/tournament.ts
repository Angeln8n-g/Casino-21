export type TournamentStatus = 'waiting' | 'in_progress' | 'completed';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'no_show';

export interface TournamentConfig {
  maxPlayers: 4 | 8 | 16 | 32;
  name?: string;
}

export interface TournamentMatch {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  status: MatchStatus;
  roomId?: string;
  roundNumber: number;
}

export interface Round {
  roundNumber: number;
  matches: TournamentMatch[];
}

export interface TournamentBracket {
  rounds: Round[];
}

export interface Tournament {
  id: string;
  code: string;
  creatorId: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: TournamentStatus;
  bracket: TournamentBracket;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Season {
  id: string;
  number: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed';
}

export type Division = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  rank: number;
}

export interface SeasonHistory {
  seasonNumber: number;
  division: Division;
  finalRank: number;
  finalElo: number;
  wins: number;
  losses: number;
}

export interface PlayerStats {
  playerId: string;
  totalGames: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  currentElo: number;
  maxElo: number;
  avgTurnTime: number;
  cardsPlayedByPosition: Record<string, number>;
}

export interface EloHistory {
  id: string;
  playerId: string;
  elo: number;
  change: number;
  timestamp: Date;
  reason: 'match' | 'season_reset' | 'tournament';
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'master';
  xpReward: number;
  criteria: string;
}

export interface PlayerAchievement {
  id: string;
  playerId: string;
  achievementId: string;
  unlockedAt: Date;
}

export interface Title {
  id: string;
  code: string;
  name: string;
  description: string;
  xpRequirement: number;
  isPremium: boolean;
}

export interface PlayerTitle {
  id: string;
  playerId: string;
  titleId: string;
  unlockedAt: Date;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  reported: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
}

export interface Friendship {
  id: string;
  player1Id: string;
  player2Id: string;
  status: 'pending' | 'accepted';
  createdAt: Date;
  acceptedAt?: Date;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  respondedAt?: Date;
}

export interface GameInvitation {
  id: string;
  senderId: string;
  receiverId: string;
  roomId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  respondedAt?: Date;
}

export interface Notification {
  id: string;
  playerId: string;
  type: 'friend_request' | 'game_invitation' | 'tournament_start' | 'round_ready' | 'achievement' | 'level_up' | 'division_change';
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface PlayerReport {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  evidence: string;
  status: 'pending' | 'reviewed' | 'actioned';
  createdAt: Date;
  reviewedAt?: Date;
}

export interface PlayerBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

export interface TemporaryBan {
  id: string;
  playerId: string;
  reason: string;
  durationHours: number;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface RateLimit {
  id: string;
  playerId: string;
  actionType: string;
  count: number;
  windowStart: Date;
}
