import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDivisionFromElo } from './ProfileHeader';

interface SearchResult {
  id: string;
  username: string;
  avatar_url?: string | null;
  elo: number;
  level: number;
  wins: number;
  losses: number;
  xp: number;
}

type RelationshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected';

interface RelationshipMap {
  [userId: string]: RelationshipStatus;
}

export function FriendSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [relationships, setRelationships] = useState<RelationshipMap>({});
  const [selectedPlayer, setSelectedPlayer] = useState<SearchResult | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      setRelationships({});
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, elo, level, wins, losses, xp')
          .ilike('username', `%${query}%`)
          .neq('id', user.id)
          .limit(8);

        if (!error && data) {
          setResults(data);
          // Fetch relationship status for all results
          await fetchRelationships(data.map(d => d.id));
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, user]);

  const fetchRelationships = useCallback(async (playerIds: string[]) => {
    if (!user || playerIds.length === 0) return;

    try {
      // Fetch ALL friend_requests involving current user and any of these players
      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .or(
          playerIds.map(pid =>
            `and(sender_id.eq.${user.id},receiver_id.eq.${pid}),and(sender_id.eq.${pid},receiver_id.eq.${user.id})`
          ).join(',')
        );

      if (error) {
        console.error('Error fetching relationships:', error);
        return;
      }

      const map: RelationshipMap = {};
      for (const pid of playerIds) {
        map[pid] = 'none';
      }

      if (requests) {
        for (const req of requests) {
          const otherId = req.sender_id === user.id ? req.receiver_id : req.sender_id;
          if (req.status === 'accepted') {
            map[otherId] = 'accepted';
          } else if (req.status === 'pending') {
            map[otherId] = req.sender_id === user.id ? 'pending_sent' : 'pending_received';
          } else if (req.status === 'rejected') {
            // Allow re-sending after rejection
            map[otherId] = 'rejected';
          }
        }
      }

      setRelationships(map);
    } catch (err) {
      console.error('Relationship fetch error:', err);
    }
  }, [user]);

  const handleSendRequest = async (receiverId: string) => {
    if (!user || sendingRequest) return;
    setSendingRequest(true);
    setActionFeedback(null);

    try {
      // 1. Fresh thorough check (to avoid race conditions or stale state)
      const { data: existing, error: fetchError } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing relationship:', fetchError);
      }

      if (existing) {
        if (existing.status === 'accepted') {
          setRelationships(prev => ({ ...prev, [receiverId]: 'accepted' }));
          setActionFeedback({ id: receiverId, message: '¡Ya son amigos!', type: 'error' });
          setSendingRequest(false);
          return;
        }
        
        if (existing.status === 'pending') {
          if (existing.sender_id === user.id) {
            setRelationships(prev => ({ ...prev, [receiverId]: 'pending_sent' }));
            setActionFeedback({ id: receiverId, message: 'Solicitud ya enviada', type: 'error' });
            setSendingRequest(false);
            return;
          } else {
            // They sent us a request - auto-accept it!
            const { error: updateError } = await supabase
              .from('friend_requests')
              .update({ status: 'accepted', responded_at: new Date().toISOString() })
              .eq('id', existing.id);

            if (updateError) {
              setActionFeedback({ id: receiverId, message: 'Error al aceptar solicitud', type: 'error' });
            } else {
              setRelationships(prev => ({ ...prev, [receiverId]: 'accepted' }));
              setActionFeedback({ id: receiverId, message: '¡Ahora son amigos!', type: 'success' });
            }
            setSendingRequest(false);
            setSelectedPlayer(null);
            return;
          }
        }
        
        // If rejected, allow a fresh insert (the existing logic was deleting, but we can just update or insert)
        if (existing.status === 'rejected') {
          await supabase.from('friend_requests').delete().eq('id', existing.id);
        }
      }

      // 2. Insert the new friend request
      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint
          setActionFeedback({ id: receiverId, message: 'Solicitud ya existe', type: 'error' });
          setRelationships(prev => ({ ...prev, [receiverId]: 'pending_sent' }));
        } else {
          setActionFeedback({ id: receiverId, message: `Error: ${insertError.message}`, type: 'error' });
        }
        setSendingRequest(false);
        return;
      }

      // 3. Create notification for receiver
      try {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        const senderName = senderProfile?.username || 'Un jugador';

        await supabase
          .from('notifications')
          .insert({
            player_id: receiverId,
            type: 'friend_request',
            content: `${senderName} te ha enviado una solicitud de amistad.`,
            is_read: false,
            metadata: { sender_id: user.id, sender_username: senderName }
          });
      } catch (notifErr) {
        console.warn('Failed to send notification:', notifErr);
      }

      setRelationships(prev => ({ ...prev, [receiverId]: 'pending_sent' }));
      setActionFeedback({ id: receiverId, message: '¡Solicitud enviada!', type: 'success' });
      
      // Auto-refresh the parent panel if we have a listener (dispatch custom event)
      window.dispatchEvent(new CustomEvent('friendships_changed'));

      // Close modal on success
      setTimeout(() => setSelectedPlayer(null), 1500);

    } catch (err) {
      console.error('Send request error:', err);
      setActionFeedback({ id: receiverId, message: 'Error inesperado', type: 'error' });
    } finally {
      setSendingRequest(false);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const getButtonContent = (playerId: string) => {
    const status = relationships[playerId];
    switch (status) {
      case 'accepted':
        return { label: '✓ Amigos', disabled: true, className: 'bg-casino-emerald/20 text-casino-emerald border border-casino-emerald/30' };
      case 'pending_sent':
        return { label: 'Enviada', disabled: true, className: 'bg-casino-gold/20 text-casino-gold border border-casino-gold/30' };
      case 'pending_received':
        return { label: 'Aceptar', disabled: false, className: 'bg-casino-emerald/20 text-casino-emerald border border-casino-emerald/30 hover:bg-casino-emerald/30 animate-pulse' };
      default:
        return { label: null, disabled: false, className: 'bg-casino-surface-light text-gray-400 hover:text-white hover:bg-white/10' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugador..."
          className="input-casino w-full pl-9 text-sm"
        />
        <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {loading && <p className="text-center text-xs text-gray-500">Buscando...</p>}
        {!loading && query && results.length === 0 && (
          <p className="text-center text-xs text-gray-500">No se encontraron jugadores.</p>
        )}
        {results.map((r) => {
          const div = getDivisionFromElo(r.elo);
          const btn = getButtonContent(r.id);
          const feedback = actionFeedback?.id === r.id ? actionFeedback : null;
          const isHighLevel = r.level >= 20 || r.elo >= 1500;

          return (
            <div key={r.id} className="glass-panel px-3 py-2.5 flex items-center justify-between group relative">
              <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedPlayer(r)}>
                <div className="w-8 h-8 rounded-full bg-casino-surface-light flex items-center justify-center text-xs font-bold text-gray-300 shrink-0 overflow-hidden">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    r.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${isHighLevel ? 'text-casino-gold' : 'text-gray-200'}`}>
                    {r.username}
                  </p>
                  <div className={`division-badge ${div.cssClass} text-[8px] mt-0.5`}>
                    Lvl. {r.level} • {div.icon} {r.elo}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (relationships[r.id] === 'pending_received') {
                    handleSendRequest(r.id); // auto-accept
                  } else {
                    setSelectedPlayer(r); // open profile modal
                  }
                }}
                disabled={btn.disabled}
                className={`shrink-0 p-1.5 rounded-lg text-xs font-bold transition-all ${btn.className}`}
              >
                {btn.label || (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>

              {/* Inline feedback */}
              {feedback && (
                <div className={`absolute -bottom-6 left-0 right-0 text-center text-[10px] font-medium z-10 animate-fade-in ${
                  feedback.type === 'success' ? 'text-casino-emerald' : 'text-red-400'
                }`}>
                  {feedback.message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Profile Modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          relationshipStatus={relationships[selectedPlayer.id] || 'none'}
          onSendRequest={() => handleSendRequest(selectedPlayer.id)}
          onClose={() => setSelectedPlayer(null)}
          sending={sendingRequest}
          feedback={actionFeedback?.id === selectedPlayer.id ? actionFeedback : null}
        />
      )}
    </div>
  );
}

// ============================================================
// PROFILE MODAL COMPONENT
// ============================================================
interface PlayerProfileModalProps {
  player: SearchResult;
  relationshipStatus: RelationshipStatus;
  onSendRequest: () => void;
  onClose: () => void;
  sending: boolean;
  feedback: { message: string; type: 'success' | 'error' } | null;
}

function PlayerProfileModal({ player, relationshipStatus, onSendRequest, onClose, sending, feedback }: PlayerProfileModalProps) {
  const div = getDivisionFromElo(player.elo);
  const totalGames = player.wins + player.losses;
  const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;

  const getActionButton = () => {
    switch (relationshipStatus) {
      case 'accepted':
        return (
          <button disabled className="w-full py-3.5 rounded-xl bg-casino-emerald/20 text-casino-emerald font-bold text-sm border border-casino-emerald/30 cursor-default flex items-center justify-center gap-2">
            <span className="text-xl">✓</span> Ya son Amigos
          </button>
        );
      case 'pending_sent':
        return (
          <button disabled className="w-full py-3.5 rounded-xl bg-casino-gold/20 text-casino-gold font-bold text-sm border border-casino-gold/30 cursor-default flex items-center justify-center gap-2">
            <span className="animate-pulse">⏳</span> Solicitud Enviada
          </button>
        );
      case 'pending_received':
        return (
          <button
            onClick={onSendRequest}
            disabled={sending}
            className="w-full py-3.5 rounded-xl bg-casino-emerald text-white font-black text-sm hover:bg-casino-emerald/90 transition-all active:scale-[0.98] disabled:opacity-50 animate-pulse shadow-lg shadow-casino-emerald/20 flex items-center justify-center gap-2"
          >
            {sending ? 'Aceptando...' : '🤝 Aceptar Solicitud de Amistad'}
          </button>
        );
      default: // 'none' or 'rejected'
        return (
          <button
            onClick={onSendRequest}
            disabled={sending}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-casino-gold via-yellow-400 to-yellow-600 text-black font-black text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-casino-gold/30 flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Enviando...
              </>
            ) : (
              <>
                <span className="text-lg">✉️</span> Enviar Solicitud
              </>
            )}
          </button>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-sm rounded-[2rem] border border-white/[0.1] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(2,6,23,0.98) 100%)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 80px rgba(251,191,36,0.1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all z-20 group"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Banner with pattern */}
        <div className="h-28 bg-gradient-to-br from-casino-gold/30 via-transparent to-casino-emerald/20 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-casino-bg to-transparent" />
        </div>

        {/* Content */}
        <div className="px-8 pb-8 relative">
          {/* Avatar Area */}
          <div className="flex justify-center -mt-14 relative z-10 mb-4">
            <div className="relative">
              <div className={`w-28 h-28 rounded-3xl bg-casino-surface-light flex items-center justify-center text-4xl font-black border-4 border-casino-bg shadow-2xl transform hover:rotate-3 transition-transform duration-500 ${
                player.elo >= 1500 ? 'text-casino-gold' : 'text-gray-300'
              }`}>
                {player.username.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl border-4 border-casino-bg flex items-center justify-center shadow-lg ${div.cssClass}`}>
                <span className="text-sm">{div.icon}</span>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="text-center mb-6">
            <h3 className={`text-2xl font-black tracking-tight ${player.elo >= 1500 ? 'text-casino-gold' : 'text-white'}`}>
              {player.username}
            </h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">
              {div.name} Division
            </p>
          </div>

          {/* Core Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass-panel-light p-4 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Rango ELO</p>
              <p className="text-xl font-black text-white">{player.elo}</p>
            </div>
            <div className="glass-panel-light p-4 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Nivel Actual</p>
              <p className="text-xl font-black text-white">{player.level}</p>
            </div>
          </div>

          {/* Record Section */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] mb-8 bg-white/[0.01]">
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider">
              <span className="text-gray-500">Historial de Combate</span>
              <span className="text-casino-gold">{player.wins}W — {player.losses}L</span>
            </div>
            
            <div className="h-3 rounded-full bg-white/5 overflow-hidden flex mb-2 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-casino-emerald to-emerald-400 transition-all duration-1000"
                style={{ width: `${winRate}%` }}
              />
              <div className="h-full flex-1 bg-red-500/30" />
            </div>

            <div className="flex justify-between items-center mt-3">
              <span className="text-[10px] text-gray-600 font-medium">RENDIMIENTO GENERAL</span>
              <span className={`text-sm font-black ${winRate >= 50 ? 'text-casino-emerald' : 'text-red-400'}`}>
                {winRate}% WR
              </span>
            </div>
          </div>

          {/* Action area */}
          <div className="space-y-4">
            {getActionButton()}

            {feedback && (
              <div className={`p-3 rounded-xl text-center text-xs font-bold animate-slide-up border ${
                feedback.type === 'success' ? 'bg-casino-emerald/10 text-casino-emerald border-casino-emerald/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {feedback.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass-panel p-2.5 text-center">
      <div className="text-sm mb-0.5">{icon}</div>
      <div className="text-white font-bold text-sm">{value}</div>
      <div className="text-gray-500 text-[9px] uppercase tracking-wider">{label}</div>
    </div>
  );
}
