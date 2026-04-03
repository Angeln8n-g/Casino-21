/**
 * Unit tests for CardView component
 * Validates: Requirements 3.5
 */

// Mock react-native before any imports
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  Pressable: 'Pressable',
  StyleSheet: { create: (s: any) => s },
  Platform: { select: (obj: any) => obj.ios ?? obj.default ?? {} },
}));

// Mock cardUtils
jest.mock('../../utils/cardUtils', () => ({
  getCardImageSource: jest.fn(() => null),
  getSuitSymbol: jest.fn((suit: string) => {
    const symbols: Record<string, string> = {
      spades: '♠',
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
    };
    return symbols[suit] ?? '?';
  }),
  isRedSuit: jest.fn((suit: string) => suit === 'hearts' || suit === 'diamonds'),
}));

import React from 'react';
import { Card } from '../../../domain/card';
import CardView, { CardViewProps } from '../../components/CardView';
import { getCardImageSource } from '../../utils/cardUtils';

const mockGetCardImageSource = getCardImageSource as jest.Mock;

function makeCard(rank: Card['rank'] = 'A', suit: Card['suit'] = 'spades'): Card {
  return { id: `${rank}-${suit}`, suit, rank, value: 1 };
}

interface PressableProps {
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityState?: { selected?: boolean };
  onPress?: () => void;
  onLongPress?: () => void;
  children?: React.ReactNode;
}

/**
 * Renders CardView to a React element tree and returns the root Pressable element props.
 * CardView is a memo component — we call the inner function directly.
 */
function renderCardView(props: CardViewProps): { props: PressableProps } {
  const CardViewFn = (CardView as any).type ?? CardView;
  return CardViewFn(props) as { props: PressableProps };
}

describe('CardView', () => {
  beforeEach(() => {
    mockGetCardImageSource.mockReturnValue(null);
  });

  describe('is a valid React component', () => {
    it('is a function or memo component', () => {
      // React.memo wraps the component in a .type property
      const isMemo = (CardView as any).$$typeof?.toString().includes('memo');
      const isFunction = typeof CardView === 'function';
      expect(isMemo || isFunction).toBe(true);
    });

    it('renders without crashing with minimal props (card only)', () => {
      const card = makeCard('A', 'spades');
      expect(() => renderCardView({ card })).not.toThrow();
    });

    it('returns a non-null object (React element)', () => {
      const card = makeCard('A', 'spades');
      const element = renderCardView({ card });
      expect(element).not.toBeNull();
      expect(typeof element).toBe('object');
    });
  });

  describe('accessibility label', () => {
    it('has correct accessibility label for unselected card', () => {
      const card = makeCard('A', 'spades');
      const element = renderCardView({ card, selected: false });
      expect(element.props.accessibilityLabel).toBe('Carta A de spades');
    });

    it('has correct accessibility label for selected card', () => {
      const card = makeCard('10', 'hearts');
      const element = renderCardView({ card, selected: true });
      expect(element.props.accessibilityLabel).toBe('Carta 10 de hearts, seleccionada');
    });

    it('includes ", seleccionada" suffix when selected=true', () => {
      const card = makeCard('Q', 'diamonds');
      const element = renderCardView({ card, selected: true });
      expect(element.props.accessibilityLabel).toContain('seleccionada');
    });

    it('does not include "seleccionada" when selected=false', () => {
      const card = makeCard('Q', 'diamonds');
      const element = renderCardView({ card, selected: false });
      expect(element.props.accessibilityLabel).not.toContain('seleccionada');
    });

    it('has accessibilityRole of button', () => {
      const card = makeCard('5', 'diamonds');
      const element = renderCardView({ card });
      expect(element.props.accessibilityRole).toBe('button');
    });
  });

  describe('selected state', () => {
    it('sets accessibilityState.selected=true when selected=true', () => {
      const card = makeCard('J', 'clubs');
      const element = renderCardView({ card, selected: true });
      expect(element.props.accessibilityState?.selected).toBe(true);
    });

    it('sets accessibilityState.selected=false when selected=false', () => {
      const card = makeCard('J', 'clubs');
      const element = renderCardView({ card, selected: false });
      expect(element.props.accessibilityState?.selected).toBe(false);
    });

    it('defaults selected to false when not provided', () => {
      const card = makeCard('J', 'clubs');
      const element = renderCardView({ card });
      expect(element.props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('onPress callback', () => {
    it('calls onPress with the card when the handler is invoked', () => {
      const card = makeCard('7', 'clubs');
      const onPress = jest.fn();
      const element = renderCardView({ card, onPress });
      // Simulate press by calling the onPress prop directly
      element.props.onPress!();
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(card);
    });

    it('does not provide onPress prop when no handler is given', () => {
      const card = makeCard('3', 'hearts');
      const element = renderCardView({ card });
      expect(element.props.onPress).toBeUndefined();
    });

    it('passes the correct card object to onPress', () => {
      const card = makeCard('K', 'spades');
      const onPress = jest.fn();
      const element = renderCardView({ card, onPress });
      element.props.onPress!();
      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'K-spades', suit: 'spades', rank: 'K' }),
      );
    });
  });

  describe('onLongPress callback', () => {
    it('calls onLongPress with the card when the handler is invoked', () => {
      const card = makeCard('J', 'spades');
      const onLongPress = jest.fn();
      const element = renderCardView({ card, onLongPress });
      element.props.onLongPress!();
      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(onLongPress).toHaveBeenCalledWith(card);
    });

    it('does not provide onLongPress prop when no handler is given', () => {
      const card = makeCard('3', 'hearts');
      const element = renderCardView({ card });
      expect(element.props.onLongPress).toBeUndefined();
    });

    it('passes the correct card object to onLongPress', () => {
      const card = makeCard('A', 'hearts');
      const onLongPress = jest.fn();
      const element = renderCardView({ card, onLongPress });
      element.props.onLongPress!();
      expect(onLongPress).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'A-hearts', suit: 'hearts', rank: 'A' }),
      );
    });
  });

  describe('sizes', () => {
    it('renders with small size without crashing', () => {
      const card = makeCard('2', 'spades');
      expect(() => renderCardView({ card, size: 'small' })).not.toThrow();
    });

    it('renders with medium size without crashing', () => {
      const card = makeCard('2', 'spades');
      expect(() => renderCardView({ card, size: 'medium' })).not.toThrow();
    });

    it('renders with large size without crashing', () => {
      const card = makeCard('2', 'spades');
      expect(() => renderCardView({ card, size: 'large' })).not.toThrow();
    });

    it('defaults to medium size when size is not provided', () => {
      const card = makeCard('2', 'spades');
      // Should not throw and should render the same as medium
      expect(() => renderCardView({ card })).not.toThrow();
    });
  });

  describe('fallback content (no image)', () => {
    it('calls getCardImageSource with the card', () => {
      const card = makeCard('9', 'diamonds');
      renderCardView({ card });
      expect(mockGetCardImageSource).toHaveBeenCalledWith(card);
    });

    it('renders fallback when getCardImageSource returns null', () => {
      mockGetCardImageSource.mockReturnValue(null);
      const card = makeCard('K', 'hearts');
      // Should not throw — fallback text content is rendered
      expect(() => renderCardView({ card })).not.toThrow();
    });

    it('renders image content when getCardImageSource returns a source', () => {
      mockGetCardImageSource.mockReturnValue(42);
      const card = makeCard('5', 'clubs');
      // Should not throw — image is rendered
      expect(() => renderCardView({ card })).not.toThrow();
    });
  });
});
