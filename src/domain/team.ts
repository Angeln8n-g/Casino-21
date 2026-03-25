import { Card } from './card';
import { Player, createPlayer } from './player';

export interface Team {
  readonly id: string;
  readonly playerIds: readonly string[];
  readonly score: number;
  readonly collectedCards: readonly Card[];
  readonly virados: number;
}

export function createTeam(id: string, playerIds: string[]): Team {
  return {
    id,
    playerIds,
    score: 0,
    collectedCards: [],
    virados: 0,
  };
}

export function create2v2PlayersAndTeams(
  team1Names: [string, string],
  team2Names: [string, string]
): { players: Player[]; teams: Team[] } {
  const team1 = createTeam('t1', ['p1', 'p3']);
  const team2 = createTeam('t2', ['p2', 'p4']);

  const players = [
    createPlayer('p1', team1Names[0], 't1'),
    createPlayer('p2', team2Names[0], 't2'),
    createPlayer('p3', team1Names[1], 't1'),
    createPlayer('p4', team2Names[1], 't2'),
  ];

  return {
    players,
    teams: [team1, team2],
  };
}
