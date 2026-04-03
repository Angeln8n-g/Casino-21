// Feature: react-native-game-migration
// Requirements: 10.2

/**
 * Formats a chat message with timestamp and sender name.
 * Format: "[HH:MM] SenderName: content"
 */
export function formatChatMessage(message: {
  content: string;
  created_at: string;
  sender_username: string;
}): string {
  const date = new Date(message.created_at);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `[${hours}:${minutes}] ${message.sender_username}: ${message.content}`;
}
