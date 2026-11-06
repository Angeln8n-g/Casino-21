import React, { memo, useRef, useMemo, useCallback } from 'react';
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

export const DraggableCard = memo(function DraggableCard({
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
  variant = 'auto',
}: DraggableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lastMoveCallRef = useRef<number>(0);

  // Mantener referencias estables a los callbacks para no recrear los gestos nativos en cada render
  const callbacksRef = useRef({
    card,
    disabled,
    onPress,
    onDragStart,
    onDragMove,
    onDragRelease,
    onDropOnBoard,
    onDropOnFormation,
  });
  callbacksRef.current = {
    card,
    disabled,
    onPress,
    onDragStart,
    onDragMove,
    onDragRelease,
    onDropOnBoard,
    onDropOnFormation,
  };

  const handlePress = useCallback(() => {
    const { disabled: isDisabled, onPress: pressFn } = callbacksRef.current;
    if (!isDisabled && pressFn) {
      pressFn();
    }
  }, []);

  const handleStart = useCallback(() => {
    const { card: currentCard, onDragStart: startFn } = callbacksRef.current;
    triggerHaptic('card_tap');
    startFn?.(currentCard);
  }, []);

  // Throttled to 50ms (~20fps) to keep JS thread responsive and prevent frame drops during drag
  const handleMove = useCallback((absX: number, absY: number) => {
    const { onDragMove: moveFn } = callbacksRef.current;
    if (!moveFn) return;
    const now = Date.now();
    if (now - lastMoveCallRef.current >= 50) {
      lastMoveCallRef.current = now;
      moveFn(absX, absY);
    }
  }, []);

  const handleEnd = useCallback((absX: number, absY: number, tx: number, ty: number) => {
    const {
      card: currentCard,
      disabled: isDisabled,
      onPress: pressFn,
      onDragRelease: releaseFn,
      onDropOnBoard: dropBoardFn,
      onDropOnFormation: dropFormFn,
    } = callbacksRef.current;

    if (isDisabled) return;

    // Si el desplazamiento fue pequeño (< 35px), tratarlo como un toque de selección inmediato
    if (Math.hypot(tx, ty) < 35) {
      pressFn?.();
      return;
    }

    if (releaseFn) {
      releaseFn(currentCard, absX, absY, tx, ty);
      return;
    }

    // Fallback si no se provee onDragRelease
    if (ty < -55) {
      if (ty < -120 && dropFormFn) {
        if (tx < -60) {
          triggerHaptic('formation');
          dropFormFn(0, currentCard);
          return;
        } else if (tx < 0) {
          triggerHaptic('formation');
          dropFormFn(1, currentCard);
          return;
        } else if (tx < 60) {
          triggerHaptic('formation');
          dropFormFn(2, currentCard);
          return;
        }
      }
      triggerHaptic('card_move');
      dropBoardFn?.(currentCard);
    } else {
      pressFn?.();
    }
  }, []);

  const composedGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .enabled(!disabled)
      .minDistance(14)
      .onStart(() => {
        isDragging.value = true;
        runOnJS(handleStart)();
      })
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        runOnJS(handleMove)(event.absoluteX, event.absoluteY);
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
      .maxDuration(600)
      .maxDistance(18)
      .onEnd((_event, success) => {
        if (success) {
          runOnJS(handlePress)();
        }
      });

    return Gesture.Exclusive(panGesture, tapGesture);
  }, [disabled, handleStart, handleMove, handleEnd, handlePress, isDragging, translateX, translateY]);

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
          disabled={disabled}
          theme={theme}
          fontKey={fontKey}
          variant={variant}
        />
      </Animated.View>
    </GestureDetector>
  );
});
