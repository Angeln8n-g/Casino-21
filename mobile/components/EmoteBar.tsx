import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MessageSquare } from 'lucide-react-native';

interface EmoteBarProps {
  onSendEmote: (emoji: string) => void;
  onOpenChat?: () => void;
}

const QUICK_EMOJIS = ['😀', '😮', '🔥', '👏', '💀', '🎉', '💩', '😎'];

export function EmoteBar({ onSendEmote, onOpenChat }: EmoteBarProps) {
  return (
    <View className="flex-row items-center justify-between my-2 px-1">
      {/* Lista Horizontal de Emoticons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 mr-3">
        <View className="flex-row items-center space-x-2">
          {QUICK_EMOJIS.map((emoji, index) => (
            <Pressable
              key={index}
              onPress={() => onSendEmote(emoji)}
              className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-xl items-center justify-center mr-2 active:bg-amber-500/20"
            >
              <Text className="text-lg">{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Botón Flotante de Chat */}
      {onOpenChat && (
        <Pressable
          onPress={onOpenChat}
          className="w-11 h-11 bg-slate-900 border border-slate-800 rounded-2xl items-center justify-center shadow-lg active:bg-slate-800"
        >
          <MessageSquare color="#fbbf24" size={20} />
        </Pressable>
      )}
    </View>
  );
}
