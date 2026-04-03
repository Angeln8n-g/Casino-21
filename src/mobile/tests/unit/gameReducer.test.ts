// Feature: react-native-game-migration
// Requirements: 8.1, 8.4

import { gameReducer, initialGameState, MobileGameState, GameAction } from '../../store/gameReducer';
import { GameState } from '../../../domain/game-state';

describe('gameReducer', () => {
  describe('initial state', () => {
    it('has correct default values', () => {
      expect(initialGameState).toEqual({
        gameState: null,
        localPlayerId: null,
        error: null,
        timeRemaining: 0,
        disconnectionMessage: null,
      });
    });
  });

  describe('SET_GAME_STATE', () => {
    it('updates gameState with a new value', () => {
      const mockGameState = { id: 'game-1', players: [] } as unknown as GameState;
      const action: GameAction = { type: 'SET_GAME_STATE', payload: mockGameState };
      const result = gameReducer(initialGameState, action);
      expect(result.gameState).toBe(mockGameState);
    });

    it('sets gameState to null', () => {
      const stateWithGame: MobileGameState = {
        ...initialGameState,
        gameState: { id: 'game-1' } as unknown as GameState,
      };
      const action: GameAction = { type: 'SET_GAME_STATE', payload: null };
      const result = gameReducer(stateWithGame, action);
      expect(result.gameState).toBeNull();
    });

    it('does not mutate other fields', () => {
      const state: MobileGameState = {
        ...initialGameState,
        localPlayerId: 'player-1',
        error: 'some error',
        timeRemaining: 30,
        disconnectionMessage: 'disconnected',
      };
      const action: GameAction = { type: 'SET_GAME_STATE', payload: null };
      const result = gameReducer(state, action);
      expect(result.localPlayerId).toBe('player-1');
      expect(result.error).toBe('some error');
      expect(result.timeRemaining).toBe(30);
      expect(result.disconnectionMessage).toBe('disconnected');
    });
  });

  describe('SET_LOCAL_PLAYER_ID', () => {
    it('updates localPlayerId', () => {
      const action: GameAction = { type: 'SET_LOCAL_PLAYER_ID', payload: 'player-42' };
      const result = gameReducer(initialGameState, action);
      expect(result.localPlayerId).toBe('player-42');
    });

    it('does not mutate other fields', () => {
      const action: GameAction = { type: 'SET_LOCAL_PLAYER_ID', payload: 'player-42' };
      const result = gameReducer(initialGameState, action);
      expect(result.gameState).toBeNull();
      expect(result.error).toBeNull();
      expect(result.timeRemaining).toBe(0);
      expect(result.disconnectionMessage).toBeNull();
    });
  });

  describe('SET_ERROR', () => {
    it('updates error with a message', () => {
      const action: GameAction = { type: 'SET_ERROR', payload: 'Connection failed' };
      const result = gameReducer(initialGameState, action);
      expect(result.error).toBe('Connection failed');
    });

    it('does not mutate other fields', () => {
      const action: GameAction = { type: 'SET_ERROR', payload: 'oops' };
      const result = gameReducer(initialGameState, action);
      expect(result.gameState).toBeNull();
      expect(result.localPlayerId).toBeNull();
      expect(result.timeRemaining).toBe(0);
      expect(result.disconnectionMessage).toBeNull();
    });
  });

  describe('CLEAR_ERROR', () => {
    it('sets error to null', () => {
      const stateWithError: MobileGameState = { ...initialGameState, error: 'some error' };
      const action: GameAction = { type: 'CLEAR_ERROR' };
      const result = gameReducer(stateWithError, action);
      expect(result.error).toBeNull();
    });

    it('does not mutate other fields', () => {
      const state: MobileGameState = {
        ...initialGameState,
        error: 'some error',
        localPlayerId: 'player-1',
        timeRemaining: 15,
      };
      const action: GameAction = { type: 'CLEAR_ERROR' };
      const result = gameReducer(state, action);
      expect(result.localPlayerId).toBe('player-1');
      expect(result.timeRemaining).toBe(15);
    });
  });

  describe('SET_TIME_REMAINING', () => {
    it('updates timeRemaining', () => {
      const action: GameAction = { type: 'SET_TIME_REMAINING', payload: 45 };
      const result = gameReducer(initialGameState, action);
      expect(result.timeRemaining).toBe(45);
    });

    it('updates timeRemaining to zero', () => {
      const state: MobileGameState = { ...initialGameState, timeRemaining: 30 };
      const action: GameAction = { type: 'SET_TIME_REMAINING', payload: 0 };
      const result = gameReducer(state, action);
      expect(result.timeRemaining).toBe(0);
    });

    it('does not mutate other fields', () => {
      const action: GameAction = { type: 'SET_TIME_REMAINING', payload: 60 };
      const result = gameReducer(initialGameState, action);
      expect(result.gameState).toBeNull();
      expect(result.localPlayerId).toBeNull();
      expect(result.error).toBeNull();
      expect(result.disconnectionMessage).toBeNull();
    });
  });

  describe('SET_DISCONNECTION_MESSAGE', () => {
    it('updates disconnectionMessage with a string', () => {
      const action: GameAction = { type: 'SET_DISCONNECTION_MESSAGE', payload: 'Opponent disconnected' };
      const result = gameReducer(initialGameState, action);
      expect(result.disconnectionMessage).toBe('Opponent disconnected');
    });

    it('sets disconnectionMessage to null', () => {
      const state: MobileGameState = { ...initialGameState, disconnectionMessage: 'Opponent disconnected' };
      const action: GameAction = { type: 'SET_DISCONNECTION_MESSAGE', payload: null };
      const result = gameReducer(state, action);
      expect(result.disconnectionMessage).toBeNull();
    });

    it('does not mutate other fields', () => {
      const action: GameAction = { type: 'SET_DISCONNECTION_MESSAGE', payload: 'msg' };
      const result = gameReducer(initialGameState, action);
      expect(result.gameState).toBeNull();
      expect(result.localPlayerId).toBeNull();
      expect(result.error).toBeNull();
      expect(result.timeRemaining).toBe(0);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged for an unrecognized action type', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as unknown as GameAction;
      const result = gameReducer(initialGameState, unknownAction);
      expect(result).toBe(initialGameState);
    });

    it('returns the exact same state reference for unknown actions', () => {
      const state: MobileGameState = {
        ...initialGameState,
        localPlayerId: 'player-1',
        timeRemaining: 20,
      };
      const unknownAction = { type: 'DOES_NOT_EXIST' } as unknown as GameAction;
      const result = gameReducer(state, unknownAction);
      expect(result).toBe(state);
    });
  });

  describe('immutability', () => {
    it('returns a new state object on each action', () => {
      const action: GameAction = { type: 'SET_LOCAL_PLAYER_ID', payload: 'player-1' };
      const result = gameReducer(initialGameState, action);
      expect(result).not.toBe(initialGameState);
    });
  });
});
