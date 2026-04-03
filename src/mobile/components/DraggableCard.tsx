import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Card } from '../../domain/card';
import CardView from './CardView';

type CardSize = 'small' | 'medium' | 'large';

export interface DraggableCardProps {
  card: Card;
  selected?: boolean;
  onPress?: (card: Card) => void;
  onLongPress?: (card: Card) => void;
  /** Called when drag ends. targetId is a placeholder for now. */
  onDragEnd?: (cardId: string, targetId: string) => void;
  disabled?: boolean;
  size?: CardSize;
}

function DraggableCard({
  card,
  selected = false,
  onPress,
  onLongPress,
  onDragEnd,
  disabled = false,
  size = 'medium',
}: DraggableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const handlePress = useCallback(() => {
    if (onPress) onPress(card);
  }, [onPress, card]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) onLongPress(card);
  }, [onLongPress, card]);

  const handleDragEnd = useCallback(
    (cardId: string, targetId: string) => {
      if (onDragEnd) onDragEnd(cardId, targetId);
    },
    [onDragEnd]
  );

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd(() => {
      runOnJS(handlePress)();
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled)
    .minDuration(500)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      isDragging.value = false;
      // Snap back to original position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      // targetId is a placeholder — full drop-target detection is wired in task 11.2
      runOnJS(handleDragEnd)(card.id, 'board');
    });

  // Compose: tap and long-press are exclusive; pan runs alongside
  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(tapGesture, longPressGesture),
    panGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
    opacity: isDragging.value ? 0.85 : 1,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <CardView
          card={card}
          selected={selected}
          // Gestures are handled by GestureDetector above; no Pressable callbacks needed
          draggable={!disabled}
          size={size}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    // Allows the animated view to lift above siblings during drag
  },
});

export default React.memo(DraggableCard);
