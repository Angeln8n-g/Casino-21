import React, { useEffect, useState } from 'react';
import { Trophy, Swords } from 'lucide-react';
import { socketService } from '../../services/socket';

interface Match {
  id: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id?: string;
  status: string;
  round_number: number;
}

interface Round {
  round_number: number;
  matches: Match[];
}

interface TournamentBracketProps {
  tournamentId: string;
  bracket: Round[];
}

export function TournamentBracket({ tournamentId, bracket: initialBracket }: TournamentBracketProps) {
  const [bracket, setBracket] = useState<Round[]>(initialBracket || []);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    let socket: any;
    const setup = async () => {
      socket = await socketService.connect();
      socket.on('tournament_match_ready', () => {
        socket.emit('get_tournament', { tournamentId });
      });
      socket.on('tournament_data', (t: any) => {
        if (t?.bracket) setBracket(t.bracket);
      });
      socket.on('tournament_completed', ({ winnerId }: any) => setWinner(winnerId));
    };
    setup();
    return () => {
      if (socket) {
        socket.off('tournament_match_ready');
        socket.off('tournament_data');
        socket.off('tournament_completed');
      }
    };
  }, [tournamentId]);

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-4 sm:p-6 overflow-x-auto">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <Trophy className="text-yellow-400" size={22} />
        <h2 className="text-lg sm:text-xl font-black text-white">Bracket del Torneo</h2>
      </div>

      {winner && (
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 text-center">
          <p className="text-yellow-400 font-black text-base sm:text-lg">🏆 Campeón: {winner}</p>
        </div>
      )}

      <div className="flex gap-4 sm:gap-8 min-w-max pb-2">
        {bracket.map(round => (
          <div key={round.round_number} className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest text-center font-bold mb-2">
              {round.round_number === bracket.length ? 'Final' : `Ronda ${round.round_number}`}
            </p>
            <div className="flex flex-col gap-6 justify-around h-full">
              {round.matches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isCompleted = match.status === 'completed';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden w-44">
      <PlayerSlot
        playerId={match.player1_id}
        isWinner={isCompleted && match.winner_id === match.player1_id}
      />
      <div className="flex items-center justify-center py-1 bg-white/5">
        <Swords size={12} className="text-gray-500" />
      </div>
      <PlayerSlot
        playerId={match.player2_id}
        isWinner={isCompleted && match.winner_id === match.player2_id}
      />
    </div>
  );
}

function PlayerSlot({ playerId, isWinner }: { playerId: string | null; isWinner: boolean }) {
  return (
    <div className={`px-3 py-2 text-sm font-medium truncate ${isWinner ? 'bg-yellow-600/30 text-yellow-300' : 'text-gray-300'} ${!playerId ? 'text-gray-600 italic' : ''}`}>
      {isWinner && '🏆 '}
      {playerId ? playerId.slice(0, 10) + '...' : 'Por definir'}
    </div>
  );
}
