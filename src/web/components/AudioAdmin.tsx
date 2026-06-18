import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface AudioTrack {
  id: string;
  name: string;
  src: string;
  category: 'lobby' | 'game';
  style: 'classic' | 'modern';
  track_order: number;
}

export function AudioAdmin() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeCategory, setActiveCategory] = useState<'lobby' | 'game'>('lobby');
  const [activeStyle, setActiveStyle] = useState<'classic' | 'modern'>('classic');
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Partial<AudioTrack>>({
    name: '', src: '', category: 'lobby', style: 'classic', track_order: 0
  });
  const [isUploading, setIsUploading] = useState(false);

  // Reproductor de prueba
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audio_tracks')
      .select('*')
      .order('category')
      .order('style')
      .order('track_order');

    if (error) {
      setError(error.message);
    } else {
      setTracks(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio_tracks')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio_tracks')
        .getPublicUrl(filePath);

      setCurrentTrack({ ...currentTrack, src: publicUrl });
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError('Error al subir el archivo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      name: currentTrack.name,
      src: currentTrack.src,
      category: currentTrack.category,
      style: currentTrack.style,
      track_order: currentTrack.track_order
    };

    if (currentTrack.id) {
      // Update
      const { error } = await supabase.from('audio_tracks').update(payload).eq('id', currentTrack.id);
      if (error) setError(error.message);
      else {
        setIsEditing(false);
        fetchTracks();
      }
    } else {
      // Insert
      const { error } = await supabase.from('audio_tracks').insert([payload]);
      if (error) setError(error.message);
      else {
        setIsEditing(false);
        fetchTracks();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta pista?')) return;
    const { error } = await supabase.from('audio_tracks').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchTracks();
  };

  const togglePlay = (track: AudioTrack) => {
    if (playingId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const newAudio = new Audio(track.src);
      newAudio.play().catch(e => console.error("Error playing audio", e));
      newAudio.onended = () => setPlayingId(null);
      audioRef.current = newAudio;
      setPlayingId(track.id);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const filteredTracks = tracks.filter(t => t.category === activeCategory && t.style === activeStyle);

  return (
    <div className="w-full text-white animate-fade-in flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-black uppercase tracking-wider text-casino-gold flex items-center gap-2">
          <span className="text-3xl">🎵</span> Ajustes de Audio
        </h2>
        
        <button 
          onClick={() => {
            setCurrentTrack({ name: '', src: '', category: activeCategory, style: activeStyle, track_order: filteredTracks.length + 1 });
            setIsEditing(true);
          }}
          className="bg-casino-gold text-black px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition whitespace-nowrap"
        >
          + Nueva Pista
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl mb-6 shrink-0">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 mb-8 shrink-0">
          <h3 className="text-xl font-bold mb-4 text-casino-gold">
            {currentTrack.id ? 'Editar Pista' : 'Agregar Nueva Pista'}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre</label>
                <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-casino-gold outline-none transition" value={currentTrack.name || ''} onChange={e => setCurrentTrack({...currentTrack, name: e.target.value})} placeholder="Ej. Piano Longe" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Orden de Reproducción</label>
                <input required type="number" min="1" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-casino-gold outline-none transition" value={currentTrack.track_order || 0} onChange={e => setCurrentTrack({...currentTrack, track_order: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoría</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-casino-gold outline-none transition" value={currentTrack.category} onChange={e => setCurrentTrack({...currentTrack, category: e.target.value as any})}>
                  <option value="lobby">Lobby (Menú Principal)</option>
                  <option value="game">Partidas (In-Game)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Estilo</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-casino-gold outline-none transition" value={currentTrack.style} onChange={e => setCurrentTrack({...currentTrack, style: e.target.value as any})}>
                  <option value="classic">Clásico</option>
                  <option value="modern">Moderno</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Archivo de Audio (URL o Subir)</label>
                <div className="flex gap-2 items-center">
                  <input required type="text" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-casino-gold outline-none transition" placeholder="https://... o ruta local" value={currentTrack.src || ''} onChange={e => setCurrentTrack({...currentTrack, src: e.target.value})} />
                  <label className="shrink-0 bg-white/5 hover:bg-white/10 border border-casino-gold/30 px-4 py-2 rounded-lg cursor-pointer text-sm font-bold text-casino-gold transition-colors flex items-center justify-center min-w-[120px]">
                    {isUploading ? 'Subiendo...' : '📂 Subir MP3'}
                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">Sube un archivo .mp3 o .wav para usar el almacenamiento de Supabase.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/10 transition">Cancelar</button>
              <button type="submit" className="px-6 py-2 rounded-lg text-sm font-bold bg-casino-gold text-black hover:bg-yellow-400 transition shadow-[0_0_15px_rgba(255,215,0,0.3)]">Guardar Pista</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-6 shrink-0">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 flex-1 sm:flex-none">
              <button 
                onClick={() => setActiveCategory('lobby')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeCategory === 'lobby' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'
                }`}
              >
                Música Lobby
              </button>
              <button 
                onClick={() => setActiveCategory('game')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeCategory === 'game' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'
                }`}
              >
                Música Partidas
              </button>
            </div>

            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 flex-1 sm:flex-none">
              <button 
                onClick={() => setActiveStyle('classic')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeStyle === 'classic' ? 'bg-casino-gold/20 text-casino-gold' : 'text-gray-500 hover:text-white'
                }`}
              >
                Estilo Clásico
              </button>
              <button 
                onClick={() => setActiveStyle('modern')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeStyle === 'modern' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-white'
                }`}
              >
                Estilo Moderno
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md z-10 border-b border-white/10">
                  <tr className="text-xs uppercase tracking-wider text-gray-400">
                    <th className="p-4 font-black w-16 text-center">Orden</th>
                    <th className="p-4 font-black">Nombre de Pista</th>
                    <th className="p-4 font-black">Ruta (Source)</th>
                    <th className="p-4 font-black text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-bold tracking-widest uppercase">Cargando pistas...</td></tr>
                  ) : filteredTracks.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No hay pistas de audio para esta combinación.</td></tr>
                  ) : (
                    filteredTracks.map(track => (
                      <tr key={track.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="p-4 text-center font-bold text-gray-400">
                          <span className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mx-auto">{track.track_order}</span>
                        </td>
                        <td className="p-4 font-bold text-white flex items-center gap-3">
                          <button 
                            onClick={() => togglePlay(track)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                              playingId === track.id ? 'bg-casino-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                          >
                            {playingId === track.id ? '⏸' : '▶'}
                          </button>
                          {track.name}
                        </td>
                        <td className="p-4 text-sm text-gray-400 font-mono truncate max-w-[200px] md:max-w-md" title={track.src}>
                          {track.src}
                        </td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <button onClick={() => {setCurrentTrack(track); setIsEditing(true);}} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition">Editar</button>
                          <button onClick={() => handleDelete(track.id)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/40 px-3 py-1.5 rounded transition">Eliminar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
