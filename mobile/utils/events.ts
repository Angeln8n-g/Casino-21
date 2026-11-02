import EventEmitter from 'eventemitter3';

/**
 * Global App Event Bus for Mobile.
 * Emulates window.dispatchEvent / window.addEventListener in React Native.
 */
export const appEvents = new EventEmitter();
