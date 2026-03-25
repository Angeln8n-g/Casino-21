"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTeam = createTeam;
exports.create2v2PlayersAndTeams = create2v2PlayersAndTeams;
const player_1 = require("./player");
function createTeam(id, playerIds) {
    return {
        id,
        playerIds,
        score: 0,
        collectedCards: [],
        virados: 0,
    };
}
function create2v2PlayersAndTeams(team1Names, team2Names) {
    const team1 = createTeam('t1', ['p1', 'p3']);
    const team2 = createTeam('t2', ['p2', 'p4']);
    const players = [
        (0, player_1.createPlayer)('p1', team1Names[0], 't1'),
        (0, player_1.createPlayer)('p2', team2Names[0], 't2'),
        (0, player_1.createPlayer)('p3', team1Names[1], 't1'),
        (0, player_1.createPlayer)('p4', team2Names[1], 't2'),
    ];
    return {
        players,
        teams: [team1, team2],
    };
}
