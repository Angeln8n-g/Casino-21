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
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
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

  it('distributes rewards via distribute_tournament_rewards RPC on success', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'evt1', title: 'Torneo Semanal', prize_pool: '5000 Monedas', is_championship: false },
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'evt1', title: 'Torneo Semanal', prize_pool: '5000 Monedas', is_championship: false },
            error: null,
          }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        already_distributed: false,
        total_pot: 5000,
        payouts: [
          { player_id: 'winner1', place: 1, coins_awarded: 3500, xp_awarded: 100 },
          { player_id: 'runner_up', place: 2, coins_awarded: 1500, xp_awarded: 50 },
        ],
      },
      error: null,
    });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    expect(supabase.rpc).toHaveBeenCalledWith('distribute_tournament_rewards', {
      p_event_id: 'evt1',
    });
  });

  it('falls back to award_tournament_prize when v3 rpc fails', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'evt1', title: 'Torneo Clásico', prize_pool: '5000 Monedas', is_championship: false },
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'evt1', title: 'Torneo Clásico', prize_pool: '5000 Monedas', is_championship: false },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    (supabase.rpc as jest.Mock).mockImplementation((rpcName: string) => {
      if (rpcName === 'distribute_tournament_rewards') {
        return Promise.resolve({ data: null, error: new Error('RPC not found') });
      }
      return Promise.resolve({ data: null, error: null });
    });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    expect(supabase.rpc).toHaveBeenCalledWith('award_tournament_prize', {
      event_id_param: 'evt1',
      winner_id_param: 'winner1',
      prize_amount: 5000,
    });
  });

  it('does not throw on rpc error', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'evt1', prize_pool: '5000', is_championship: false },
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'evt1', prize_pool: '5000', is_championship: false },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('DB error') });

    await expect(handleTournamentFinal({ event_id: 'evt1' }, 'winner1')).resolves.not.toThrow();
  });
});
