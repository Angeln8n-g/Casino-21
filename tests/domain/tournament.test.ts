import {
  CASH_PRIZES_ENABLED,
  PRIZE_TIER_PRESETS,
  getDefaultPrizeTiers,
  validatePrizeTiers,
  calculateDynamicPot,
  parseLegacyCoinPool,
  buildPrizeDisplayGroups,
  resolveBracketSize,
  getInitialRoundNumber,
  getRoundDisplayName,
  getTournamentSeedPairs,
  buildSeededBracketPlan,
  FINAL_ROUND_NUMBER,
} from '../../src/domain/tournament';

describe('Tournament 2.0 Domain & Prize Engine', () => {
  test('CASH_PRIZES_ENABLED is paused (false) by default', () => {
    expect(CASH_PRIZES_ENABLED).toBe(false);
  });

  describe('Prize Tiers & Validation', () => {
    test('all built-in presets sum to 100% and pass validation', () => {
      for (const preset of Object.values(PRIZE_TIER_PRESETS)) {
        const res = validatePrizeTiers(preset.tiers);
        expect(res.valid).toBe(true);
        expect(res.totalPercent).toBe(100);
      }
    });

    test('getDefaultPrizeTiers adapts to tournament size', () => {
      expect(getDefaultPrizeTiers(4)).toHaveLength(2);
      expect(getDefaultPrizeTiers(8)).toHaveLength(4);
      expect(getDefaultPrizeTiers(16)).toHaveLength(4);
      expect(getDefaultPrizeTiers(32)).toHaveLength(8);
    });

    test('validatePrizeTiers rejects over-allocated (>100%) or duplicate tiers', () => {
      const overAllocated = validatePrizeTiers([
        { place: 1, percent: 70 },
        { place: 2, percent: 40 },
      ]);
      expect(overAllocated.valid).toBe(false);
      expect(overAllocated.totalPercent).toBe(110);

      const duplicated = validatePrizeTiers([
        { place: 1, percent: 50 },
        { place: 1, percent: 50 },
      ]);
      expect(duplicated.valid).toBe(false);
    });
  });

  describe('Dynamic Pot Calculation', () => {
    test('calculates current pot, projected pot, and anti-inflation sink accurately', () => {
      const pot = calculateDynamicPot({
        guaranteedCoins: 1000,
        entryFee: 500,
        participantsCount: 3,
        maxParticipants: 4,
        entryPoolPercent: 90,
      });

      // 90% of 500 = 450 per player; 10% = 50 house sink
      expect(pot.contributionPerEntry).toBe(450);
      expect(pot.houseSinkPerEntry).toBe(50);
      expect(pot.entriesPotContribution).toBe(1350);
      expect(pot.currentPot).toBe(2350);
      expect(pot.maxProjectedPot).toBe(2800);

      // Positional numeric overload returns currentPot directly
      expect(calculateDynamicPot(1000, 500, 3, 90)).toBe(2350);
      expect(calculateDynamicPot(1000, 500, 4, 90)).toBe(2800);
    });

    test('parseLegacyCoinPool extracts coins and ignores USD strings', () => {
      expect(parseLegacyCoinPool('10,000 Monedas')).toBe(10000);
      expect(parseLegacyCoinPool('5000 monedas + 500 XP')).toBe(5000);
      expect(parseLegacyCoinPool('$1,250 USD')).toBe(0);
    });

    test('buildPrizeDisplayGroups never exceeds 100% of pot', () => {
      const groups = buildPrizeDisplayGroups(10000, PRIZE_TIER_PRESETS.top4.tiers, undefined, true);
      expect(groups).toHaveLength(3); // 1st, 2nd, 3rd-4th grouped
      expect(groups[0].coinsEach).toBe(5500);
      expect(groups[0].label).toBe('1er Lugar');
      expect(groups[0].count).toBe(1);
      expect(groups[0].includesExclusiveItem).toBe(true);
      expect(groups[1].coinsEach).toBe(2500);
      expect(groups[2].coinsEach).toBe(1000); // 1000 each for 3rd and 4th = 2000 total
      expect(groups[2].count).toBe(2);
      const totalDistributed = groups[0].coinsEach + groups[1].coinsEach + groups[2].coinsEach * 2;
      expect(totalDistributed).toBe(10000);

      // Fallback maxParticipants=4 defaults to top2 (70/30)
      const groups4 = buildPrizeDisplayGroups(2000, null, 4);
      expect(groups4).toHaveLength(2);
      expect(groups4[0].coinsEach).toBe(1400);
      expect(groups4[1].coinsEach).toBe(600);
    });
  });

  describe('Seeding, Bracket Sizes & Auto-Bye Advancement', () => {
    test('resolveBracketSize chooses tightest power of 2 in [4..32]', () => {
      expect(resolveBracketSize(2, 8)).toBe(4);
      expect(resolveBracketSize(3, 8)).toBe(4);
      expect(resolveBracketSize(4, 4)).toBe(4);
      expect(resolveBracketSize(5, 8)).toBe(8);
      expect(resolveBracketSize(9, 16)).toBe(16);
      expect(resolveBracketSize(19, 32)).toBe(32);
    });

    test('getInitialRoundNumber and getRoundDisplayName anchor Final to round 4', () => {
      expect(getInitialRoundNumber(4)).toBe(3);
      expect(getInitialRoundNumber(8)).toBe(2);
      expect(getInitialRoundNumber(16)).toBe(1);
      expect(getInitialRoundNumber(32)).toBe(0);

      expect(getRoundDisplayName(4)).toBe('Gran Final');
      expect(getRoundDisplayName(3)).toBe('Semifinales');
      expect(getRoundDisplayName(2)).toBe('Cuartos');
      expect(getRoundDisplayName(1)).toBe('Octavos');
      expect(getRoundDisplayName(0)).toBe('16avos');
    });

    test('getTournamentSeedPairs keeps Seed 1 and Seed 2 in opposite halves for 4, 8, 16, 32', () => {
      for (const size of [4, 8, 16, 32] as const) {
        const pairs = getTournamentSeedPairs(size);
        expect(pairs).toHaveLength(size / 2);
        const half = pairs.length / 2;
        const topHalfSeeds = pairs.slice(0, half).flat();
        const bottomHalfSeeds = pairs.slice(half).flat();
        expect(topHalfSeeds).toContain(1);
        expect(bottomHalfSeeds).toContain(2);
      }
    });

    test('buildSeededBracketPlan handles full 4-player Sit & Go cleanly', () => {
      const plan = buildSeededBracketPlan(
        [
          { id: 'p-low', elo: 950 },
          { id: 'p-top', elo: 1450 },
          { id: 'p-mid1', elo: 1200 },
          { id: 'p-mid2', elo: 1100 },
        ],
        4,
        1
      );

      expect(plan.bracketSize).toBe(4);
      expect(plan.startRound).toBe(3);
      expect(plan.finalRound).toBe(FINAL_ROUND_NUMBER);
      expect(plan.matches).toHaveLength(3); // 2 semifinals + 1 final
      expect(plan.readyFirstMatches).toHaveLength(2);

      // Seed 1 (p-top) plays Seed 4 (p-low); Seed 2 (p-mid1) plays Seed 3 (p-mid2)
      const semi1 = plan.matches.find(m => m.round_number === 3 && m.match_order === 1)!;
      const semi2 = plan.matches.find(m => m.round_number === 3 && m.match_order === 2)!;
      expect(semi1.player1_id).toBe('p-top');
      expect(semi1.player2_id).toBe('p-low');
      expect(semi2.player1_id).toBe('p-mid1');
      expect(semi2.player2_id).toBe('p-mid2');
    });

    test('buildSeededBracketPlan auto-completes Byes and advances top seeds to next round (e.g. 3 or 5 players)', () => {
      // 3 players in an 8-max scheduled tournament -> fits in 4-player bracket, Seed 1 gets Bye to Final!
      const plan3 = buildSeededBracketPlan(
        [
          { id: 'seed1', elo: 1500 },
          { id: 'seed2', elo: 1300 },
          { id: 'seed3', elo: 1100 },
        ],
        8,
        3 // Bo3 Final
      );

      expect(plan3.bracketSize).toBe(4);
      const semi1 = plan3.matches.find(m => m.round_number === 3 && m.match_order === 1)!;
      const semi2 = plan3.matches.find(m => m.round_number === 3 && m.match_order === 2)!;
      const finalGame1 = plan3.matches.find(m => m.round_number === 4 && m.match_order === 1)!;

      expect(semi1.status).toBe('completed');
      expect(semi1.walkover_reason).toBe('bye');
      expect(semi1.winner_id).toBe('seed1');
      // Seed 1 is ALREADY advanced into Final Game 1 player1_id!
      expect(finalGame1.player1_id).toBe('seed1');
      expect(finalGame1.player2_id).toBeNull();

      // Only Semi 2 (seed2 vs seed3) needs to be played right now
      expect(semi2.status).toBe('pending');
      expect(plan3.readyFirstMatches).toHaveLength(1);
      expect(plan3.readyFirstMatches[0].player1_id).toBe('seed2');
      expect(plan3.readyFirstMatches[0].player2_id).toBe('seed3');

      // 2 players -> both get Byes in Semis and meet directly in Final Game 1!
      const plan2 = buildSeededBracketPlan(
        [
          { id: 'seed1', elo: 1500 },
          { id: 'seed2', elo: 1300 },
        ],
        8,
        1
      );
      const final2 = plan2.matches.find(m => m.round_number === 4 && m.match_order === 1)!;
      expect(final2.player1_id).toBe('seed1');
      expect(final2.player2_id).toBe('seed2');
      expect(plan2.readyFirstMatches).toHaveLength(1);
      expect(plan2.readyFirstMatches[0].round_number).toBe(4);
    });
  });
});
