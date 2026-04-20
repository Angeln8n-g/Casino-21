import React, { useState } from 'react';
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

interface AvatarGalleryProps {
  onClose: () => void;
  onAvatarSelected: (url: string) => void;
  currentAvatarUrl?: string;
}

export function AvatarGallery({ onClose, onAvatarSelected, currentAvatarUrl }: AvatarGalleryProps) {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(currentAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !selectedAvatar) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: selectedAvatar,
          equipped_avatar: null // Clear equipped store avatar so the free one shows
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      onAvatarSelected(selectedAvatar);
      onClose();
    } catch (err) {
      console.error('Error saving avatar:', err);
      alert('No se pudo guardar el avatar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-panel-strong w-full max-w-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
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
            disabled={isSaving || !selectedAvatar || selectedAvatar === currentAvatarUrl}
            className={`
              px-8 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all
              ${isSaving || !selectedAvatar || selectedAvatar === currentAvatarUrl
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
}
