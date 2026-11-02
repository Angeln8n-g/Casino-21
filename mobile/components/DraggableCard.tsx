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

  const handleDrop = (x: number, y: number) => {
    // Si la carta fue arrastrada hacia arriba al área del tablero o formaciones
    if (y < -65) {
      triggerHaptic('card_tap');
      // Si fue arrastrada a la zona de formaciones (centro-izquierda)
      if (y < -120 && onDropOnFormation) {
        if (x < -60) {
          onDropOnFormation(0, card);
          return;
        } else if (x < 0) {
          onDropOnFormation(1, card);
          return;
        } else if (x < 60) {
          onDropOnFormation(2, card);
          return;
        }
      }

      // Si fue soltada en el tablero general
      if (onDropOnBoard) {
        onDropOnBoard(card);
        return;
      }
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(6)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(triggerHaptic)('light');
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      isDragging.value = false;
      runOnJS(handleDrop)(event.translationX, event.translationY);
      translateX.value = withSpring(0, { damping: 14 });
      translateY.value = withSpring(0, { damping: 14 });
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
      { scale: isDragging.value ? 1.14 : 1 },
      { rotate: isDragging.value ? '2.5deg' : '0deg' },
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
