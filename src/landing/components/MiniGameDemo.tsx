import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../../web/hooks/useAudio';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, Trophy, Sparkles } from 'lucide-react';

interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
  value: number;
}

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 },
  { rank: 'A', value: 11 },
];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank: rank.rank, value: rank.value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function calculateScore(hand: Card[]): number {
  let score = hand.reduce((acc, card) => acc + card.value, 0);
  let aces = hand.filter(card => card.rank === 'A').length;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
}

export default function MiniGameDemo() {
  const { playSfx } = useAudio();
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'dealer-turn' | 'won' | 'lost' | 'tie'>('idle');
  const [betPlaced, setBetPlaced] = useState(false);

  const startNewGame = () => {
    playSfx('chipsClink');
    const newDeck = createDeck();
    const p1 = newDeck.pop()!;
    const d1 = newDeck.pop()!;
    const p2 = newDeck.pop()!;
    const d2 = newDeck.pop()!;

    setDeck(newDeck);
    setPlayerHand([p1, p2]);
    setDealerHand([d1, d2]);
    setBetPlaced(true);
    setGameStatus('playing');

    setTimeout(() => playSfx('cardDeal'), 100);
    setTimeout(() => playSfx('cardDeal'), 300);
  };

  const hit = () => {
    if (gameStatus !== 'playing') return;
    playSfx('cardPlay');
    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];
    
    setDeck(newDeck);
    setPlayerHand(newHand);

    const score = calculateScore(newHand);
    if (score > 21) {
      setGameStatus('lost');
      playSfx('defeat');
    }
  };

  const stand = () => {
    if (gameStatus !== 'playing') return;
    playSfx('chipsClink');
    setGameStatus('dealer-turn');
  };

  useEffect(() => {
    if (gameStatus !== 'dealer-turn') return;

    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];

    const dealerPlayLoop = () => {
      const score = calculateScore(currentDealerHand);
      if (score < 17) {
        playSfx('cardDeal');
        const newCard = currentDeck.pop()!;
        currentDealerHand.push(newCard);
        setDealerHand([...currentDealerHand]);
        setDeck([...currentDeck]);
        setTimeout(dealerPlayLoop, 600);
      } else {
        const playerScore = calculateScore(playerHand);
        const dealerScore = score;

        if (dealerScore > 21) {
          setGameStatus('won');
          playSfx('victory');
        } else if (playerScore > dealerScore) {
          setGameStatus('won');
          playSfx('victory');
        } else if (playerScore < dealerScore) {
          setGameStatus('lost');
          playSfx('defeat');
        } else {
          setGameStatus('tie');
          playSfx('chipsClink');
        }
      }
    };

    setTimeout(dealerPlayLoop, 600);
  }, [gameStatus]);

  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  return (
    <section className="py-24 px-6 relative bg-transparent overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-yellow-500/[0.02] rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(251,191,36,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(251,191,36,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 font-bold mb-2 font-['Chakra_Petch']">
            Pruébalo Ahora
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Demo interactiva de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">21</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch']">
            Juega una ronda rápida contra la IA antes de unirte a las mesas ranked reales.
          </p>
        </div>

        <div className="glass-cyber border border-yellow-500/15 rounded-3xl p-6 sm:p-8">
          {gameStatus === 'idle' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                <Trophy size={36} className="text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold font-['Russo_One'] text-white mb-2">¿Listo para desafiar a la mesa?</h3>
              <p className="text-gray-500 text-sm font-['Chakra_Petch'] mb-8 max-w-sm">
                Coloca tu apuesta virtual de 100 fichas y demuestra tu dominio del 21.
              </p>
              <button
                onClick={startNewGame}
                className="btn-gold flex items-center gap-2 px-10 py-4 text-base tracking-widest font-['Russo_One'] text-black shadow-[0_0_25px_rgba(251,191,36,0.35)]"
              >
                <Play size={18} fill="black" />
                APOSTAR Y JUGAR
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* DEALER FIELD */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-widest font-['Chakra_Petch']">Mesa (Crupier)</span>
                  <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-2.5 py-1 rounded-lg font-black font-['Russo_One'] shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                    SCORE: {gameStatus === 'playing' ? '?' : dealerScore}
                  </span>
                </div>

                <div className="bg-[#050811] border border-white/[0.03] rounded-2xl p-4 flex gap-4 min-h-[140px] items-center justify-center relative">
                  {/* Decorative felt pattern */}
                  <div className="absolute inset-0 bg-radial-felt pointer-events-none opacity-20" />
                  
                  <AnimatePresence>
                    {dealerHand.map((card, i) => {
                      const isHidden = gameStatus === 'playing' && i === 1;
                      const isRed = card.suit === '♥' || card.suit === '♦';
                      return (
                        <motion.div
                          key={`dealer-card-${i}-${card.rank}-${card.suit}`}
                          initial={{ opacity: 0, scale: 0.8, x: -100, rotate: -20 }}
                          animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.4, delay: i * 0.15 }}
                          className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl flex flex-col justify-between p-3 border relative overflow-hidden select-none ${
                            isHidden
                              ? 'bg-gradient-to-br from-yellow-600 via-amber-700 to-yellow-600 border-yellow-500/40 shadow-[0_0_15px_rgba(251,191,36,0.2)] animate-pulse'
                              : 'bg-black/75 text-white border-yellow-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)] backdrop-blur-md'
                          }`}
                        >
                          {isHidden ? (
                            <div className="absolute inset-0 flex items-center justify-center font-['Russo_One'] text-xl sm:text-2xl text-yellow-300/40">
                              K21
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start">
                                <span className="text-base sm:text-lg font-black leading-none text-yellow-400">{card.rank}</span>
                                <span className={`text-base sm:text-lg leading-none ${isRed ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'text-yellow-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'}`}>
                                  {card.suit}
                                </span>
                              </div>
                              <div className={`text-3xl sm:text-4xl self-center font-black ${isRed ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'}`}>
                                {card.suit}
                              </div>
                              <div className="flex justify-between items-end rotate-180">
                                <span className="text-base sm:text-lg font-black leading-none text-yellow-400">{card.rank}</span>
                                <span className={`text-base sm:text-lg leading-none ${isRed ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'text-yellow-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'}`}>
                                  {card.suit}
                                </span>
                              </div>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* GAME MIDBAR STATUS */}
              <div className="flex justify-center items-center h-8">
                {gameStatus === 'playing' && (
                  <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest animate-pulse font-['Chakra_Petch'] flex items-center gap-1.5">
                    <Sparkles size={12} /> Tu turno. ¿Pides carta o te plantas?
                  </span>
                )}
                {gameStatus === 'dealer-turn' && (
                  <span className="text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse font-['Chakra_Petch']">
                    El crupier está jugando...
                  </span>
                )}
                {gameStatus === 'won' && (
                  <span className="text-emerald-400 text-sm font-black uppercase tracking-widest font-['Russo_One'] flex items-center gap-1.5 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    🏆 ¡VICTORIA! GANAS +200 FICHAS
                  </span>
                )}
                {gameStatus === 'lost' && (
                  <span className="text-rose-500 text-sm font-black uppercase tracking-widest font-['Russo_One'] flex items-center gap-1.5 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                    <AlertTriangle size={14} /> ¡DERROTA! PIERDES LA APUESTA
                  </span>
                )}
                {gameStatus === 'tie' && (
                  <span className="text-gray-400 text-sm font-black uppercase tracking-widest font-['Russo_One'] flex items-center gap-1.5">
                    🤝 EMPATE. APUESTA DEVUELTA
                  </span>
                )}
              </div>

              {/* PLAYER FIELD */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-widest font-['Chakra_Petch']">Tu mano (Jugador)</span>
                  <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-2.5 py-1 rounded-lg font-black font-['Russo_One'] shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                    SCORE: {playerScore}
                  </span>
                </div>

                <div className="bg-[#050811] border border-white/[0.03] rounded-2xl p-4 flex gap-4 min-h-[140px] items-center justify-center relative">
                  <div className="absolute inset-0 bg-radial-felt pointer-events-none opacity-20" />

                  <AnimatePresence>
                    {playerHand.map((card, i) => {
                      const isRed = card.suit === '♥' || card.suit === '♦';
                      return (
                        <motion.div
                          key={`player-card-${i}-${card.rank}-${card.suit}`}
                          initial={{ opacity: 0, scale: 0.8, y: 100, rotate: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.4, delay: i * 0.15 }}
                          className="w-16 h-24 sm:w-20 sm:h-28 bg-black/75 text-white border border-cyan-500/30 rounded-xl flex flex-col justify-between p-3 relative shadow-[0_0_15px_rgba(56,189,248,0.15)] backdrop-blur-md select-none"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-base sm:text-lg font-black leading-none text-cyan-400">{card.rank}</span>
                            <span className={`text-base sm:text-lg leading-none ${isRed ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'text-cyan-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]'}`}>
                              {card.suit}
                            </span>
                          </div>
                          <div className={`text-3xl sm:text-4xl self-center font-black ${isRed ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]'}`}>
                            {card.suit}
                          </div>
                          <div className="flex justify-between items-end rotate-180">
                            <span className="text-base sm:text-lg font-black leading-none text-cyan-400">{card.rank}</span>
                            <span className={`text-base sm:text-lg leading-none ${isRed ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]' : 'text-cyan-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]'}`}>
                              {card.suit}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* GAME ACTIONS */}
              <div className="flex gap-4 justify-center items-center pt-2">
                {gameStatus === 'playing' ? (
                  <>
                    <button
                      onClick={hit}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs sm:text-sm font-black px-6 py-3.5 rounded-xl hover:scale-105 transition-all duration-300 font-['Russo_One'] tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                    >
                      PEDIR CARTA
                    </button>
                    <button
                      onClick={stand}
                      className="bg-white/10 border border-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-black px-6 py-3.5 rounded-xl hover:scale-105 transition-all duration-300 font-['Russo_One'] tracking-wider"
                    >
                      PLANTARSE
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startNewGame}
                    disabled={gameStatus === 'dealer-turn'}
                    className="btn-gold flex items-center gap-2 text-xs sm:text-sm tracking-wider font-['Russo_One'] text-black disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <RotateCcw size={14} /> JUGAR OTRA VEZ
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
