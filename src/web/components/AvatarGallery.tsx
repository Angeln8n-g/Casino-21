import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

const AVATAR_OPTIONS = [
  { id: 'avatar-1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=020617' },
  { id: 'avatar-2', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=020617' },
  { id: 'avatar-3', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Leo&backgroundColor=020617' },
  { id: 'avatar-4', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Mimi&backgroundColor=020617' },
  { id: 'avatar-5', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Jasper&backgroundColor=020617' },
  { id: 'avatar-6', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Loki&backgroundColor=020617' },
  { id: 'avatar-7', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Chloe&backgroundColor=020617' },
  { id: 'avatar-8', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Simba&backgroundColor=020617' },
  { id: 'avatar-9', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Oliver&backgroundColor=020617' },
  { id: 'avatar-10', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Luna&backgroundColor=020617' },
];

interface PurchasedAvatar {
  id: string;
  name: string;
  image_url: string;
}

interface AvatarGalleryProps {
  onClose: () => void;
  onAvatarSelected: (url: string) => void;
  currentAvatarUrl?: string;
}

export function AvatarGallery({ onClose, onAvatarSelected, currentAvatarUrl }: AvatarGalleryProps) {
  const { user, profile } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(currentAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [purchasedAvatars, setPurchasedAvatars] = useState<PurchasedAvatar[]>([]);
  const [loadingPurchased, setLoadingPurchased] = useState(true);

  // Fetch purchased avatars from player inventory
  useEffect(() => {
    if (!user) return;
    
    const fetchPurchased = async () => {
      setLoadingPurchased(true);
      try {
        const { data, error } = await supabase
          .from('player_inventory')
          .select(`
            item_id,
            store_items:item_id (id, name, image_url, item_type)
          `)
          .eq('player_id', user.id);

        if (!error && data) {
          const avatars = data
            .map((inv: any) => {
              const item = Array.isArray(inv.store_items) ? inv.store_items[0] : inv.store_items;
              return item;
            })
            .filter((item: any) => item && item.item_type === 'avatar' && item.image_url)
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              image_url: item.image_url,
            }));
          setPurchasedAvatars(avatars);
        }
      } catch (err) {
        console.error('Error fetching purchased avatars:', err);
      } finally {
        setLoadingPurchased(false);
      }
    };

    fetchPurchased();
  }, [user]);

  // Determine if the currently selected avatar is a "store" avatar (use equip RPC)
  // or a free avatar (direct profile update)
  const handleSave = async () => {
    if (!user || !selectedAvatar) return;
    
    setIsSaving(true);
    try {
      const purchasedMatch = purchasedAvatars.find(a => a.image_url === selectedAvatar);
      
      if (purchasedMatch) {
        // This is a purchased avatar → equip it via RPC
        const { error } = await supabase.rpc('equip_store_item', { p_item_id: purchasedMatch.id });
        if (error) throw error;
      } else {
        // This is a free DiceBear avatar → update profile directly
        const { error } = await supabase
          .from('profiles')
          .update({ 
            avatar_url: selectedAvatar,
            equipped_avatar: null // Clear equipped store avatar so the free one shows
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      onAvatarSelected(selectedAvatar);
      onClose();
    } catch (err) {
      console.error('Error saving avatar:', err);
      alert('No se pudo guardar el avatar.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if current equipped is from store or free
  const currentEquipped = profile?.equipped_avatar || currentAvatarUrl;

  const content = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-panel-strong w-full max-w-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-slate-900/50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xs font-bold text-casino-gold uppercase tracking-widest mb-1">Personalización</h3>
            <h2 className="text-2xl font-black text-white leading-tight">Selecciona tu Avatar</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Gallery */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* Purchased (Premium) Avatars */}
          {purchasedAvatars.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest">⭐ Premium</h4>
                <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{purchasedAvatars.length} comprados</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {purchasedAvatars.map((avatar) => (
                  <div 
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.image_url)}
                    className={`
                      relative aspect-square rounded-2xl cursor-pointer overflow-hidden border-2 transition-all duration-300 group
                      ${selectedAvatar === avatar.image_url 
                        ? 'border-purple-400 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.5)]' 
                        : 'border-purple-500/20 hover:border-purple-500/50 hover:scale-105 bg-black/40'}
                    `}
                  >
                    <img 
                      src={avatar.image_url} 
                      alt={avatar.name} 
                      className="w-full h-full object-cover"
                    />
                    {/* Premium badge */}
                    <div className="absolute top-1 left-1 bg-purple-500/80 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">
                      ⭐
                    </div>
                    {selectedAvatar === avatar.image_url && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center text-white text-xs font-black">
                        ✓
                      </div>
                    )}
                    {/* Hover tooltip */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm px-2 py-1 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-[9px] text-white font-bold truncate">{avatar.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingPurchased && (
            <div className="mb-6 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Cargando avatares premium...
            </div>
          )}

          {/* Free Avatars */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Gratis</h4>
              <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{AVATAR_OPTIONS.length} disponibles</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {AVATAR_OPTIONS.map((avatar) => (
                <div 
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.url)}
                  className={`
                    relative aspect-square rounded-2xl cursor-pointer overflow-hidden border-2 transition-all duration-300
                    ${selectedAvatar === avatar.url 
                      ? 'border-casino-gold scale-105 shadow-[0_0_20px_rgba(234,179,8,0.5)]' 
                      : 'border-white/10 hover:border-white/30 hover:scale-105 bg-black/40'}
                  `}
                >
                  <img 
                    src={avatar.url} 
                    alt="Avatar option" 
                    className="w-full h-full object-cover p-2"
                  />
                  {selectedAvatar === avatar.url && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-casino-gold rounded-full flex items-center justify-center text-black text-xs font-black">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-slate-900/50 shrink-0 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:bg-white/10 transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || !selectedAvatar || selectedAvatar === currentEquipped}
            className={`
              px-8 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all
              ${isSaving || !selectedAvatar || selectedAvatar === currentEquipped
                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-casino-gold to-yellow-600 text-black hover:from-yellow-400 hover:to-casino-gold shadow-[0_0_15px_rgba(234,179,8,0.4)]'}
            `}
          >
            {isSaving ? 'Guardando...' : 'Guardar Avatar'}
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
