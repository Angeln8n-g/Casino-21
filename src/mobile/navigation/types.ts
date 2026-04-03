// Feature: react-native-game-migration
// Requirements: 7.1

export type RootStackParamList = {
  Auth: undefined;
  MainMenu: undefined;
  Game: { roomId: string };
  Tournament: { tournamentId?: string };
  Social: undefined;
  Settings: undefined;
  Stats: { playerId: string };
};
