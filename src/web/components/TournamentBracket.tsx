import React from 'react';

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar?: string;
  isWinner?: boolean;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number; // 1 to 8 for R1, 1 to 4 for R2, 1 to 2 for R3, 1 for R4
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  status: 'pending' | 'live' | 'completed';
  game_room_id?: string | null;
}

export interface TournamentBracketProps {
  matches: TournamentMatch[];
  title?: string;
  maxParticipants?: number;
  onJoinMatch?: (match: TournamentMatch) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
}

function MatchNode({ match, isLeft, isFinal, onJoinMatch, currentUserId, isAdmin }: { match?: TournamentMatch; isLeft: boolean; isFinal?: boolean; onJoinMatch?: (match: TournamentMatch) => void; currentUserId?: string | null; isAdmin?: boolean }) {
  if (!match) {
    return (
      <div className="w-32 md:w-40 h-16 border-2 border-white/10 rounded-lg bg-black/40 flex flex-col justify-center opacity-50 relative z-10">
        <div className="h-1/2 border-b border-white/10" />
      </div>
    );
  }

  const getPlayerClass = (p: TournamentPlayer | null) => {
    if (!p) return 'text-gray-600';
    if (match.status === 'completed') {
      return p.isWinner ? 'text-casino-gold font-bold' : 'text-gray-500 opacity-50 line-through';
    }
    return 'text-gray-200';
  };

  const getBoxClass = () => {
    if (match.status === 'live') return 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-red-950/20';
    if (match.status === 'completed') return 'border-white/20 bg-black/60';
    return 'border-white/10 bg-black/40';
  };

  const isPlayerInMatch = currentUserId && (match.player1?.id === currentUserId || match.player2?.id === currentUserId);
  const canJoin = (match.status === 'pending' || match.status === 'live') && isPlayerInMatch && match.player1 && match.player2;
  const isClickable = canJoin || (isAdmin && match.status !== 'completed');

  return (
    <div 
      className={`w-32 md:w-40 h-16 border-2 rounded-lg flex flex-col justify-center relative z-10 backdrop-blur-sm transition-all ${isClickable ? 'hover:scale-105 hover:border-casino-gold/50 cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.2)]' : ''} ${getBoxClass()}`}
      onClick={() => isClickable && onJoinMatch && onJoinMatch(match)}
    >
      {match.status === 'live' && (
        <div className="absolute -top-2 -right-2 w-4 h-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-slate-900"></span>
        </div>
      )}
      {canJoin && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-casino-gold text-black text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-[0_0_10px_rgba(234,179,8,0.8)] z-20 animate-pulse">
          ¡TU TURNO!
        </div>
      )}
      
      <div className="flex flex-col h-full text-xs">
        <div className={`flex-1 flex items-center px-2 border-b border-white/10 truncate ${getPlayerClass(match.player1)} gap-2`}>
          {match.player1 && (
            <div className="w-4 h-4 rounded-sm bg-casino-surface-light flex items-center justify-center text-[8px] border border-casino-gold/30 shrink-0 overflow-hidden">
              {match.player1.avatar ? (
                <img src={match.player1.avatar} alt="A" className="w-full h-full object-cover" />
              ) : (
                match.player1.name.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <span className="truncate">{match.player1?.name || 'TBD'}</span>
        </div>
        <div className={`flex-1 flex items-center px-2 truncate ${getPlayerClass(match.player2)} gap-2`}>
          {match.player2 && (
            <div className="w-4 h-4 rounded-sm bg-casino-surface-light flex items-center justify-center text-[8px] border border-casino-gold/30 shrink-0 overflow-hidden">
              {match.player2.avatar ? (
                <img src={match.player2.avatar} alt="A" className="w-full h-full object-cover" />
              ) : (
                match.player2.name.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <span className="truncate">{match.player2?.name || 'TBD'}</span>
        </div>
      </div>

      {/* Connectors (CSS Lines) */}
      {!isFinal && (
        <>
          <div className={`absolute top-1/2 w-4 md:w-6 border-t-2 border-white/20 ${isLeft ? '-right-4 md:-right-6' : '-left-4 md:-left-6'}`} />
        </>
      )}
    </div>
  );
}

export function TournamentBracket({ matches, title = "SOCCER CHAMPIONSHIP", maxParticipants = 16, onJoinMatch, currentUserId, isAdmin }: TournamentBracketProps) {
  // Helper to find a match by round and position
  const getMatch = (r: number, p: number) => matches.find(m => m.round === r && m.position === p);

  const renderMatchNode = (match: TournamentMatch | undefined, isLeft: boolean, isFinal = false) => (
    <MatchNode 
      match={match} 
      isLeft={isLeft} 
      isFinal={isFinal} 
      onJoinMatch={onJoinMatch} 
      currentUserId={currentUserId} 
      isAdmin={isAdmin}
    />
  );

  // Calculate structure based on maxParticipants
  const is8Player = maxParticipants === 8;
  const is32Player = maxParticipants === 32;

  return (
    <div className="w-full h-full overflow-auto pb-8 pt-4 custom-scrollbar flex justify-center md:items-start items-start">
      <div className="min-w-[800px] md:min-w-[1000px] flex flex-col items-center select-none font-sans mx-auto px-4">
        
        {/* Bracket Container */}
        <div className="flex justify-center items-stretch gap-6 md:gap-10 relative w-full px-4 mt-8">
          
          {/* LEFT SIDE */}
          <div className="flex gap-6 md:gap-10">
            {/* Round 0 (16avos) - Only for 32 players */}
            {is32Player && (
              <div className="flex flex-col justify-around gap-2 relative">
                {[...Array(8)].map((_, i) => (
                  <React.Fragment key={`r0-${i+1}`}>
                    {renderMatchNode(getMatch(0, i + 1), true)}
                  </React.Fragment>
                ))}
                {/* Vertical connectors */}
                {[...Array(4)].map((_, i) => (
                  <div key={`vconn0-${i}`} className="absolute border-r-2 border-white/20" style={{ top: `${(i * 25) + 6}%`, height: '13%', right: '-0.75rem' }} />
                ))}
                {/* Horizontal connectors */}
                {[...Array(4)].map((_, i) => (
                  <div key={`hconn0-${i}`} className="absolute border-t-2 border-white/20 w-3 md:w-5" style={{ top: `${(i * 25) + 12.5}%`, right: '-1.5rem' }} />
                ))}
              </div>
            )}

            {/* Round 1 (Octavos) - Only for 16 or 32 players */}
            {!is8Player && (
              <div className="flex flex-col justify-around gap-6 relative">
                {renderMatchNode(getMatch(1, 1), true)}
                {renderMatchNode(getMatch(1, 2), true)}
                {renderMatchNode(getMatch(1, 3), true)}
                {renderMatchNode(getMatch(1, 4), true)}
                {/* Vertical connectors for R1 -> R2 */}
                <div className="absolute border-r-2 border-white/20" style={{ top: '12%', height: '26%', right: '-0.75rem' }} />
                <div className="absolute border-r-2 border-white/20" style={{ top: '62%', height: '26%', right: '-0.75rem' }} />
                
                {/* Horizontal connect to R2 */}
                <div className="absolute border-t-2 border-white/20 w-3 md:w-5" style={{ top: '25%', right: '-1.5rem' }} />
                <div className="absolute border-t-2 border-white/20 w-3 md:w-5" style={{ top: '75%', right: '-1.5rem' }} />
              </div>
            )}
            
            {/* Round 2 (Cuartos) */}
            <div className={`flex flex-col justify-around ${is8Player ? 'gap-6 py-0' : 'gap-16 py-12'} relative`}>
              {renderMatchNode(getMatch(2, 1), true)}
              {renderMatchNode(getMatch(2, 2), true)}
              
              {/* Vertical connector to R3 */}
              <div className="absolute border-r-2 border-white/20" style={{ top: '25%', height: '50%', right: '-0.75rem' }} />
              {/* Horizontal connect to R3 */}
              <div className="absolute border-t-2 border-white/20 w-3 md:w-5" style={{ top: '50%', right: '-1.5rem' }} />
            </div>

            {/* Round 3 (Semis) */}
            <div className="flex flex-col justify-center relative py-24">
              {renderMatchNode(getMatch(3, 1), true)}
            </div>
          </div>

          {/* CENTER (FINAL) */}
          <div className="flex flex-col justify-center items-center relative z-20 mx-2 md:mx-4 mt-8 md:mt-16">
             <div className="mb-6 relative">
               <div className="absolute inset-0 bg-casino-gold/20 blur-xl rounded-full animate-pulse" />
               <span className="text-6xl md:text-8xl drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] relative z-10">🏆</span>
             </div>
             {renderMatchNode(getMatch(4, 1), false, true)}
             {/* Connectors from semis to final */}
             <div className="absolute top-[calc(50%+3rem)] md:top-[calc(50%+4rem)] -left-6 md:-left-10 w-6 md:w-10 border-t-2 border-white/20" />
             <div className="absolute top-[calc(50%+3rem)] md:top-[calc(50%+4rem)] -right-6 md:-right-10 w-6 md:w-10 border-t-2 border-white/20" />
          </div>

          {/* RIGHT SIDE */}
          <div className="flex gap-6 md:gap-10 flex-row-reverse">
            {/* Round 0 (16avos) - Only for 32 players */}
            {is32Player && (
              <div className="flex flex-col justify-around gap-2 relative">
                {[...Array(8)].map((_, i) => (
                  <React.Fragment key={`r0r-${i+9}`}>
                    {renderMatchNode(getMatch(0, i + 9), false)}
                  </React.Fragment>
                ))}
                {/* Vertical connectors */}
                {[...Array(4)].map((_, i) => (
                  <div key={`vconn0r-${i}`} className="absolute border-l-2 border-white/20" style={{ top: `${(i * 25) + 6}%`, height: '13%', left: '-0.75rem' }} />
                ))}
                {/* Horizontal connectors */}
                {[...Array(4)].map((_, i) => (
                  <div key={`hconn0r-${i}`} className="absolute border-t-2 border-white/20 w-3 md:w-5" style={{ top: `${(i * 25) + 12.5}%`, left: '-1.5rem' }} />
                ))}
              </div>
            )}

            {/* Round 1 (Octavos) */}
            {!is8Player && (
              <div className="flex flex-col justify-around gap-6 relative">
                {renderMatchNode(getMatch(1, 5), false)}
                {renderMatchNode(getMatch(1, 6), false)}
                {renderMatchNode(getMatch(1, 7), false)}
                {renderMatchNode(getMatch(1, 8), false)}
                {/* Vertical connectors */}
                <div className="absolute border-l-2 border-white/20" style={{ top: '12%', height: '26%', left: '-0.75rem' }} />
                <div className="absolute border-l-2 border-white/20" style={{ top: '62%', height: '26%', left: '-0.75rem' }} />
                
                {/* Horizontal connect to R2 */}
                <div className="absolute border-t-2 border-white/20 w-3 md:w-5" style={{ top: '25%', left: '-1.5rem' }} />
                <div className="absolute border-t-2 border-white/20 w-3 md:w-5" style={{ top: '75%', left: '-1.5rem' }} />
              </div>
            )}
            
            {/* Round 2 (Cuartos) */}
            <div className={`flex flex-col justify-around ${is8Player ? 'gap-6 py-0' : 'gap-16 py-12'} relative`}>
              {renderMatchNode(getMatch(2, 3), false)}
              {renderMatchNode(getMatch(2, 4), false)}
              
              {/* Vertical connector to R3 */}
              <div className="absolute border-l-2 border-white/20" style={{ top: '25%', height: '50%', left: '-0.75rem' }} />
              {/* Horizontal connect to R3 */}
              <div className="absolute border-t-2 border-white/20 w-3 md:w-5" style={{ top: '50%', left: '-1.5rem' }} />
            </div>

            {/* Round 3 (Semis) */}
            <div className="flex flex-col justify-center relative py-24">
              {renderMatchNode(getMatch(3, 2), false)}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
