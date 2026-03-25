"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_VERSION = void 0;
exports.serializeGameState = serializeGameState;
exports.deserializeGameState = deserializeGameState;
const game_state_1 = require("../domain/game-state");
exports.CURRENT_VERSION = 1;
function serializeGameState(state) {
    const serialized = {
        version: exports.CURRENT_VERSION,
        state
    };
    return JSON.stringify(serialized, null, 2);
}
function deserializeGameState(json) {
    try {
        const serialized = JSON.parse(json);
        if (serialized.version !== exports.CURRENT_VERSION) {
            throw new Error(`Unsupported save version: ${serialized.version}`);
        }
        const state = serialized.state;
        // Validar integridad del estado cargado
        (0, game_state_1.validateGameState)(state);
        return state;
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Invalid JSON format');
        }
        throw error;
    }
}
