import { Card } from '../../domain/card';

/**
 * Returns the image source for a card sprite.
 * Returns null for now (no actual assets yet).
 * Will be populated when card sprites are added to assets/cards/
 */
export function getCardImageSource(_card: Card): number | null {
  // Returns null for now (no actual assets yet)
  // Will be populated when card sprites are added to assets/
  return null;
}

/**
 * Returns a display string for a card's suit symbol.
 */
export function getSuitSymbol(suit: Card['suit']): string {
  switch (suit) {
    case 'spades': return '♠';
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
  }
}

/**
 * Returns whether a suit is red (hearts or diamonds).
 */
export function isRedSuit(suit: Card['suit']): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}
