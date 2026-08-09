import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Card } from 'domain/card';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function CardView({ card, selected, onPress, disabled }: CardViewProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitColor = isRed ? 'text-red-600' : 'text-slate-900';

  const suitSymbols: Record<string, string> = {
    spades: '♠️',
    hearts: '♥️',
    diamonds: '♦️',
    clubs: '♣️',
    hidden: '❓',
  };

  const symbol = suitSymbols[card.suit] || '❓';
  const rank = String(card.rank);

  if ((card as any).suit === 'hidden' || (card as any).rank === '?') {
    return (
      <View className="w-14 h-20 rounded-xl bg-slate-800 border border-slate-700 items-center justify-center shadow-md">
        <Text className="text-amber-400 font-bold text-lg">K21</Text>
      </View>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`w-14 h-20 rounded-xl bg-slate-100 p-1.5 justify-between border-2 shadow-md ${
        selected ? 'border-amber-400 -translate-y-2 bg-amber-50' : 'border-slate-300'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`font-bold text-xs ${suitColor}`}>{rank}</Text>
      <View className="items-center justify-center">
        <Text className="text-lg">{symbol}</Text>
      </View>
      <Text className={`font-bold text-xs text-right ${suitColor}`}>{rank}</Text>
    </Pressable>
  );
}
