import { createPlayer, create1v1Players } from '../../src/domain/player';

describe('Player', () => {
  it('creates a player with default values', () => {
    const player = createPlayer('p1', 'Alice');
    
    expect(player.id).toBe('p1');
    expect(player.name).toBe('Alice');
    expect(player.hand).toEqual([]);
    expect(player.collectedCards).toEqual([]);
    expect(player.virados).toBe(0);
    expect(player.score).toBe(0);
    expect(player.teamId).toBeUndefined();
  });

  it('creates 1v1 players correctly', () => {
    const players = create1v1Players('Alice', 'Bob');
    
    expect(players.length).toBe(2);
    expect(players[0].id).toBe('p1');
    expect(players[0].name).toBe('Alice');
    expect(players[0].teamId).toBeUndefined();
    
    expect(players[1].id).toBe('p2');
    expect(players[1].name).toBe('Bob');
    expect(players[1].teamId).toBeUndefined();
  });
});
