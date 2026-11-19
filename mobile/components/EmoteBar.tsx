import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { triggerHaptic } from '../utils/haptics';

interface EmoteBarProps {
  onSendEmote: (emoji: string) => void;
}

const DEFAULT_EMOJIS = ['😀', '😮', '🔥', '👏', '💀', '🎉', '💩', '😎'];

export function EmoteBar({ onSendEmote }: EmoteBarProps) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePressEmote = (emoji: string) => {
    if (cooldown > 0) return;
    triggerHaptic('light');
    onSendEmote(emoji);
    setCooldown(2);
  };

  return (
    <View className="flex-row items-center justify-between my-1 px-1">
      {/* Scroll de Emoticones */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
        <View className="flex-row items-center">
          {DEFAULT_EMOJIS.map((emoji, index) => (
            <Pressable
              key={index}
              disabled={cooldown > 0}
              onPress={() => handlePressEmote(emoji)}
              className={`w-9 h-9 bg-slate-900 border rounded-xl items-center justify-center mr-1.5 active:bg-amber-500/20 ${
                cooldown > 0 ? 'border-slate-800 opacity-40' : 'border-slate-800'
              }`}
            >
              <Text className="text-base">{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
