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
  prizePool?: string;
}

function MatchNode({ match, isLeft, isFinal, onJoinMatch, currentUserId, isAdmin }: { match?: TournamentMatch; isLeft: boolean; isFinal?: boolean; onJoinMatch?: (match: TournamentMatch) => void; currentUserId?: string | null; isAdmin?: boolean }) {
  if (!match) {
    return (
      <div className="w-40 md:w-48 h-20 md:h-24 border border-[#2A2A4A] rounded bg-[#0F0F23]/80 flex flex-col justify-center opacity-40 relative z-10">
        <div className="h-1/2 border-b border-[#2A2A4A]" />
      </div>
    );
  }

  const getPlayerClass = (p: TournamentPlayer | null) => {
    if (!p) return 'text-slate-600 font-mono';
    if (match.status === 'completed') {
      return p.isWinner ? 'text-[#00FFCC] font-bold text-shadow-[0_0_5px_rgba(0,255,204,0.5)]' : 'text-slate-500 opacity-60 line-through';
    }
    return 'text-slate-200';
  };

  const getBoxClass = () => {
    if (match.status === 'live') return 'border-[#FF0055]/70 shadow-[0_0_15px_rgba(255,0,85,0.4)] bg-[#FF0055]/10';
    if (match.status === 'completed') return 'border-[#7C3AED]/40 bg-[#0F0F23]/90';
    return 'border-[#2A2A4A] bg-[#0F0F23]/70 hover:border-[#7C3AED]/60';
  };

  const isPlayerInMatch = currentUserId && (match.player1?.id === currentUserId || match.player2?.id === currentUserId);
  const canJoin = (match.status === 'pending' || match.status === 'live') && isPlayerInMatch && match.player1 && match.player2;
  const isSpectatable = match.status === 'live' || (match.status === 'pending' && match.player1 && match.player2 && match.game_room_id);
  const isClickable = canJoin || isSpectatable || (isAdmin && match.status !== 'completed');

  return (
    <div 
      className={`w-40 md:w-48 h-20 md:h-24 border rounded flex flex-col justify-center relative z-10 backdrop-blur-sm transition-all duration-300 font-mono tracking-tight ${isClickable ? 'hover:scale-105 hover:-translate-y-1 hover:shadow-[0_5px_20px_rgba(124,58,237,0.4)] cursor-pointer' : ''} ${getBoxClass()}`}
      onClick={() => isClickable && onJoinMatch && onJoinMatch(match)}
    >
      {match.status === 'live' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 z-30">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0055] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF0055] shadow-[0_0_8px_#FF0055]"></span>
        </div>
      )}
      {canJoin ? (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#00FFCC] text-[#0F0F23] text-[9px] font-black uppercase px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(0,255,204,0.8)] z-20 animate-pulse tracking-widest border border-[#00FFCC]/50">
          TU TURNO
        </div>
      ) : isSpectatable ? (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#7C3AED] text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(124,58,237,0.6)] z-20 flex items-center gap-1 group-hover:bg-[#8B5CF6] transition-colors tracking-widest border border-[#A78BFA]/50">
          <span>👁️</span> VER
        </div>
      ) : null}
      
      <div className="flex flex-col h-full text-sm">
        <div className={`flex-1 flex items-center px-3 border-b border-[#2A2A4A] truncate ${getPlayerClass(match.player1)} gap-3 transition-colors`}>
          {match.player1 && (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-[#1A1A3A] flex items-center justify-center text-xs font-bold border border-[#7C3AED]/40 shrink-0 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
              {match.player1.avatar ? (
                <img src={match.player1.avatar} alt={match.player1.name} className="w-full h-full object-cover" />
              ) : (
                match.player1.name.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <span className="truncate">{match.player1?.name || 'TBD'}</span>
        </div>
        <div className={`flex-1 flex items-center px-3 truncate ${getPlayerClass(match.player2)} gap-3 transition-colors`}>
          {match.player2 && (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-[#1A1A3A] flex items-center justify-center text-xs font-bold border border-[#7C3AED]/40 shrink-0 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
              {match.player2.avatar ? (
                <img src={match.player2.avatar} alt={match.player2.name} className="w-full h-full object-cover" />
              ) : (
                match.player2.name.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <span className="truncate">{match.player2?.name || 'TBD'}</span>
        </div>
      </div>

      {/* Connectors (CSS Lines) Cyberpunk style */}
      {!isFinal && (
        <div className={`absolute top-1/2 w-4 md:w-6 border-t-2 ${match.status === 'completed' ? 'border-[#7C3AED] shadow-[0_0_5px_#7C3AED]' : 'border-[#2A2A4A]'} ${isLeft ? '-right-4 md:-right-6' : '-left-4 md:-left-6'} transition-colors duration-500`} />
      )}
    </div>
  );
}

export function TournamentBracket({ matches, title = "SOCCER CHAMPIONSHIP", maxParticipants = 16, onJoinMatch, currentUserId, isAdmin, prizePool }: TournamentBracketProps) {
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
    <div className="w-full h-full overflow-x-auto overflow-y-hidden pb-8 pt-4 custom-scrollbar flex md:justify-center justify-start items-start relative bg-[#0F0F23] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1A1A3A] via-[#0F0F23] to-black">
      {/* Grid Background Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.05)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="min-w-[800px] md:min-w-[1000px] flex flex-col items-center select-none font-sans mx-auto px-4 relative z-10">
        
        {/* Title/Header Area */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00FFCC] via-white to-[#7C3AED] drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]">
            {title}
          </h2>
          <div className="h-1 w-32 bg-gradient-to-r from-transparent via-[#FF0055] to-transparent mx-auto mt-2 opacity-70" />
        </div>

        {/* Bracket Container */}
        <div className="flex justify-center items-stretch gap-6 md:gap-10 relative w-full px-4 mt-4">
          
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
             <div className="mb-6 relative flex flex-col items-center">
               <div className="absolute inset-0 bg-casino-gold/20 blur-xl rounded-full animate-pulse" />
               <span className="text-6xl md:text-8xl drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] relative z-10 mb-2">🏆</span>
               {prizePool && (
                 <div className="bg-[#0F0F23]/80 border border-[#00FFCC]/50 px-4 py-1 rounded shadow-[0_0_15px_rgba(0,255,204,0.3)] backdrop-blur-sm z-10 animate-pulse mt-2">
                   <span className="text-[#00FFCC] font-bold text-sm tracking-widest uppercase">RECOMPENSA: {prizePool}</span>
                 </div>
               )}
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
