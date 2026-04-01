import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChatManager } from '../application/chat-manager';
import { ErrorCode } from '../domain/types';

describe('ChatManager', () => {
  let chatManager: ChatManager;

  beforeEach(() => {
    chatManager = new ChatManager();
  });

  describe('filterContent', () => {
    it('should filter offensive words', () => {
      const offensiveContent = 'Eres una puta idiota';
      const filtered = chatManager.filterContent(offensiveContent);
      expect(filtered).not.toContain('puta');
      expect(filtered).not.toContain('idiota');
    });

    it('should return original content if no offensive words', () => {
      const cleanContent = 'Hola, ¿cómo estás?';
      const filtered = chatManager.filterContent(cleanContent);
      expect(filtered).toBe(cleanContent);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow messages when under rate limit', () => {
      const playerId = 'player1';
      expect(chatManager.checkRateLimit(playerId)).toBe(true);
    });

    it('should deny messages when over rate limit', () => {
      const playerId = 'player2';
      // Simulate 10 messages (rate limit)
      for (let i = 0; i < 10; i++) {
        chatManager['updateRateLimit'](playerId);
      }
      expect(chatManager.checkRateLimit(playerId)).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should reject empty messages', async () => {
      const result = await chatManager.sendMessage('room1', 'player1', 'Player 1', '');
      expect(result.success).toBe(false);
      expect(result.error).toBe(ErrorCode.MESSAGE_TOO_SHORT);
    });

    it('should reject messages over 200 characters', async () => {
      const longMessage = 'a'.repeat(201);
      const result = await chatManager.sendMessage('room1', 'player1', 'Player 1', longMessage);
      expect(result.success).toBe(false);
      expect(result.error).toBe(ErrorCode.MESSAGE_TOO_LONG);
    });
  });
});
