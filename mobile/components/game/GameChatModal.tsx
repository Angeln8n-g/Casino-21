import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { ChatMessage } from '../../hooks/useGame';
import { X, Send, MessageSquare } from 'lucide-react-native';

interface GameChatModalProps {
  visible: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

const QUICK_EMOJIS = ['😀', '🔥', '👏', '💀', '🎉', '😎', '👍', '❌'];

export function GameChatModal({ visible, messages, onSendMessage, onClose }: GameChatModalProps) {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [visible, messages.length]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/80 justify-end"
      >
        <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[80%] p-4 pb-8">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-slate-800 mb-3">
            <View className="flex-row items-center">
              <MessageSquare color="#fbbf24" size={20} className="mr-2" />
              <Text className="text-white font-bold text-base">Chat de la Partida</Text>
            </View>
            <Pressable onPress={onClose} className="p-1.5 bg-slate-800 rounded-full">
              <X color="#94a3b8" size={18} />
            </Pressable>
          </View>

          {/* Lista de Mensajes */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || String(item.timestamp)}
            className="flex-1 mb-3 max-h-72"
            ListEmptyComponent={() => (
              <View className="items-center justify-center py-10">
                <Text className="text-slate-500 text-xs italic">Aún no hay mensajes. ¡Di hola!</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View className="mb-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <View className="flex-row justify-between items-center mb-0.5">
                  <Text className="text-amber-400 font-bold text-[11px]">{item.senderName}</Text>
                  <Text className="text-slate-500 text-[9px]">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text className="text-slate-200 text-xs">{item.text}</Text>
              </View>
            )}
          />

          {/* Barra de Emojis Rápidos */}
          <View className="flex-row justify-between mb-3 px-1">
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => onSendMessage(emoji)}
                className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-xl items-center justify-center active:bg-amber-500/20"
              >
                <Text className="text-base">{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {/* Input de Mensaje */}
          <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#64748b"
              className="flex-1 text-white text-xs py-2 mr-2"
            />
            <Pressable
              onPress={handleSend}
              className="bg-amber-500 active:bg-amber-600 p-2 rounded-xl"
            >
              <Send color="#020617" size={16} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
