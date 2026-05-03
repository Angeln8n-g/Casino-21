import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { CardView } from './CardView';
import { getTheme, ALL_THEMES } from '../themes/themeRegistry';
import { createCard } from '../../domain/card';
import { triggerHaptic } from '../utils/haptics';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  item_type: 'avatar' | 'card_back' | 'title' | 'board' | 'theme' | 'emotic';
  price: number;
  image_url: string | null;
  theme_key?: string | null;
}

const PREVIEW_CARD = createCard('hearts', 'A');

function ThemeCardPreview({ themeKey }: { themeKey: string }) {
  const theme = getTheme(themeKey);
  return (
    <div
      className="relative flex items-center justify-center w-full h-full overflow-hidden rounded-xl"
      style={{ background: theme.boardTheme.background }}
      role="img"
      aria-label={`Vista previa del tema ${themeKey}`}
    >
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: theme.boardTheme.background }} />
      {theme.boardTheme.overlayGradient && (
        <div className="absolute inset-0" style={{ backgroundImage: theme.boardTheme.overlayGradient }} />
      )}
      <div
        className="absolute inset-2 rounded-lg pointer-events-none"
        style={{ border: `1px solid ${theme.boardTheme.innerRingColor}` }}
      />
      <div className="relative z-10 transform scale-90 drop-shadow-2xl">
        <CardView card={PREVIEW_CARD} theme={theme.cardTheme} />
      </div>
    </div>
  );
}

// Skeleton Loader
const SkeletonStoreItem = () => (
  <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/5 bg-[#18181B]/50 animate-pulse flex flex-col h-full min-h-[300px]">
    <div className="flex justify-between items-start mb-4">
      <div className="h-5 w-16 bg-white/10 rounded-lg"></div>
      <div className="h-6 w-20 bg-white/10 rounded-lg"></div>
    </div>
    <div className="h-28 w-full bg-white/5 rounded-2xl mb-4"></div>
    <div className="h-6 w-3/4 bg-white/10 rounded-md mb-2"></div>
    <div className="h-4 w-full bg-white/5 rounded-md mb-1"></div>
    <div className="h-4 w-2/3 bg-white/5 rounded-md mb-4"></div>
    <div className="mt-auto h-12 w-full bg-white/10 rounded-xl"></div>
  </div>
);

export function Store() {
  const { profile, user } = useAuth();
  const { playSfx } = useAudio();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Cart State
  const [viewMode, setViewMode] = useState<'store' | 'gallery'>('store');
  const [activeCategory, setActiveCategory] = useState<'all' | 'avatar' | 'card_back' | 'title' | 'board' | 'theme' | 'emotic'>('all');
  const [cart, setCart] = useState<StoreItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  // Calculate Rarity dynamically based on price
  const getRarity = (price: number) => {
    if (price >= 2000) return { label: 'LEGENDARIO', color: 'text-[#FACC15] border-[#FACC15]/50 bg-black/60' };
    if (price >= 800) return { label: 'EPICO', color: 'text-[#C084FC] border-[#C084FC]/50 bg-black/60' };
    return { label: 'RARO', color: 'text-[#60A5FA] border-[#60A5FA]/50 bg-black/60' };
  };
  
  // Purchase & Equip Flow
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successItems, setSuccessItems] = useState<string[]>([]);

  // Wallet animation state
  const [prevCoins, setPrevCoins] = useState(profile?.coins || 0);
  const [coinAnim, setCoinAnim] = useState(false);

  useEffect(() => {
    fetchStoreData();
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
    if (!user) return;
    setLoading(true);
    try {
      const { data: storeData, error: storeError } = await supabase
        .from('store_items')
        .select('*')
        .eq('is_active', true);
        
      if (storeError) throw storeError;
      setItems(storeData || []);

      const { data: invData, error: invError } = await supabase
        .from('player_inventory')
        .select('item_id')
        .eq('player_id', user.id);

      if (invError) throw invError;
      setInventory((invData || []).map(i => i.item_id));

    } catch (err) {
      console.error('Error fetching store:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cart Functions
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const isInCart = (id: string) => cart.some(item => item.id === id);

  const toggleCartItem = (item: StoreItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (isInCart(item.id)) {
      setCart(prev => prev.filter(i => i.id !== item.id));
      triggerHaptic('light');
    } else {
      // Check if we can afford it before adding
      if ((profile?.coins || 0) < cartTotal + item.price) {
        playSfx('error');
        triggerHaptic('error');
        return;
      }
      setCart(prev => [...prev, item]);
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
      // Process purchases sequentially to ensure DB consistency
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
      window.dispatchEvent(new CustomEvent('coins_updated'));
      
      setTimeout(() => setSuccessItems([]), 3000);
      
      // Switch to gallery view after successful multi-purchase
      setViewMode('gallery');
    } catch (err: any) {
      console.error('Error during checkout:', err);
      playSfx('error');
      triggerHaptic('error');
      alert(err.message || 'Ocurrió un error al procesar el carrito.');
      
      // Keep successful items in inventory, remove from cart
      setInventory(newInventory);
      setCart(prev => prev.filter(item => !successfulPurchases.includes(item.id)));
    } finally {
      setProcessingId(null);
    }
  };

  const handleEquip = async (item: StoreItem, slot?: number) => {
    setProcessingId(item.id);
    try {
      const { error } = await supabase.rpc('equip_store_item', { 
        p_item_id: item.id,
        p_slot: slot || 1
      });
      if (error) throw error;
      
      playSfx('cardPlay', { volumeMultiplier: 0.8, playbackRate: 1.08 });
      triggerHaptic('success');
      window.dispatchEvent(new Event('profile_updated'));
      
      setSuccessItems([item.id]);
      setTimeout(() => setSuccessItems([]), 1500);
    } catch (err: any) {
      console.error('Error equipping item:', err);
      playSfx('error');
      triggerHaptic('error');
      alert(err.message || 'Error al equipar.');
    } finally {
      setProcessingId(null);
    }
  };

  const isItemEquipped = (item: StoreItem): boolean => {
    switch (item.item_type) {
      case 'avatar':    return profile?.equipped_avatar === item.image_url;
      case 'card_back': return profile?.equipped_card_back === item.image_url;
      case 'title':     return profile?.equipped_title === item.name;
      case 'board':     return profile?.equipped_board === item.image_url;
      case 'theme':     return profile?.equipped_theme === item.theme_key;
      case 'emotic':    return profile?.equipped_emotics?.includes(item.image_url);
      default: return false;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch(type) {
      case 'avatar':    return '👤 Avatar';
      case 'card_back': return '🃏 Reverso';
      case 'title':     return '🏷️ Título';
      case 'board':     return '🎲 Tapete';
      case 'theme':     return '🎨 Tema';
      case 'emotic':    return '😊 Emoticón';
      default: return 'Otro';
    }
  };

  // Apply filters and sorting based on view mode
  const displayItems = useMemo(() => {
    // 1. Filter by ownership based on View Mode
    let result = items.filter(item => {
      const isOwned = inventory.includes(item.id);
      return viewMode === 'gallery' ? isOwned : !isOwned;
    });

    // 2. Filter by category
    result = result.filter(item => activeCategory === 'all' || item.item_type === activeCategory);
    
    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
    }

    // 4. Sort (Hardcoded to price_desc matching design intent for top items first, or keep existing logic)
    return result.sort((a, b) => b.price - a.price);
  }, [items, activeCategory, searchQuery, viewMode, inventory]);

  return (
    <div className="min-h-screen bg-[#11100E] pb-24 md:pb-8 font-modern relative overflow-x-hidden">
      {/* UI/UX Pro Max recommended font import (Nunito Sans & Rubik) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&family=Rubik:wght@300;400;500;700&display=swap');
        .font-modern { font-family: 'Nunito Sans', sans-serif; }
        .font-display { font-family: 'Rubik', sans-serif; }
        
        @keyframes float3d {
          0%, 100% { transform: translateY(0px) rotateX(10deg) rotateY(-5deg); }
          50% { transform: translateY(-15px) rotateX(15deg) rotateY(5deg); }
        }
        .animate-float-3d {
          animation: float3d 6s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        .masonry-grid {
          column-count: 1;
          column-gap: 1.25rem;
        }
        @media (min-width: 640px) { .masonry-grid { column-count: 2; } }
        @media (min-width: 1024px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1280px) { .masonry-grid { column-count: 4; } }
        .masonry-item { break-inside: avoid; margin-bottom: 1.25rem; }
      `}</style>

      {/* Floating Cart Button (Mobile & Desktop) */}
      {/* Eliminado: El botón flotante inferior ha sido removido y movido al Header */}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 flex flex-col">
        
        {/* Top Bar: Search and View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-grow order-2 md:order-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" aria-hidden="true">🔍</span>
            <input 
              type="text" 
              placeholder={viewMode === 'store' ? "Buscar cosméticos exclusivos..." : "Buscar en tu colección..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1815] border border-[#2A2722] rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-[#71717A] focus:outline-none focus:border-[#FACC15] transition-all"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex p-1 bg-[#1A1815] rounded-xl border border-[#2A2722] order-1 md:order-2 shrink-0 md:h-[54px]">
            <button
              onClick={() => setViewMode('store')}
              className={`flex-1 md:flex-none px-6 py-2 md:py-0 rounded-lg font-bold text-sm transition-all duration-300 ${viewMode === 'store' ? 'bg-[#2A2722] text-white shadow-md' : 'text-[#A1A1AA] hover:text-white'}`}
            >
              Catalog
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`flex-1 md:flex-none px-6 py-2 md:py-0 rounded-lg font-bold text-sm transition-all duration-300 ${viewMode === 'gallery' ? 'bg-[#2A2722] text-white shadow-md' : 'text-[#A1A1AA] hover:text-white'}`}
            >
              Collection ({inventory.length})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="mb-8 flex gap-3 overflow-x-auto max-w-full custom-scrollbar pb-2 mask-edges">
          {(['all', 'avatar', 'card_back', 'title', 'board', 'theme', 'emotic'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => { triggerHaptic('light'); setActiveCategory(cat); }}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                activeCategory === cat 
                  ? 'bg-[#FDE68A] text-[#11100E] border-[#FDE68A] shadow-lg' 
                  : 'bg-transparent border-[#2A2722] text-[#A1A1AA] hover:border-[#FACC15]/50 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All items' : getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Title & Wallet/Cart Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
              {viewMode === 'store' ? 'Digital Assets' : 'My Collection'}
            </h1>
            <p className="text-[#A1A1AA] mt-1 text-sm">
              {viewMode === 'store' ? 'Coleccionables de edición limitada' : 'Tus artículos exclusivos'}
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Wallet */}
            <div className="bg-[#1A1815] border border-[#FACC15]/30 rounded-full px-5 py-2.5 flex items-center justify-center shadow-xl flex-grow md:flex-grow-0">
              <div className={`text-sm font-display font-bold flex items-center justify-center gap-2 transition-transform duration-300 ${coinAnim ? 'scale-110 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'text-[#FACC15]'}`}>
                <span aria-hidden="true">🪙</span> {(profile?.coins || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Cart Button */}
            {viewMode === 'store' && (
              <button 
                onClick={() => setIsCartOpen(true)}
                disabled={cart.length === 0}
                className={`border rounded-full px-5 py-2.5 flex items-center justify-center shadow-xl transition-all duration-300 gap-2 ${
                  cart.length > 0 
                    ? 'bg-[#FACC15]/10 border-[#FACC15]/50 text-[#FACC15] hover:bg-[#FACC15]/20 cursor-pointer' 
                    : 'bg-[#1A1815] border-[#2A2722] text-[#A1A1AA] opacity-50 cursor-not-allowed'
                }`}
                aria-label="Abrir carrito"
              >
                <span aria-hidden="true">🛒</span>
                <span className="text-sm font-bold">{cart.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Grid / Masonry Layout */}
        <div className={viewMode === 'gallery' ? 'masonry-grid' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={viewMode === 'gallery' ? 'masonry-item' : ''}>
                <SkeletonStoreItem />
              </div>
            ))
          ) : displayItems.length === 0 ? (
            <div className="col-span-full text-center py-24 bg-[#18181B]/50 rounded-3xl border border-white/5">
              <div className="text-6xl mb-6 opacity-30" aria-hidden="true">{viewMode === 'store' ? '💸' : '📦'}</div>
              <h3 className="text-xl font-display font-bold text-white mb-2">
                {viewMode === 'store' ? 'Tienda vacía' : 'Galería vacía'}
              </h3>
              <p className="text-[#A1A1AA]">
                {viewMode === 'store' 
                  ? 'No hay artículos nuevos en esta categoría. ¡Ya compraste todo!' 
                  : 'Aún no posees artículos de esta categoría. Ve a comprar algunos.'}
              </p>
            </div>
          ) : (
            displayItems.map((item, index) => {
              const rarity = getRarity(item.price);
              const isSuccess = successItems.includes(item.id);
              const inCart = isInCart(item.id);
              const isEquipped = viewMode === 'gallery' && isItemEquipped(item);
              
              return (
                <div 
                  key={item.id} 
                  className={`bg-[#1A1815] rounded-2xl relative overflow-hidden group border transition-all duration-500 flex flex-col ${
                    viewMode === 'gallery' ? 'masonry-item' : 'h-full'
                  } ${
                    isSuccess ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 
                    inCart ? 'border-[#FACC15] shadow-[0_0_20px_rgba(250,204,21,0.15)] scale-[0.98]' :
                    isEquipped ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' :
                    'border-[#2A2722] hover:border-[#3A362F] hover:shadow-2xl hover:-translate-y-1'
                  }`}
                  style={{ animationDelay: `${(index % 10) * 50}ms` }}
                >
                  {/* Image/Preview Area */}
                  <div className={`relative w-full overflow-hidden flex items-center justify-center bg-[#0F0E0C] ${
                    item.item_type === 'board' ? 'aspect-video' : 'aspect-square'
                  }`}>
                    <div className={`absolute top-3 left-3 z-20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border backdrop-blur-md ${rarity.color}`}>
                      {rarity.label}
                    </div>

                    {item.item_type === 'theme' && item.theme_key ? (
                      <div className="w-full h-full absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-700">
                        <ThemeCardPreview themeKey={item.theme_key} />
                      </div>
                    ) : item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        loading="lazy"
                        className={`w-full h-full transition-transform duration-700 group-hover:scale-110 ${
                          item.item_type === 'board' || item.item_type === 'avatar' ? 'object-cover' : 'object-contain p-4'
                        }`}
                        onError={(e) => { 
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes('/assets/store/')) {
                            target.src = `/assets/store/${item.image_url}`; 
                          }
                        }}
                      />
                    ) : (
                      <div className="text-5xl opacity-20">✨</div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="p-5 flex flex-col flex-grow">
                    <span className="text-[10px] text-[#A78BFA] uppercase tracking-widest font-black mb-1">
                      {getCategoryLabel(item.item_type).split(' ')[1] || item.item_type}
                    </span>
                    
                    <h3 className="font-display font-bold text-lg text-white mb-2 leading-tight">
                      {item.name}
                    </h3>
                    
                    {viewMode === 'store' && (
                      <div className="text-[#FACC15] font-bold flex items-center gap-1.5 mb-4">
                        <span aria-hidden="true" className="text-sm">🪙</span> 
                        <span>{item.price.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-auto pt-2" onClick={e => e.stopPropagation()}>
                      {viewMode === 'store' ? (
                        <button 
                          onClick={(e) => toggleCartItem(item, e)}
                          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                            inCart 
                              ? 'bg-[#2A2722] text-[#FACC15] border border-[#FACC15]/30 hover:bg-[#3A362F]' 
                              : 'bg-[#FACC15] text-black hover:bg-[#FDE68A]'
                          }`}
                        >
                          {inCart ? (
                            <><span aria-hidden="true">✓</span> EN EL CARRITO</>
                          ) : (
                            <><span aria-hidden="true">🛒</span> AÑADIR</>
                          )}
                        </button>
                      ) : (
                        item.item_type === 'emotic' ? (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider text-center font-bold">Equipar en Slot:</span>
                            <div className="grid grid-cols-4 gap-2">
                              {[1, 2, 3, 4].map(slot => {
                                const isEquippedInSlot = profile?.equipped_emotics?.[slot - 1] === item.image_url;
                                return (
                                  <button
                                    key={slot}
                                    onClick={(e) => { e.stopPropagation(); handleEquip(item, slot); }}
                                    disabled={processingId === item.id || isEquippedInSlot}
                                    className={`py-2 rounded-xl font-bold text-xs transition-colors border ${
                                      isEquippedInSlot
                                        ? 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/50'
                                        : 'bg-[#2A2722] border-[#3A362F] text-white hover:bg-[#3A362F]'
                                    }`}
                                    title={`Equipar en Slot ${slot}`}
                                  >
                                    S{slot}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEquip(item); }}
                            disabled={isEquipped || processingId === item.id}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                              isEquipped 
                                ? 'bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/20' 
                                : 'bg-[#2A2722] text-white hover:bg-[#3A362F] border border-[#3A362F]'
                            }`}
                          >
                            {processingId === item.id ? 'Cargando...' : isEquipped ? '★ EQUIPADO' : 'EQUIPAR'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Shopping Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="w-full max-w-md bg-[#09090B] border-l border-white/10 h-[100dvh] flex flex-col relative z-10 animate-slide-left shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#18181B] shrink-0">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <span aria-hidden="true">🛒</span> Tu Carrito
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#A1A1AA] opacity-70">
                  <div className="text-6xl mb-4">🛒</div>
                  <p>El carrito está vacío</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={`cart-${item.id}`} className="flex gap-4 p-4 rounded-2xl bg-[#18181B] border border-white/5 items-center">
                    <div className="w-16 h-16 rounded-xl bg-[#27272A] flex items-center justify-center overflow-hidden shrink-0 p-1">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="max-w-full max-h-full object-contain" />
                      ) : <span className="text-xs">✨</span>}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-white font-bold text-sm truncate">{item.name}</h4>
                      <p className="text-[#A1A1AA] text-xs">{getCategoryLabel(item.item_type)}</p>
                      <p className="text-[#FACC15] font-bold text-sm mt-1">🪙 {item.price.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => toggleCartItem(item)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-[#18181B] shrink-0">
              <div className="flex justify-between items-end mb-6">
                <span className="text-[#A1A1AA] font-bold">Total a pagar:</span>
                <span className={`text-2xl font-display font-bold ${cartTotal > (profile?.coins || 0) ? 'text-red-400' : 'text-white'}`}>
                  🪙 {cartTotal.toLocaleString()}
                </span>
              </div>
              
              {cartTotal > (profile?.coins || 0) && (
                <p className="text-red-400 text-xs mb-4 font-bold text-center">
                  Monedas insuficientes. Te faltan {(cartTotal - (profile?.coins || 0)).toLocaleString()} 🪙
                </p>
              )}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || cartTotal > (profile?.coins || 0) || processingId === 'checkout'}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  cart.length === 0 || cartTotal > (profile?.coins || 0)
                    ? 'bg-[#27272A] text-[#71717A] cursor-not-allowed'
                    : 'bg-[#F8FAFC] text-[#09090B] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                }`}
              >
                {processingId === 'checkout' ? (
                  <>
                    <svg className="animate-spin w-5 h-5 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  'Confirmar Compra'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
