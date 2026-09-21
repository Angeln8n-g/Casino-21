import { processTournamentAdvancement, handleTournamentFinal, clearNoShowTimer } from '../src/tournament-service';
import { getTournamentSeedPairs } from '../src/championship-service';
import { Server } from 'socket.io';

jest.mock('../src/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('../src/web-push', () => ({
  sendPushToUser: jest.fn().mockResolvedValue({ success: true }),
}));

import { supabase } from '../src/supabase';

describe('getTournamentSeedPairs', () => {
  it('correctly separates seed 1 and seed 2 into opposite halves for 32 players', () => {
    const pairs = getTournamentSeedPairs(32);
    expect(pairs).toHaveLength(16);
    // Match 1 has seed 1
    expect(pairs[0]).toEqual([1, 32]);
    // Match 9 has seed 2 (bottom half)
    expect(pairs[8]).toEqual([2, 31]);
  });

  it('correctly separates seed 1 and seed 2 for 16 players', () => {
    const pairs = getTournamentSeedPairs(16);
    expect(pairs).toHaveLength(8);
    expect(pairs[0]).toEqual([1, 16]);
    expect(pairs[4]).toEqual([2, 15]);
  });

  it('correctly separates seed 1 and seed 2 for 8 players', () => {
    const pairs = getTournamentSeedPairs(8);
    expect(pairs).toHaveLength(4);
    expect(pairs[0]).toEqual([1, 8]);
    expect(pairs[2]).toEqual([2, 7]);
  });
});

describe('processTournamentAdvancement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early if not a tournament', async () => {
    const result = await processTournamentAdvancement({} as Server, {} as any, 'room1', 'winner1', false);
    expect(result).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns early if no winnerId', async () => {
    const result = await processTournamentAdvancement({} as Server, {} as any, 'room1', '', true);
    expect(result).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('handles missing tournament match gracefully', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
        }),
      }),
    });

    const result = await processTournamentAdvancement({} as Server, {} as any, 'room1', 'winner1', true);
    expect(result).toBeUndefined();
  });
});

describe('handleTournamentFinal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing if no prize_pool and not championship', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '', is_championship: false }, error: null }),
        }),
      }),
    });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('calls award_tournament_prize with parsed amount for coin prize', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '5000 Monedas', is_championship: false }, error: null }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    expect(supabase.rpc).toHaveBeenCalledWith('award_tournament_prize', {
      event_id_param: 'evt1',
      winner_id_param: 'winner1',
      prize_amount: 5000,
    });
  });

  it('processes championship final with USD prize distribution and fixed coin bonus', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'evt1', title: 'KASINO21 CHAMPIONSHIP', is_championship: true, prize_pool: '$1,250 USD' },
            error: null
          }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ data: { claims_created: 32 }, error: null });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    // Verifies USD distribution RPC was called
    expect(supabase.rpc).toHaveBeenCalledWith('calculate_championship_prize_distribution', {
      p_event_id: 'evt1',
    });
    // Verifies fixed champion coin bonus (10,000) was awarded
    expect(supabase.rpc).toHaveBeenCalledWith('award_tournament_prize', {
      event_id_param: 'evt1',
      winner_id_param: 'winner1',
      prize_amount: 10000,
    });
  });

  it('does not throw on rpc error', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '5000', is_championship: false }, error: null }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ error: new Error('DB error') });

    await expect(handleTournamentFinal({ event_id: 'evt1' }, 'winner1')).resolves.not.toThrow();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
});
