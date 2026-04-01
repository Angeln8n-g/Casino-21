import React, { useEffect, useState } from 'react';
import { Trophy, Users, Clock } from 'lucide-react';
import { socketService } from '../../services/socket';

interface TournamentLobbyProps {
  tournament: any;
  onStart: (tournament: any) => void;
}

export function TournamentLobby({ tournament: initial, onStart }: TournamentLobbyProps) {
  const [tournament, setTournament] = useState(initial);

  useEffect(() => {
    let socket: any;
    const setup = async () => {
      socket = await socketService.connect();
      socket.on('tournament_player_joined', ({ tournament: t }: any) => setTournament(t));
      socket.on('tournament_started', (t: any) => { setTournament(t); onStart(t); });
    };
    setup();
    return () => {
      if (socket) {
        socket.off('tournament_player_joined');
        socket.off('tournament_started');
      }
    };
  }, [onStart]);

  const progress = (tournament.current_players / tournament.max_players) * 100;

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-8 max-w-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="text-yellow-400" size={24} />
        <h2 className="text-xl font-black text-white">{tournament.name}</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">Código: <span className="font-mono text-yellow-400 font-bold">{tournament.code}</span></p>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400 flex items-center gap-1"><Users size={14} /> Jugadores</span>
          <span className="text-white font-bold">{tournament.current_players} / {tournament.max_players}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-blue-400 animate-pulse">
        <Clock size={16} />
        <span className="text-sm font-bold">El torneo iniciará automáticamente al completarse</span>
      </div>
    </div>
  );
}
