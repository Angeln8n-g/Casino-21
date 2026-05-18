import { processTournamentAdvancement, handleTournamentFinal } from '../src/tournament-service';
import { Server } from 'socket.io';

jest.mock('../src/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '../src/supabase';

describe('processTournamentAdvancement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early if not a tournament', async () => {
    const result = await processTournamentAdvancement({} as Server, {}, 'room1', 'winner1', false);
    expect(result).toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns early if no winnerId', async () => {
    const result = await processTournamentAdvancement({} as Server, {}, 'room1', '', true);
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

    const result = await processTournamentAdvancement({} as Server, {}, 'room1', 'winner1', true);
    expect(result).toBeUndefined();
  });
});

describe('handleTournamentFinal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing if no prize_pool', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '' }, error: null }),
        }),
      }),
    });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('calls award_tournament_prize with parsed amount', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '5000' }, error: null }),
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

  it('parses formatted prize string', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '$10,000 USD' }, error: null }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    await handleTournamentFinal({ event_id: 'evt1' }, 'winner1');
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
          single: jest.fn().mockResolvedValue({ data: { prize_pool: '5000' }, error: null }),
        }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({ error: new Error('DB error') });

    await expect(handleTournamentFinal({ event_id: 'evt1' }, 'winner1')).resolves.not.toThrow();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
});
