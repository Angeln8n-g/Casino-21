import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-950 p-6 justify-center items-center">
      <Text className="text-amber-400 text-3xl font-bold mb-2">KASINO 21</Text>
      <Text className="text-slate-400 text-base text-center mb-8">
        Bienvenido {profile?.username || 'Jugador'}
      </Text>

      <Pressable
        className="bg-amber-500 active:bg-amber-600 px-6 py-3 rounded-xl mb-4 w-full items-center"
        onPress={() => router.push('/shop')}
      >
        <Text className="text-slate-950 font-bold text-lg">Ir a la Tienda</Text>
      </Pressable>
    </View>
  );
}
