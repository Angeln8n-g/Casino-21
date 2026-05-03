import React, { useState, useEffect } from 'react';
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

// Mini preview card used inside the store for theme items
const PREVIEW_CARD = createCard('hearts', 'A');

function ThemeCardPreview({ themeKey }: { themeKey: string }) {
  const theme = getTheme(themeKey);
  return (
    <div
      className="relative flex items-center justify-center w-full h-full overflow-hidden rounded-xl"
      style={{ background: theme.boardTheme.background }}
    >
      {/* Board mini-preview background */}
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: theme.boardTheme.background }} />
      {/* Overlay gradient */}
      {theme.boardTheme.overlayGradient && (
        <div className="absolute inset-0" style={{ backgroundImage: theme.boardTheme.overlayGradient }} />
      )}
      {/* Inner ring */}
      <div
        className="absolute inset-2 rounded-lg pointer-events-none"
        style={{ border: `1px solid ${theme.boardTheme.innerRingColor}` }}
      />
      {/* Sample card */}
      <div className="relative z-10 transform scale-90 drop-shadow-2xl">
        <CardView card={PREVIEW_CARD} theme={theme.cardTheme} />
      </div>
    </div>
  );
}

export function Store() {
  const { profile, user } = useAuth();
  const { playSfx } = useAudio();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<string[]>([]); // item_ids
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'avatar' | 'card_back' | 'title' | 'board' | 'theme' | 'emotic'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);

  // Wallet animation state
  const [prevCoins, setPrevCoins] = useState(profile?.coins || 0);
  const [coinAnim, setCoinAnim] = useState(false);
  const [successItem, setSuccessItem] = useState<string | null>(null);

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
      // Fetch store catalog
      const { data: storeData, error: storeError } = await supabase
        .from('store_items')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
        
      if (storeError) throw storeError;
      setItems(storeData || []);

      // Fetch player inventory
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

  const handleBuy = async (item: StoreItem) => {
    if (!profile) return;
    if ((profile.coins || 0) < item.price) {
      playSfx('error');
      triggerHaptic('error');
      alert('Monedas insuficientes.');
      return;
    }
    setProcessingId(item.id);
    try {
      const { error } = await supabase.rpc('buy_store_item', { p_item_id: item.id });
      if (error) throw error;
      
      setInventory(prev => [...prev, item.id]);
      playSfx('chipsClink', { volumeMultiplier: 1.15 });
      triggerHaptic('success');
      window.dispatchEvent(new CustomEvent('coins_updated'));
      
      setSuccessItem(item.id);
      setTimeout(() => setSuccessItem(null), 1500);
    } catch (err: any) {
      console.error('Error buying item:', err);
      playSfx('error');
      triggerHaptic('error');
      alert(err.message || 'Error al procesar la compra.');
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
      
      setSuccessItem(item.id);
      setTimeout(() => setSuccessItem(null), 1500);
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

  const filteredItems = items.filter(item => activeCategory === 'all' || item.item_type === activeCategory);

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

  const getRarityStyle = (item: StoreItem) => {
    if (item.item_type !== 'theme') return '';
    const key = item.theme_key ?? '';
    if (key === 'tactile_vegas') return 'from-purple-500/20 to-pink-500/10 border-purple-500/30';
    if (key === 'neon_dealer')   return 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30';
    if (key === 'gold_rush')     return 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
    if (key === 'vault_noir')    return 'from-amber-900/20 to-yellow-900/10 border-amber-800/30';
    return 'from-slate-500/20 to-slate-600/10 border-slate-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 h-64">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-8">
      <style>{`
        @keyframes float3d {
          0%, 100% { transform: translateY(0px) rotateX(10deg) rotateY(-5deg); }
          50% { transform: translateY(-15px) rotateX(15deg) rotateY(5deg); }
        }
        .animate-float-3d {
          animation: float3d 6s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        @keyframes purchaseSuccess {
          0% { box-shadow: inset 0 0 0 0 rgba(74, 222, 128, 0); }
          50% { box-shadow: inset 0 0 20px 5px rgba(74, 222, 128, 0.5); }
          100% { box-shadow: inset 0 0 0 0 rgba(74, 222, 128, 0); }
        }
        .animate-purchase-success {
          animation: purchaseSuccess 1s ease-out;
        }
      `}</style>

      {/* Hero Banner / Header */}
      <div className="relative z-30 -mx-4 px-4 md:mx-0 md:px-0 mb-6 md:mb-8 pt-2">
        <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-black/20 to-blue-900/40 pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              Tienda VIP
            </h2>
            <p className="text-gray-300 text-sm md:text-base mt-2 font-medium max-w-md">
              Adquiere artículos exclusivos, tapetes y reversos premium. Tu estilo, tus reglas.
            </p>
          </div>

          <div className="relative z-10 bg-black/60 border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-xl min-w-[200px] justify-center md:justify-end">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Tu Billetera</p>
              <div className={`text-2xl md:text-3xl font-black font-mono flex items-center gap-2 transition-transform duration-300 ${coinAnim ? 'scale-110 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'text-casino-gold drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'}`}>
                <span className="text-3xl">🪙</span> {(profile?.coins || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="mt-6 flex gap-2 md:gap-3 overflow-x-auto max-w-full snap-x snap-mandatory custom-scrollbar pb-2">
          {(['all', 'avatar', 'card_back', 'title', 'board', 'theme', 'emotic'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => {
                triggerHaptic('light');
                setActiveCategory(cat);
              }}
              className={`snap-center px-5 md:px-6 min-h-[48px] py-3 md:py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center justify-center min-w-[min-content] border ${
                activeCategory === cat 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                  : 'bg-black/40 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
              }`}
            >
              {cat === 'all' ? '🌟 Todo' : getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 min-[375px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 grid-flow-dense">
        {filteredItems.map((item, index) => {
          const isOwned = inventory.includes(item.id);
          const canAfford = (profile?.coins || 0) >= item.price;
          const isEquipped = isItemEquipped(item);
          const isTheme = item.item_type === 'theme';
          const isPremium = item.price >= 5000;
          const isBoard = item.item_type === 'board';
          const isCardBack = item.item_type === 'card_back';
          const isSuccess = successItem === item.id;
          
          return (
            <div 
              key={item.id} 
              onClick={() => {
                triggerHaptic('light');
                setPreviewItem(item);
              }}
              className={`glass-panel p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden group border transition-all duration-300 cursor-pointer bg-black/40 backdrop-blur-md shadow-lg animate-slide-up hover:-translate-y-1.5 flex flex-col h-full
                ${isBoard ? 'col-span-1 min-[375px]:col-span-2 lg:col-span-2' : 'col-span-1'}
                ${isCardBack ? 'row-span-2' : ''}
                ${isSuccess ? 'animate-purchase-success border-green-400' : ''}
                ${isTheme
                  ? `bg-gradient-to-br ${getRarityStyle(item)} hover:border-purple-400/60 hover:shadow-[0_15px_40px_rgba(168,85,247,0.3)]`
                  : isPremium 
                    ? 'border-casino-gold/40 shadow-[0_0_15px_rgba(251,191,36,0.1)] hover:border-casino-gold hover:shadow-[0_15px_40px_rgba(251,191,36,0.25)]'
                    : 'border-white/10 hover:border-purple-500/50 hover:shadow-[0_15px_40px_rgba(168,85,247,0.2)]'
              }`}
              style={{ animationDelay: `${(index % 10) * 50}ms` }}
            >
              {/* Glow effects */}
              {isPremium && (
                <>
                  <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden z-20 pointer-events-none">
                    <div className="absolute top-6 -right-6 bg-gradient-to-r from-yellow-500 to-yellow-300 text-black text-[9px] font-black uppercase tracking-widest py-1.5 px-8 rotate-45 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                      Premium
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </>
              )}

              <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-700 pointer-events-none"></div>
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-700 pointer-events-none"></div>
              
              {/* Tags Area */}
              <div className="flex flex-wrap sm:flex-nowrap justify-between items-start mb-4 relative z-10 gap-1.5 sm:gap-2 w-full">
                <span className={`text-[9px] sm:text-[10px] text-gray-200 uppercase tracking-widest font-black bg-black/50 border px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg shrink-0 max-w-[50%] truncate ${isPremium ? 'border-casino-gold/30' : 'border-white/10'}`}>
                  {getCategoryLabel(item.item_type)}
                </span>
                {isOwned ? (
                  <span className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-black px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border text-center shadow-sm shrink-0 whitespace-nowrap max-w-[50%] overflow-hidden text-ellipsis ${isEquipped ? 'text-casino-gold bg-casino-gold/10 border-casino-gold/40' : 'text-green-400 bg-green-400/10 border-green-400/30'}`}>
                    {isEquipped ? '★ Equipado' : '✓ Adquirido'}
                  </span>
                ) : (
                  <span className={`text-[10px] sm:text-xs font-black font-mono flex items-center justify-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border bg-black/60 shrink-0 shadow-sm whitespace-nowrap max-w-[50%] ${canAfford ? (isPremium ? 'text-yellow-300 border-yellow-400/50' : 'text-yellow-400 border-yellow-400/30') : 'text-red-400 border-red-400/30'}`}>
                    🪙 {item.price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Preview area */}
              <div className={`text-center py-2 mb-4 bg-black/50 border rounded-2xl relative z-10 flex items-center justify-center group-hover:scale-[1.04] transition-transform duration-500 shadow-inner overflow-hidden ${
                isPremium ? 'border-casino-gold/20' : 'border-white/5'
              } ${isBoard ? 'min-h-[160px] sm:min-h-[200px]' : isCardBack ? 'min-h-[220px]' : 'min-h-[140px] sm:min-h-[160px]'}`}>
                {isTheme && item.theme_key ? (
                  <ThemeCardPreview themeKey={item.theme_key} />
                ) : item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    loading="lazy"
                    decoding="async"
                    className={`object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] transition-all duration-700 group-hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] ${
                      isBoard ? 'w-full h-full object-cover rounded-xl' : 'max-h-24 sm:max-h-32'
                    }`} 
                    onError={(e) => { 
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('/assets/store/')) {
                        target.src = `/assets/store/${item.image_url}`; 
                      }
                    }}
                  />
                ) : (
                  <div className="text-4xl sm:text-5xl animate-pulse opacity-50">✨</div>
                )}
              </div>

              <div className="flex flex-col flex-grow relative z-10">
                <h3 className={`font-display font-black text-base sm:text-lg md:text-xl leading-tight mb-2 transition-colors drop-shadow-md ${isPremium ? 'text-casino-gold group-hover:text-yellow-300' : 'text-white group-hover:text-purple-300'}`}>
                  {item.name}
                </h3>
                <p className="text-gray-400 text-[11px] sm:text-xs mb-5 line-clamp-3 font-medium flex-grow">{item.description}</p>
              </div>

              <div className="relative z-10 mt-auto pt-2">
                <button 
                  className={`w-full min-h-[48px] py-2.5 sm:py-3 font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl transition-all border flex items-center justify-center ${
                    isPremium 
                      ? 'bg-casino-gold/10 border-casino-gold/30 text-casino-gold group-hover:bg-casino-gold/20 group-hover:border-casino-gold/60' 
                      : 'bg-white/5 border-white/10 text-gray-300 group-hover:bg-purple-500/20 group-hover:border-purple-500/50 group-hover:text-purple-300'
                  }`}
                  aria-label={isOwned ? (isEquipped ? `Equipado: ${item.name}` : `Equipar o ver: ${item.name}`) : `Ver detalles de ${item.name}`}
                >
                  {isOwned ? (isEquipped ? '★ Equipado' : 'Equipar / Ver') : 'Ver Detalles'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20 glass-panel rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md">
          <div className="text-5xl mb-6 opacity-50">🏪</div>
          <p className="text-gray-400 font-black uppercase tracking-widest text-base">No hay artículos en esta categoría</p>
        </div>
      )}

      {/* Premium Preview Modal (Bottom Sheet on Mobile, Centered on Desktop) */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-[100] flex items-top md:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-0 md:p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className={`w-full max-w-[100%] md:max-w-4xl max-h-[90vh] md:max-h-[85vh] rounded-t-[2.5rem] md:rounded-[2rem] border-t md:border border-x bg-black/60 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row relative z-10 animate-slide-up overflow-hidden flex-shrink-0 ${
              previewItem.price >= 5000 ? 'border-casino-gold/40 shadow-[0_0_80px_rgba(251,191,36,0.15)]' : 'border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.2)]'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Visual handle for mobile bottom sheet */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full md:hidden z-50"></div>

            {/* Close button - absolute for both mobile and desktop */}
            <button 
              onClick={() => setPreviewItem(null)}
              className="absolute right-4 top-4 md:right-5 md:top-5 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-black/40 border border-white/10 hover:bg-white/20 text-white transition-colors z-50 backdrop-blur-md"
              aria-label="Cerrar modal"
            >
              ✕
            </button>

            {/* Content Wrapper for internal scrolling on mobile */}
            <div className="flex flex-col md:flex-row w-full overflow-y-auto md:overflow-hidden custom-scrollbar pb-safe">
              
              {/* Left side: Immersive Preview */}
              <div className={`w-full md:w-1/2 relative flex items-center justify-center p-6 pt-10 md:p-8 min-h-[30vh] md:min-h-[50vh] perspective-1000 shrink-0 ${
                previewItem.item_type === 'board' ? 'bg-transparent' : 'bg-gradient-to-br from-white/5 to-transparent'
              }`}>
                {/* Background Board if previewing a board */}
                {previewItem.item_type === 'board' && previewItem.image_url && (
                  <div 
                    className="absolute inset-0 opacity-40 z-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${previewItem.image_url.startsWith('http') ? previewItem.image_url : `/assets/store/${previewItem.image_url}`})` }}
                  />
                )}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent pointer-events-none" />
                
                {previewItem.item_type === 'theme' && previewItem.theme_key ? (
                  <div className="w-full max-w-[240px] md:max-w-[280px] h-40 sm:h-48 md:h-64 shadow-2xl rounded-2xl overflow-hidden border border-white/10 relative z-10">
                    <ThemeCardPreview themeKey={previewItem.theme_key} />
                  </div>
                ) : previewItem.image_url ? (
                  <img 
                    src={previewItem.image_url} 
                    alt={previewItem.name} 
                    className={`max-w-full relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${
                      previewItem.item_type === 'card_back' ? 'w-24 sm:w-32 md:w-56 animate-float-3d' :
                      previewItem.item_type === 'board' ? 'w-full h-full object-cover rounded-2xl border border-white/20 shadow-2xl' :
                      'max-h-36 sm:max-h-48 md:max-h-64'
                    }`}
                    onError={(e) => { 
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('/assets/store/')) {
                        target.src = `/assets/store/${previewItem.image_url}`; 
                      }
                    }}
                  />
                ) : (
                  <div className="text-5xl md:text-8xl animate-pulse relative z-10">✨</div>
                )}
              </div>

              {/* Right side: Info and Actions */}
              <div className="w-full md:w-1/2 p-5 md:p-8 flex flex-col bg-black/80 backdrop-blur-xl md:border-l border-white/10 relative shrink-0 md:justify-center">
                <span className={`text-[10px] sm:text-xs uppercase tracking-widest font-black bg-white/5 border px-2.5 py-1 rounded-lg mb-3 md:mb-4 self-start shrink-0 ${
                  previewItem.price >= 5000 ? 'text-casino-gold border-casino-gold/40' : 'text-gray-300 border-white/10'
                }`}>
                  {getCategoryLabel(previewItem.item_type)} {previewItem.price >= 5000 && '· PREMIUM'}
                </span>

                {previewItem.item_type === 'theme' && previewItem.theme_key && (() => {
                  const themeData = ALL_THEMES.find(t => t.key === previewItem.theme_key);
                  return themeData ? (
                    <div className="flex items-center gap-2 mb-2 md:mb-3 text-xs md:text-sm text-gray-400 font-bold">
                      <span className="text-xl md:text-2xl">{themeData.emoji}</span>
                      <span className="uppercase tracking-widest">{themeData.name}</span>
                    </div>
                  ) : null;
                })()}

                <h2 className={`text-2xl sm:text-3xl md:text-4xl font-display font-black mb-2 md:mb-3 tracking-wide drop-shadow-lg leading-tight shrink-0 ${
                  previewItem.price >= 5000 ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600' : 'text-white'
                }`}>
                  {previewItem.name}
                </h2>
                
                <p className="text-gray-300 text-sm md:text-base mb-4 md:mb-6 leading-relaxed shrink-0">
                  {previewItem.description}
                </p>

                {previewItem.item_type === 'theme' && (
                  <div className="text-[10px] md:text-xs text-purple-300/80 font-black uppercase tracking-widest mb-4 md:mb-6 bg-purple-500/10 border border-purple-500/20 px-4 py-2.5 rounded-xl shrink-0">
                    🃏 Tus cartas · 🎲 Mesa compartida con el anfitrión
                  </div>
                )}

                <div className="mt-2 md:mt-auto pt-2 flex flex-col gap-3 shrink-0">
                  {inventory.includes(previewItem.id) ? (
                    previewItem.item_type === 'emotic' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map(slot => {
                          const isEquippedInSlot = profile?.equipped_emotics?.[slot - 1] === previewItem.image_url;
                          return (
                            <button
                              key={slot}
                              onClick={() => handleEquip(previewItem, slot)}
                              disabled={processingId === previewItem.id || isEquippedInSlot}
                              className={`py-2 md:py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest border-2 transition-all ${
                                isEquippedInSlot
                                  ? 'bg-casino-gold/20 text-casino-gold border-casino-gold/50 cursor-default'
                                  : 'bg-black/40 border-white/10 text-white hover:bg-purple-600/40 hover:border-purple-500'
                              }`}
                            >
                              Slot {slot}
                              {isEquippedInSlot && <span className="block text-[8px] mt-0.5 opacity-80">Equipado</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          if (!isItemEquipped(previewItem)) {
                            handleEquip(previewItem);
                          }
                        }}
                        disabled={processingId === previewItem.id || isItemEquipped(previewItem)}
                        className={`w-full min-h-[56px] py-3 md:py-4 font-black text-sm md:text-base uppercase tracking-widest rounded-xl md:rounded-2xl transition-all border-2 shadow-xl flex items-center justify-center ${
                          isItemEquipped(previewItem)
                            ? 'bg-casino-gold/20 text-casino-gold border-casino-gold/50 cursor-default' 
                            : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]'
                        }`}
                      >
                        {processingId === previewItem.id 
                          ? 'PROCESANDO...' 
                          : isItemEquipped(previewItem)
                            ? '★ EQUIPADO' 
                            : 'EQUIPAR AHORA'}
                      </button>
                    )
                  ) : (
                    <button 
                      onClick={() => {
                        if (confirm(`¿Comprar "${previewItem.name}" por ${previewItem.price} monedas?`)) {
                          handleBuy(previewItem);
                        }
                      }}
                      disabled={processingId === previewItem.id || (profile?.coins || 0) < previewItem.price}
                      className={`w-full min-h-[56px] py-3 md:py-4 font-black text-sm md:text-base uppercase tracking-widest rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2 md:gap-3 border-2 ${
                        (profile?.coins || 0) >= previewItem.price 
                          ? previewItem.price >= 5000 
                            ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black border-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:shadow-[0_0_50px_rgba(251,191,36,0.6)] hover:-translate-y-1'
                            : 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-1'
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700'
                      }`}
                    >
                      {processingId === previewItem.id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          PROCESANDO...
                        </div>
                      ) : (
                        <>
                          COMPRAR POR <span className="text-xl md:text-2xl leading-none">🪙 {previewItem.price.toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {!inventory.includes(previewItem.id) && (profile?.coins || 0) < previewItem.price && (
                    <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl p-2 md:p-3">
                      <p className="text-xs md:text-sm text-red-400 font-bold">
                        Te faltan {(previewItem.price - (profile?.coins || 0)).toLocaleString()} monedas
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
