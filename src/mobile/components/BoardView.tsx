import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Card } from '../../domain/card';
import { Board, Formation, CantedCard } from '../../domain/board';
import CardView from './CardView';

export interface BoardViewProps {
  board: Board;
  selectedCardIds: string[];
  onCardPress: (card: Card) => void;
  /** Called when the user taps on the empty board area to clear selection (Req 4.5) */
  onClearSelection?: () => void;
  isMyTurn: boolean;
}

const NARROW_SCREEN_BREAKPOINT = 375;

function BoardView({
  board,
  selectedCardIds,
  onCardPress,
  onClearSelection,
  isMyTurn: _isMyTurn,
}: BoardViewProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < NARROW_SCREEN_BREAKPOINT;
  const cardSize = isNarrow ? 'small' : 'medium';

  const handleCardPress = useCallback(
    (card: Card) => {
      onCardPress(card);
    },
    [onCardPress]
  );

  // Tap on empty area clears selection (Req 4.5)
  const handleClearSelection = useCallback(() => {
    if (onClearSelection) onClearSelection();
  }, [onClearSelection]);

  const backgroundTapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleClearSelection)();
  });

  const renderLooseCard = useCallback(
    (card: Card) => (
      <View key={card.id} style={styles.cardWrapper}>
        <CardView
          card={card}
          selected={selectedCardIds.includes(card.id)}
          onPress={handleCardPress}
          size={cardSize}
        />
      </View>
    ),
    [selectedCardIds, handleCardPress, cardSize]
  );

  const renderFormation = useCallback(
    (formation: Formation) => (
      <View key={formation.id} style={[styles.formation, isNarrow && styles.formationNarrow]}>
        <Text style={styles.formationLabel} numberOfLines={1}>
          {formation.value}
        </Text>
        <View style={styles.formationCards}>
          {formation.cards.map((card) => (
            <View key={card.id} style={[styles.cardWrapper, styles.formationCardWrapper]}>
              <CardView
                card={card}
                selected={selectedCardIds.includes(card.id)}
                onPress={handleCardPress}
                size={cardSize}
              />
            </View>
          ))}
        </View>
      </View>
    ),
    [selectedCardIds, handleCardPress, cardSize, isNarrow]
  );

  const renderCantedCard = useCallback(
    (cantedCard: CantedCard) => (
      <View key={cantedCard.card.id} style={styles.cantedCardWrapper}>
        <CardView
          card={cantedCard.card}
          selected={selectedCardIds.includes(cantedCard.card.id)}
          onPress={handleCardPress}
          size={cardSize}
        />
        <View style={styles.cantedBadge}>
          <Text style={styles.cantedBadgeText} numberOfLines={1}>
            🔒
          </Text>
        </View>
      </View>
    ),
    [selectedCardIds, handleCardPress, cardSize]
  );

  const hasLooseCards = board.cards.length > 0;
  const hasFormations = board.formations.length > 0;
  const hasCantedCards = board.cantedCards.length > 0;

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <GestureDetector gesture={backgroundTapGesture}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {hasLooseCards && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Mesa</Text>
              <View style={styles.row}>
                {board.cards.map(renderLooseCard)}
              </View>
            </View>
          )}

          {hasFormations && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Formaciones</Text>
              <View style={[styles.row, styles.formationsRow]}>
                {board.formations.map(renderFormation)}
              </View>
            </View>
          )}

          {hasCantedCards && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cantadas</Text>
              <View style={styles.row}>
                {board.cantedCards.map(renderCantedCard)}
              </View>
            </View>
          )}

          {!hasLooseCards && !hasFormations && !hasCantedCards && (
            <View style={styles.emptyBoard}>
              <Text style={styles.emptyBoardText}>Mesa vacía</Text>
            </View>
          )}
        </ScrollView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 8,
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  formationsRow: {
    // formations use their own margin
  },
  cardWrapper: {
    marginRight: 6,
    marginBottom: 6,
  },
  formation: {
    borderWidth: 1,
    borderColor: '#4A90D9',
    borderRadius: 8,
    padding: 6,
    backgroundColor: 'rgba(74, 144, 217, 0.08)',
    marginRight: 8,
    marginBottom: 8,
  },
  formationNarrow: {
    padding: 4,
  },
  formationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A90D9',
    textAlign: 'center',
    marginBottom: 4,
  },
  formationCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  formationCardWrapper: {
    marginRight: 4,
    marginBottom: 4,
  },
  cantedCardWrapper: {
    position: 'relative',
  },
  cantedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantedBadgeText: {
    fontSize: 10,
  },
  emptyBoard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyBoardText: {
    fontSize: 14,
    color: '#AAAAAA',
    fontStyle: 'italic',
  },
});

export default React.memo(BoardView);
