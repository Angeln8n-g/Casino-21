import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAudio } from '../../hooks/useAudio';
import { createCard } from 'domain/card';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  item_type: 'avatar' | 'title' | 'board' | 'theme' | 'emotic';
  price: number;
  image_url: string | null;
  theme_key?: string | null;
}

export default function ShopScreen() {
  const { profile, user, refetchProfile } = useAuth();
  const { playSfx } = useAudio();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'avatar' | 'title' | 'board' | 'theme' | 'emotic'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      
      // Real API calls to Supabase (NO MOCK DATA)
      const { data: storeData, error: storeError } = await supabase
        .from('store_items')
        .select('*')
        .order('price', { ascending: true });

      if (storeError) {
        console.error('Error fetching store items:', storeError);
      } else if (storeData) {
        setItems(storeData as StoreItem[]);
        // Rule 5.3: Mandatory console log to prove real data fetching
        console.log('Shop items from API:', storeData);
      }

      if (user?.id) {
        const { data: invData, error: invError } = await supabase
          .from('profile_inventory')
          .select('item_id')
          .eq('user_id', user.id);

        if (!invError && invData) {
          setInventory(invData.map((inv: any) => inv.item_id));
        }
      }
    } catch (err) {
      console.error('Failed to load shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [user]);

  const handleBuy = async (item: StoreItem) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para comprar en la tienda.');
      return;
    }

    if ((profile?.coins || 0) < item.price) {
      Alert.alert('Monedas insuficientes', 'No tienes suficientes monedas para este objeto.');
      return;
    }

    try {
      setProcessingId(item.id);
      const { error } = await supabase.rpc('buy_store_item', { p_item_id: item.id });
      
      if (error) {
        Alert.alert('Error', error.message || 'No se pudo realizar la compra.');
      } else {
        playSfx('chipsClink');
        Alert.alert('¡Compra exitosa!', `Has adquirido ${item.name}`);
        await fetchStoreData();
        if (refetchProfile) await refetchProfile();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error inesperado al comprar.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredItems = items.filter(item => 
    activeCategory === 'all' ? true : item.item_type === activeCategory
  );

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-12">
      {/* Header con Monedas del Usuario Real */}
      <View className="flex-row justify-between items-center mb-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <View>
          <Text className="text-amber-400 font-bold text-2xl">TIENDA</Text>
          <Text className="text-slate-400 text-xs">Kasino 21 items</Text>
        </View>
        <View className="flex-row items-center bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30">
          <Text className="text-amber-400 font-bold text-base mr-1">🪙</Text>
          <Text className="text-amber-400 font-bold text-base">{profile?.coins ?? 0}</Text>
        </View>
      </View>

      {/* Categorías */}
      <View className="flex-row mb-4">
        {(['all', 'avatar', 'title', 'theme'] as const).map(cat => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl mr-2 ${
              activeCategory === cat ? 'bg-amber-500' : 'bg-slate-900 border border-slate-800'
            }`}
          >
            <Text className={`font-bold capitalize ${activeCategory === cat ? 'text-slate-950' : 'text-slate-400'}`}>
              {cat === 'all' ? 'Todos' : cat}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lista de Items */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text className="text-slate-400 mt-4">Cargando la tienda...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            const isOwned = inventory.includes(item.id);
            const isBuying = processingId === item.id;

            return (
              <View className="bg-slate-900/90 rounded-2xl p-4 mb-4 border border-slate-800 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} className="w-14 h-14 rounded-xl mr-3 bg-slate-800" />
                  ) : (
                    <View className="w-14 h-14 rounded-xl mr-3 bg-amber-500/10 border border-amber-500/30 items-center justify-center">
                      <Text className="text-2xl">🃏</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">{item.name}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={2}>{item.description}</Text>
                    <Text className="text-amber-400 font-bold text-sm mt-1">🪙 {item.price}</Text>
                  </View>
                </View>

                <Pressable
                  disabled={isOwned || isBuying}
                  onPress={() => handleBuy(item)}
                  className={`px-4 py-2.5 rounded-xl ${
                    isOwned ? 'bg-slate-800' : isBuying ? 'bg-amber-600/50' : 'bg-amber-500 active:bg-amber-600'
                  }`}
                >
                  {isBuying ? (
                    <ActivityIndicator size="small" color="#020617" />
                  ) : (
                    <Text className={`font-bold ${isOwned ? 'text-slate-500' : 'text-slate-950'}`}>
                      {isOwned ? 'Adquirido' : 'Comprar'}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
