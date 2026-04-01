import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { socketService } from '../../services/socket';
import { Friend, useSocial } from '../../hooks/useSocial';

interface FriendsListProps {
  onChat?: (friend: Friend) => void;
}

export function FriendsList({ onChat }: FriendsListProps) {
  const { friends, removeFriend, sendGameInvitation } = useSocial();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const socket = await socketService.connect();
      socket.emit('search_players', { query: q });
      socket.once('players_search_results', (results: { id: string; username: string }[]) => {
        setSearchResults(results);
        setSearching(false);
      });
    } catch { setSearching(false); }
  };

  const handleSendRequest = async (receiverId: string) => {
    const socket = await socketService.connect();
    socket.emit('send_friend_request', { receiverId });
    setSearchResults([]);
    setSearchQuery('');
  };

  const online = friends.filter(f => f.status === 'online');
  const offline = friends.filter(f => f.status === 'offline');

  return (
    <div className="flex flex-col gap-4">
      {/* Búsqueda */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar jugadores..."
          className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
        />
        {searchResults.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-slate-800 border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl">
            {searchResults.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2 hover:bg-white/5">
                <span className="text-white text-sm">{r.username}</span>
                <button
                  onClick={() => handleSendRequest(r.id)}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg"
                >
                  Añadir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Online */}
      {online.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">En línea — {online.length}</p>
          {online.map(f => <FriendRow key={f.id} friend={f} onRemove={removeFriend} onInvite={sendGameInvitation} onChat={onChat} />)}
        </div>
      )}

      {/* Offline */}
      {offline.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Desconectado — {offline.length}</p>
          {offline.map(f => <FriendRow key={f.id} friend={f} onRemove={removeFriend} onInvite={sendGameInvitation} onChat={onChat} />)}
        </div>
      )}

      {friends.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-4">Aún no tienes amigos. ¡Busca jugadores arriba!</p>
      )}
    </div>
  );
}

function FriendRow({ friend, onRemove, onInvite, onChat }: {
  friend: Friend;
  onRemove: (id: string) => void;
  onInvite: (id: string) => void;
  onChat?: (friend: Friend) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/5 group">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${friend.status === 'online' ? 'bg-green-400' : 'bg-gray-600'}`} />
        <span className="text-white text-sm font-medium">{friend.username}</span>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onChat?.(friend)}
          className="text-xs bg-blue-600/60 hover:bg-blue-500 text-white px-2 py-1 rounded-lg"
          title="Chat"
        >
          <MessageSquare size={12} />
        </button>
        {friend.status === 'online' && (
          <button
            onClick={() => onInvite(friend.id)}
            className="text-xs bg-yellow-600/80 hover:bg-yellow-500 text-white px-2 py-1 rounded-lg"
          >
            Invitar
          </button>
        )}
        <button
          onClick={() => onRemove(friend.id)}
          className="text-xs bg-red-600/40 hover:bg-red-600/80 text-red-300 px-2 py-1 rounded-lg"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
