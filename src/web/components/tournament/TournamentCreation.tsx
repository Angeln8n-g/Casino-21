import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { socketService } from '../../services/socket';

interface TournamentCreationProps {
  onCreated: (tournament: any) => void;
  onJoined: (tournament: any) => void;
}

export function TournamentCreation({ onCreated, onJoined }: TournamentCreationProps) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<4 | 8 | 16 | 32>(8);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Ingresa un nombre para el torneo'); return; }
    setLoading(true); setError('');
    try {
      const socket = await socketService.connect();
      socket.emit('create_tournament', { name, maxPlayers });
      socket.once('tournament_created', (t: any) => { setLoading(false); onCreated(t); });
      socket.once('error', (msg: string) => { setLoading(false); setError(msg); });
    } catch (e: any) { setLoading(false); setError(e.message); }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError('Ingresa el código del torneo'); return; }
    setLoading(true); setError('');
    try {
      const socket = await socketService.connect();
      socket.emit('join_tournament', { tournamentCode: joinCode.toUpperCase() });
      socket.once('tournament_joined', (t: any) => { setLoading(false); onJoined(t); });
      socket.once('error', (msg: string) => { setLoading(false); setError(msg); });
    } catch (e: any) { setLoading(false); setError(e.message); }
  };

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-8 max-w-md w-full">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-yellow-400" size={28} />
        <h2 className="text-2xl font-black text-white">Torneos</h2>
      </div>

      {error && <div className="bg-red-500/20 text-red-300 text-sm p-3 rounded-xl mb-4 border border-red-500/30">{error}</div>}

      {/* Crear torneo */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-3">Crear torneo</h3>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre del torneo"
          className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white text-sm mb-3 focus:outline-none focus:border-yellow-500"
        />
        <div className="flex gap-2 mb-3">
          {([4, 8, 16, 32] as const).map(n => (
            <button
              key={n}
              onClick={() => setMaxPlayers(n)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${maxPlayers === n ? 'bg-yellow-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:opacity-50 text-black font-black py-3 rounded-xl transition"
        >
          {loading ? 'Creando...' : 'Crear Torneo'}
        </button>
      </div>

      <div className="relative flex py-3 items-center">
        <div className="flex-grow border-t border-white/10" />
        <span className="mx-4 text-gray-500 text-xs font-bold">O ÚNETE</span>
        <div className="flex-grow border-t border-white/10" />
      </div>

      {/* Unirse */}
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Código (6 chars)"
          maxLength={6}
          className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono text-center focus:outline-none focus:border-blue-500 uppercase"
        />
        <button
          onClick={handleJoin}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-5 rounded-xl transition"
        >
          Unirse
        </button>
      </div>
    </div>
  );
}
