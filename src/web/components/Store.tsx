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
  item_type: 'avatar' | 'card_back' | 'title' | 'board' | 'theme';
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'avatar' | 'card_back' | 'title' | 'board' | 'theme'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);

  useEffect(() => {
    fetchStoreData();
  }, [user]);

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
    if (confirm(`¿Comprar "${item.name}" por ${item.price} monedas?`)) {
      setProcessingId(item.id);
      try {
        const { error } = await supabase.rpc('buy_store_item', { p_item_id: item.id });
        if (error) throw error;
        
        setInventory(prev => [...prev, item.id]);
        playSfx('chipsClink', { volumeMultiplier: 1.15 });
        triggerHaptic('success');
        window.dispatchEvent(new CustomEvent('coins_updated'));
      } catch (err: any) {
        console.error('Error buying item:', err);
        playSfx('error');
        triggerHaptic('error');
        alert(err.message || 'Error al procesar la compra.');
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleEquip = async (item: StoreItem) => {
    setProcessingId(item.id);
    try {
      const { error } = await supabase.rpc('equip_store_item', { p_item_id: item.id });
      if (error) throw error;
      
      playSfx('cardPlay', { volumeMultiplier: 0.8, playbackRate: 1.08 });
      triggerHaptic('success');
      window.dispatchEvent(new Event('profile_updated'));
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
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-down">
        <div>
          <h2 className="text-2xl font-display font-black text-purple-400 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
            Tienda In-Game
          </h2>
          <p className="text-gray-400 text-sm mt-1 font-medium">Personaliza tu experiencia con tus monedas.</p>
        </div>
        <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex gap-1 overflow-x-auto max-w-full snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {(['all', 'avatar', 'card_back', 'title', 'board', 'theme'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => {
                triggerHaptic('light');
                setActiveCategory(cat);
              }}
              className={`snap-center px-4 md:px-5 py-2.5 md:py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                activeCategory === cat ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {cat === 'all' ? 'Todo' : getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {filteredItems.map((item, index) => {
          const isOwned = inventory.includes(item.id);
          const canAfford = (profile?.coins || 0) >= item.price;
          const isEquipped = isItemEquipped(item);
          const isTheme = item.item_type === 'theme';
          
          return (
            <div 
              key={item.id} 
              onClick={() => {
                triggerHaptic('light');
                setPreviewItem(item);
              }}
              className={`glass-panel p-4 md:p-5 rounded-3xl relative overflow-hidden group border transition-all duration-300 cursor-pointer bg-black/40 backdrop-blur-md shadow-lg animate-slide-up hover:-translate-y-1 ${
                isTheme
                  ? `bg-gradient-to-br ${getRarityStyle(item)} hover:border-purple-400/60 hover:shadow-[0_10px_30px_rgba(168,85,247,0.2)]`
                  : 'border-white/10 hover:border-purple-500/50 hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)]'
              }`}
              style={{ animationDelay: `${(index % 10) * 50}ms` }}
            >
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
              <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-[10px] text-gray-300 uppercase tracking-widest font-bold bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                  {getCategoryLabel(item.item_type)}
                </span>
                {isOwned ? (
                  <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-lg border ${isEquipped ? 'text-casino-gold bg-casino-gold/10 border-casino-gold/30' : 'text-green-400 bg-green-400/10 border-green-400/20'}`}>
                    {isEquipped ? '★ Equipado' : '✓ Comprado'}
                  </span>
                ) : (
                  <span className={`text-xs font-black font-mono flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-black/40 ${canAfford ? 'text-yellow-400 border-yellow-400/30' : 'text-red-400 border-red-400/30'}`}>
                    🪙 {item.price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Preview area */}
              <div className="text-center py-2 mb-4 md:mb-5 bg-black/30 border border-white/5 rounded-2xl relative z-10 min-h-[120px] md:min-h-[140px] flex items-center justify-center group-hover:scale-[1.03] transition-transform duration-500 shadow-inner overflow-hidden">
                {isTheme && item.theme_key ? (
                  <ThemeCardPreview themeKey={item.theme_key} />
                ) : item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="max-h-24 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                    onError={(e) => { 
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('/assets/store/')) {
                        target.src = `/assets/store/${item.image_url}`; 
                      }
                    }}
                  />
                ) : (
                  <div className="text-4xl animate-pulse opacity-50">✨</div>
                )}
              </div>

              <h3 className="font-display font-black text-white text-base md:text-lg leading-tight mb-1.5 md:mb-2 relative z-10 group-hover:text-purple-300 transition-colors drop-shadow-sm">{item.name}</h3>
              <p className="text-gray-400 text-xs mb-4 md:mb-5 line-clamp-2 relative z-10 font-medium">{item.description}</p>

              <div className="relative z-10 mt-auto">
                <button 
                  className="w-full py-3 md:py-2.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-white/10 bg-white/5 group-hover:bg-purple-500/20 group-hover:border-purple-500/40 group-hover:text-purple-300 text-gray-300"
                >
                  {isOwned ? (isEquipped ? '★ Equipado' : 'Equipar / Ver') : 'Ver Detalles'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 glass-panel rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md">
          <div className="text-4xl mb-4 opacity-50">🏪</div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No hay artículos en esta categoría</p>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className="glass-panel-strong w-full md:max-w-lg mt-auto md:mt-0 rounded-t-3xl md:rounded-3xl border-t md:border border-purple-500/30 shadow-[0_-10px_50px_rgba(168,85,247,0.2)] md:shadow-[0_0_50px_rgba(168,85,247,0.3)] overflow-hidden flex flex-col relative animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Scrollable Container */}
            <div className="overflow-y-auto max-h-[85vh] md:max-h-[90vh] custom-scrollbar flex flex-col relative w-full">
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-purple-500/20 to-transparent z-0 pointer-events-none" />
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl z-0 pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl z-0 pointer-events-none" />

              <div className="p-4 flex flex-col items-center justify-center md:items-end relative z-10">
                {/* Visual handle for mobile bottom sheet */}
                <div className="w-12 h-1.5 bg-white/20 rounded-full mb-2 md:hidden"></div>
                <button 
                  onClick={() => setPreviewItem(null)}
                  className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="px-5 md:px-8 pb-6 md:pb-8 flex flex-col items-center text-center relative z-10 flex-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full mb-6 shadow-inner">
                  {getCategoryLabel(previewItem.item_type)}
                </span>

                {/* Preview — live theme card for themes, image for others */}
                <div className="w-full h-40 md:h-52 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center mb-6 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {previewItem.item_type === 'theme' && previewItem.theme_key ? (
                    <div className="absolute inset-0">
                      <ThemeCardPreview themeKey={previewItem.theme_key} />
                    </div>
                  ) : previewItem.image_url ? (
                    <img 
                      src={previewItem.image_url} 
                      alt={previewItem.name} 
                      className={`max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 ${
                        previewItem.item_type === 'board' ? 'w-full h-full object-cover rounded-xl' : 'p-4'
                      }`} 
                      onError={(e) => { 
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('/assets/store/')) {
                          target.src = `/assets/store/${previewItem.image_url}`; 
                        }
                      }}
                    />
                  ) : (
                    <div className="text-6xl animate-pulse">✨</div>
                  )}
                </div>

                {/* Theme description row */}
                {previewItem.item_type === 'theme' && previewItem.theme_key && (() => {
                  const themeData = ALL_THEMES.find(t => t.key === previewItem.theme_key);
                  return themeData ? (
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 font-bold">
                      <span className="text-xl">{themeData.emoji}</span>
                      <span className="uppercase tracking-widest">{themeData.name}</span>
                    </div>
                  ) : null;
                })()}

                <h2 className="text-2xl md:text-3xl font-display font-black text-white mb-2 tracking-wide drop-shadow-md">
                  {previewItem.name}
                </h2>
                <p className="text-gray-400 text-sm mb-8 max-w-sm leading-relaxed">
                  {previewItem.description}
                </p>

                {/* Note for theme items */}
                {previewItem.item_type === 'theme' && (
                  <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-widest mb-4 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-xl w-full">
                    🃏 Tus cartas · 🎲 Mesa compartida con el anfitrión
                  </div>
                )}

                {/* Actions */}
                <div className="w-full flex flex-col gap-3 mt-auto pb-2 md:pb-0">
                  {inventory.includes(previewItem.id) ? (
                    <button 
                      onClick={() => {
                        if (!isItemEquipped(previewItem)) {
                          handleEquip(previewItem);
                          setPreviewItem(null);
                        }
                      }}
                      disabled={processingId === previewItem.id || isItemEquipped(previewItem)}
                      className={`w-full py-4 font-black text-sm uppercase tracking-widest rounded-xl transition-all border shadow-lg ${
                        isItemEquipped(previewItem)
                          ? 'bg-casino-gold/20 text-casino-gold border-casino-gold/50 cursor-default' 
                          : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                      }`}
                    >
                      {processingId === previewItem.id 
                        ? 'PROCESANDO...' 
                        : isItemEquipped(previewItem)
                          ? '★ EQUIPADO' 
                          : 'EQUIPAR AHORA'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        handleBuy(previewItem);
                        setPreviewItem(null);
                      }}
                      disabled={processingId === previewItem.id || (profile?.coins || 0) < previewItem.price}
                      className={`w-full py-4 font-black text-sm uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
                        (profile?.coins || 0) >= previewItem.price 
                          ? 'btn-gold shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:-translate-y-0.5' 
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      {processingId === previewItem.id ? (
                        'PROCESANDO...'
                      ) : (
                        <>
                          COMPRAR POR <span className="text-lg leading-none">🪙 {previewItem.price.toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {!inventory.includes(previewItem.id) && (profile?.coins || 0) < previewItem.price && (
                    <p className="text-xs text-red-400 font-bold mt-1">
                      Te faltan {(previewItem.price - (profile?.coins || 0)).toLocaleString()} monedas
                    </p>
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
