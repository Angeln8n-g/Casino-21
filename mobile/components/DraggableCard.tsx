import React from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { CardView } from './CardView';
import { Card } from 'domain/card';
import { CardTheme, ThemeFontKey } from '../themes/themeRegistry';
import { triggerHaptic } from '../utils/haptics';

interface DraggableCardProps {
  card: Card;
  selected?: boolean;
  onPress?: () => void;
  onDragStart?: (card: Card) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragRelease?: (
    card: Card,
    absoluteX: number,
    absoluteY: number,
    translationX: number,
    translationY: number
  ) => void;
  onDropOnBoard?: (card: Card) => void;
  onDropOnFormation?: (formationIndex: number, card: Card) => void;
  disabled?: boolean;
  theme?: CardTheme;
  fontKey?: ThemeFontKey;
  variant?: 'light' | 'dark' | 'auto';
}

export function DraggableCard({
  card,
  selected,
  onPress,
  onDragStart,
  onDragMove,
  onDragRelease,
  onDropOnBoard,
  onDropOnFormation,
  disabled,
  theme,
  fontKey,
  variant = 'light',
}: DraggableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  const handleStart = () => {
    triggerHaptic('card_tap');
    onDragStart?.(card);
  };

  const handleMove = (absX: number, absY: number) => {
    onDragMove?.(absX, absY);
  };

  const handleEnd = (absX: number, absY: number, tx: number, ty: number) => {
    if (onDragRelease) {
      onDragRelease(card, absX, absY, tx, ty);
      return;
    }

    // Fallback si no se provee onDragRelease
    if (ty < -55) {
      triggerHaptic('card_tap');
      if (ty < -120 && onDropOnFormation) {
        if (tx < -60) {
          onDropOnFormation(0, card);
          return;
        } else if (tx < 0) {
          onDropOnFormation(1, card);
          return;
        } else if (tx < 60) {
          onDropOnFormation(2, card);
          return;
        }
      }
      onDropOnBoard?.(card);
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(6)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(handleStart)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      if (onDragMove) {
        runOnJS(handleMove)(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      isDragging.value = false;
      runOnJS(handleEnd)(
        event.absoluteX,
        event.absoluteY,
        event.translationX,
        event.translationY
      );
      translateX.value = withSpring(0, { damping: 15, stiffness: 180 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
    })
    .onFinalize(() => {
      isDragging.value = false;
      translateX.value = withSpring(0, { damping: 15, stiffness: 180 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
    });

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd(() => {
      runOnJS(handlePress)();
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: isDragging.value ? 1.12 : 1 },
      { rotate: isDragging.value ? '2deg' : '0deg' },
    ],
    zIndex: isDragging.value ? 999999 : 1,
    elevation: isDragging.value ? 999999 : 1,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[animatedStyle, { overflow: 'visible' }]}>
        <CardView
          card={card}
          selected={selected}
          onPress={onPress}
          disabled={disabled}
          theme={theme}
          fontKey={fontKey}
          variant={variant}
        />
      </Animated.View>
    </GestureDetector>
  );
}
