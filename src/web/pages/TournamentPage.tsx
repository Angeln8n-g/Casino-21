import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TournamentCreation } from '../components/tournament/TournamentCreation';
import { TournamentLobby } from '../components/tournament/TournamentLobby';
import { TournamentBracket } from '../components/tournament/TournamentBracket';

type TournamentView = 'create' | 'lobby' | 'bracket';

interface TournamentPageProps {
  onBack: () => void;
}

export function TournamentPage({ onBack }: TournamentPageProps) {
  const [view, setView] = useState<TournamentView>('create');
  const [tournament, setTournament] = useState<any>(null);

  const handleCreated = (t: any) => { setTournament(t); setView('lobby'); };
  const handleJoined = (t: any) => { setTournament(t); setView('lobby'); };
  const handleStarted = (t: any) => { setTournament(t); setView('bracket'); };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-16 sm:pt-4 relative z-10">
      <button
        onClick={onBack}
        className="absolute top-14 sm:top-4 left-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft size={18} /> Volver
      </button>

      {view === 'create' && (
        <TournamentCreation onCreated={handleCreated} onJoined={handleJoined} />
      )}
      {view === 'lobby' && tournament && (
        <TournamentLobby tournament={tournament} onStart={handleStarted} />
      )}
      {view === 'bracket' && tournament && (
        <div className="w-full max-w-4xl">
          <TournamentBracket
            tournamentId={tournament.id}
            bracket={tournament.bracket || []}
          />
        </div>
      )}
    </div>
  );
}
