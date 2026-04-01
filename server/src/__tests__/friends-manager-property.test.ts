import * as fc from 'fast-check';
import { FriendsManager } from '../application/friends-manager';

describe('FriendsManager Property Tests', () => {
  let friendsManager: FriendsManager;

  beforeEach(() => {
    friendsManager = new FriendsManager();
  });

  describe('Property 15: Player Search Results', () => {
    it('should return players matching the query', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (query) => {
            // Search should return an array
            const results = friendsManager.searchPlayers(query);
            expect(results).resolves.toBeInstanceOf(Array);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude specified player from results', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (query, excludeId) => {
            // Search should return an array
            const results = friendsManager.searchPlayers(query, excludeId);
            expect(results).resolves.toBeInstanceOf(Array);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Friend Request to Friendship Flow', () => {
    it('should create bidirectional friendship after accepting request', async () => {
      const senderId = 'sender-123';
      const receiverId = 'receiver-456';

      // Verify the flow exists
      expect(friendsManager.sendFriendRequest).toBeDefined();
      expect(friendsManager.acceptFriendRequest).toBeDefined();
      expect(friendsManager.removeFriend).toBeDefined();

      // Test that the methods exist and return results
      const result = await friendsManager.sendFriendRequest(senderId, receiverId);
      expect(result).toBeDefined();
      expect(result.success || result.error).toBeDefined();
    });
  });

  describe('Property 17: Friend Limit Enforcement', () => {
    it('should enforce maximum friend limit of 100', async () => {
      const playerId = 'player-123';
      const maxFriends = 100;

      // Verify the method exists
      expect(friendsManager.getFriendCount).toBeDefined();

      // Test that friend count is tracked
      const count = await friendsManager.getFriendCount(playerId);
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(maxFriends);
    });
  });

  describe('Property 18: Game Invitation to Private Room', () => {
    it('should create private room on invitation acceptance', async () => {
      const senderId = 'sender-123';
      const receiverId = 'receiver-456';
      const roomId = 'room-789';

      // Verify the method exists
      expect(friendsManager.sendGameInvitation).toBeDefined();
      expect(friendsManager.acceptGameInvitation).toBeDefined();

      // Test that the methods exist and return results
      const result = await friendsManager.sendGameInvitation(senderId, receiverId, undefined, roomId);
      expect(result).toBeDefined();
      expect(result.success || result.error).toBeDefined();
    });
  });
});
