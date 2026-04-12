import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

import { TournamentBracket, TournamentMatch } from './TournamentBracket';

interface EventData {
  id: string;
  title: string;
  description: string;
  rules: string;
  type: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: string;
  min_elo: number;
  image_url?: string;
  participants_count: number;
  max_participants: number;
}

const MOCK_EVENTS: EventData[] = [
  {
    id: 'mock-live-1',
    title: 'Torneo Relampago Neon',
    description: 'Compite en rondas rapidas 1v1 con recompensas inmediatas y clasificacion especial.',
    rules: 'Formato eliminacion directa. Mejor de 1 partida por ronda. Desempates por puntaje total.',
    type: 'torneo',
    status: 'live',
    start_date: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    entry_fee: 100,
    prize_pool: '10,000 Monedas + 500 XP',
    min_elo: 900,
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1600',
    participants_count: 24,
    max_participants: 32,
  },
  {
    id: 'mock-upcoming-1',
    title: 'Liga Cyber Elite',
    description: 'Escala posiciones durante una semana y gana recompensas por division.',
    rules: 'Sistema de puntos por victoria. 3 puntos por win, 1 por empate tecnico.',
    type: 'liga',
    status: 'upcoming',
    start_date: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    entry_fee: 250,
    prize_pool: '25,000 Monedas + Skin Exclusiva',
    min_elo: 1100,
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1600',
    participants_count: 12,
    max_participants: 64,
  },
  {
    id: 'mock-completed-1',
    title: 'Especial Fin de Semana',
    description: 'Evento tematico con bonus de XP y recompensas cosmeticas.',
    rules: 'Partidas por bloques horarios. Ranking final por mejor racha de victorias.',
    type: 'especial',
    status: 'completed',
    start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    entry_fee: 0,
    prize_pool: '5,000 Monedas + 1,000 XP',
    min_elo: 0,
    image_url: 'https://images.unsplash.com/photo-1603484477859-abe6a73f9366?auto=format&fit=crop&q=80&w=1600',
    participants_count: 48,
    max_participants: 48,
  },
];

function EventCard({ id, title, type, status, prize_pool, start_date, end_date, image_url, rules, max_participants, onViewRules, onViewBracket, onJoinEvent, isEnrolled, isLoading }: EventData & { onViewRules: (rules: string, title: string) => void, onViewBracket: (eventId: string, title: string, maxParticipants: number, imageUrl?: string) => void, onJoinEvent: (eventId: string, title: string, e: React.MouseEvent) => void, isEnrolled: boolean, isLoading: boolean }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    live: 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
    upcoming: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.5)]',
    completed: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  };

  const statusLabels: Record<string, string> = {
    draft: 'BORRADOR',
    live: 'EN VIVO',
    upcoming: 'PRÓXIMAMENTE',
    completed: 'FINALIZADO'
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-panel group relative overflow-hidden rounded-2xl border border-white/10 hover:border-white/30 transition-all cursor-pointer h-64 flex flex-col">
      {/* Background Image Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10" />
      <div 
        className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity bg-cover bg-center"
        style={{ backgroundImage: `url(${image_url || 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=800'})` }}
      />
      
      {/* Content */}
      <div className="relative z-20 p-5 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${statusColors[status] || statusColors.completed}`}>
            {statusLabels[status] || status}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-black/40 px-2 py-1 rounded-lg backdrop-blur-md">
            {type}
          </span>
        </div>

        <div>
          <h3 className="text-xl md:text-2xl font-black text-white mb-1 group-hover:text-casino-gold transition-colors">{title}</h3>
          <p className="text-sm text-gray-300 font-medium mb-3">
            {status === 'upcoming' ? `Inicia: ${formatDate(start_date)}` : 
             status === 'live' ? `Termina: ${formatDate(end_date)}` : 
             `Finalizó: ${formatDate(end_date)}`}
          </p>
          
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2 bg-black/50 w-fit px-3 py-2 rounded-xl border border-white/5">
              <span className="text-xs">🎁</span>
              <span className="text-xs font-bold text-casino-gold">{prize_pool}</span>
            </div>
            <div className="flex gap-2">
              {(status === 'upcoming' || status === 'live') && (
                <button 
                  onClick={(e) => onJoinEvent(id, title, e)}
                  disabled={isLoading}
                  className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg transition-colors border ${isEnrolled ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'text-black bg-casino-gold hover:bg-yellow-400 border-casino-gold'}`}
                >
                  {isLoading ? '...' : isEnrolled ? 'Inscrito' : 'Entrar Ahora'}
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewRules(rules, title);
                }}
                className="text-[10px] uppercase font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors border border-white/5"
              >
                Reglas
              </button>
              {(status === 'live' || status === 'completed') && type === 'torneo' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewBracket(id, title, max_participants, image_url);
                  }}
                  className="text-[10px] uppercase font-bold text-casino-gold hover:text-yellow-300 bg-casino-gold/10 hover:bg-casino-gold/20 px-3 py-1.5 rounded-lg transition-colors border border-casino-gold/30"
                >
                  Ver Llaves
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [events, setEvents] = useState<EventData[]>([]);
  const [userEntries, setUserEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [selectedRules, setSelectedRules] = useState({ title: '', content: '' });

  const [bracketModalOpen, setBracketModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedTournamentImage, setSelectedTournamentImage] = useState<string | undefined>('');
  const [selectedTournamentMaxParticipants, setSelectedTournamentMaxParticipants] = useState(16);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Modal de inscripción
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'success' | 'already_enrolled' | 'error'>('success');
  const [enrollmentEventTitle, setEnrollmentEventTitle] = useState('');

  const handleJoinMatch = (match: TournamentMatch) => {
    if (!match.game_room_id) {
      alert('La sala de juego aún no ha sido generada.');
      return;
    }
    
    // Close the bracket modal
    setBracketModalOpen(false);

    // Tell MainMenu (or the app) to join this room as a tournament
    window.dispatchEvent(new CustomEvent('join_game_from_invite', { 
      detail: { roomId: match.game_room_id, isTournament: true } 
    }));
  };
  const handleViewRules = (rules: string, title: string) => {
    setSelectedRules({ title, content: rules });
    setRulesModalOpen(true);
  };

  const handleViewBracket = async (eventId: string, title: string, maxParticipants: number, imageUrl?: string) => {
    setSelectedTournament(title);
    setSelectedTournamentMaxParticipants(maxParticipants || 16);
    setSelectedTournamentImage(imageUrl);
    setBracketModalOpen(true);
    setMatchesLoading(true);

    const { data, error } = await supabase
      .from('tournament_matches')
      .select(`
        id, round_number, match_order, status, winner_id,
        player1_id,
        player2_id,
        game_room_id
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching matches:', error);
    } else if (data) {
      // Need to fetch profiles separately because we have two foreign keys to the same table 
      // and Supabase RPC might be tricky to format.
      const playerIds = Array.from(new Set(data.flatMap(m => [m.player1_id, m.player2_id]).filter(Boolean)));
      
      let profiles: Record<string, any> = {};
      if (playerIds.length > 0) {
        console.log('Buscando perfiles para IDs:', playerIds);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', playerIds);
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }
          
        console.log('Perfiles encontrados:', profilesData);
          
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

  useEffect(() => {
    let isMounted = true;
    
    const fetchEventsAndEntries = async () => {
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .neq('status', 'draft') // Don't show drafts to users
          .order('start_date', { ascending: true });
          
        if (!isMounted) return;
          
        if (eventsError) {
          throw eventsError;
        } else if (eventsData && eventsData.length > 0) {
          setEvents(eventsData as EventData[]);
        } else {
          // Fase 1: mostrar una experiencia completa aunque la BD aun no este poblada.
          setEvents(MOCK_EVENTS);
        }

        if (user) {
          const { data: entriesData, error: entriesError } = await supabase
            .from('event_entries')
            .select('event_id')
            .eq('player_id', user.id);
            
          if (!isMounted) return;
            
          if (entriesError) throw entriesError;
            
          if (entriesData) {
            setUserEntries(entriesData.map(e => e.event_id));
          }
        }
      } catch (error: any) {
        if (!isMounted) return;
        const message = String(error?.message || '');
        if (error?.name === 'TypeError' && message.includes('Failed to fetch')) {
          setEvents(MOCK_EVENTS);
          return;
        }
        console.error('Error fetching events:', error);
        setEvents(MOCK_EVENTS);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEventsAndEntries();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleJoinEvent = async (eventId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('Debes iniciar sesión para unirte a un evento.');
      return;
    }

    setEnrollmentEventTitle(title);
    
    if (userEntries.includes(eventId)) {
      setEnrollmentStatus('already_enrolled');
      setEnrollmentModalOpen(true);
      return;
    }
    
    setActionLoading(eventId);
    const { error } = await supabase.from('event_entries').insert([
      { event_id: eventId, player_id: user.id }
    ]);
    
    if (error) {
      console.error(error);
      setEnrollmentStatus('error');
      setEnrollmentModalOpen(true);
    } else {
      setUserEntries([...userEntries, eventId]);
      // Update participant count optimistically
      setEvents(events.map(ev => ev.id === eventId ? { ...ev, participants_count: ev.participants_count + 1 } : ev));
      setEnrollmentStatus('success');
      setEnrollmentModalOpen(true);
    }
    setActionLoading(null);
  };

  const filteredEvents = events.filter(e => filter === 'all' || e.status === filter);
  
  // Find a featured event (preferably live, then upcoming)
  const featuredEvent = events.find(e => e.status === 'live') || events.find(e => e.status === 'upcoming');

  useEffect(() => {
    if (!featuredEvent) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [featuredEvent]);
  
  const formatCountdown = (targetDate: string) => {
    const diffMs = Math.max(0, new Date(targetDate).getTime() - now);
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400 uppercase tracking-widest font-bold animate-pulse">
        Cargando eventos...
      </div>
    );
  }



  return (
    <div className="w-full text-white animate-fade-in">
      {/* Hero Banner (Featured Event) */}
      {featuredEvent && (
        <div className="relative w-full h-72 md:h-96 rounded-3xl overflow-hidden mb-8 border border-casino-gold/30 shadow-[0_0_30px_rgba(234,179,8,0.15)] group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10" />
          <div 
            className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
            style={{ backgroundImage: `url(${featuredEvent.image_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1600'})` }}
          />
          
          <div className="relative z-20 h-full p-8 md:p-12 flex flex-col justify-center max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${featuredEvent.status === 'live' ? 'bg-red-400' : 'bg-cyan-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${featuredEvent.status === 'live' ? 'bg-red-500' : 'bg-cyan-500'}`}></span>
              </span>
              <span className={`${featuredEvent.status === 'live' ? 'text-red-400' : 'text-cyan-400'} font-bold tracking-widest text-sm`}>
                {featuredEvent.status === 'live' ? 'EN VIVO AHORA' : 'PRÓXIMAMENTE'}
              </span>
              <span className="px-3 py-1 rounded-lg border border-white/20 bg-black/40 text-gray-100 text-xs md:text-sm font-bold font-mono tracking-wider">
                {featuredEvent.status === 'live' ? 'TERMINA EN ' : 'INICIA EN '} {formatCountdown(featuredEvent.status === 'live' ? featuredEvent.end_date : featuredEvent.start_date)}
              </span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 leading-none">
              {featuredEvent.title}
            </h2>
            <p className="text-gray-300 text-sm md:text-base mb-8 max-w-md line-clamp-3">
              {featuredEvent.description}
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={(e) => handleJoinEvent(featuredEvent.id, featuredEvent.title, e)}
                disabled={actionLoading === featuredEvent.id}
                className={`px-8 py-3 rounded-xl uppercase tracking-wider font-black transition-all transform hover:-translate-y-1 shadow-[0_0_20px_rgba(234,179,8,0.4)]
                  ${userEntries.includes(featuredEvent.id) 
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-400 border border-green-500/30' 
                    : 'bg-gradient-to-r from-casino-gold to-yellow-600 hover:from-yellow-400 hover:to-casino-gold text-black'
                  }`}
              >
                {actionLoading === featuredEvent.id ? 'Cargando...' : userEntries.includes(featuredEvent.id) ? 'Ya Estás Inscrito' : 'Entrar Ahora'}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewRules(featuredEvent.rules, featuredEvent.title);
                }}
                className="glass-panel px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                Ver Reglas
              </button>
              {(featuredEvent.status === 'live' || featuredEvent.status === 'completed') && featuredEvent.type === 'torneo' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewBracket(featuredEvent.id, featuredEvent.title, featuredEvent.max_participants, featuredEvent.image_url);
                  }}
                  className="glass-panel border-casino-gold/50 text-casino-gold px-6 py-3 rounded-xl font-bold hover:bg-casino-gold/10 transition-colors"
                >
                  Ver Llaves
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="text-2xl font-black uppercase tracking-wider">Cartelera de Eventos</h3>
        
        <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'all' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('live')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            En Vivo
          </button>
          <button 
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'upcoming' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Próximos
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEvents.map((event, i) => (
          <EventCard 
            key={i} 
            {...event} 
            onViewRules={handleViewRules} 
            onViewBracket={handleViewBracket} 
            onJoinEvent={handleJoinEvent}
            isEnrolled={userEntries.includes(event.id)}
            isLoading={actionLoading === event.id}
          />
        ))}
      </div>
      
      {filteredEvents.length === 0 && (
        <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest">
          No hay eventos en esta categoría
        </div>
      )}

      {/* Rules Modal */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setRulesModalOpen(false)}>
          <div className="glass-panel-strong w-full max-w-lg rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 bg-slate-900/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xs font-bold text-casino-gold uppercase tracking-widest mb-1">Reglas del Evento</h3>
                <h2 className="text-2xl font-black text-white leading-tight">{selectedRules.title}</h2>
              </div>
              <button 
                onClick={() => setRulesModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto text-gray-300 whitespace-pre-wrap font-medium leading-relaxed">
              {selectedRules.content || 'No hay reglas especificadas para este evento.'}
            </div>
            
            <div className="p-6 border-t border-white/10 bg-slate-900/50 shrink-0">
              <button 
                onClick={() => setRulesModalOpen(false)}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bracket Modal */}
      {bracketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setBracketModalOpen(false)}>
          <div className="glass-panel-strong w-full max-w-7xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[95vh] relative bg-slate-950/80" onClick={e => e.stopPropagation()}>
            
            {/* Background Image with Blur */}
            {selectedTournamentImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-95 blur-md z-0"
                style={{ backgroundImage: `url(${selectedTournamentImage})` }}
              />
            )}

            <div className="p-4 md:p-6 border-b border-white/10 bg-slate-900/50 flex justify-between items-center shrink-0 relative z-10">
              <div>
                <h3 className="text-xs font-bold text-casino-gold uppercase tracking-widest mb-1">Llaves del Torneo</h3>
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight">{selectedTournament}</h2>
              </div>
              <button 
                onClick={() => setBracketModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto relative z-10">
              {matchesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-casino-gold animate-pulse font-bold tracking-widest uppercase">Cargando llaves...</div>
                </div>
              ) : tournamentMatches.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400 font-bold tracking-widest uppercase">Las llaves aún no se han generado</div>
                </div>
              ) : (
                <TournamentBracket 
                  matches={tournamentMatches} 
                  title={selectedTournament} 
                  maxParticipants={selectedTournamentMaxParticipants} 
                  onJoinMatch={handleJoinMatch}
                  currentUserId={user?.id}
                />
              )}
            </div>
            
            <div className="p-4 md:p-6 border-t border-white/10 bg-slate-900/50 shrink-0 relative z-10">
              <button 
                onClick={() => setBracketModalOpen(false)}
                className="w-full md:w-auto px-8 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-sm float-right"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Status Modal */}
      {enrollmentModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setEnrollmentModalOpen(false)}>
          <div className="glass-panel-strong w-full max-w-sm rounded-3xl border shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-8 text-center" 
               style={{ borderColor: enrollmentStatus === 'success' ? 'rgba(34,197,94,0.3)' : enrollmentStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)' }}
               onClick={e => e.stopPropagation()}>
            
            <div className="mb-6 flex justify-center">
              {enrollmentStatus === 'success' && (
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 text-4xl shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                  🎉
                </div>
              )}
              {enrollmentStatus === 'already_enrolled' && (
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/50 text-4xl shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  ✅
                </div>
              )}
              {enrollmentStatus === 'error' && (
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50 text-4xl shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  ❌
                </div>
              )}
            </div>

            <h2 className="text-2xl font-black text-white mb-2">
              {enrollmentStatus === 'success' ? '¡Inscripción Exitosa!' : 
               enrollmentStatus === 'already_enrolled' ? '¡Ya Estás Inscrito!' : 
               'Error de Inscripción'}
            </h2>
            
            <p className="text-gray-300 font-medium mb-8">
              {enrollmentStatus === 'success' ? `Te has inscrito correctamente en "${enrollmentEventTitle}". Prepárate para competir y mucha suerte.` : 
               enrollmentStatus === 'already_enrolled' ? `Ya te encuentras registrado en el evento "${enrollmentEventTitle}". ¡Tu lugar está asegurado!` : 
               `Ocurrió un error al intentar inscribirte en "${enrollmentEventTitle}". Es posible que el evento esté lleno.`}
            </p>

            <button 
              onClick={() => setEnrollmentModalOpen(false)}
              className={`w-full font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-sm
                ${enrollmentStatus === 'success' ? 'bg-green-500 text-black hover:bg-green-400' : 
                  enrollmentStatus === 'already_enrolled' ? 'bg-casino-gold text-black hover:bg-yellow-400' : 
                  'bg-red-500 text-white hover:bg-red-400'}`}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
