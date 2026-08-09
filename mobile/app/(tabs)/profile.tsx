import React from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Trophy, Award, Zap, Sparkles } from 'lucide-react-native';

export function getDivisionFromElo(elo: number) {
  if (elo < 1200) return { label: 'Bronce', icon: '🥉', color: 'text-amber-700' };
  if (elo < 1500) return { label: 'Plata', icon: '🥈', color: 'text-slate-400' };
  if (elo < 1800) return { label: 'Oro', icon: '🥇', color: 'text-amber-400' };
  if (elo < 2100) return { label: 'Platino', icon: '💎', color: 'text-cyan-400' };
  return { label: 'Diamante', icon: '👑', color: 'text-purple-400' };
}

export function calculateLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100));
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  const elo = profile?.elo || 1000;
  const xp = profile?.xp || 0;
  const level = calculateLevelFromXp(xp);
  const division = getDivisionFromElo(elo);
  const wins = profile?.wins || 0;
  const losses = profile?.losses || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0';

  const handleSignOut = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => await signOut() }
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 px-4 pt-12">
      {/* Tarjeta Principal del Perfil */}
      <View className="bg-slate-900/90 rounded-3xl p-6 mb-6 border border-slate-800 items-center">
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} className="w-24 h-24 rounded-full mb-3 border-2 border-amber-400" />
        ) : (
          <View className="w-24 h-24 rounded-full mb-3 bg-amber-500/20 border-2 border-amber-400 items-center justify-center">
            <Text className="text-4xl">👤</Text>
          </View>
        )}

        <Text className="text-white font-bold text-2xl">{profile?.username || 'Jugador K21'}</Text>
        {profile?.equipped_title && (
          <Text className="text-amber-400 text-xs font-bold uppercase tracking-wider mt-1">
            ✨ {profile.equipped_title}
          </Text>
        )}

        {/* Nivel y División */}
        <View className="flex-row items-center mt-4 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700">
          <Text className="text-xl mr-2">{division.icon}</Text>
          <Text className={`font-bold text-sm mr-3 ${division.color}`}>{division.label}</Text>
          <View className="w-px h-4 bg-slate-700 mr-3" />
          <Text className="text-amber-400 font-bold text-sm">Nivel {level}</Text>
        </View>
      </View>

      {/* Estadísticas Clave */}
      <Text className="text-slate-400 font-bold text-sm uppercase mb-3 ml-1">Estadísticas de Partida</Text>

      <View className="flex-row flex-wrap justify-between mb-6">
        <View className="bg-slate-900/80 w-[48%] p-4 rounded-2xl border border-slate-800 mb-3 flex-row items-center">
          <View className="bg-amber-500/10 p-3 rounded-xl mr-3">
            <Trophy color="#fbbf24" size={24} />
          </View>
          <View>
            <Text className="text-slate-400 text-xs">Puntos ELO</Text>
            <Text className="text-amber-400 font-bold text-xl">{elo}</Text>
          </View>
        </View>

        <View className="bg-slate-900/80 w-[48%] p-4 rounded-2xl border border-slate-800 mb-3 flex-row items-center">
          <View className="bg-emerald-500/10 p-3 rounded-xl mr-3">
            <Zap color="#10b981" size={24} />
          </View>
          <View>
            <Text className="text-slate-400 text-xs">Experiencia</Text>
            <Text className="text-emerald-400 font-bold text-xl">{xp} XP</Text>
          </View>
        </View>

        <View className="bg-slate-900/80 w-[48%] p-4 rounded-2xl border border-slate-800 flex-row items-center">
          <View className="bg-cyan-500/10 p-3 rounded-xl mr-3">
            <Award color="#06b6d4" size={24} />
          </View>
          <View>
            <Text className="text-slate-400 text-xs">Victorias</Text>
            <Text className="text-cyan-400 font-bold text-xl">{wins}</Text>
          </View>
        </View>

        <View className="bg-slate-900/80 w-[48%] p-4 rounded-2xl border border-slate-800 flex-row items-center">
          <View className="bg-purple-500/10 p-3 rounded-xl mr-3">
            <Sparkles color="#c084fc" size={24} />
          </View>
          <View>
            <Text className="text-slate-400 text-xs">Efectividad</Text>
            <Text className="text-purple-400 font-bold text-xl">{winRate}%</Text>
          </View>
        </View>
      </View>

      {/* Botón de Cerrar Sesión */}
      <Pressable
        onPress={handleSignOut}
        className="bg-red-500/10 active:bg-red-500/20 border border-red-500/30 p-4 rounded-2xl flex-row items-center justify-center mb-12"
      >
        <LogOut color="#ef4444" size={20} className="mr-2" />
        <Text className="text-red-400 font-bold text-base">Cerrar Sesión</Text>
      </Pressable>
    </ScrollView>
  );
}
