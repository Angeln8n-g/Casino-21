import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDivisionFromElo } from './ProfileHeader';

interface SearchResult {
  id: string;
  username: string;
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
          .select('id, username, elo, level, wins, losses, xp')
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
      const currentStatus = relationships[receiverId];

      // Guard: already friends
      if (currentStatus === 'accepted') {
        setActionFeedback({ id: receiverId, message: '¡Ya son amigos!', type: 'error' });
        setSendingRequest(false);
        return;
      }

      // Guard: already sent
      if (currentStatus === 'pending_sent') {
        setActionFeedback({ id: receiverId, message: 'Solicitud ya enviada', type: 'error' });
        setSendingRequest(false);
        return;
      }

      // Guard: they already sent us a request — auto-accept it
      if (currentStatus === 'pending_received') {
        // Find the existing request and accept it
        const { data: existingReq } = await supabase
          .from('friend_requests')
          .select('id')
          .eq('sender_id', receiverId)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .single();

        if (existingReq) {
          const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted', responded_at: new Date().toISOString() })
            .eq('id', existingReq.id);

          if (updateError) {
            console.error('Error accepting existing request:', updateError);
            setActionFeedback({ id: receiverId, message: 'Error al aceptar', type: 'error' });
          } else {
            setRelationships(prev => ({ ...prev, [receiverId]: 'accepted' }));
            setActionFeedback({ id: receiverId, message: '¡Ahora son amigos!', type: 'success' });
          }
        }
        setSendingRequest(false);
        setSelectedPlayer(null);
        return;
      }

      // If previously rejected, delete the old row first so we can insert fresh
      if (currentStatus === 'rejected') {
        await supabase
          .from('friend_requests')
          .delete()
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
          .eq('status', 'rejected');
      }

      // Insert the new friend request
      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (insertError) {
        // Handle unique constraint violation 
        if (insertError.code === '23505') {
          setActionFeedback({ id: receiverId, message: 'Solicitud ya existe', type: 'error' });
          setRelationships(prev => ({ ...prev, [receiverId]: 'pending_sent' }));
        } else {
          console.error('Insert error:', insertError);
          setActionFeedback({ id: receiverId, message: `Error: ${insertError.message}`, type: 'error' });
        }
        setSendingRequest(false);
        setSelectedPlayer(null);
        return;
      }

      // Successfully inserted — Now create notification for receiver
      // Uses the REAL DB schema: player_id, type, content
      const senderProfile = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const senderName = senderProfile.data?.username || 'Un jugador';

      await supabase
        .from('notifications')
        .insert({
          player_id: receiverId,
          type: 'friend_request',
          content: `${senderName} te ha enviado una solicitud de amistad.`,
          is_read: false,
          metadata: { sender_id: user.id, sender_username: senderName }
        });

      setRelationships(prev => ({ ...prev, [receiverId]: 'pending_sent' }));
      setActionFeedback({ id: receiverId, message: '¡Solicitud enviada!', type: 'success' });
      setSelectedPlayer(null);

    } catch (err) {
      console.error('Send request error:', err);
      setActionFeedback({ id: receiverId, message: 'Error inesperado', type: 'error' });
    } finally {
      setSendingRequest(false);
      // Auto-clear feedback
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
                <div className="w-8 h-8 rounded-full bg-casino-surface-light flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                  {r.username.charAt(0).toUpperCase()}
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
          <button disabled className="w-full py-3 rounded-xl bg-casino-emerald/20 text-casino-emerald font-bold text-sm border border-casino-emerald/30 cursor-not-allowed">
            ✓ Ya son Amigos
          </button>
        );
      case 'pending_sent':
        return (
          <button disabled className="w-full py-3 rounded-xl bg-casino-gold/20 text-casino-gold font-bold text-sm border border-casino-gold/30 cursor-not-allowed">
            ⏳ Solicitud Enviada
          </button>
        );
      case 'pending_received':
        return (
          <button
            onClick={onSendRequest}
            disabled={sending}
            className="w-full py-3 rounded-xl bg-casino-emerald text-white font-bold text-sm hover:bg-casino-emerald/90 transition-all active:scale-[0.98] disabled:opacity-50 animate-pulse"
          >
            {sending ? 'Aceptando...' : '🤝 Aceptar Solicitud'}
          </button>
        );
      default: // 'none' or 'rejected'
        return (
          <button
            onClick={onSendRequest}
            disabled={sending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-casino-gold to-yellow-500 text-black font-bold text-sm hover:from-yellow-400 hover:to-casino-gold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-casino-gold/20"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Enviando...
              </span>
            ) : '✉️ Enviar Solicitud de Amistad'}
          </button>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(2,6,23,0.98) 100%)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 40px rgba(251,191,36,0.08)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Banner */}
        <div className="h-20 bg-gradient-to-r from-casino-gold/20 via-casino-emerald/10 to-casino-gold/20 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTIwIDBMMjAgNDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjxwYXRoIGQ9Ik0wIDIwTDQwIDIwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-10 relative z-10">
          <div className={`w-20 h-20 rounded-2xl bg-casino-surface-light flex items-center justify-center text-2xl font-black border-4 border-casino-bg shadow-xl ${
            player.elo >= 1500 ? 'text-casino-gold' : 'text-gray-300'
          }`}>
            {player.username.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Player Info */}
        <div className="px-6 pt-3 pb-5 space-y-4">
          {/* Name & Division */}
          <div className="text-center">
            <h3 className={`text-lg font-bold ${player.elo >= 1500 ? 'text-casino-gold' : 'text-white'}`}>
              {player.username}
            </h3>
            <div className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-xs font-semibold ${div.cssClass}`}>
              {div.icon} {div.name}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Nivel" value={`${player.level}`} icon="⭐" />
            <StatBox label="ELO" value={`${player.elo}`} icon="🏆" />
            <StatBox label="XP" value={player.xp >= 1000 ? `${(player.xp / 1000).toFixed(1)}k` : `${player.xp}`} icon="✨" />
          </div>

          {/* W/L Record */}
          <div className="glass-panel px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">Récord (W/L)</span>
              <span className="text-white text-sm font-bold">{player.wins}W / {player.losses}L</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-casino-emerald to-emerald-400 transition-all"
                  style={{ width: `${winRate}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${winRate >= 50 ? 'text-casino-emerald' : 'text-red-400'}`}>
                {winRate}%
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-2">
            {getActionButton()}

            {/* Feedback */}
            {feedback && (
              <p className={`text-center text-xs font-medium animate-fade-in ${
                feedback.type === 'success' ? 'text-casino-emerald' : 'text-red-400'
              }`}>
                {feedback.message}
              </p>
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
