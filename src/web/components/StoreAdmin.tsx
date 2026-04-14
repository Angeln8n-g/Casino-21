import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  item_type: 'avatar' | 'card_back' | 'title' | 'board';
  price: number;
  image_url: string | null;
  is_active: boolean;
}

export function StoreAdmin() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-purple-400">Catálogo de la Tienda</h3>
          <p className="text-xs text-gray-400">Sube, edita o deshabilita artículos cosméticos.</p>
        </div>
        <button 
          onClick={() => {
            setCurrentItem({ name: '', description: '', item_type: 'avatar', price: 0, image_url: '', is_active: true });
            setIsEditing(true);
          }}
          className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-xl font-bold hover:bg-purple-500/40 transition border border-purple-500/30 text-sm"
        >
          + Nuevo Artículo
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 animate-fade-in">
          <h4 className="text-lg font-bold mb-4">{currentItem.id ? 'Editar Artículo' : 'Crear Nuevo Artículo'}</h4>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre</label>
                <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Precio (Monedas)</label>
                <input required type="number" min="0" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentItem.price} onChange={e => setCurrentItem({...currentItem, price: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoría</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentItem.item_type} onChange={e => setCurrentItem({...currentItem, item_type: e.target.value as any})}>
                  <option value="avatar">Avatar</option>
                  <option value="card_back">Reverso de Carta</option>
                  <option value="title">Título</option>
                  <option value="board">Tapete de Mesa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descripción</label>
                <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentItem.description} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} />
              </div>
              
              <div className="md:col-span-2 border border-white/10 p-4 rounded-xl bg-black/20">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">URL de la Imagen / GIF (Opcional para Títulos)</label>
                
                <div className="flex flex-col gap-4">
                  <input 
                    type="url" 
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" 
                    placeholder="https://ejemplo.com/imagen.gif"
                    value={currentItem.image_url || ''} 
                    onChange={e => setCurrentItem({...currentItem, image_url: e.target.value})} 
                  />
                  
                  {currentItem.image_url && (
                    <div className="relative w-full max-w-xs h-32 bg-black/50 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                      <img 
                        src={currentItem.image_url} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          // Si falla la URL absoluta, intentamos la ruta local por si es un seed antiguo
                          if (!(e.target as HTMLImageElement).src.includes('/assets/store/')) {
                            (e.target as HTMLImageElement).src = `/assets/store/${currentItem.image_url}`;
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/10 transition">Cancelar</button>
              <button type="submit" className="px-6 py-2 rounded-lg text-sm font-bold bg-purple-500 text-white hover:bg-purple-400 transition">Guardar Artículo</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                  <th className="p-4 font-black w-16">Img</th>
                  <th className="p-4 font-black">Artículo</th>
                  <th className="p-4 font-black">Tipo</th>
                  <th className="p-4 font-black">Precio</th>
                  <th className="p-4 font-black text-center">Estado</th>
                  <th className="p-4 font-black text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando catálogo...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay artículos en la tienda.</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className={`border-b border-white/5 transition-colors ${!item.is_active ? 'opacity-50 grayscale' : 'hover:bg-white/5'}`}>
                      <td className="p-4">
                        {item.image_url ? (
                          <div className="w-10 h-10 bg-black/30 rounded flex items-center justify-center p-1 overflow-hidden">
                            <img 
                              src={item.image_url}
                              onError={(e) => { 
                                if (!(e.target as HTMLImageElement).src.includes('/assets/store/')) {
                                  (e.target as HTMLImageElement).src = `/assets/store/${item.image_url}`; 
                                }
                              }}
                              alt="" className="max-w-full max-h-full object-contain" 
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-black/30 rounded flex items-center justify-center text-xs">TXT</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold">{item.name}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</div>
                      </td>
                      <td className="p-4"><span className="bg-white/10 px-2 py-1 rounded text-[10px] uppercase">{item.item_type}</span></td>
                      <td className="p-4 font-mono text-casino-gold">🪙 {item.price}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => toggleActive(item)}
                          className={`text-xs px-2 py-1 rounded font-bold ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
                        >
                          {item.is_active ? 'ACTIVO' : 'INACTIVO'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => {setCurrentItem(item); setIsEditing(true);}} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition">Editar</button>
                        <button onClick={() => handleDelete(item.id)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/40 px-3 py-1.5 rounded transition">Eliminar</button>
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