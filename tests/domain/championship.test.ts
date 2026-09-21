import { getTournamentSeedPairs, calculatePrizeForRank } from '../../src/domain/championship';

describe('Championship Domain Logic', () => {
  describe('getTournamentSeedPairs', () => {
    it('generates standard bracket pairs for 8 players keeping seeds 1 and 2 in opposite halves', () => {
      const pairs = getTournamentSeedPairs(8);
      expect(pairs).toHaveLength(4);
      expect(pairs[0]).toEqual([1, 8]);
      expect(pairs[2]).toEqual([2, 7]);
    });

    it('generates standard bracket pairs for 16 players keeping seeds 1 and 2 in opposite halves', () => {
      const pairs = getTournamentSeedPairs(16);
      expect(pairs).toHaveLength(8);
      expect(pairs[0]).toEqual([1, 16]);
      expect(pairs[4]).toEqual([2, 15]);
    });

    it('generates standard bracket pairs for 32 players keeping seeds 1 and 2 in opposite halves', () => {
      const pairs = getTournamentSeedPairs(32);
      expect(pairs).toHaveLength(16);
      // Top half
      expect(pairs[0]).toEqual([1, 32]);
      // Bottom half
      expect(pairs[8]).toEqual([2, 31]);
    });

    it('ensures all seeds from 1 to N are uniquely present in the generated pairs', () => {
      for (const size of [8, 16, 32]) {
        const pairs = getTournamentSeedPairs(size);
        const flattened = pairs.flat();
        expect(flattened).toHaveLength(size);
        const uniqueSeeds = new Set(flattened);
        expect(uniqueSeeds.size).toBe(size);
        for (let i = 1; i <= size; i++) {
          expect(uniqueSeeds.has(i)).toBe(true);
        }
      }
    });
  });

  describe('calculatePrizeForRank', () => {
    it('calculates 1st place prize percentage correctly', () => {
      const pool = 1000;
      const prize = calculatePrizeForRank(1, pool);
      expect(prize).toBe(400); // 40% of 1000
    });

    it('calculates 2nd place prize percentage correctly', () => {
      const pool = 1000;
      const prize = calculatePrizeForRank(2, pool);
      expect(prize).toBe(200); // 20% of 1000
    });

    it('returns fixed USD prize for positions in octavos (9-16)', () => {
      expect(calculatePrizeForRank(9, 1000)).toBe(15);
      expect(calculatePrizeForRank(16, 1000)).toBe(15);
    });

    it('returns fixed USD prize for positions in 32avos (17-32)', () => {
      expect(calculatePrizeForRank(17, 1000)).toBe(5);
      expect(calculatePrizeForRank(32, 1000)).toBe(5);
    });

    it('returns 0 for unranked positions beyond 32', () => {
      expect(calculatePrizeForRank(33, 1000)).toBe(0);
    });
  });
});
