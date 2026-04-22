/**
 * Bot Player Module — Easy Difficulty
 * 
 * Server-side virtual player that uses the existing `getTimeoutAction()` strategy:
 *   Priority 1: Take own formation if possible.
 *   Priority 2: Drop the lowest value non-Ace card.
 *   Fallback: Drop an Ace.
 * 
 * The bot plays automatically with a simulated "think" delay to feel natural.
 */

/** Unique identifier for the bot player (never collides with real Supabase UUIDs) */
export const BOT_USER_ID = 'bot-easy';

/** Display name shown in the game UI */
export const BOT_NAME = 'Bot Fácil 🤖';

/** Delay in ms before the bot plays its card (simulates thinking) */
export const BOT_THINK_DELAY_MS = 1500;
