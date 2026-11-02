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
} from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAudio } from '../../hooks/useAudio';
import { triggerHaptic } from '../../utils/haptics';
import { TacticalCard3D } from '../../components/card/TacticalCard3D';
import { getTheme, ALL_THEME_FONTS, ThemeFontKey } from '../../themes/themeRegistry';
import { getStoredFontPreference, setStoredFontPreference } from '../../hooks/useGameTheme';
import { appEvents } from '../../utils/events';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Check,
  Sparkles,
  Trash2,
  X,
  Layers,
  Type,
} from 'lucide-react-native';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  item_type: 'avatar' | 'title' | 'board' | 'theme' | 'emotic';
  price: number;
  image_url: string | null;
  theme_key?: string | null;
}

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

const getRarity = (price: number) => {
  if (price >= 2000)
    return {
      label: 'LEGENDARIO',
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
    };
  if (price >= 800)
    return {
      label: 'ÉPICO',
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
    };
  return {
    label: 'RARO',
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
  };
};

export default function ShopScreen() {
  const { profile, user, refetchProfile } = useAuth();
  const { playSfx } = useAudio();

  const [items, setItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegación: Catálogo vs Mi Colección
  const [viewMode, setViewMode] = useState<'store' | 'gallery'>('store');
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'avatar' | 'title' | 'board' | 'theme' | 'emotic'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Carrito de compras
  const [cart, setCart] = useState<StoreItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Equipamiento & Preferencias de Fuente
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedEmoticItem, setSelectedEmoticItem] = useState<StoreItem | null>(null);
  const [preferredFont, setPreferredFont] = useState<ThemeFontKey | null>(null);

  // Cargar preferencia de fuente guardada
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

  // ── Fetch de ítems e inventario ────────────────────────────
  const fetchStoreData = async () => {
    try {
      setLoading(true);

      const { data: storeData, error: storeError } = await supabase
        .from('store_items')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: false });

      if (storeError) {
        console.error('Error fetching store items:', storeError);
      } else if (storeData) {
        setItems(storeData as StoreItem[]);
        // Cumplimiento Regla 5.3: Console log demostrando datos reales de API
        console.log('Shop items from API:', storeData);
      }

      if (user?.id) {
        const { data: invData, error: invError } = await supabase
          .from('player_inventory')
          .select('item_id')
          .eq('player_id', user.id);

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

  // ── Carrito de compras ─────────────────────────────────────
  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.price, 0), [cart]);
  const isInCart = (id: string) => cart.some((i) => i.id === id);

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
          `Te faltan ${(cartTotal + item.price - (profile?.coins || 0)).toLocaleString()} 🪙 para añadir este artículo al carrito.`
        );
        return;
      }
      setCart((prev) => [...prev, item]);
      triggerHaptic('success');
      playSfx('chipsClink', { volumeMultiplier: 0.6 });
    }
  };

  const handleCheckout = async () => {
    if (!profile || cart.length === 0) return;
    if ((profile.coins || 0) < cartTotal) {
      playSfx('error');
      triggerHaptic('error');
      Alert.alert('Monedas insuficientes', 'No tienes saldo suficiente para pagar el total del carrito.');
      return;
    }

    setIsCheckingOut(true);
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

      playSfx('victory', { volumeMultiplier: 0.8 });
      triggerHaptic('success');
      appEvents.emit('coins_updated');
      appEvents.emit('profile_updated');
      if (refetchProfile) await refetchProfile();

      Alert.alert(
        '¡Compras completadas!',
        `Has adquirido ${successfulPurchases.length} artículo(s). Ya están disponibles en tu Colección.`
      );
      setViewMode('gallery');
    } catch (err: any) {
      console.error('Error during checkout:', err);
      playSfx('error');
      triggerHaptic('error');
      Alert.alert('Error en compra', err.message || 'Ocurrió un error al procesar el carrito.');
      setInventory(newInventory);
      setCart((prev) => prev.filter((item) => !successfulPurchases.includes(item.id)));
    } finally {
      setIsCheckingOut(false);
    }
  };

  // ── Equipamiento de ítems ──────────────────────────────────
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
        return (profile?.equipped_emotics || []).includes(item.image_url || '');
      default:
        return false;
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

      playSfx('cardPlay', { volumeMultiplier: 0.8 });
      triggerHaptic('success');
      appEvents.emit('profile_updated');
      if (refetchProfile) await refetchProfile();

      if (item.item_type === 'emotic') {
        setSelectedEmoticItem(null);
      }
      Alert.alert('¡Equipado!', `${item.name} ahora está activo.`);
    } catch (err: any) {
      console.error('Error equipping item:', err);
      playSfx('error');
      triggerHaptic('error');
      Alert.alert('Error al equipar', err.message || 'No se pudo equipar el cosmético.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFontChange = async (fontKey: ThemeFontKey | null) => {
    triggerHaptic('light');
    await setStoredFontPreference(fontKey);
    setPreferredFont(fontKey);
  };

  const getItemEmoji = (type: string) => {
    switch (type) {
      case 'avatar':
        return '👤';
      case 'title':
        return '🏷️';
      case 'board':
        return '🎲';
      case 'theme':
        return '🎨';
      case 'emotic':
        return '😊';
      default:
        return '🎁';
    }
  };

  // ── Filtrado y búsqueda ────────────────────────────────────
  const displayItems = useMemo(() => {
    let result = items.filter((item) => {
      const isOwned = inventory.includes(item.id);
      return viewMode === 'gallery' ? isOwned : !isOwned;
    });

    if (activeCategory !== 'all') {
      result = result.filter((item) => item.item_type === activeCategory);
    }

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

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-12">
      {/* ── Header con Saldo y Carrito ──────────────────────── */}
      <View className="flex-row justify-between items-center mb-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <View>
          <Text className="text-amber-400 font-bold text-2xl tracking-wide">
            {viewMode === 'store' ? 'TIENDA K21' : 'MI COLECCIÓN'}
          </Text>
          <Text className="text-slate-400 text-xs">
            {viewMode === 'store' ? 'Cosméticos exclusivos y temas' : 'Tus artículos adquiridos'}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Carrito en modo catálogo */}
          {viewMode === 'store' && (
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setIsCartOpen(true);
              }}
              className="relative p-2.5 rounded-full bg-slate-800 border border-slate-700 active:bg-slate-700"
            >
              <ShoppingCart color="#fbbf24" size={20} />
              {cart.length > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-600 rounded-full w-5 h-5 items-center justify-center border border-slate-900">
                  <Text className="text-white text-[10px] font-black">{cart.length}</Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Saldo de monedas */}
          <View className="flex-row items-center bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30">
            <Text className="text-amber-400 font-bold text-sm mr-1">🪙</Text>
            <Text className="text-amber-400 font-bold text-sm">
              {(profile?.coins ?? 0).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Selector Catálogo / Colección ───────────────────── */}
      <View className="flex-row bg-slate-900 p-1 rounded-2xl border border-slate-800 mb-3">
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setViewMode('store');
          }}
          className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 ${
            viewMode === 'store' ? 'bg-amber-500' : ''
          }`}
        >
          <ShoppingBag color={viewMode === 'store' ? '#020617' : '#94a3b8'} size={15} />
          <Text
            className={`font-bold text-xs uppercase tracking-wider ${
              viewMode === 'store' ? 'text-slate-950 font-black' : 'text-slate-400'
            }`}
          >
            Catálogo
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setViewMode('gallery');
          }}
          className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1.5 ${
            viewMode === 'gallery' ? 'bg-amber-500' : ''
          }`}
        >
          <Layers color={viewMode === 'gallery' ? '#020617' : '#94a3b8'} size={15} />
          <Text
            className={`font-bold text-xs uppercase tracking-wider ${
              viewMode === 'gallery' ? 'text-slate-950 font-black' : 'text-slate-400'
            }`}
          >
            Colección ({inventory.length})
          </Text>
        </Pressable>
      </View>

      {/* ── Barra de Búsqueda ───────────────────────────────── */}
      <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 mb-3">
        <Search color="#94a3b8" size={16} className="mr-2" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={viewMode === 'store' ? 'Buscar artículos en catálogo...' : 'Buscar en mi colección...'}
          placeholderTextColor="#64748b"
          className="flex-1 text-white text-xs"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X color="#94a3b8" size={16} />
          </Pressable>
        )}
      </View>

      {/* ── Selector de Categorías ─────────────────────────── */}
      <View className="mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'avatar', label: '👤 Avatares' },
              { key: 'title', label: '🏷️ Títulos' },
              { key: 'theme', label: '🎨 Temas' },
              { key: 'board', label: '🎲 Tapetes' },
              { key: 'emotic', label: '😊 Emoticones' },
            ] as const
          ).map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => {
                  triggerHaptic('light');
                  setActiveCategory(cat.key);
                }}
                className={`px-3 py-1.5 rounded-xl mr-2 border ${
                  isActive
                    ? 'bg-amber-500 border-amber-400'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <Text
                  className={`font-bold text-xs ${
                    isActive ? 'text-slate-950' : 'text-slate-400'
                  }`}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Toolbar de Tipografía de Cartas (Activo con Tema) ── */}
      {activeCategory === 'theme' && (
        <View className="bg-slate-900/90 border border-amber-500/30 p-3 rounded-2xl mb-3">
          <View className="flex-row items-center gap-1.5 mb-1.5">
            <Type color="#fbbf24" size={15} />
            <Text className="text-amber-400 font-bold text-xs">Tipografía Oficial de Cartas</Text>
          </View>
          <Text className="text-slate-400 text-[10px] mb-2">
            Personaliza la fuente tipográfica de los números y letras de todas tus barajas:
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            <Pressable
              onPress={() => handleFontChange(null)}
              className={`px-2.5 py-1.5 rounded-lg border ${
                preferredFont === null
                  ? 'bg-amber-500 border-amber-400'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  preferredFont === null ? 'text-slate-950' : 'text-slate-300'
                }`}
              >
                Por defecto
              </Text>
            </Pressable>

            {ALL_THEME_FONTS.map((font) => {
              const isSelected = preferredFont === font.key;
              return (
                <Pressable
                  key={font.key}
                  onPress={() => handleFontChange(font.key)}
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    isSelected
                      ? 'bg-amber-500 border-amber-400'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isSelected ? 'text-slate-950' : 'text-slate-300'
                    }`}
                  >
                    {font.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Lista de Artículos ──────────────────────────────── */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text className="text-slate-400 mt-3 text-xs">Cargando catálogo oficial...</Text>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={() => (
            <View className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 items-center mt-6">
              <ShoppingBag color="#64748b" size={38} className="mb-2" />
              <Text className="text-white font-bold text-base mb-1">
                {viewMode === 'store' ? 'No hay artículos disponibles' : 'Colección vacía'}
              </Text>
              <Text className="text-slate-400 text-xs text-center">
                {viewMode === 'store'
                  ? '¡Ya has adquirido todos los cosméticos de esta categoría!'
                  : 'Aún no posees artículos en esta categoría. Puedes explorar el Catálogo para desbloquearlos.'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isOwned = inventory.includes(item.id);
            const inCart = isInCart(item.id);
            const isEquipped = viewMode === 'gallery' && isItemEquipped(item);
            const isTheme = item.item_type === 'theme';
            const themeConfig = isTheme ? getTheme(item.theme_key) : null;
            const fullImageUrl = resolveImageUrl(item.image_url);
            const rarity = getRarity(item.price);
            const isBusy = processingId === item.id;

            return (
              <View
                className={`bg-slate-900/90 rounded-2xl p-4 mb-3 border ${
                  isEquipped
                    ? 'border-amber-400/80 bg-amber-950/20'
                    : inCart
                    ? 'border-amber-500/60'
                    : 'border-slate-800'
                } flex-row items-center justify-between`}
              >
                {/* Visual / Preview */}
                <View className="flex-row items-center flex-1 mr-3">
                  {isTheme && themeConfig ? (
                    <View className="mr-3">
                      <TacticalCard3D
                        rank="A"
                        suit="hearts"
                        theme={
                          preferredFont
                            ? { ...themeConfig.cardTheme, fontKey: preferredFont }
                            : themeConfig.cardTheme
                        }
                        size="xs"
                      />
                    </View>
                  ) : fullImageUrl ? (
                    <Image
                      source={{ uri: fullImageUrl }}
                      contentFit="cover"
                      className="w-12 h-12 rounded-xl mr-3 bg-slate-800 border border-slate-700"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-xl mr-3 bg-amber-500/10 border border-amber-500/30 items-center justify-center">
                      <Text className="text-xl">{getItemEmoji(item.item_type)}</Text>
                    </View>
                  )}

                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 mb-0.5">
                      <View className={`px-1.5 py-0.2 rounded border ${rarity.bg} ${rarity.border}`}>
                        <Text className={`text-[9px] font-black ${rarity.text}`}>{rarity.label}</Text>
                      </View>
                      <Text className="text-[10px] text-slate-400 font-bold uppercase">
                        {item.item_type}
                      </Text>
                    </View>

                    <Text className="text-white font-bold text-sm" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                      {item.description}
                    </Text>

                    {viewMode === 'store' && (
                      <Text className="text-amber-400 font-bold text-xs mt-1">
                        🪙 {item.price.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Acciones */}
                {viewMode === 'store' ? (
                  <Pressable
                    disabled={inCart}
                    onPress={() => toggleCartItem(item)}
                    className={`px-3 py-2 rounded-xl flex-row items-center gap-1 ${
                      inCart
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-amber-500 active:bg-amber-600'
                    }`}
                  >
                    {inCart ? (
                      <>
                        <Check color="#fbbf24" size={13} />
                        <Text className="font-bold text-xs text-amber-400">En carrito</Text>
                      </>
                    ) : (
                      <>
                        <ShoppingCart color="#020617" size={13} />
                        <Text className="font-bold text-xs text-slate-950">Añadir</Text>
                      </>
                    )}
                  </Pressable>
                ) : item.item_type === 'emotic' ? (
                  <Pressable
                    disabled={isBusy}
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedEmoticItem(item);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 active:bg-slate-700"
                  >
                    <Text className="font-bold text-xs text-amber-400">Slots (1-8)</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={isEquipped || isBusy}
                    onPress={() => handleEquip(item)}
                    className={`px-3 py-2 rounded-xl ${
                      isEquipped
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-slate-800 border border-slate-700 active:bg-slate-700'
                    }`}
                  >
                    <Text
                      className={`font-bold text-xs ${
                        isEquipped ? 'text-amber-400 font-black' : 'text-white'
                      }`}
                    >
                      {isBusy ? '...' : isEquipped ? '★ ACTIVO' : 'EQUIPAR'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ── Modal de Slots para Emoticones ───────────────────── */}
      <Modal
        visible={Boolean(selectedEmoticItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEmoticItem(null)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-4">
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-base">Equipar Emoticón</Text>
              <Pressable onPress={() => setSelectedEmoticItem(null)} className="p-1">
                <X color="#94a3b8" size={20} />
              </Pressable>
            </View>

            <Text className="text-slate-400 text-xs mb-4">
              Selecciona en qué ranura táctica (1 a 8) deseas equipar{' '}
              <Text className="text-amber-400 font-bold">{selectedEmoticItem?.name}</Text>:
            </Text>

            <View className="flex-row flex-wrap justify-between gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => {
                const isEquippedInThisSlot =
                  profile?.equipped_emotics?.[slot - 1] === selectedEmoticItem?.image_url;

                return (
                  <Pressable
                    key={slot}
                    disabled={isEquippedInThisSlot || processingId === selectedEmoticItem?.id}
                    onPress={() => selectedEmoticItem && handleEquip(selectedEmoticItem, slot)}
                    className={`w-[22%] py-3 rounded-2xl items-center border ${
                      isEquippedInThisSlot
                        ? 'bg-amber-500/20 border-amber-400'
                        : 'bg-slate-800/80 border-slate-700 active:bg-slate-700'
                    }`}
                  >
                    <Text
                      className={`font-bold text-xs ${
                        isEquippedInThisSlot ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      Slot {slot}
                    </Text>
                    {isEquippedInThisSlot && (
                      <Text className="text-[9px] text-amber-400 font-bold mt-0.5">Activo</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setSelectedEmoticItem(null)}
              className="bg-slate-800 p-2.5 rounded-xl items-center"
            >
              <Text className="text-slate-400 font-bold text-xs">Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Modal del Carrito de Compras ────────────────────── */}
      <Modal
        visible={isCartOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCartOpen(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[80%] flex-col">
            <View className="flex-row justify-between items-center pb-3 border-b border-slate-800 mb-3">
              <View className="flex-row items-center gap-2">
                <ShoppingCart color="#fbbf24" size={20} />
                <Text className="text-white font-bold text-lg">Tu Carrito ({cart.length})</Text>
              </View>
              <Pressable onPress={() => setIsCartOpen(false)} className="p-1">
                <X color="#94a3b8" size={20} />
              </Pressable>
            </View>

            {cart.length === 0 ? (
              <View className="py-12 items-center">
                <ShoppingCart color="#64748b" size={44} className="mb-2" />
                <Text className="text-slate-400 text-sm font-semibold">Tu carrito está vacío</Text>
              </View>
            ) : (
              <ScrollView className="flex-1 mb-3">
                {cart.map((item) => {
                  const fullImageUrl = resolveImageUrl(item.image_url);
                  return (
                    <View
                      key={item.id}
                      className="bg-slate-800/80 p-3 rounded-2xl mb-2 flex-row items-center justify-between border border-slate-700/60"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        {fullImageUrl ? (
                          <Image
                            source={{ uri: fullImageUrl }}
                            contentFit="cover"
                            className="w-10 h-10 rounded-xl mr-2.5 bg-slate-700"
                          />
                        ) : (
                          <View className="w-10 h-10 rounded-xl mr-2.5 bg-amber-500/10 items-center justify-center">
                            <Text className="text-base">{getItemEmoji(item.item_type)}</Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-white font-bold text-xs" numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text className="text-amber-400 font-bold text-xs">
                            🪙 {item.price.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => toggleCartItem(item)}
                        className="p-2 rounded-xl bg-red-500/10 border border-red-500/30"
                      >
                        <Trash2 color="#f87171" size={15} />
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Total y Checkout */}
            <View className="border-t border-slate-800 pt-3">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-slate-400 font-bold text-sm">Total a pagar:</Text>
                <Text
                  className={`font-bold text-lg ${
                    cartTotal > (profile?.coins || 0) ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  🪙 {cartTotal.toLocaleString()}
                </Text>
              </View>

              {cartTotal > (profile?.coins || 0) && (
                <Text className="text-red-400 text-xs text-center mb-3 font-semibold">
                  Saldo insuficiente. Te faltan {(cartTotal - (profile?.coins || 0)).toLocaleString()} 🪙
                </Text>
              )}

              <Pressable
                disabled={cart.length === 0 || cartTotal > (profile?.coins || 0) || isCheckingOut}
                onPress={handleCheckout}
                className={`p-3.5 rounded-2xl items-center ${
                  cart.length === 0 || cartTotal > (profile?.coins || 0)
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-amber-500 active:bg-amber-600'
                }`}
              >
                {isCheckingOut ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <Text
                    className={`font-black text-sm uppercase tracking-wider ${
                      cart.length === 0 || cartTotal > (profile?.coins || 0)
                        ? 'text-slate-500'
                        : 'text-slate-950'
                    }`}
                  >
                    Confirmar Compra ({cart.length})
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
