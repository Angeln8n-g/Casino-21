import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAudio } from '../../hooks/useAudio';
import { CardView } from '../../components/CardView';
import { extractGradientColors } from '../../components/card/TacticalCard3D';
import { getTheme, ALL_THEME_FONTS, ThemeFontKey } from '../../themes/themeRegistry';
import { getStoredFontPreference, setStoredFontPreference } from '../../hooks/useGameTheme';
import { createCard } from 'domain/card';
import { triggerHaptic } from '../../utils/haptics';
import { appEvents } from '../../utils/events';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  item_type: 'avatar' | 'title' | 'board' | 'theme' | 'emotic';
  price: number;
  image_url: string | null;
  theme_key?: string | null;
}

const PREVIEW_CARD = createCard('hearts', 'A');

export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const baseUrl =
    process.env.EXPO_PUBLIC_SOCKET_URL || process.env.VITE_SOCKET_URL || 'http://localhost:4000';
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  return `${baseUrl}/assets/store/${url}`;
}

function ThemeCardPreview({
  themeKey,
  fontOverride,
}: {
  themeKey: string;
  fontOverride?: ThemeFontKey | null;
}) {
  const theme = getTheme(themeKey);
  const cardTheme = fontOverride ? { ...theme.cardTheme, fontKey: fontOverride } : theme.cardTheme;
  const boardColors = extractGradientColors(theme.boardTheme.background, [
    '#0a3258',
    '#07263f',
    '#041a2e',
  ]);

  return (
    <View className="relative items-center justify-center w-full h-full overflow-hidden rounded-xl">
      <LinearGradient
        colors={boardColors}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          right: 6,
          bottom: 6,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.boardTheme.innerRingColor || 'rgba(253, 224, 71, 0.35)',
        }}
      />
      <View className="z-10">
        <CardView
          card={PREVIEW_CARD}
          theme={cardTheme}
          fontKey={cardTheme.fontKey}
          size="sm"
        />
      </View>
    </View>
  );
}

const SkeletonStoreItem = () => (
  <View className="flex-1 p-4 rounded-2xl border border-white/5 bg-[#18181B]/60 min-h-[240px] justify-between mb-3">
    <View>
      <View className="flex-row justify-between items-start mb-3">
        <View className="h-4 w-14 bg-white/10 rounded" />
        <View className="h-4 w-16 bg-white/10 rounded" />
      </View>
      <View className="h-28 w-full bg-white/5 rounded-xl mb-3" />
      <View className="h-4 w-3/4 bg-white/10 rounded mb-1.5" />
      <View className="h-3 w-1/2 bg-white/5 rounded mb-3" />
    </View>
    <View className="h-10 w-full bg-white/10 rounded-xl" />
  </View>
);

export default function Store() {
  const insets = useSafeAreaInsets();
  const { profile, user, refetchProfile } = useAuth();
  const { playSfx } = useAudio();

  const [items, setItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Navigation & Cart State (idéntico a Store.tsx Web)
  const [viewMode, setViewMode] = useState<'store' | 'gallery'>('store');
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'avatar' | 'title' | 'board' | 'theme' | 'emotic'
  >('all');
  const [cart, setCart] = useState<StoreItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Rarity dynamically based on price
  const getRarity = (price: number) => {
    if (price >= 2000)
      return {
        label: 'LEGENDARIO',
        color: 'text-[#FACC15] border-[#FACC15]/50 bg-black/60',
      };
    if (price >= 800)
      return {
        label: 'EPICO',
        color: 'text-[#C084FC] border-[#C084FC]/50 bg-black/60',
      };
    return {
      label: 'RARO',
      color: 'text-[#60A5FA] border-[#60A5FA]/50 bg-black/60',
    };
  };

  // Purchase & Equip Flow
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successItems, setSuccessItems] = useState<string[]>([]);

  // Wallet animation state
  const [prevCoins, setPrevCoins] = useState(profile?.coins || 0);
  const [coinAnim, setCoinAnim] = useState(false);

  // Ad Views Limit state
  const [adViewsCount, setAdViewsCount] = useState<number>(0);
  const [showLimitReachedAnimation, setShowLimitReachedAnimation] = useState<boolean>(false);
  const [isAdChecking, setIsAdChecking] = useState<boolean>(false);

  // Player Font Preference
  const [preferredFont, setPreferredFont] = useState<ThemeFontKey | null>(null);

  useEffect(() => {
    getStoredFontPreference().then((f) => setPreferredFont(f));
    const handler = () => {
      getStoredFontPreference().then((f) => setPreferredFont(f));
    };
    appEvents.on('font_preference_updated', handler);
    return () => {
      appEvents.off('font_preference_updated', handler);
    };
  }, []);

  const loadAdCountFromLocalStorage = async () => {
    if (!user) return;
    try {
      const cached = await AsyncStorage.getItem(`ad_views_daily_${user.id}`);
      if (cached) {
        const { date, count } = JSON.parse(cached);
        const todayStr = new Date().toISOString().split('T')[0];
        if (date === todayStr) {
          setAdViewsCount(count);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading storage for ads:', e);
    }
    setAdViewsCount(0);
  };

  const fetchAdCount = async () => {
    if (!user) return;
    setIsAdChecking(true);
    try {
      const { data, error } = await supabase.rpc('get_daily_rewarded_ad_count');
      if (!error && typeof data === 'number') {
        setAdViewsCount(data);
        const todayStr = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(
          `ad_views_daily_${user.id}`,
          JSON.stringify({ date: todayStr, count: data })
        );
      } else {
        await loadAdCountFromLocalStorage();
      }
    } catch (e) {
      console.error('Error fetching ad count:', e);
      await loadAdCountFromLocalStorage();
    } finally {
      setIsAdChecking(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
    fetchAdCount();
  }, [user]);

  useEffect(() => {
    if (profile?.coins !== prevCoins) {
      setCoinAnim(true);
      const timer = setTimeout(() => setCoinAnim(false), 500);
      setPrevCoins(profile?.coins || 0);
      return () => clearTimeout(timer);
    }
  }, [profile?.coins, prevCoins]);

  const fetchStoreData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: storeData, error: storeError } = await supabase
        .from('store_items')
        .select('*')
        .eq('is_active', true);

      if (storeError) throw storeError;
      setItems((storeData as StoreItem[]) || []);
      console.log('Shop items from API:', storeData || []);

      const { data: invData, error: invError } = await supabase
        .from('player_inventory')
        .select('item_id')
        .eq('player_id', user.id);

      if (invError) throw invError;
      setInventory((invData || []).map((i: any) => i.item_id));
    } catch (err) {
      console.error('Error fetching store:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRewardedAd = async () => {
    if (adViewsCount >= 3) {
      setShowLimitReachedAnimation(true);
      playSfx('victory');
      return;
    }
    if (!user) return;
    setIsAdChecking(true);
    try {
      const { data, error } = await supabase.rpc('claim_rewarded_ad_coins', {
        p_reward_amount: 50,
      });

      if (error) throw error;

      if (data?.success) {
        const nextCount = adViewsCount + 1;
        setAdViewsCount(nextCount);
        const todayStr = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(
          `ad_views_daily_${user.id}`,
          JSON.stringify({ date: todayStr, count: nextCount })
        );

        appEvents.emit('coins_updated');
        if (refetchProfile) await refetchProfile();
        playSfx('victory');
        triggerHaptic('success');

        if (nextCount >= 3) {
          setShowLimitReachedAnimation(true);
        } else {
          Alert.alert('¡Recompensa obtenida!', 'Has recibido +50 🪙 por ver el anuncio.');
        }
      } else {
        if (data?.error === 'DAILY_LIMIT_REACHED') {
          setAdViewsCount(3);
          const todayStr = new Date().toISOString().split('T')[0];
          await AsyncStorage.setItem(
            `ad_views_daily_${user.id}`,
            JSON.stringify({ date: todayStr, count: 3 })
          );
          setShowLimitReachedAnimation(true);
          playSfx('victory');
          return;
        }
        const errMsg =
          data?.error === 'ON_COOLDOWN'
            ? 'Debes esperar un momento antes de ver otro anuncio y reclamar más monedas.'
            : data?.error === 'DAILY_LIMIT_REACHED'
            ? 'Ya has visto el límite máximo de 3 anuncios por hoy.'
            : `Error al reclamar monedas: ${data?.error || 'Desconocido'}`;
        Alert.alert('Aviso', errMsg);
        playSfx('error');
        triggerHaptic('error');
      }
    } catch (e) {
      console.error('Error rewarding player:', e);
      Alert.alert('Error', 'Error de conexión al reclamar tu recompensa.');
      playSfx('error');
      triggerHaptic('error');
    } finally {
      setIsAdChecking(false);
    }
  };

  // Cart Functions
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const isInCart = (id: string) => cart.some((item) => item.id === id);

  const toggleCartItem = (item: StoreItem) => {
    if (isInCart(item.id)) {
      setCart((prev) => prev.filter((i) => i.id !== item.id));
      triggerHaptic('light');
    } else {
      if ((profile?.coins || 0) < cartTotal + item.price) {
        playSfx('error');
        triggerHaptic('error');
        Alert.alert(
          'Monedas insuficientes',
          `Te faltan ${(cartTotal + item.price - (profile?.coins || 0)).toLocaleString()} 🪙`
        );
        return;
      }
      setCart((prev) => [...prev, item]);
      triggerHaptic('success');
      playSfx('chipsClink', { volumeMultiplier: 0.5 });
    }
  };

  const handleCheckout = async () => {
    if (!profile || cart.length === 0) return;
    if ((profile.coins || 0) < cartTotal) {
      playSfx('error');
      triggerHaptic('error');
      return;
    }

    setProcessingId('checkout');
    const newInventory = [...inventory];
    const successfulPurchases: string[] = [];

    try {
      for (const item of cart) {
        const { error } = await supabase.rpc('buy_store_item', { p_item_id: item.id });
        if (error) throw error;
        newInventory.push(item.id);
        successfulPurchases.push(item.id);
      }

      setInventory(newInventory);
      setCart([]);
      setIsCartOpen(false);
      setSuccessItems(successfulPurchases);

      playSfx('victory', { volumeMultiplier: 0.8 });
      triggerHaptic('success');
      appEvents.emit('coins_updated');
      appEvents.emit('profile_updated');
      if (refetchProfile) await refetchProfile();

      setTimeout(() => setSuccessItems([]), 3000);
      setViewMode('gallery');
    } catch (err: any) {
      console.error('Error during checkout:', err);
      playSfx('error');
      triggerHaptic('error');
      Alert.alert('Error', err.message || 'Ocurrió un error al procesar el carrito.');

      setInventory(newInventory);
      setCart((prev) => prev.filter((item) => !successfulPurchases.includes(item.id)));
    } finally {
      setProcessingId(null);
    }
  };

  const handleEquip = async (item: StoreItem, slot?: number) => {
    setProcessingId(item.id);
    try {
      const { error } = await supabase.rpc('equip_store_item', {
        p_item_id: item.id,
        p_slot: slot || 1,
      });
      if (error) throw error;

      playSfx('cardPlay', { volumeMultiplier: 0.8, playbackRate: 1.08 });
      triggerHaptic('success');
      appEvents.emit('profile_updated');
      if (refetchProfile) await refetchProfile();

      setSuccessItems([item.id]);
      setTimeout(() => setSuccessItems([]), 1500);
    } catch (err: any) {
      console.error('Error equipping item:', err);
      playSfx('error');
      triggerHaptic('error');
      Alert.alert('Error', err.message || 'Error al equipar.');
    } finally {
      setProcessingId(null);
    }
  };

  const isItemEquipped = (item: StoreItem): boolean => {
    switch (item.item_type) {
      case 'avatar':
        return profile?.equipped_avatar === item.image_url;
      case 'title':
        return profile?.equipped_title === item.name;
      case 'board':
        return profile?.equipped_board === item.image_url;
      case 'theme':
        return profile?.equipped_theme === item.theme_key;
      case 'emotic':
        return Boolean(item.image_url && profile?.equipped_emotics?.includes(item.image_url));
      default:
        return false;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'avatar':
        return '👤 Avatar';
      case 'title':
        return '🏷️ Título';
      case 'board':
        return '🎲 Tapete';
      case 'theme':
        return '🎨 Tema';
      case 'emotic':
        return '😊 Emoticón';
      default:
        return 'Otro';
    }
  };

  // Apply filters and sorting based on view mode (idéntico a Store.tsx Web)
  const displayItems = useMemo(() => {
    let result = items.filter((item) => {
      const isOwned = inventory.includes(item.id);
      return viewMode === 'gallery' ? isOwned : !isOwned;
    });

    result = result.filter(
      (item) => activeCategory === 'all' || item.item_type === activeCategory
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => b.price - a.price);
  }, [items, activeCategory, searchQuery, viewMode, inventory]);

  const androidStatusBar = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 32) : 0;
  const safeTop = Math.max(insets.top, androidStatusBar, 36) + 8;

  const renderHeader = () => (
    <View className="pt-2 pb-4">
      {/* Top Bar: View Toggle and Search */}
      <View className="flex-col gap-3 mb-4">
        {/* View Mode Toggle */}
        <View className="flex-row p-1 bg-[#1A1815] rounded-xl border border-[#2A2722]">
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setViewMode('store');
            }}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
              viewMode === 'store' ? 'bg-[#2A2722]' : ''
            }`}
          >
            <Text
              className={`font-bold text-sm ${
                viewMode === 'store' ? 'text-white' : 'text-[#A1A1AA]'
              }`}
            >
              Catalog
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setViewMode('gallery');
            }}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
              viewMode === 'gallery' ? 'bg-[#2A2722]' : ''
            }`}
          >
            <Text
              className={`font-bold text-sm ${
                viewMode === 'gallery' ? 'text-white' : 'text-[#A1A1AA]'
              }`}
            >
              Collection ({inventory.length})
            </Text>
          </Pressable>
        </View>

        {/* Search */}
        <View className="relative flex-row items-center bg-[#1A1815] border border-[#2A2722] rounded-xl px-4 py-3">
          <Text className="mr-2.5 opacity-60 text-sm">🔍</Text>
          <TextInput
            placeholder={
              viewMode === 'store'
                ? 'Buscar cosméticos exclusivos...'
                : 'Buscar en tu colección...'
            }
            placeholderTextColor="#71717A"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-white text-sm p-0"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} className="pl-2">
              <Text className="text-[#A1A1AA] font-bold text-xs">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-5"
        contentContainerStyle={{ gap: 8, paddingRight: 12 }}
      >
        {(['all', 'avatar', 'title', 'board', 'theme', 'emotic'] as const).map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => {
                triggerHaptic('light');
                setActiveCategory(cat);
              }}
              className={`px-4 py-2 rounded-full border ${
                isActive
                  ? 'bg-[#FDE68A] border-[#FDE68A]'
                  : 'bg-transparent border-[#2A2722]'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isActive ? 'text-[#11100E]' : 'text-[#A1A1AA]'
                }`}
              >
                {cat === 'all' ? 'All items' : getCategoryLabel(cat)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Title & Wallet/Ad Row */}
      <View className="flex-col gap-3 mb-4">
        <View>
          <Text className="text-2xl font-bold text-white tracking-tight">
            {viewMode === 'store' ? 'Digital Assets' : 'My Collection'}
          </Text>
          <Text className="text-[#A1A1AA] mt-0.5 text-xs">
            {viewMode === 'store'
              ? 'Coleccionables de edición limitada'
              : 'Tus artículos exclusivos'}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-2.5 w-full">
          {/* View Sponsored Message Button */}
          <Pressable
            disabled={isAdChecking}
            onPress={handleRewardedAd}
            className={`rounded-full px-3.5 py-2.5 items-center justify-center border flex-1 ${
              adViewsCount >= 3
                ? 'bg-zinc-800/40 border-zinc-700/50'
                : 'bg-[#3b82f6]/20 border-[#3b82f6]/50 active:bg-[#3b82f6]/30'
            }`}
          >
            <Text
              numberOfLines={1}
              className={`text-xs font-bold ${
                adViewsCount >= 3 ? 'text-[#A1A1AA]' : 'text-[#60a5fa]'
              }`}
            >
              {adViewsCount >= 3
                ? 'Anuncios Agotados (3/3)'
                : `Ver Anuncio (${adViewsCount}/3, quedan ${3 - adViewsCount})`}
            </Text>
          </Pressable>

          {/* Wallet */}
          <View className="bg-[#1A1815] border border-[#FACC15]/30 rounded-full px-4 py-2.5 items-center justify-center shadow-xl">
            <View className="flex-row items-center justify-center gap-1.5">
              <Text className="text-xs">🪙</Text>
              <Text
                className={`text-xs font-bold ${
                  coinAnim ? 'text-green-400' : 'text-[#FACC15]'
                }`}
              >
                {(profile?.coins || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Theme Font Selector Toolbar */}
      {activeCategory === 'theme' && (
        <View className="mb-4 p-4 rounded-2xl bg-[#1A1815] border border-[#2A2722]">
          <View className="mb-3">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs">🔤</Text>
              <Text className="text-xs uppercase tracking-wider font-bold text-[#FACC15]">
                Personalizar Tipografía de Cartas
              </Text>
            </View>
            <Text className="text-xs text-[#A1A1AA] mt-0.5">
              Selecciona la fuente de los números y letras de tus cartas para todas tus partidas.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2 items-center">
            <Pressable
              onPress={async () => {
                await setStoredFontPreference(null);
                setPreferredFont(null);
                triggerHaptic('light');
              }}
              className={`px-3 py-1.5 rounded-lg border ${
                preferredFont === null
                  ? 'bg-[#FACC15] border-[#FACC15]'
                  : 'bg-[#2A2722] border-[#3A362F]'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  preferredFont === null ? 'text-[#11100E]' : 'text-[#A1A1AA]'
                }`}
              >
                Por defecto del tema
              </Text>
            </Pressable>

            {ALL_THEME_FONTS.map((f) => {
              const isActive = preferredFont === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={async () => {
                    await setStoredFontPreference(f.key);
                    setPreferredFont(f.key);
                    triggerHaptic('light');
                  }}
                  className={`px-3 py-1.5 rounded-lg border ${
                    isActive
                      ? 'bg-[#FACC15] border-[#FACC15]'
                      : 'bg-[#2A2722] border-[#3A362F]'
                  }`}
                >
                  <Text
                    style={{ fontFamily: f.fontFamily }}
                    className={`text-xs font-bold ${
                      isActive ? 'text-[#11100E]' : 'text-[#A1A1AA]'
                    }`}
                  >
                    {f.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#11100E', paddingTop: safeTop }}>
      {loading ? (
        <View className="flex-1 px-4">
          {renderHeader()}
          <View className="flex-row gap-3">
            <SkeletonStoreItem />
            <SkeletonStoreItem />
          </View>
          <View className="flex-row gap-3">
            <SkeletonStoreItem />
            <SkeletonStoreItem />
          </View>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 110 }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20 px-6 bg-[#18181B]/50 rounded-3xl border border-white/5">
              <Text className="text-5xl mb-4 opacity-40">
                {viewMode === 'store' ? '💸' : '📦'}
              </Text>
              <Text className="text-xl font-bold text-white mb-2 text-center">
                {viewMode === 'store' ? 'Tienda vacía' : 'Galería vacía'}
              </Text>
              <Text className="text-[#A1A1AA] text-xs text-center">
                {viewMode === 'store'
                  ? 'No hay artículos nuevos en esta categoría. ¡Ya compraste todo!'
                  : 'Aún no posees artículos de esta categoría. Ve a comprar algunos.'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const rarity = getRarity(item.price);
            const isSuccess = successItems.includes(item.id);
            const inCart = isInCart(item.id);
            const isEquipped = viewMode === 'gallery' && isItemEquipped(item);
            const fullImageUrl = resolveImageUrl(item.image_url);
            const hasImageError = failedImages[item.id];

            return (
              <View
                style={{ flex: 1, maxWidth: '48.5%', marginBottom: 12 }}
                className={`bg-[#1A1815] rounded-2xl relative overflow-hidden border flex-col justify-between ${
                  isSuccess
                    ? 'border-green-500'
                    : inCart
                    ? 'border-[#FACC15]'
                    : isEquipped
                    ? 'border-yellow-500/60'
                    : 'border-[#2A2722]'
                }`}
              >
                {/* Image/Preview Area */}
                <View
                  style={{ height: item.item_type === 'board' ? 110 : 145 }}
                  className="relative w-full overflow-hidden items-center justify-center bg-[#0F0E0C]"
                >
                  <View
                    className={`absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded border ${rarity.color}`}
                  >
                    <Text
                      className={`text-[8px] font-bold uppercase tracking-wider ${
                        rarity.color.split(' ')[0]
                      }`}
                    >
                      {rarity.label}
                    </Text>
                  </View>

                  {item.item_type === 'theme' && item.theme_key ? (
                    <View className="w-full h-full">
                      <ThemeCardPreview
                        themeKey={item.theme_key}
                        fontOverride={preferredFont}
                      />
                    </View>
                  ) : fullImageUrl && !hasImageError ? (
                    <Image
                      source={{ uri: fullImageUrl }}
                      style={{
                        width: '100%',
                        height: '100%',
                        padding:
                          item.item_type === 'board' || item.item_type === 'avatar' ? 0 : 12,
                      }}
                      contentFit={
                        item.item_type === 'board' || item.item_type === 'avatar'
                          ? 'cover'
                          : 'contain'
                      }
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                      }
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center bg-[#141210]">
                      <Text className="text-4xl opacity-40">
                        {item.item_type === 'avatar'
                          ? '👤'
                          : item.item_type === 'board'
                          ? '🃏'
                          : item.item_type === 'emotic'
                          ? '💬'
                          : '✨'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Content Area */}
                <View className="p-3.5 flex-col flex-grow justify-between">
                  <View>
                    <Text className="text-[9px] text-[#A78BFA] uppercase tracking-widest font-black mb-1">
                      {getCategoryLabel(item.item_type).split(' ')[1] || item.item_type}
                    </Text>

                    <Text
                      className="font-bold text-sm text-white mb-2 leading-tight"
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>

                    {viewMode === 'store' && (
                      <View className="flex-row items-center gap-1 mb-3">
                        <Text className="text-xs">🪙</Text>
                        <Text className="text-[#FACC15] font-bold text-xs">
                          {item.price.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View className="mt-auto pt-1">
                    {viewMode === 'store' ? (
                      <Pressable
                        onPress={() => toggleCartItem(item)}
                        className={`w-full py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
                          inCart
                            ? 'bg-[#2A2722] border border-[#FACC15]/30'
                            : 'bg-[#FACC15] active:bg-[#FDE68A]'
                        }`}
                      >
                        <Text
                          className={`font-bold text-xs ${
                            inCart ? 'text-[#FACC15]' : 'text-black'
                          }`}
                        >
                          {inCart ? '✓ EN EL CARRITO' : '🛒 AÑADIR'}
                        </Text>
                      </Pressable>
                    ) : item.item_type === 'emotic' ? (
                      <View className="flex-col gap-1.5">
                        <Text className="text-[9px] text-[#A1A1AA] uppercase tracking-wider text-center font-bold">
                          Equipar en Slot:
                        </Text>
                        <View className="flex-row flex-wrap justify-between gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => {
                            const isEquippedInSlot =
                              profile?.equipped_emotics?.[slot - 1] === item.image_url;
                            return (
                              <Pressable
                                key={slot}
                                onPress={() => handleEquip(item, slot)}
                                disabled={processingId === item.id || isEquippedInSlot}
                                style={{ width: '22%' }}
                                className={`py-1.5 rounded-lg items-center border ${
                                  isEquippedInSlot
                                    ? 'bg-[#FACC15]/20 border-[#FACC15]/50'
                                    : 'bg-[#2A2722] border-[#3A362F] active:bg-[#3A362F]'
                                }`}
                              >
                                <Text
                                  className={`font-bold text-[10px] ${
                                    isEquippedInSlot ? 'text-[#FACC15]' : 'text-white'
                                  }`}
                                >
                                  S{slot}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleEquip(item)}
                        disabled={isEquipped || processingId === item.id}
                        className={`w-full py-2.5 rounded-xl items-center justify-center border ${
                          isEquipped
                            ? 'bg-[#FACC15]/10 border-[#FACC15]/20'
                            : 'bg-[#2A2722] border-[#3A362F] active:bg-[#3A362F]'
                        }`}
                      >
                        <Text
                          className={`font-bold text-xs ${
                            isEquipped ? 'text-[#FACC15]' : 'text-white'
                          }`}
                        >
                          {processingId === item.id
                            ? 'Cargando...'
                            : isEquipped
                            ? '★ EQUIPADO'
                            : 'EQUIPAR'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Floating Cart Button (idéntico a Store.tsx Web) */}
      {viewMode === 'store' && cart.length > 0 && (
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setIsCartOpen(true);
          }}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 20,
            zIndex: 40,
            elevation: 16,
          }}
          className="bg-[#FACC15] active:bg-[#FDE68A] w-14 h-14 rounded-full shadow-2xl items-center justify-center border border-[#FDE68A]"
        >
          <Text className="text-2xl">🛒</Text>
          <View className="absolute -top-1 -right-1 bg-red-600 w-6 h-6 rounded-full items-center justify-center border border-white">
            <Text className="text-white text-[10px] font-black">{cart.length}</Text>
          </View>
        </Pressable>
      )}

      {/* Shopping Cart Drawer / Modal (idéntico a Store.tsx Web) */}
      <Modal
        visible={isCartOpen}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsCartOpen(false)}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View className="w-full bg-[#09090B] border-t border-white/10 rounded-t-3xl max-h-[85%] flex-col shadow-2xl overflow-hidden">
            <View className="p-5 border-b border-white/5 flex-row justify-between items-center bg-[#18181B]">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">🛒</Text>
                <Text className="text-xl font-bold text-white">Tu Carrito</Text>
              </View>
              <Pressable
                onPress={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 items-center justify-center"
              >
                <Text className="text-[#A1A1AA] font-bold">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="p-5" contentContainerStyle={{ gap: 12 }}>
              {cart.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Text className="text-5xl mb-3 opacity-60">🛒</Text>
                  <Text className="text-[#A1A1AA] text-sm">El carrito está vacío</Text>
                </View>
              ) : (
                cart.map((item) => {
                  const fullImageUrl = resolveImageUrl(item.image_url);
                  return (
                    <View
                      key={`cart-${item.id}`}
                      className="flex-row gap-3.5 p-3.5 rounded-2xl bg-[#18181B] border border-white/5 items-center"
                    >
                      <View className="w-14 h-14 rounded-xl bg-[#27272A] items-center justify-center overflow-hidden p-1">
                        {fullImageUrl ? (
                          <Image
                            source={{ uri: fullImageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="contain"
                          />
                        ) : (
                          <Text className="text-base">✨</Text>
                        )}
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-white font-bold text-sm" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="text-[#A1A1AA] text-xs">
                          {getCategoryLabel(item.item_type)}
                        </Text>
                        <Text className="text-[#FACC15] font-bold text-sm mt-1">
                          🪙 {item.price.toLocaleString()}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => toggleCartItem(item)}
                        className="w-8 h-8 rounded-full items-center justify-center bg-red-500/10"
                      >
                        <Text className="text-red-400 font-bold text-xs">✕</Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View className="p-5 border-t border-white/5 bg-[#18181B]">
              <View className="flex-row justify-between items-end mb-4">
                <Text className="text-[#A1A1AA] font-bold">Total a pagar:</Text>
                <Text
                  className={`text-2xl font-bold ${
                    cartTotal > (profile?.coins || 0) ? 'text-red-400' : 'text-white'
                  }`}
                >
                  🪙 {cartTotal.toLocaleString()}
                </Text>
              </View>

              {cartTotal > (profile?.coins || 0) && (
                <Text className="text-red-400 text-xs mb-3 font-bold text-center">
                  Monedas insuficientes. Te faltan{' '}
                  {(cartTotal - (profile?.coins || 0)).toLocaleString()} 🪙
                </Text>
              )}

              <Pressable
                onPress={handleCheckout}
                disabled={
                  cart.length === 0 ||
                  cartTotal > (profile?.coins || 0) ||
                  processingId === 'checkout'
                }
                className={`w-full py-4 rounded-xl items-center justify-center flex-row gap-2 ${
                  cart.length === 0 || cartTotal > (profile?.coins || 0)
                    ? 'bg-[#27272A]'
                    : 'bg-[#F8FAFC] active:bg-white'
                }`}
              >
                {processingId === 'checkout' ? (
                  <>
                    <ActivityIndicator size="small" color="#09090B" />
                    <Text className="text-[#09090B] font-bold text-base">
                      Procesando...
                    </Text>
                  </>
                ) : (
                  <Text
                    className={`font-bold text-base ${
                      cart.length === 0 || cartTotal > (profile?.coins || 0)
                        ? 'text-[#71717A]'
                        : 'text-[#09090B]'
                    }`}
                  >
                    Confirmar Compra
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Limit Reached Animation Modal (idéntico a Store.tsx Web) */}
      <Modal
        visible={showLimitReachedAnimation}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowLimitReachedAnimation(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center p-5">
          <View className="bg-[#1A1815] border border-yellow-500/30 rounded-3xl p-7 max-w-sm w-full items-center shadow-2xl">
            <View className="relative mb-5 justify-center items-center h-24 w-24 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <Text className="text-5xl">🎬</Text>
            </View>

            <Text className="text-2xl font-black text-white mb-3 text-center">
              ¡Anuncios Agotados!
            </Text>

            <Text className="text-gray-300 text-xs mb-6 leading-relaxed text-center">
              Has completado el límite máximo de{' '}
              <Text className="text-yellow-400 font-bold">3 anuncios diarios</Text>.{'\n'}
              ¡Muchas gracias por apoyar el juego! Vuelve mañana para seguir obteniendo monedas gratis.
            </Text>

            <Pressable
              onPress={() => setShowLimitReachedAnimation(false)}
              className="w-full bg-amber-500 active:bg-amber-400 py-3.5 rounded-xl items-center"
            >
              <Text className="text-black font-black text-sm uppercase">Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
