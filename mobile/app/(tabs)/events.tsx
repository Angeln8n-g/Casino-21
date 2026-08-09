import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Trophy, Calendar, Zap, Award } from 'lucide-react-native';

interface EventItem {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  prize_pool_coins?: number;
  entry_fee_coins?: number;
  is_championship?: boolean;
}

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
      } else if (data) {
        setEvents(data as EventItem[]);
      }
    } catch (e) {
      console.error('Error fetching events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <View>
          <Text className="text-amber-400 font-bold text-2xl">EVENTOS & TORNEOS</Text>
          <Text className="text-slate-400 text-xs">Compite en torneos semanales Kasino 21</Text>
        </View>
        <View className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
          <Trophy color="#fbbf24" size={24} />
        </View>
      </View>

      {/* Lista de Eventos */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text className="text-slate-400 mt-4">Cargando eventos...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <View className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 items-center mt-6">
              <Calendar color="#94a3b8" size={40} className="mb-3" />
              <Text className="text-white font-bold text-lg mb-1">Próximos Torneos</Text>
              <Text className="text-slate-400 text-xs text-center">
                Los nuevos eventos semanales se anunciarán muy pronto. ¡Mantente atento!
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="bg-slate-900/90 rounded-3xl p-5 mb-4 border border-slate-800">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-amber-400 font-bold text-lg">{item.title}</Text>
                  <Text className="text-slate-400 text-xs mt-1" numberOfLines={3}>{item.description}</Text>
                </View>
                {item.is_championship && (
                  <View className="bg-purple-500/20 border border-purple-500/40 px-2.5 py-1 rounded-full">
                    <Text className="text-purple-300 font-bold text-[10px] uppercase">Campeonato</Text>
                  </View>
                )}
              </View>

              {/* Fechas y Premio */}
              <View className="flex-row justify-between items-center mt-4 bg-slate-800/80 p-3 rounded-2xl">
                <View className="flex-row items-center">
                  <Calendar color="#94a3b8" size={16} className="mr-1.5" />
                  <Text className="text-slate-300 text-xs font-bold">{formatDate(item.start_time)}</Text>
                </View>
                <View className="flex-row items-center bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                  <Text className="text-amber-400 font-bold text-xs">🪙 Premio: {item.prize_pool_coins || 1000}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => Alert.alert('Inscripción', `Te has registrado en el torneo ${item.title}`)}
                className="bg-amber-500 active:bg-amber-600 p-3 rounded-2xl items-center mt-4"
              >
                <Text className="text-slate-950 font-bold text-sm">Inscribirse al Torneo</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
