export interface FriendRequestMetadata {
  sender_id: string;
  sender_name: string;
  request_id: string;
}

export interface GameInvitationMetadata {
  sender_id: string;
  sender_name: string;
  invitation_id: string;
  room_id: string;
  bet_amount?: number;
  expires_at: string;
}

export interface TournamentMetadata {
  event_id: string;
  game_room_id: string;
  round: number;
}

export type NotificationMetadata =
  | FriendRequestMetadata
  | GameInvitationMetadata
  | TournamentMetadata
  | Record<string, unknown>;
