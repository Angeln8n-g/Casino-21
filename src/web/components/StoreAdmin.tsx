import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  item_type: 'avatar' | 'card_back' | 'title' | 'board' | 'theme' | 'emotic';
  price: number;
  image_url: string | null;
  theme_key?: string | null;
  is_active: boolean;
}

export function StoreAdmin() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentItem, setCurrentItem] = useState<Partial<StoreItem>>({
    name: '',
    description: '',
    item_type: 'avatar',
    price: 0,
    image_url: '',
    is_active: true
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setItems(data || []);
    setLoading(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    setError('');

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeName = (currentItem.name || 'item')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `${safeName}_${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('store_assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('store_assets')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        setCurrentItem(prev => ({ ...prev, image_url: urlData.publicUrl }));
      }
    } catch (err: any) {
      setError(`Error al subir archivo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (currentItem.id) {
        const { error } = await supabase.from('store_items').update(currentItem).eq('id', currentItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('store_items').insert([currentItem]);
        if (error) throw error;
      }

      setIsEditing(false);
      fetchItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleActive = async (item: StoreItem) => {
    const { error } = await supabase
      .from('store_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
      
    if (error) setError(error.message);
    else fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este artículo permanentemente?')) return;
    
    const { error } = await supabase.from('store_items').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchItems();
  };

  const totalItems = items.length;
  const activeItems = items.filter(i => i.is_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#A78BFA] flex items-center gap-2">
            <span aria-hidden="true">🛠️</span> Panel de Control de Tienda
          </h3>
          <p className="text-sm text-gray-400 mt-1">Gestiona el inventario, sube assets y controla la disponibilidad.</p>
        </div>
        <button 
          onClick={() => {
            setCurrentItem({ name: '', description: '', item_type: 'avatar', price: 0, image_url: '', is_active: true });
            setIsEditing(true);
          }}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] text-sm flex items-center gap-2"
        >
          <span>➕</span> Nuevo Artículo
        </button>
      </div>

      {!isEditing && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-center shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-black mb-1">Total Artículos</span>
            <span className="text-3xl font-bold text-white">{totalItems}</span>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-center shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-black mb-1">Activos</span>
            <span className="text-3xl font-bold text-green-400">{activeItems}</span>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-center shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-black mb-1">Premium (&gt;5k)</span>
            <span className="text-3xl font-bold text-yellow-400">{items.filter(i => i.price >= 5000).length}</span>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-center shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-black mb-1">Categorías</span>
            <span className="text-3xl font-bold text-cyan-400">{new Set(items.map(i => i.item_type)).size}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl text-sm flex items-center gap-2 shadow-lg" role="alert">
          <span aria-hidden="true">⚠️</span> {error}
        </div>
      )}

      {isEditing ? (
        <div className="bg-[#0F0F23] p-6 sm:p-8 rounded-3xl border border-[#7C3AED]/30 shadow-2xl animate-slide-up">
          <h4 className="text-xl font-bold mb-6 text-white border-b border-white/10 pb-4">
            {currentItem.id ? '✏️ Editar Artículo' : '✨ Crear Nuevo Artículo'}
          </h4>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="itemName" className="block text-xs font-bold text-gray-400 uppercase mb-2">Nombre del artículo</label>
                <input id="itemName" required type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} placeholder="Ej: Avatar Neón" />
              </div>
              <div>
                <label htmlFor="itemPrice" className="block text-xs font-bold text-gray-400 uppercase mb-2">Precio (🪙 Monedas)</label>
                <input id="itemPrice" required type="number" min="0" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all font-mono" value={currentItem.price} onChange={e => setCurrentItem({...currentItem, price: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label htmlFor="itemType" className="block text-xs font-bold text-gray-400 uppercase mb-2">Categoría</label>
                <select id="itemType" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all cursor-pointer" value={currentItem.item_type} onChange={e => setCurrentItem({...currentItem, item_type: e.target.value as any})}>
                  <option value="avatar">👤 Avatar</option>
                  <option value="card_back">🃏 Reverso de Carta</option>
                  <option value="title">🏷️ Título</option>
                  <option value="board">🎲 Tapete de Mesa</option>
                  <option value="theme">🎨 Tema Premium</option>
                  <option value="emotic">😊 Emoticón</option>
                </select>
              </div>
              <div>
                <label htmlFor="itemDesc" className="block text-xs font-bold text-gray-400 uppercase mb-2">Descripción Corta</label>
                <input id="itemDesc" required type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all" value={currentItem.description} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} placeholder="Atrae a los compradores con una buena descripción" />
              </div>
              
              {currentItem.item_type === 'theme' && (
                <div className="md:col-span-2">
                  <label htmlFor="themeKey" className="block text-xs font-bold text-gray-400 uppercase mb-2">Clave del Tema (Theme Registry Key)</label>
                  <input id="themeKey" type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all font-mono text-sm" value={currentItem.theme_key || ''} onChange={e => setCurrentItem({...currentItem, theme_key: e.target.value})} placeholder="Ej: neon_dealer" />
                  <p className="text-[10px] text-gray-500 mt-1">Asegúrate de que esta clave exista en src/themes/themeRegistry.ts</p>
                </div>
              )}
              
              {/* Image Upload Section */}
              <div className="md:col-span-2 border border-white/10 p-6 rounded-2xl bg-black/20">
                <label className="block text-sm font-bold text-gray-300 uppercase mb-4">🖼️ Asset Visual</label>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* File Upload / URL input */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        aria-label="Subir archivo"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`w-full py-4 rounded-xl font-bold text-sm border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                          uploading 
                            ? 'bg-[#7C3AED]/10 text-[#A78BFA] border-[#7C3AED]/30 cursor-wait' 
                            : 'bg-black/40 text-gray-300 border-gray-600 hover:border-[#7C3AED] hover:text-[#A78BFA] hover:bg-[#7C3AED]/5'
                        }`}
                      >
                        {uploading ? (
                          <>
                            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Subiendo al Storage...
                          </>
                        ) : (
                          <>
                            <span className="text-2xl" aria-hidden="true">📤</span>
                            <span>Click para seleccionar archivo</span>
                            <span className="text-[10px] text-gray-500 font-normal">PNG, JPG, GIF, WebP, SVG — Máx. 5MB</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="h-px bg-white/10 flex-1"></div>
                      <span className="text-xs text-gray-500 font-bold uppercase">O</span>
                      <div className="h-px bg-white/10 flex-1"></div>
                    </div>

                    <div>
                      <label htmlFor="imgUrl" className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Pegar URL directa</label>
                      <input 
                        id="imgUrl"
                        type="url" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7C3AED] transition-all" 
                        placeholder="https://miservidor.com/imagen.gif"
                        value={currentItem.image_url || ''} 
                        onChange={e => setCurrentItem({...currentItem, image_url: e.target.value})} 
                      />
                    </div>
                  </div>
                  
                  {/* Image preview */}
                  <div className="w-full md:w-48 h-48 bg-black/60 rounded-xl border border-white/10 flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                    {currentItem.image_url ? (
                      <>
                        <img 
                          src={currentItem.image_url} 
                          alt="Vista previa" 
                          className="max-w-full max-h-full object-contain p-2 drop-shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setCurrentItem({...currentItem, image_url: ''})}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 text-gray-400 hover:text-rose-400 flex items-center justify-center transition-colors shadow-lg border border-white/10"
                          aria-label="Eliminar imagen"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-600 text-sm flex flex-col items-center gap-2">
                        <span className="text-3xl">👁️</span>
                        Vista Previa
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-6 border-t border-white/10 mt-6">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-300 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-8 py-3 rounded-xl text-sm font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] transition-all"
              >
                Guardar Artículo
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-[#0F0F23] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-black/60 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-400">
                  <th className="p-5 font-black w-20">Asset</th>
                  <th className="p-5 font-black">Detalles</th>
                  <th className="p-5 font-black">Tipo</th>
                  <th className="p-5 font-black">Precio</th>
                  <th className="p-5 font-black text-center">Estado</th>
                  <th className="p-5 font-black text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-500 animate-pulse font-bold">Cargando catálogo del servidor...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-500 font-bold">No hay artículos en la tienda. Crea uno nuevo.</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className={`border-b border-white/5 transition-all hover:bg-white/5 ${!item.is_active ? 'opacity-60 bg-black/40' : ''}`}>
                      <td className="p-4">
                        <div className="w-12 h-12 bg-black/40 border border-white/10 rounded-lg flex items-center justify-center p-1 overflow-hidden shadow-inner">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="max-w-full max-h-full object-contain drop-shadow-md" loading="lazy" />
                          ) : (
                            <span className="text-xs text-gray-600">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                          {item.name}
                          {item.price >= 5000 && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded uppercase tracking-widest">Premium</span>}
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-[250px] mt-1">{item.description}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-white/10 border border-white/5 text-gray-300 px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold">
                          {item.item_type}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-yellow-400 font-bold bg-black/20">
                        🪙 {item.price.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => toggleActive(item)}
                          className={`text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-colors ${
                            item.is_active 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                          }`}
                          aria-label={item.is_active ? 'Desactivar artículo' : 'Activar artículo'}
                        >
                          {item.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {setCurrentItem(item); setIsEditing(true);}} 
                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors border border-white/5"
                            aria-label={`Editar ${item.name}`}
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="text-xs bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-3 py-2 rounded-lg transition-colors border border-rose-500/30"
                            aria-label={`Eliminar ${item.name}`}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
