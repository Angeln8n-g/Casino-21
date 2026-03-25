import { createTeam, create2v2PlayersAndTeams } from '../../src/domain/team';

describe('Team', () => {
  it('creates a team with default values', () => {
    const team = createTeam('t1', ['p1', 'p2']);
    
    expect(team.id).toBe('t1');
    expect(team.playerIds).toEqual(['p1', 'p2']);
    expect(team.score).toBe(0);
    expect(team.collectedCards).toEqual([]);
    expect(team.virados).toBe(0);
  });

  it('creates 2v2 players and teams correctly', () => {
    const { players, teams } = create2v2PlayersAndTeams(
      ['Alice', 'Charlie'],
      ['Bob', 'Dave']
    );
    
    expect(teams.length).toBe(2);
    expect(teams[0].id).toBe('t1');
    expect(teams[0].playerIds).toEqual(['p1', 'p3']);
    
    expect(teams[1].id).toBe('t2');
    expect(teams[1].playerIds).toEqual(['p2', 'p4']);
    
    expect(players.length).toBe(4);
    
    expect(players[0].name).toBe('Alice');
    expect(players[0].teamId).toBe('t1');
    expect(players[0].id).toBe('p1');
    
    expect(players[1].name).toBe('Bob');
    expect(players[1].teamId).toBe('t2');
    expect(players[1].id).toBe('p2');
    
    expect(players[2].name).toBe('Charlie');
    expect(players[2].teamId).toBe('t1');
    expect(players[2].id).toBe('p3');
    
    expect(players[3].name).toBe('Dave');
    expect(players[3].teamId).toBe('t2');
    expect(players[3].id).toBe('p4');
  });
});
