import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  item_type: 'avatar' | 'card_back' | 'title' | 'board';
  price: number;
  image_url: string | null;
}

export function Store() {
  const { profile, user } = useAuth();
  const { playSfx } = useAudio();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<string[]>([]); // item_ids
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'avatar' | 'card_back' | 'title' | 'board'>('all');
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
      alert('Monedas insuficientes.');
      return;
    }
    if (confirm(`¿Comprar "${item.name}" por ${item.price} monedas?`)) {
      setProcessingId(item.id);
      try {
        const { error } = await supabase.rpc('buy_store_item', { p_item_id: item.id });
        if (error) throw error;
        
        // Update local inventory
        setInventory(prev => [...prev, item.id]);
        playSfx('chipsClink', { volumeMultiplier: 1.15 });
        // Disparar evento para actualizar el header
        window.dispatchEvent(new CustomEvent('coins_updated'));
      } catch (err: any) {
        console.error('Error buying item:', err);
        playSfx('error');
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
      
      // Disparar evento global para recargar perfil (si tienes algo escuchando) o alertar
      playSfx('cardPlay', { volumeMultiplier: 0.8, playbackRate: 1.08 });
      alert(`¡${item.name} equipado con éxito!`);
      // Opcional: trigger profile reload
      window.dispatchEvent(new Event('profile_updated'));
    } catch (err: any) {
      console.error('Error equipping item:', err);
      playSfx('error');
      alert(err.message || 'Error al equipar.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredItems = items.filter(item => activeCategory === 'all' || item.item_type === activeCategory);

  const getCategoryLabel = (type: string) => {
    switch(type) {
      case 'avatar': return '👤 Avatar';
      case 'card_back': return '🃏 Reverso';
      case 'title': return '🏷️ Título';
      case 'board': return '🎲 Tapete';
      default: return 'Otro';
    }
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black text-purple-400 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
            Tienda In-Game
          </h2>
          <p className="text-gray-400 text-sm">Personaliza tu experiencia con tus monedas.</p>
        </div>
        <div className="bg-black/40 p-1.5 rounded-xl border border-white/5 flex gap-1 overflow-x-auto max-w-full">
          {(['all', 'avatar', 'card_back', 'title', 'board'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                activeCategory === cat ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {cat === 'all' ? 'Todo' : getCategoryLabel(cat).split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isOwned = inventory.includes(item.id);
          const canAfford = (profile?.coins || 0) >= item.price;
          const isEquipped = profile?.equipped_avatar === item.id || 
                             profile?.equipped_card_back === item.id || 
                             profile?.equipped_title === item.id || 
                             profile?.equipped_board === item.id;
          
          return (
            <div 
              key={item.id} 
              onClick={() => setPreviewItem(item)}
              className="glass-panel p-4 rounded-2xl relative overflow-hidden group border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer"
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
              
              <div className="flex justify-between items-start mb-3 relative z-10">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold bg-black/40 px-2 py-1 rounded-md">
                  {getCategoryLabel(item.item_type)}
                </span>
                {isOwned ? (
                  <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md">✓ En Inventario</span>
                ) : (
                  <span className={`text-xs font-black font-mono flex items-center gap-1 ${canAfford ? 'text-casino-gold' : 'text-red-400'}`}>
                    🪙 {item.price.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="text-center py-6 mb-4 bg-black/20 rounded-xl relative z-10 min-h-[120px] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="max-h-20 object-contain drop-shadow-lg" 
                    onError={(e) => { 
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('/assets/store/')) {
                        target.src = `/assets/store/${item.image_url}`; 
                      }
                    }}
                  />
                ) : (
                  <div className="text-4xl">✨</div>
                )}
              </div>

              <h3 className="font-display font-bold text-white text-lg leading-tight mb-1 relative z-10 group-hover:text-purple-300 transition-colors">{item.name}</h3>
              <p className="text-gray-400 text-xs mb-4 line-clamp-2 relative z-10">{item.description}</p>

              <div className="relative z-10 mt-auto">
                <button 
                  className="w-full py-2 font-bold text-xs uppercase tracking-widest rounded-xl transition-all border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300"
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 glass-panel rounded-2xl">
          <p className="text-gray-500">No hay artículos en esta categoría.</p>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className="glass-panel-strong w-full max-w-lg rounded-3xl border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.3)] overflow-hidden flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Background blur effect */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-purple-500/20 to-transparent z-0 pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl z-0 pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl z-0 pointer-events-none" />

            {/* Header */}
            <div className="p-4 flex justify-end relative z-10">
              <button 
                onClick={() => setPreviewItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-8 pb-8 flex flex-col items-center text-center relative z-10">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full mb-6 shadow-inner">
                {getCategoryLabel(previewItem.item_type)}
              </span>

              {/* Preview Image Container */}
              <div className="w-48 h-48 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center mb-6 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {previewItem.image_url ? (
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

              <h2 className="text-3xl font-display font-black text-white mb-2 tracking-wide drop-shadow-md">
                {previewItem.name}
              </h2>
              <p className="text-gray-400 text-sm mb-8 max-w-sm leading-relaxed">
                {previewItem.description}
              </p>

              {/* Actions */}
              <div className="w-full flex flex-col gap-3 mt-auto">
                {inventory.includes(previewItem.id) ? (
                  <button 
                    onClick={() => {
                      const isEquipped = profile?.equipped_avatar === previewItem.id || 
                                         profile?.equipped_card_back === previewItem.id || 
                                         profile?.equipped_title === previewItem.id || 
                                         profile?.equipped_board === previewItem.id;
                      if (!isEquipped) {
                        handleEquip(previewItem);
                        setPreviewItem(null);
                      }
                    }}
                    disabled={processingId === previewItem.id || (
                      profile?.equipped_avatar === previewItem.id || 
                      profile?.equipped_card_back === previewItem.id || 
                      profile?.equipped_title === previewItem.id || 
                      profile?.equipped_board === previewItem.id
                    )}
                    className={`w-full py-4 font-black text-sm uppercase tracking-widest rounded-xl transition-all border shadow-lg ${
                      (profile?.equipped_avatar === previewItem.id || 
                       profile?.equipped_card_back === previewItem.id || 
                       profile?.equipped_title === previewItem.id || 
                       profile?.equipped_board === previewItem.id)
                        ? 'bg-casino-gold/20 text-casino-gold border-casino-gold/50 cursor-default' 
                        : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    }`}
                  >
                    {processingId === previewItem.id 
                      ? 'PROCESANDO...' 
                      : (profile?.equipped_avatar === previewItem.id || 
                         profile?.equipped_card_back === previewItem.id || 
                         profile?.equipped_title === previewItem.id || 
                         profile?.equipped_board === previewItem.id) 
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
                
                {/* Balance warning if can't afford */}
                {!inventory.includes(previewItem.id) && (profile?.coins || 0) < previewItem.price && (
                  <p className="text-xs text-red-400 font-bold mt-1">
                    Te faltan {(previewItem.price - (profile?.coins || 0)).toLocaleString()} monedas
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
