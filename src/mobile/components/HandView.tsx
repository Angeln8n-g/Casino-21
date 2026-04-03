import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Modal,
  Text,
  Pressable,
  ListRenderItemInfo,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Card } from '../../domain/card';
import DraggableCard from './DraggableCard';

export interface HandViewProps {
  cards: Card[];
  selectedCardId: string | null;
  onCardSelect: (card: Card) => void;
  onCardDrop: (cardId: string, targetId: string) => void;
  disabled: boolean;
}

// Card width (60) + horizontal margin (8) = 68 per item
const CARD_ITEM_WIDTH = 60;
const CARD_ITEM_MARGIN = 8;
const CARD_ITEM_TOTAL = CARD_ITEM_WIDTH + CARD_ITEM_MARGIN;

function HandView({
  cards,
  selectedCardId,
  onCardSelect,
  onCardDrop,
  disabled,
}: HandViewProps) {
  const [enlargedCard, setEnlargedCard] = useState<Card | null>(null);

  const keyExtractor = useCallback((card: Card) => card.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<Card> | null | undefined, index: number) => ({
      length: CARD_ITEM_TOTAL,
      offset: CARD_ITEM_TOTAL * index,
      index,
    }),
    []
  );

  // Tap simple: seleccionar carta de la mano (Req 4.1)
  const handleCardPress = useCallback(
    (card: Card) => {
      if (!disabled) {
        onCardSelect(card);
      }
    },
    [disabled, onCardSelect]
  );

  // Long press: mostrar vista ampliada de la carta (Req 4.6)
  const handleCardLongPress = useCallback(
    (card: Card) => {
      if (!disabled) {
        setEnlargedCard(card);
      }
    },
    [disabled]
  );

  // Drag end: arrastrar carta hacia la mesa o formación (Req 4.2)
  const handleDragEnd = useCallback(
    (cardId: string, targetId: string) => {
      if (!disabled) {
        onCardDrop(cardId, targetId);
      }
    },
    [disabled, onCardDrop]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Card>) => (
      <View style={styles.cardWrapper}>
        <DraggableCard
          card={item}
          selected={item.id === selectedCardId}
          onPress={handleCardPress}
          onLongPress={handleCardLongPress}
          onDragEnd={handleDragEnd}
          disabled={disabled}
          size="medium"
        />
      </View>
    ),
    [selectedCardId, disabled, handleCardPress, handleCardLongPress, handleDragEnd]
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <FlatList
        data={cards}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        style={styles.list}
        scrollEnabled={!disabled}
      />

      {/* Enlarged card modal for long press (Req 4.6) */}
      <Modal
        visible={enlargedCard !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEnlargedCard(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEnlargedCard(null)}
          accessibilityLabel="Cerrar vista ampliada"
        >
          {enlargedCard && (
            <View style={styles.enlargedCardContainer}>
              <DraggableCard
                card={enlargedCard}
                selected={false}
                disabled
                size="large"
              />
              <Text style={styles.enlargedCardHint}>Toca para cerrar</Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 0,
  },
  list: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cardWrapper: {
    marginRight: CARD_ITEM_MARGIN,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedCardContainer: {
    alignItems: 'center',
    gap: 12,
  },
  enlargedCardHint: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.8,
  },
});

export default React.memo(HandView);
