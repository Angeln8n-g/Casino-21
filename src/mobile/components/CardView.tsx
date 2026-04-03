import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { Card } from '../../domain/card';
import { getCardImageSource, getSuitSymbol, isRedSuit } from '../utils/cardUtils';

type CardSize = 'small' | 'medium' | 'large';

export interface CardViewProps {
  card: Card;
  selected?: boolean;
  onPress?: (card: Card) => void;
  onLongPress?: (card: Card) => void;
  draggable?: boolean;
  size?: CardSize;
}

const CARD_DIMENSIONS: Record<CardSize, { width: number; height: number }> = {
  small: { width: 45, height: 67 },
  medium: { width: 60, height: 90 },
  large: { width: 80, height: 120 },
};

const FONT_SIZES: Record<CardSize, { rank: number; suit: number }> = {
  small: { rank: 12, suit: 10 },
  medium: { rank: 16, suit: 14 },
  large: { rank: 20, suit: 18 },
};

function CardView({
  card,
  selected = false,
  onPress,
  onLongPress,
  draggable = false,
  size = 'medium',
}: CardViewProps) {
  const dimensions = CARD_DIMENSIONS[size];
  const fontSizes = FONT_SIZES[size];
  const imageSource = getCardImageSource(card);
  const suitSymbol = getSuitSymbol(card.suit);
  const isRed = isRedSuit(card.suit);

  const handlePress = onPress ? () => onPress(card) : undefined;
  const handleLongPress = onLongPress ? () => onLongPress(card) : undefined;

  const cardContent = imageSource ? (
    <Image
      source={imageSource as ImageSourcePropType}
      style={[styles.cardImage, { width: dimensions.width, height: dimensions.height }]}
      resizeMode="contain"
      accessibilityLabel={`${card.rank} de ${card.suit}`}
    />
  ) : (
    <View style={styles.fallbackContent}>
      <Text
        style={[
          styles.rankText,
          { fontSize: fontSizes.rank, color: isRed ? '#CC0000' : '#111111' },
        ]}
        numberOfLines={1}
      >
        {card.rank}
      </Text>
      <Text
        style={[
          styles.suitText,
          { fontSize: fontSizes.suit, color: isRed ? '#CC0000' : '#111111' },
        ]}
        numberOfLines={1}
      >
        {suitSymbol}
      </Text>
    </View>
  );

  const shadowStyle = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    android: {
      elevation: 4,
    },
  });

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Carta ${card.rank} de ${card.suit}${selected ? ', seleccionada' : ''}`}
      accessibilityState={{ selected }}
    >
      <View
        style={[
          styles.card,
          { width: dimensions.width, height: dimensions.height },
          shadowStyle,
          selected && styles.selectedCard,
          draggable && styles.draggableCard,
        ]}
      >
        {cardContent}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  draggableCard: {
    // Hint for gesture handlers (actual drag logic added in task 11)
  },
  cardImage: {
    // Image fills the card
  },
  fallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  rankText: {
    fontWeight: 'bold',
    lineHeight: undefined,
  },
  suitText: {
    lineHeight: undefined,
  },
});

export default React.memo(CardView);
