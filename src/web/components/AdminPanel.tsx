import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface EventData {
  id: string;
  title: string;
  description: string;
  rules: string;
  type: 'torneo' | 'liga' | 'especial';
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: string;
  min_elo: number;
  image_url: string;
  participants_count: number;
  max_participants: number;
}

export function AdminPanel() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<EventData>>({
    title: '', description: '', rules: '', type: 'torneo', status: 'draft', 
    entry_fee: 0, prize_pool: '', min_elo: 0, image_url: '', max_participants: 16
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Calculate dates roughly (for MVP)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Default to 1 week

    const payload = {
      ...currentEvent,
      start_date: currentEvent.start_date || startDate.toISOString(),
      end_date: currentEvent.end_date || endDate.toISOString()
    };

    if (currentEvent.id) {
      // Update
      const { error } = await supabase.from('events').update(payload).eq('id', currentEvent.id);
      if (error) setError(error.message);
      else {
        setIsEditing(false);
        fetchEvents();
      }
    } else {
      // Insert
      const { error } = await supabase.from('events').insert([payload]);
      if (error) setError(error.message);
      else {
        setIsEditing(false);
        fetchEvents();
      }
    }
  };

  const handleGenerateBracket = async (event: EventData) => {
    if (event.type !== 'torneo') return;
    if (!confirm(`¿Estás seguro de generar las llaves para "${event.title}"? Esto sobrescribirá cualquier llave existente.`)) return;
    
    setLoading(true);
    
    try {
      // 1. Delete existing matches for this event (if any)
      await supabase.from('tournament_matches').delete().eq('event_id', event.id);

      // 2. Fetch enrolled players
      const { data: entries } = await supabase
        .from('event_entries')
        .select('player_id')
        .eq('event_id', event.id);
        
      const players = entries ? entries.map(e => e.player_id) : [];
      
      // Shuffle players randomly
      for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
      }

      // 3. Generate matches based on max_participants
      const maxP = event.max_participants || 16;
      const totalRounds = Math.log2(maxP);
      
      const matchesToInsert = [];
      let playerIndex = 0;

      for (let round = 1; round <= totalRounds; round++) {
        const matchesInRound = maxP / Math.pow(2, round);
        
        for (let order = 1; order <= matchesInRound; order++) {
          let p1 = null;
          let p2 = null;
          
          // Only assign players in Round 1
          if (round === 1) {
            if (playerIndex < players.length) p1 = players[playerIndex++];
            if (playerIndex < players.length) p2 = players[playerIndex++];
          }
          
          matchesToInsert.push({
            event_id: event.id,
            round_number: round,
            match_order: order,
            player1_id: p1,
            player2_id: p2,
            status: round === 1 ? 'pending' : 'pending', // Only Round 1 is ready conceptually, but we set all to pending initially
            game_room_id: Math.random().toString(36).substring(2, 8).toUpperCase()
          });
        }
      }

      // 4. Insert matches
      const { error: insertError } = await supabase.from('tournament_matches').insert(matchesToInsert);
      
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      // Optional: Update event status to live
      await supabase.from('events').update({ status: 'live' }).eq('id', event.id);

      alert('Llaves generadas con éxito.');
      fetchEvents();
      
    } catch (err: any) {
      setError('Error al generar llaves: ' + err.message);
    }
    
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchEvents();
  };

  return (
    <div className="w-full text-white animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black uppercase tracking-wider text-casino-gold">Panel Administrativo</h2>
        <button 
          onClick={() => {
            setCurrentEvent({ title: '', description: '', rules: '', type: 'torneo', status: 'draft', entry_fee: 0, prize_pool: '', min_elo: 0, image_url: '', max_participants: 16 });
            setIsEditing(true);
          }}
          className="bg-casino-gold text-black px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition"
        >
          + Nuevo Evento
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 mb-8">
          <h3 className="text-xl font-bold mb-4">{currentEvent.id ? 'Editar Evento' : 'Crear Evento'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título</label>
                <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.title} onChange={e => setCurrentEvent({...currentEvent, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Premio (Texto)</label>
                <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.prize_pool} onChange={e => setCurrentEvent({...currentEvent, prize_pool: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.type} onChange={e => setCurrentEvent({...currentEvent, type: e.target.value as any})}>
                  <option value="torneo">Torneo</option>
                  <option value="liga">Liga</option>
                  <option value="especial">Especial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Estado</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.status} onChange={e => setCurrentEvent({...currentEvent, status: e.target.value as any})}>
                  <option value="draft">Borrador (Draft)</option>
                  <option value="upcoming">Próximo</option>
                  <option value="live">En Vivo</option>
                  <option value="completed">Finalizado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Costo de Entrada (Monedas)</label>
                <input type="number" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.entry_fee} onChange={e => setCurrentEvent({...currentEvent, entry_fee: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Máx. Participantes</label>
                <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.max_participants} onChange={e => setCurrentEvent({...currentEvent, max_participants: parseInt(e.target.value)})}>
                  <option value={8}>8 Jugadores</option>
                  <option value={16}>16 Jugadores</option>
                  <option value={32}>32 Jugadores</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ELO Mínimo</label>
                <input type="number" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.min_elo} onChange={e => setCurrentEvent({...currentEvent, min_elo: parseInt(e.target.value) || 0})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">URL Imagen (Opcional)</label>
                <input type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.image_url} onChange={e => setCurrentEvent({...currentEvent, image_url: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descripción</label>
                <textarea required rows={2} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={currentEvent.description} onChange={e => setCurrentEvent({...currentEvent, description: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Reglas del Evento</label>
                <textarea required rows={4} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm" placeholder="Ej: Las partidas duran 10 min. Eliminación directa..." value={currentEvent.rules} onChange={e => setCurrentEvent({...currentEvent, rules: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/10 transition">Cancelar</button>
              <button type="submit" className="px-6 py-2 rounded-lg text-sm font-bold bg-casino-gold text-black hover:bg-yellow-400 transition">Guardar Evento</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                  <th className="p-4 font-black">Título</th>
                  <th className="p-4 font-black">Tipo</th>
                  <th className="p-4 font-black">Estado</th>
                  <th className="p-4 font-black">Premio</th>
                  <th className="p-4 font-black text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Cargando eventos...</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay eventos creados.</td></tr>
                ) : (
                  events.map(ev => (
                    <tr key={ev.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold">{ev.title}</td>
                      <td className="p-4"><span className="bg-white/10 px-2 py-1 rounded text-xs">{ev.type}</span></td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          ev.status === 'live' ? 'text-red-400 bg-red-400/20' :
                          ev.status === 'upcoming' ? 'text-cyan-400 bg-cyan-400/20' :
                          ev.status === 'draft' ? 'text-gray-400 bg-gray-400/20' : 'text-green-400 bg-green-400/20'
                        }`}>{ev.status}</span>
                      </td>
                      <td className="p-4 text-sm text-gray-300">{ev.prize_pool}</td>
                      <td className="p-4 text-right space-x-2">
                        {ev.type === 'torneo' && (ev.status === 'upcoming' || ev.status === 'live') && (
                          <button onClick={() => handleGenerateBracket(ev)} className="text-xs bg-casino-gold/20 text-casino-gold hover:bg-casino-gold/40 px-3 py-1.5 rounded transition">
                            Generar Llaves
                          </button>
                        )}
                        <button onClick={() => {setCurrentEvent(ev); setIsEditing(true);}} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition">Editar</button>
                        <button onClick={() => handleDelete(ev.id)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/40 px-3 py-1.5 rounded transition">Eliminar</button>
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
