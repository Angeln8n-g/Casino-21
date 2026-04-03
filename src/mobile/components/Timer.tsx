// Feature: react-native-game-migration
// Requirements: 8.3
import React from 'react';
import { View, StyleSheet } from 'react-native';

export interface TimerProps {
  timeRemaining: number;
  maxTime?: number;
}

function getBarColor(ratio: number): string {
  if (ratio > 0.5) return '#22c55e'; // green
  if (ratio > 0.25) return '#eab308'; // yellow
  return '#ef4444'; // red
}

const Timer = React.memo<TimerProps>(({ timeRemaining, maxTime = 30 }) => {
  const ratio = Math.min(1, Math.max(0, timeRemaining / maxTime));
  const color = getBarColor(ratio);

  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: maxTime, now: timeRemaining }}>
      <View style={[styles.bar, { width: `${ratio * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
});

Timer.displayName = 'Timer';

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
});

export default Timer;
