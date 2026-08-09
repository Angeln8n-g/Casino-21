import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Users, UserPlus, Search } from 'lucide-react-native';

interface Friend {
  id: string;
  username: string;
  elo: number;
  avatar_url?: string | null;
}

export default function SocialScreen() {
  const { user, presenceByUserId } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);

  const fetchFriends = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id, profiles!friendships_friend_id_fkey(id, username, elo, avatar_url)')
        .eq('user_id', user.id);

      if (!error && data) {
        const friendList = data.map((f: any) => f.profiles).filter(Boolean);
        setFriends(friendList);
      }
    } catch (e) {
      console.error('Error fetching friends:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, elo, avatar_url')
        .ilike('username', `%${searchQuery.trim()}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data as Friend[]);
      }
    } catch (e) {
      console.error('Error searching players:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <Text className="text-amber-400 font-bold text-2xl">SOCIAL</Text>
        <View className="flex-row bg-slate-800 p-1 rounded-xl">
          <Pressable
            onPress={() => setActiveTab('friends')}
            className={`px-3 py-1.5 rounded-lg flex-row items-center ${activeTab === 'friends' ? 'bg-amber-500' : ''}`}
          >
            <Users color={activeTab === 'friends' ? '#020617' : '#94a3b8'} size={16} className="mr-1" />
            <Text className={`font-bold text-xs ${activeTab === 'friends' ? 'text-slate-950' : 'text-slate-400'}`}>
              Amigos ({friends.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg flex-row items-center ${activeTab === 'search' ? 'bg-amber-500' : ''}`}
          >
            <UserPlus color={activeTab === 'search' ? '#020617' : '#94a3b8'} size={16} className="mr-1" />
            <Text className={`font-bold text-xs ${activeTab === 'search' ? 'text-slate-950' : 'text-slate-400'}`}>
              Buscar
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'search' ? (
        <View className="mb-4">
          <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 mb-4">
            <Search color="#94a3b8" size={18} className="mr-2" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              placeholder="Buscar jugadores por nombre..."
              placeholderTextColor="#64748b"
              className="flex-1 text-white text-sm"
            />
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View className="bg-slate-900 p-4 rounded-xl mb-3 border border-slate-800 flex-row justify-between items-center">
                <Text className="text-white font-bold">{item.username}</Text>
                <Text className="text-amber-400 text-xs font-bold">ELO: {item.elo}</Text>
              </View>
            )}
          />
        </View>
      ) : loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fbbf24" />
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={item => item.id}
          ListEmptyComponent={() => (
            <Text className="text-slate-500 text-center mt-10">No tienes amigos añadidos aún.</Text>
          )}
          renderItem={({ item }) => {
            const isOnline = !!presenceByUserId[item.id];

            return (
              <View className="bg-slate-900/80 p-4 rounded-2xl mb-3 border border-slate-800 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="relative mr-3">
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} className="w-10 h-10 rounded-full" />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                        <Text className="text-white">👤</Text>
                      </View>
                    )}
                    <View
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-base">{item.username}</Text>
                    <Text className="text-amber-400 text-xs">
                      ELO: {item.elo} • {isOnline ? '🟢 En línea' : '⚪ Desconectado'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
