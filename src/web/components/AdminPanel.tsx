import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

import { TournamentBracket, TournamentMatch } from './TournamentBracket';
import { StoreAdmin } from './StoreAdmin';
import { QuestManager } from './QuestManager';
import { useAudio } from '../hooks/useAudio';

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
  audio_url?: string;
  board_theme_url?: string;
  participants_count: number;
  max_participants: number;
}

export function AdminPanel() {
  const { startUrlLoop, stopLoop } = useAudio();
  const [activeTab, setActiveTab] = useState<'events' | 'store' | 'quests'>('events');
  
  useEffect(() => {
    console.log('AdminPanel renderizado, pestaña activa:', activeTab);
  }, [activeTab]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Participants Modal State
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [currentEventParticipants, setCurrentEventParticipants] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Bracket Admin Modal State
  const [bracketModalOpen, setBracketModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<EventData | null>(null);
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<EventData>>({
    title: '', description: '', rules: '', type: 'torneo', status: 'draft', 
    entry_fee: 0, prize_pool: '', min_elo: 0, image_url: '', board_theme_url: '', max_participants: 16
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

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'boardTheme') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event_assets')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event_assets')
        .getPublicUrl(filePath);

      if (type === 'image') {
        setCurrentEvent({ ...currentEvent, image_url: publicUrl });
      } else if (type === 'audio') {
        setCurrentEvent({ ...currentEvent, audio_url: publicUrl });
      } else {
        setCurrentEvent({ ...currentEvent, board_theme_url: publicUrl });
      }
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
      
      // The UI expects the Final to ALWAYS be Round 4.
      // 32 players (5 rounds): 0, 1, 2, 3, 4
      // 16 players (4 rounds): 1, 2, 3, 4
      // 8 players (3 rounds): 2, 3, 4
      const startRound = 4 - totalRounds + 1;
      
      const matchesToInsert = [];
      let playerIndex = 0;

      for (let i = 0; i < totalRounds; i++) {
        const round = startRound + i;
        const matchesInRound = maxP / Math.pow(2, i + 1);
        
        for (let order = 1; order <= matchesInRound; order++) {
          let p1 = null;
          let p2 = null;
          
          // Only assign players in the first round played
          if (i === 0) {
            if (playerIndex < players.length) p1 = players[playerIndex++];
            if (playerIndex < players.length) p2 = players[playerIndex++];
          }
          
          matchesToInsert.push({
            event_id: event.id,
            round_number: round,
            match_order: order,
            player1_id: p1,
            player2_id: p2,
            status: i === 0 ? 'pending' : 'pending', // Only first round is ready conceptually, but we set all to pending initially
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

  const handleViewParticipants = async (eventId: string) => {
    setSelectedEventId(eventId);
    setParticipantsModalOpen(true);
    setParticipantsLoading(true);
    
    const { data, error } = await supabase
      .from('event_entries')
      .select('id, player_id, score, joined_at, profiles!inner(id, username, avatar_url, elo)')
      .eq('event_id', eventId);
      
    if (error) {
      console.error("Error fetching participants:", error);
      setError("Error al cargar participantes.");
    } else {
      setCurrentEventParticipants(data || []);
    }
    setParticipantsLoading(false);
  };

  const handleKickParticipant = async (entryId: string, playerName: string) => {
    if (!confirm(`¿Estás seguro de expulsar a ${playerName} del evento?`)) return;
    
    setParticipantsLoading(true);
    const { error } = await supabase.from('event_entries').delete().eq('id', entryId);
    
    if (error) {
      console.error("Error kicking participant:", error);
      alert("Error al expulsar jugador.");
    } else {
      // Update local state
      setCurrentEventParticipants(prev => prev.filter(p => p.id !== entryId));
      // Update main events table to reflect count change
      fetchEvents();
    }
    setParticipantsLoading(false);
  };

  const handleCloseEvent = async (event: EventData) => {
    if (!confirm(`¿Estás seguro de finalizar manualmente "${event.title}"?`)) return;
    setLoading(true);
    const { error } = await supabase.from('events').update({ status: 'completed' }).eq('id', event.id);
    if (error) setError(error.message);
    else fetchEvents();
    setLoading(false);
  };

  const handleAdminBracketView = async (event: EventData) => {
    setSelectedTournament(event);
    setBracketModalOpen(true);
    setMatchesLoading(true);

    if (event.audio_url) {
      startUrlLoop('event-bracket-audio', event.audio_url);
    }

    const { data, error } = await supabase
      .from('tournament_matches')
      .select(`
        id, round_number, match_order, status, winner_id,
        player1_id, player2_id, game_room_id
      `)
      .eq('event_id', event.id);

    if (error) {
      console.error('Error fetching matches:', error);
    } else if (data) {
      const playerIds = Array.from(new Set(data.flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean)));
      
      let profiles: Record<string, any> = {};
      if (playerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', playerIds);
          
        if (profilesData) {
          profilesData.forEach(p => {
            profiles[p.id] = p;
          });
        }
      }

      const mappedMatches: TournamentMatch[] = data.map(m => {
        const p1 = m.player1_id ? profiles[m.player1_id] : null;
        const p2 = m.player2_id ? profiles[m.player2_id] : null;
        
        return {
          id: m.id,
          round: m.round_number,
          position: m.match_order,
          player1: p1 ? { id: p1.id, name: p1.username || 'Desconocido', avatar: p1.avatar_url, isWinner: m.winner_id === p1.id } : null,
          player2: p2 ? { id: p2.id, name: p2.username || 'Desconocido', avatar: p2.avatar_url, isWinner: m.winner_id === p2.id } : null,
          status: m.status as any,
          game_room_id: m.game_room_id
        };
      });
      setTournamentMatches(mappedMatches);
    }
    
    setMatchesLoading(false);
  };

  const handleAdminMatchClick = async (match: TournamentMatch) => {
    // Only allow clicking matches that are not completed yet
    if (match.status === 'completed') return;

    const action = window.prompt(
      `Opciones para este encuentro:\n\n1 - Declarar ganador a: ${match.player1?.name || 'TBD'}\n2 - Declarar ganador a: ${match.player2?.name || 'TBD'}\n3 - Marcar "No Show" (Ambos pierden/Nulo)\n\nIngresa el número (1, 2 o 3):`
    );

    if (!action) return;

    let winnerId: string | null = null;
    let newStatus = 'completed';

    if (action === '1' && match.player1) {
      winnerId = match.player1.id;
    } else if (action === '2' && match.player2) {
      winnerId = match.player2.id;
    } else if (action === '3') {
      newStatus = 'no_show';
    } else {
      alert("Opción inválida o jugador no definido.");
      return;
    }

    setMatchesLoading(true);

    try {
      // Update the current match
      const { data: tMatch, error: updateError } = await supabase
        .from('tournament_matches')
        .update({ status: newStatus, winner_id: winnerId })
        .eq('id', match.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Advance the winner if there's one
      if (winnerId && tMatch && selectedTournament) {
        const nextRound = tMatch.round_number + 1;
        const nextOrder = Math.ceil(tMatch.match_order / 2);
        
        const { data: nextMatch } = await supabase
          .from('tournament_matches')
          .select('id, player1_id, player2_id')
          .eq('event_id', selectedTournament.id)
          .eq('round_number', nextRound)
          .eq('match_order', nextOrder)
          .single();
          
        if (nextMatch) {
          const updateData: any = {};
          if (tMatch.match_order % 2 !== 0) {
            updateData.player1_id = winnerId;
          } else {
            updateData.player2_id = winnerId;
          }
          
          await supabase
            .from('tournament_matches')
            .update(updateData)
            .eq('id', nextMatch.id);
        }
      }

      // Refresh bracket
      if (selectedTournament) {
        await handleAdminBracketView(selectedTournament);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error al actualizar llave: " + e.message);
      setMatchesLoading(false);
    }
  };

  return (
    <div className="w-full text-white animate-fade-in flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-black uppercase tracking-wider text-casino-gold">Panel Administrativo</h2>
        
        <div className="flex gap-2">
          <div className="bg-black/40 p-1 rounded-xl flex gap-1 border border-white/5 mr-4">
            <button 
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'events' ? 'bg-casino-gold/20 text-casino-gold' : 'text-gray-500 hover:text-white'
              }`}
            >
              Eventos
            </button>
            <button 
              onClick={() => setActiveTab('store')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'store' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              Tienda
            </button>
            <button 
              onClick={() => setActiveTab('quests')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'quests' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              Misiones
            </button>
          </div>

          {activeTab === 'events' && (
            <button 
              onClick={() => {
                setCurrentEvent({ title: '', description: '', rules: '', type: 'torneo', status: 'draft', entry_fee: 0, prize_pool: '', min_elo: 0, image_url: '', board_theme_url: '', max_participants: 16 });
                setIsEditing(true);
              }}
              className="bg-casino-gold text-black px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition whitespace-nowrap"
            >
              + Nuevo Evento
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl mb-6 shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {activeTab === 'events' ? (
          <>
            {/* Eventos Form / Table ... */}
            {isEditing ? (        <div className="glass-panel p-6 rounded-2xl border border-white/10 mb-8">
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
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Imagen del Evento</label>
                <div className="flex gap-2 items-center">
                  <input type="text" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="URL o subir archivo" value={currentEvent.image_url} onChange={e => setCurrentEvent({...currentEvent, image_url: e.target.value})} />
                  <label className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition-colors">
                    {isUploading ? '...' : '📁'}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} disabled={isUploading} />
                  </label>
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Audio del Evento (Llaves)</label>
                <div className="flex gap-2 items-center">
                  <input type="text" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="URL o subir archivo" value={currentEvent.audio_url || ''} onChange={e => setCurrentEvent({...currentEvent, audio_url: e.target.value})} />
                  <label className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition-colors">
                    {isUploading ? '...' : '🎵'}
                    <input type="file" className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} disabled={isUploading} />
                  </label>
                </div>
              </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tapete del Evento</label>
                  <div className="flex gap-2 items-center">
                    <input type="text" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="URL de textura del tapete" value={currentEvent.board_theme_url || ''} onChange={e => setCurrentEvent({...currentEvent, board_theme_url: e.target.value})} />
                    <label className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition-colors">
                      {isUploading ? '...' : '🧵'}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'boardTheme')} disabled={isUploading} />
                    </label>
                  </div>
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
                        <button onClick={() => handleViewParticipants(ev.id)} className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 px-3 py-1.5 rounded transition">
                          👥 {ev.participants_count}
                        </button>
                        {ev.type === 'torneo' && (ev.status === 'upcoming' || ev.status === 'live') && (
                          <>
                            <button onClick={() => handleGenerateBracket(ev)} className="text-xs bg-casino-gold/20 text-casino-gold hover:bg-casino-gold/40 px-3 py-1.5 rounded transition">
                              Generar Llaves
                            </button>
                            <button onClick={() => handleAdminBracketView(ev)} className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 px-3 py-1.5 rounded transition">
                              Admin Llaves
                            </button>
                          </>
                        )}
                        {ev.status === 'live' && (
                          <button onClick={() => handleCloseEvent(ev)} className="text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 px-3 py-1.5 rounded transition">
                            Finalizar
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

      {/* Participants Modal */}
      {participantsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setParticipantsModalOpen(false)}>
          <div className="glass-panel-strong w-full max-w-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 bg-slate-900/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xs font-bold text-casino-gold uppercase tracking-widest mb-1">Participantes Inscritos</h3>
                <h2 className="text-xl font-black text-white leading-tight">Gestión de Jugadores</h2>
              </div>
              <button 
                onClick={() => setParticipantsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {participantsLoading ? (
                <div className="text-center py-8 text-gray-500 font-bold uppercase tracking-widest animate-pulse">Cargando...</div>
              ) : currentEventParticipants.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-bold uppercase tracking-widest">No hay inscritos aún</div>
              ) : (
                <div className="space-y-2">
                  {currentEventParticipants.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                          {p.profiles.avatar_url ? (
                            <img src={p.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-gray-400">{p.profiles.username?.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{p.profiles.username}</div>
                          <div className="text-xs text-gray-400">ELO: {p.profiles.elo}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleKickParticipant(p.id, p.profiles.username)}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Expulsar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/10 bg-slate-900/50 shrink-0 text-right">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total: {currentEventParticipants.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Bracket Modal */}
      {bracketModalOpen && selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => {
          setBracketModalOpen(false);
          stopLoop('event-bracket-audio');
        }}>
          <div className="glass-panel-strong w-full max-w-7xl rounded-3xl border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col max-h-[95vh] relative bg-slate-950/80" onClick={e => e.stopPropagation()}>
            
            <div className="p-4 md:p-6 border-b border-white/10 bg-slate-900/50 flex justify-between items-center shrink-0 relative z-10">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Modo Administrador - Llaves</h3>
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight">{selectedTournament.title}</h2>
              </div>
              <button 
                onClick={() => {
                  setBracketModalOpen(false);
                  stopLoop('event-bracket-audio');
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto relative z-10">
              {matchesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-emerald-400 animate-pulse font-bold tracking-widest uppercase">Cargando llaves...</div>
                </div>
              ) : tournamentMatches.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400 font-bold tracking-widest uppercase">Las llaves aún no se han generado</div>
                </div>
              ) : (
                <TournamentBracket 
                  matches={tournamentMatches} 
                  title={selectedTournament.title} 
                  maxParticipants={selectedTournament.max_participants} 
                  onJoinMatch={handleAdminMatchClick}
                  currentUserId={null}
                  isAdmin={true}
                />
              )}
            </div>
            
            <div className="p-4 md:p-6 border-t border-white/10 bg-slate-900/50 shrink-0 relative z-10">
              <p className="text-xs text-emerald-400 mb-2">Haz clic en cualquier encuentro activo para declarar un ganador manualmente o marcar "No Show".</p>
              <button 
                onClick={() => {
                  setBracketModalOpen(false);
                  stopLoop('event-bracket-audio');
                }}
                className="w-full md:w-auto px-8 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-sm float-right"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
          </>
        ) : activeTab === 'store' ? (
          <StoreAdmin />
        ) : (
          <QuestManager />
        )}
      </div>
    </div>
  );
}
