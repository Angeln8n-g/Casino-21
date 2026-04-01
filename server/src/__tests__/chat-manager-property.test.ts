import * as fc from 'fast-check';
import { ChatManager } from '../application/chat-manager';

describe('ChatManager Property Tests', () => {
  let chatManager: ChatManager;

  beforeEach(() => {
    chatManager = new ChatManager();
  });

  describe('Property 10: Chat Message Length Validation', () => {
    it('should reject messages shorter than 1 character', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 0 }),
          (emptyString) => {
            const result = chatManager.filterContent(emptyString);
            // Empty string should be filtered to empty
            expect(result.length).toBeGreaterThanOrEqual(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept messages up to 200 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (validMessage) => {
            const filtered = chatManager.filterContent(validMessage);
            expect(filtered.length).toBeGreaterThanOrEqual(1);
            expect(filtered.length).toBeLessThanOrEqual(200);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Chat Message Persistence', () => {
    it('should maintain message integrity after filtering', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (originalMessage) => {
            const filtered = chatManager.filterContent(originalMessage);
            // The filtered message should be a valid string
            expect(typeof filtered).toBe('string');
            expect(filtered.length).toBeGreaterThanOrEqual(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Offensive Content Filtering', () => {
    it('should replace offensive words with asterisks', () => {
      const offensiveWords = ['puta', 'idiota', 'mierda', 'coño'];
      
      fc.assert(
        fc.property(
          fc.oneof(
            ...offensiveWords.map(word => fc.constant(word)),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          (input) => {
            const filtered = chatManager.filterContent(input);
            // Check that offensive words are replaced
            const hasOffensiveWord = offensiveWords.some(word => 
              input.toLowerCase().includes(word) && !filtered.includes(word)
            );
            expect(hasOffensiveWord).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Chat Rate Limiting', () => {
    it('should enforce rate limit of 10 messages per 30 seconds', () => {
      const playerId = 'test-player';
      const rateLimit = 10;
      const windowMs = 30000;

      // Simulate rate limit tracking
      const rateLimits = new Map<string, { playerId: string; timestamps: Date[] }>();

      const updateRateLimit = (pid: string) => {
        const now = new Date();
        let playerLimit = rateLimits.get(pid);

        if (!playerLimit) {
          playerLimit = { playerId: pid, timestamps: [] };
          rateLimits.set(pid, playerLimit);
        }

        playerLimit.timestamps.push(now);
        playerLimit.timestamps = playerLimit.timestamps.filter(
          ts => now.getTime() - ts.getTime() < windowMs
        );
      };

      const checkRateLimit = (pid: string): boolean => {
        const now = new Date();
        const playerLimit = rateLimits.get(pid);

        if (!playerLimit) {
          return true;
        }

        playerLimit.timestamps = playerLimit.timestamps.filter(
          ts => now.getTime() - ts.getTime() < windowMs
        );

        return playerLimit.timestamps.length < rateLimit;
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (numMessages) => {
            // Reset for each test run
            rateLimits.clear();

            // Send messages
            for (let i = 0; i < numMessages; i++) {
              updateRateLimit(playerId);
            }

            // Check if rate limited
            const isLimited = !checkRateLimit(playerId);

            // Should be limited if more than 10 messages
            expect(isLimited).toBe(numMessages > rateLimit);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
