import React, { useEffect, useState } from 'react';
import { GameState } from '../../../domain/game-state';
import { CelebrationConfetti } from '../CelebrationConfetti';
import { Share2, Home, RotateCcw, Clock, Flag, Info, CheckCircle2, Crown } from 'lucide-react';

interface MatchCompletedScreenProps {
  gameState: GameState;
  showCelebration: boolean;
  celebrationSeed: number;
  localPlayerId?: string | null;
  statsData?: { eloChange: number; coinsEarned: number; xpGained: number; isWinner: boolean } | null;
  playerAvatarUrls?: Record<string, string | null>;
}

const handleBackToMenu = () => {
  localStorage.removeItem('casino21_roomId');
  window.location.reload();
};

const LaurelBranch = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <path d="M 50 90 Q 20 50 20 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M 45 80 Q 20 75 25 60 Q 40 65 45 80" />
    <path d="M 37 60 Q 10 55 15 40 Q 30 45 37 60" />
    <path d="M 30 40 Q 0 35 5 20 Q 20 25 30 40" />
    <path d="M 23 20 Q -5 15 0 0 Q 15 5 23 20" />
  </svg>
);

export function MatchCompletedScreen({
  gameState,
  showCelebration,
  celebrationSeed,
  localPlayerId,
  statsData,
  playerAvatarUrls,
}: MatchCompletedScreenProps) {
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('profile_updated'));
    window.dispatchEvent(new CustomEvent('coins_updated'));
    window.dispatchEvent(new CustomEvent('elo_updated'));
    
    import('../AdManager').then(({ showInterstitialAd }) => {
      showInterstitialAd();
    });
  }, []);

  const isPlayerWinner = (playerId: string): boolean => {
    if (!gameState.winnerId) return false;
    if (gameState.mode === '2v2') {
      const p = gameState.players.find(x => x.id === playerId);
      return p ? p.teamId === gameState.winnerId : false;
    }
    return playerId === gameState.winnerId;
  };

  const isLocalWinner = localPlayerId ? isPlayerWinner(localPlayerId) : false;

  const handleShare = async () => {
    try {
      const eloMagnitude = statsData ? Math.abs(statsData.eloChange) : 25;
      const winText = isLocalWinner ? `gané +${eloMagnitude} ELO` : `jugué una gran partida`;
      const textToShare = `¡Acabo de terminar una partida en Kasino21! ${winText}. ¡Únete a jugar en Kasino21!`;
      await navigator.clipboard.writeText(textToShare);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const winningPlayers = (() => {
    if (!gameState.winnerId) return [];
    if (gameState.mode === '2v2') {
      return gameState.players.filter(p => p.teamId === gameState.winnerId);
    }
    const singleWinner = gameState.players.find((p) => p.id === gameState.winnerId);
    return singleWinner ? [singleWinner] : [];
  })();

  const durationSeconds = Math.max(0, gameState.turnCount * 6);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationRemainder = durationSeconds % 60;
  const durationStr = `${String(durationMinutes).padStart(2, '0')}:${String(durationRemainder).padStart(2, '0')}`;

  const matchSides = gameState.mode === '2v2' 
    ? gameState.teams.map(t => ({
        id: t.id,
        name: gameState.players.filter(p => p.teamId === t.id).map(p => p.name).join(' & '),
        score: t.score,
        isWinner: t.id === gameState.winnerId,
        collected: t.collectedCards.length,
        virados: t.virados
      }))
    : gameState.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isWinner: p.id === gameState.winnerId,
        collected: p.collectedCards.length,
        virados: p.virados
      }));

  const matchTitle = (() => {
    if (!gameState.winnerId) return '¡EMPATE!';
    if (localPlayerId) return isLocalWinner ? '¡VICTORIA!' : '¡DERROTA!';
    return '¡PARTIDA TERMINADA!';
  })();

  return (
    <div
      className="flex flex-col items-center justify-start h-dvh text-center p-2 sm:p-6 md:p-8 bg-transparent relative z-10 overflow-x-hidden overflow-y-auto w-full"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <CelebrationConfetti active={showCelebration} seed={celebrationSeed} />

      <div className="bg-black/60 backdrop-blur-xl p-4 sm:p-6 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 shadow-2xl max-w-5xl w-full relative">
        
        {/* ENCABEZADO CON LAURELES */}
        <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 w-full">
          <div className="flex items-center justify-center gap-1 sm:gap-6 w-full">
            <LaurelBranch className="w-8 h-12 sm:w-16 sm:h-24 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] shrink-0" />
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter truncate">
              {matchTitle}
            </h1>
            <LaurelBranch className="w-8 h-12 sm:w-16 sm:h-24 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] transform -scale-x-100 shrink-0" />
          </div>
          
          <h2 className="text-[10px] sm:text-base text-gray-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-2 font-bold">
            {gameState.mode === '2v2' ? 'Batalla por Parejas' : 'Duelo Clásico'}
          </h2>
        </div>

        {/* PODIO Y ESTADÍSTICAS DEL GANADOR */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20 mb-10 md:mb-12 relative w-full">
          
          {/* Avatar Pedestal */}
          {winningPlayers.length > 0 && (
            <div className="relative flex justify-center items-center mt-4 sm:mt-6">
              {/* Resplandor */}
              <div className="absolute w-[150%] h-[150%] sm:w-[200%] sm:h-[200%] rounded-full bg-yellow-500/15 blur-2xl sm:blur-3xl -z-20 animate-pulse-slow" />
              
              {/* Estrellas flotantes */}
              <div className="absolute -left-4 sm:-left-16 top-0 sm:-top-4 text-yellow-300 animate-[bounce_3s_infinite] drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] z-10">
                <svg className="w-5 h-5 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" /></svg>
              </div>
              <div className="absolute -right-2 sm:-right-12 -bottom-2 sm:-bottom-4 text-amber-300 animate-[bounce_4s_infinite] drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] z-10">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" /></svg>
              </div>

              {/* Carta Izquierda (A Picas) */}
              <div className="absolute -left-6 sm:-left-20 top-2 sm:top-10 transform -rotate-[15deg] hover:scale-110 hover:-rotate-[5deg] transition-transform duration-300 shadow-2xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] animate-float z-20 pointer-events-auto">
                <div className="w-10 h-16 sm:w-20 sm:h-28 bg-white rounded flex flex-col justify-between p-0.5 sm:p-1.5 overflow-hidden border sm:border-2 border-slate-300">
                  <div className="text-black font-black text-[8px] sm:text-xs leading-none">A<br/>♠</div>
                  <div className="text-black text-sm sm:text-4xl self-center leading-none">♠️</div>
                  <div className="text-black font-black text-[8px] sm:text-xs leading-none self-end rotate-180">A<br/>♠</div>
                </div>
              </div>

              {/* Carta Derecha (A Diamantes) */}
              <div className="absolute -right-6 sm:-right-20 bottom-2 sm:bottom-10 transform rotate-[15deg] hover:scale-110 hover:rotate-[5deg] transition-transform duration-300 shadow-2xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] animate-float z-20 pointer-events-auto" style={{ animationDelay: '1s' }}>
                <div className="w-10 h-16 sm:w-20 sm:h-28 bg-white rounded flex flex-col justify-between p-0.5 sm:p-1.5 overflow-hidden border sm:border-2 border-slate-300">
                  <div className="text-red-600 font-black text-[8px] sm:text-xs leading-none">A<br/>♦</div>
                  <div className="text-red-600 text-sm sm:text-4xl self-center leading-none">♦️</div>
                  <div className="text-red-600 font-black text-[8px] sm:text-xs leading-none self-end rotate-180">A<br/>♦</div>
                </div>
              </div>

              {/* Avatares */}
              <div className="flex items-center justify-center gap-3 sm:gap-6 z-30">
                {winningPlayers.map((winner) => {
                  const winnerAvatar = playerAvatarUrls?.[winner.id] || null;
                  return (
                    <div key={winner.id} className="relative w-24 h-24 sm:w-36 sm:h-36 rounded-full p-1 sm:p-1.5 bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-600 shadow-[0_0_20px_rgba(251,191,36,0.6)] sm:shadow-[0_0_40px_rgba(251,191,36,0.6)] animate-glow-pulse border border-yellow-200">
                      <div className="absolute -inset-2 sm:-inset-3 rounded-full border border-dashed sm:border-2 border-yellow-500/40 animate-[spin_15s_linear_infinite]" />
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-900 bg-slate-950 relative">
                        {winnerAvatar ? (
                          <img src={winnerAvatar} alt={winner.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 text-2xl sm:text-3xl font-extrabold text-amber-400">
                            {winner.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cinta Dorada superpuesta (Ribbon) */}
              <div className="absolute -bottom-4 sm:-bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center w-[85%] max-w-[200px] sm:max-w-none sm:min-w-[240px]">
                <div className="absolute -left-2 sm:-left-3 top-1 sm:top-2 w-6 sm:w-8 h-6 sm:h-8 bg-amber-800 -z-10 transform -skew-x-[30deg] rounded-l" />
                <div className="absolute -right-2 sm:-right-3 top-1 sm:top-2 w-6 sm:w-8 h-6 sm:h-8 bg-amber-800 -z-10 transform skew-x-[30deg] rounded-r" />
                <div className="relative px-3 sm:px-6 py-1 sm:py-2 bg-gradient-to-b from-yellow-300 via-yellow-500 to-amber-600 shadow-xl border-y sm:border-y-2 border-yellow-200 text-center w-full whitespace-nowrap overflow-hidden text-ellipsis rounded-sm">
                   <span className="text-black font-black text-xs sm:text-lg uppercase tracking-widest drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] truncate block">
                     {winningPlayers.map(p => p.name).join(' & ')}
                   </span>
                </div>
              </div>
            </div>
          )}

          {/* Caja Lateral de ELO & Partida */}
          <div className="flex flex-col gap-3 sm:gap-4 w-full md:w-auto z-30 mt-6 md:mt-0">
            {/* ELO Card */}
            <div className="bg-slate-950/80 border border-yellow-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden backdrop-blur-md">
               <div className="flex gap-1 sm:gap-1.5 mb-2 sm:mb-3 text-yellow-400 drop-shadow-md">
                 {'⭐'.repeat(Math.min(5, Math.max(1, statsData?.eloChange && statsData.eloChange > 0 ? 5 : 3)))}
               </div>
               <span className="text-gray-400 text-[10px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-1">Ganancia de ELO</span>
               <span className={`text-3xl sm:text-5xl font-black drop-shadow-md ${statsData?.eloChange && statsData.eloChange < 0 ? 'text-red-400' : 'text-green-400'}`}>
                 {statsData?.eloChange && statsData.eloChange < 0 ? '-' : '+'}{statsData ? Math.abs(statsData.eloChange) : 25} ELO <span className="text-xl sm:text-3xl">{statsData?.eloChange && statsData.eloChange < 0 ? '▼' : '▲'}</span>
               </span>
            </div>

            {/* Duration & Rounds */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex-1 bg-slate-950/80 border border-white/5 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col items-center justify-center backdrop-blur-md">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 mb-1" />
                <span className="text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5">Duración</span>
                <span className="text-white font-black text-base sm:text-lg">{durationStr}</span>
              </div>
              <div className="flex-1 bg-slate-950/80 border border-white/5 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col items-center justify-center backdrop-blur-md">
                <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 mb-1" />
                <span className="text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5">Rondas</span>
                <span className="text-white font-black text-base sm:text-lg">{gameState.roundCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MARCADOR UNIFICADO */}
        <div className="w-full max-w-4xl mx-auto mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 opacity-80">
            <div className="h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent to-yellow-500/50 flex-1" />
            <span className="text-yellow-500 font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase text-[10px] sm:text-xs">Marcador</span>
            <div className="h-[1px] sm:h-[2px] bg-gradient-to-l from-transparent to-yellow-500/50 flex-1" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 bg-slate-950/60 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 py-3 sm:py-5 px-4 sm:px-10 shadow-inner">
             {matchSides[0] && (
               <div className="flex flex-col-reverse sm:flex-row items-center gap-1 sm:gap-5 flex-1 w-full justify-center sm:justify-end">
                 <span className="text-gray-300 font-bold text-xs sm:text-lg uppercase tracking-wider text-center sm:text-right truncate max-w-[120px] sm:max-w-none">{matchSides[0].name}</span>
                 <span className={`text-4xl sm:text-6xl font-black leading-none ${matchSides[0].isWinner ? 'text-yellow-400' : 'text-blue-400'}`}>{matchSides[0].score}</span>
               </div>
             )}
             
             <div className="text-white/20 font-black italic text-lg sm:text-3xl px-3 sm:px-4 py-1 sm:py-2 bg-black/40 rounded-lg sm:rounded-xl border border-white/5">VS</div>
             
             {matchSides[1] && (
               <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-5 flex-1 w-full justify-center sm:justify-start">
                 <span className={`text-4xl sm:text-6xl font-black leading-none ${matchSides[1].isWinner ? 'text-yellow-400' : 'text-rose-400'}`}>{matchSides[1].score}</span>
                 <span className="text-gray-300 font-bold text-xs sm:text-lg uppercase tracking-wider text-center sm:text-left truncate max-w-[120px] sm:max-w-none">{matchSides[1].name}</span>
               </div>
             )}
          </div>
        </div>

        {/* ESTADÍSTICAS Y RESUMEN */}
        <div className="w-full max-w-5xl mx-auto mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 opacity-80">
            <div className="h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent to-white/30 flex-1" />
            <span className="text-white font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase text-[10px] sm:text-xs">Estadísticas</span>
            <div className="h-[1px] sm:h-[2px] bg-gradient-to-l from-transparent to-white/30 flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {/* Columnas de Jugadores/Equipos */}
            {matchSides.map(side => (
              <div key={side.id} className="bg-slate-950/60 border border-white/5 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col shadow-lg backdrop-blur-sm hover:bg-slate-900/60 transition-colors">
                 <h4 className="text-center font-black text-sm sm:text-lg mb-4 sm:mb-6 text-white flex items-center justify-center gap-2 truncate">
                    {side.isWinner && <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 drop-shadow-md shrink-0" />}
                    <span className="truncate">{side.name}</span>
                 </h4>
                 
                 <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center py-2 sm:py-3 border-b border-white/[0.04]">
                       <span className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">Puntuación</span>
                       <span className="text-white font-black text-base sm:text-lg">{side.score}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 sm:py-3 border-b border-white/[0.04]">
                       <span className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">Cartas Recogidas</span>
                       <span className="text-cyan-400 font-black text-base sm:text-lg">{side.collected}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 sm:py-3 border-b border-transparent">
                       <span className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">Virados</span>
                       <span className="text-yellow-400 font-black text-base sm:text-lg">{side.virados}</span>
                    </div>
                 </div>
              </div>
            ))}

            {/* Columna Resumen (Timeline) */}
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col shadow-lg backdrop-blur-sm sm:col-span-2 md:col-span-1">
               <h4 className="text-center font-black text-sm sm:text-lg mb-4 sm:mb-6 text-white uppercase tracking-wider">Resumen</h4>
               
               <div className="flex flex-col gap-4 sm:gap-5 relative pl-2">
                  <div className="absolute left-[15px] sm:left-[19px] top-4 bottom-4 w-px bg-white/10" />

                  <div className="flex gap-3 sm:gap-4 relative items-center">
                     <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 border border-cyan-500/50 flex items-center justify-center z-10 shrink-0 shadow-lg">
                       <Info className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
                     </div>
                     <div className="flex flex-col overflow-hidden">
                       <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold truncate">Modalidad</span>
                       <span className="text-white text-xs sm:text-sm font-bold truncate">{gameState.mode === '2v2' ? 'Por Parejas (2v2)' : 'Clásico (1v1)'}</span>
                     </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4 relative items-center">
                     <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 border border-rose-500/50 flex items-center justify-center z-10 shrink-0 shadow-lg">
                       <Flag className="w-3 h-3 sm:w-4 sm:h-4 text-rose-400" />
                     </div>
                     <div className="flex flex-col overflow-hidden">
                       <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold truncate">Rondas Disputadas</span>
                       <span className="text-white text-xs sm:text-sm font-bold truncate">{gameState.roundCount} rondas</span>
                     </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4 relative items-center">
                     <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 border border-yellow-500/50 flex items-center justify-center z-10 shrink-0 shadow-lg">
                       <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                     </div>
                     <div className="flex flex-col overflow-hidden">
                       <span className="text-gray-500 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold truncate">Despliegue Final</span>
                       <span className="text-white text-xs sm:text-sm font-bold truncate">Partida Completada</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* RECOMPENSAS */}
        <div className="w-full max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 opacity-80">
            <div className="h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent to-yellow-500/50 flex-1" />
            <span className="text-yellow-500 font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase text-[10px] sm:text-xs">Recompensas</span>
            <div className="h-[1px] sm:h-[2px] bg-gradient-to-l from-transparent to-yellow-500/50 flex-1" />
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-12 md:gap-20">
             {/* Monedas */}
             <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 group">
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.3)] border border-yellow-300/40 transform group-hover:scale-110 group-hover:-translate-y-2 transition-all cursor-default">
                   <svg className="w-6 h-6 sm:w-10 sm:h-10 text-amber-950" viewBox="0 0 24 24" fill="currentColor">
                     <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                     <path d="M12 7v10M9 9h5a2 2 0 0 0 0-4h-5v8h5a2 2 0 0 1 0 4h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                   </svg>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-yellow-400 font-black text-base sm:text-2xl drop-shadow-sm">+{statsData ? statsData.coinsEarned : 250}</span>
                  <span className="text-gray-400 text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] font-bold">Monedas</span>
                </div>
             </div>
             
             {/* XP */}
             <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 group">
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-blue-500 via-cyan-400 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-cyan-300/40 transform group-hover:scale-110 group-hover:-translate-y-2 transition-all cursor-default">
                   <svg className="w-6 h-6 sm:w-10 sm:h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                   </svg>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-cyan-400 font-black text-base sm:text-2xl drop-shadow-sm">+{statsData ? statsData.xpGained : 35}</span>
                  <span className="text-gray-400 text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] font-bold">Exp</span>
                </div>
             </div>

             {/* Racha */}
             <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 group">
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-orange-600 via-red-500 to-yellow-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-orange-400/40 transform group-hover:scale-110 group-hover:-translate-y-2 transition-all cursor-default">
                   <svg className="w-6 h-6 sm:w-10 sm:h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2C12 2 19 6.5 19 12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12C5 6.5 12 2 12 2ZM12 6C12 6 8.5 9 8.5 12C8.5 13.93 10.07 15.5 12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 9 12 6 12 6Z" />
                   </svg>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-orange-400 font-black text-base sm:text-2xl drop-shadow-sm">+{statsData?.isWinner || isLocalWinner ? 1 : 0}</span>
                  <span className="text-gray-400 text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] font-bold">Racha</span>
                </div>
             </div>
          </div>
        </div>

        {/* BOTONERA (ACCIONES) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full mt-8 sm:mt-10">
           <button 
             onClick={handleBackToMenu} 
             className="flex-1 w-full flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-amber-950 px-4 sm:px-6 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-widest transition transform hover:-translate-y-1 shadow-[0_10px_20px_rgba(245,158,11,0.2)]"
           >
              <RotateCcw className="w-4 h-4 sm:w-6 sm:h-6" />
              <span>Revancha</span>
           </button>
           <button 
             onClick={handleBackToMenu} 
             className="flex-1 w-full flex items-center justify-center gap-2 sm:gap-3 bg-slate-800/80 hover:bg-slate-700 text-white px-4 sm:px-6 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-base uppercase tracking-widest transition transform hover:-translate-y-1 shadow-lg border border-white/10"
           >
              <Home className="w-4 h-4 sm:w-6 sm:h-6" />
              <span>Menú</span>
           </button>
           <button 
             onClick={handleShare} 
             className="flex-1 w-full flex items-center justify-center gap-2 sm:gap-3 bg-slate-800/80 hover:bg-slate-700 text-white px-4 sm:px-6 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-base uppercase tracking-widest transition transform hover:-translate-y-1 shadow-lg border border-white/10 relative"
           >
              <Share2 className="w-4 h-4 sm:w-6 sm:h-6" />
              <span>Compartir</span>
              
              {showCopiedToast && (
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-green-400 border border-green-500/50 text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.3)] whitespace-nowrap animate-bounce font-bold tracking-widest uppercase">
                   ¡Copiado!
                 </div>
              )}
           </button>
        </div>

      </div>
    </div>
  );
}
