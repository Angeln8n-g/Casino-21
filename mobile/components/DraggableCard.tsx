import React from 'react';
import { View, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { CardView } from './CardView';
import { Card } from 'domain/card';

interface DraggableCardProps {
  card: Card;
  selected?: boolean;
  onPress?: () => void;
  onDropOnFormation?: (formationIndex: number) => void;
  disabled?: boolean;
}

export function DraggableCard({
  card,
  selected,
  onPress,
  onDropOnFormation,
  disabled,
}: DraggableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const handleDrop = (x: number, y: number) => {
    // Estimación táctil para 4 columnas en pantalla vertical (Portrait)
    if (y < -80 && onDropOnFormation) {
      if (x < -90) {
        onDropOnFormation(0);
      } else if (x < -30) {
        onDropOnFormation(1);
      } else if (x < 30) {
        onDropOnFormation(2);
      } else {
        onDropOnFormation(3);
      }
    }
  };

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      isDragging.value = false;
      runOnJS(handleDrop)(event.translationX, event.translationY);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: isDragging.value ? 1.18 : 1 },
    ],
    zIndex: isDragging.value ? 99999 : 1,
    elevation: isDragging.value ? 99999 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle, { overflow: 'visible' }]}>
        <CardView card={card} selected={selected} onPress={onPress} disabled={disabled} />
      </Animated.View>
    </GestureDetector>
  );
}
