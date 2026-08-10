import React, { useState, useMemo } from 'react';
import { GameState } from '../../../domain/game-state';

interface BotTutorialOverlayProps {
  gameState: GameState | null;
  localPlayerId: string | null;
  selectedHandCardId: string | null;
  selectedBoardCardIds: Set<string>;
  onClose?: () => void;
}

// Interfaz para los pasos del tutorial guiado
interface TutorialStep {
  title: string;
  icon: string;
  badge: string;
  description: string;
  bulletPoints: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '¡Bienvenido a Casino 21!',
    icon: '🏆',
    badge: 'Paso 1 de 5 · Objetivo',
    description: 'Tu objetivo es ser el primero en alcanzar 21 puntos acumulados a lo largo de varias rondas.',
    bulletPoints: [
      'Ganas puntos recolectando cartas de la mesa en cada turno.',
      'Al final de cada mazo, se cuentan las cartas, picas, Ases y cartas especiales.',
      'El primer jugador o equipo en llegar a 21 puntos se corona ganador.'
    ]
  },
  {
    title: 'El Tablero y Tus Cartas',
    icon: '🃏',
    badge: 'Paso 2 de 5 · Interfaz',
    description: 'En cada turno recibes 4 cartas en tu mano y hay cartas descubiertas en el centro de la mesa.',
    bulletPoints: [
      'Abajo: Tus 4 cartas de la mano.',
      'Centro: La mesa (board) con las cartas y sumatorias disponibles.',
      'Arriba: Las cartas y puntuación de tu oponente (Bot Fácil).'
    ]
  },
  {
    title: 'Cómo hacer tu Jugada',
    icon: '⚡',
    badge: 'Paso 3 de 5 · Acciones',
    description: 'Selecciona una carta de tu mano para activar los botones de acción:',
    bulletPoints: [
      '🎯 LLEVAR: Captura cartas del tablero de igual valor o que sumen el valor de tu carta.',
      '🧱 FORMAR: Combina cartas del tablero que sumen el valor de una carta en tu mano.',
      '👑 CANTAR AS: Si tienes 2 Ases en la mano, puedes colocar uno protegido.',
      '📥 COLOCAR: Si no puedes llevar ni formar, dejas una carta en la mesa.'
    ]
  },
  {
    title: 'Virados y Puntuación',
    icon: '✨',
    badge: 'Paso 4 de 5 · Puntos',
    description: '¡Capturar todas las cartas del tablero te otorga un Virado (+1 punto instantáneo)!',
    bulletPoints: [
      'Mayoría de cartas: +3 puntos al final de la ronda.',
      'Mayoría de picas ♠️: +1 punto.',
      '10 de diamantes ♦️: +2 puntos.',
      '2 de picas ♠️: +1 punto.',
      'Cada As capturado: +1 punto.'
    ]
  },
  {
    title: 'Asistente Táctico en Vivo',
    icon: '💡',
    badge: 'Paso 5 de 5 · Ayuda en Tiempo Real',
    description: 'En esta guía verás recomendaciones en vivo cuando sea tu turno.',
    bulletPoints: [
      'El asistente evaluará tus cartas y te dirá qué jugadas son posibles.',
      'Puedes minimizar o volver a abrir la guía cuando quieras.',
      '¡Practica contra Bot Fácil hasta dominar todas las combinaciones!'
    ]
  }
];

export function BotTutorialOverlay({
  gameState,
  localPlayerId,
  selectedHandCardId,
  selectedBoardCardIds,
  onClose
}: BotTutorialOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'tutorial' | 'live'>('live');

  // Determinar si es el turno del jugador local
  const isMyTurn = useMemo(() => {
    if (!gameState || !localPlayerId) return false;
    const currentPlayer = gameState.players[gameState.currentTurnPlayerIndex];
    return currentPlayer?.id === localPlayerId;
  }, [gameState, localPlayerId]);

  // Obtener jugador local y cartas
  const localPlayer = useMemo(() => {
    if (!gameState || !localPlayerId) return null;
    return gameState.players.find(p => p.id === localPlayerId) || null;
  }, [gameState, localPlayerId]);

  // Analizar sugerencia táctica en tiempo real para el turno actual
  const liveRecommendation = useMemo(() => {
    if (!gameState || !localPlayer || !isMyTurn) {
      return {
        type: 'wait',
        title: 'Turno del Bot',
        desc: 'El Bot Fácil está pensando su jugada. Observa las cartas que juega en el tablero.',
        icon: '🤖'
      };
    }

    const hand = localPlayer.hand || [];
    const boardCards = gameState.board?.cards || [];
    const formations = gameState.board?.formations || [];

    if (hand.length === 0) {
      return {
        type: 'info',
        title: 'Repartiendo cartas',
        desc: 'Esperando a la siguiente mano de la ronda...',
        icon: '🎴'
      };
    }

    // 1. Buscar coincidencias directas (Llevar)
    for (const handCard of hand) {
      const targetValue = handCard.value;
      const matchingBoardCard = boardCards.find(bc => bc.value === targetValue);
      if (matchingBoardCard) {
        return {
          type: 'llevar',
          title: `¡Puedes LLEVAR con tu ${handCard.rank}!`,
          desc: `Selecciona tu ${handCard.rank} y el ${matchingBoardCard.rank} de la mesa, luego presiona "LLEVAR" para capturarlo.`,
          icon: '🎯',
          suggestedHandCardId: handCard.id,
          suggestedBoardCardIds: [matchingBoardCard.id]
        };
      }
    }

    // 2. Buscar combinaciones de suma (Llevar con suma)
    for (const handCard of hand) {
      const targetValue = handCard.value;
      for (let i = 0; i < boardCards.length; i++) {
        for (let j = i + 1; j < boardCards.length; j++) {
          if (boardCards[i].value + boardCards[j].value === targetValue) {
            return {
              type: 'llevar_sum',
              title: `¡Puedes LLEVAR sumando ${targetValue}!`,
              desc: `Tu ${handCard.rank} es igual a (${boardCards[i].rank} + ${boardCards[j].rank} = ${targetValue}). Selecciona tu carta y esas dos de la mesa, luego presiona "LLEVAR".`,
              icon: '➕',
              suggestedHandCardId: handCard.id,
              suggestedBoardCardIds: [boardCards[i].id, boardCards[j].id]
            };
          }
        }
      }
    }

    // 3. Ver si se puede Cantar As (si tiene 2 o más Ases)
    const acesInHand = hand.filter(c => c.rank === 'A');
    if (acesInHand.length >= 2) {
      return {
        type: 'cantar',
        title: '¡Tienes 2 Ases!',
        desc: 'Puedes seleccionar un As y presionar "CANTAR AS" para colocarlo protegido en la mesa.',
        icon: '👑',
        suggestedHandCardId: acesInHand[0].id
      };
    }

    // 4. Formaciones existentes para capturar
    for (const handCard of hand) {
      const matchingFormation = formations.find(f => f.value === handCard.value);
      if (matchingFormation) {
        return {
          type: 'llevar_formation',
          title: `¡Captura la Formación de ${handCard.value}!`,
          desc: `Tu ${handCard.rank} coincide con la formación en el tablero. Selecciona tu carta y la formación, luego presiona "LLEVAR".`,
          icon: '🧱',
          suggestedHandCardId: handCard.id
        };
      }
    }

    // 5. Sugerencia por defecto: Colocar carta de menor valor
    const sortedHand = [...hand].sort((a, b) => a.value - b.value);
    const lowestCard = sortedHand[0];

    return {
      type: 'colocar',
      title: 'Colocar una carta en la mesa',
      desc: `No tienes capturas directas disponibles. Te recomendamos seleccionar tu carta de menor valor (${lowestCard.rank}) y presionar "COLOCAR".`,
      icon: '📥',
      suggestedHandCardId: lowestCard.id
    };
  }, [gameState, localPlayer, isMyTurn]);

  const step = TUTORIAL_STEPS[currentStepIndex];

  // Si está minimizado, mostrar botón compacto flotante
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[90] animate-bounce-short">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/90 to-yellow-500/90 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-2xl border border-amber-300/40 backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <span className="text-base">💡</span>
          <span>Guía Bot Fácil</span>
          {isMyTurn && (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-16 right-4 z-[90] w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-slate-950/95 border border-amber-500/30 rounded-2xl shadow-2xl backdrop-blur-2xl text-white overflow-hidden animate-fade-in transition-all">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent p-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 text-sm font-bold">
            💡
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Guía de Juego</h4>
            <p className="text-[10px] text-gray-400 font-medium">Modo Bot Fácil</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimizar"
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs text-gray-300 transition-colors"
          >
            ➖
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Cerrar guía"
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 flex items-center justify-center text-xs text-gray-300 hover:text-rose-400 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Mode Tabs: Asistente en vivo vs Paso a Paso */}
      <div className="flex border-b border-white/10 bg-slate-900/60 p-1 gap-1">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'live'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <span>🎯</span> Sugerencia en Vivo
          {isMyTurn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>

        <button
          onClick={() => setActiveTab('tutorial')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tutorial'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <span>📘</span> Reglas Paso a Paso
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-3.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {activeTab === 'live' ? (
          /* Live Tactical Assistant */
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-2xl shrink-0">{liveRecommendation.icon}</span>
              <div>
                <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  {liveRecommendation.title}
                </h5>
                <p className="text-xs text-gray-300 leading-relaxed mt-1">
                  {liveRecommendation.desc}
                </p>
              </div>
            </div>

            {/* Selection Guidance */}
            {isMyTurn && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <span>✨</span> Pasos sugeridos para tu turno:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px] leading-relaxed">
                  <li>
                    {selectedHandCardId ? (
                      <span className="text-emerald-300 font-semibold">✓ Carta de mano seleccionada</span>
                    ) : (
                      'Toca la carta en tu mano que deseas jugar.'
                    )}
                  </li>
                  <li>
                    {selectedBoardCardIds.size > 0 ? (
                      <span className="text-emerald-300 font-semibold">✓ Cartas de la mesa seleccionadas</span>
                    ) : (
                      'Si vas a llevar o formar, toca las cartas del tablero.'
                    )}
                  </li>
                  <li>Presiona la acción deseada en la barra inferior (Llevar, Formar o Colocar).</li>
                </ol>
              </div>
            )}
          </div>
        ) : (
          /* Step by Step Tutorial */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-amber-400/80">
              <span>{step.badge}</span>
              <span className="text-gray-500">{currentStepIndex + 1} / {TUTORIAL_STEPS.length}</span>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{step.icon}</span>
              <div>
                <h5 className="text-xs font-black text-white">{step.title}</h5>
                <p className="text-xs text-gray-300 leading-relaxed mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>

            <ul className="space-y-1.5 bg-white/5 border border-white/10 rounded-xl p-3">
              {step.bulletPoints.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-gray-300 leading-snug">
                  <span className="text-amber-400 shrink-0">•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="bg-slate-900/90 p-3 border-t border-white/10 flex items-center justify-between">
        {activeTab === 'tutorial' ? (
          <>
            <button
              onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs font-bold text-gray-300 transition-all"
            >
              ← Anterior
            </button>

            {/* Step indicators */}
            <div className="flex items-center gap-1">
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentStepIndex ? 'w-4 bg-amber-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
                  setCurrentStepIndex(prev => prev + 1);
                } else {
                  setActiveTab('live');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all"
            >
              {currentStepIndex === TUTORIAL_STEPS.length - 1 ? '¡Entendido!' : 'Siguiente →'}
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              {isMyTurn ? '🟢 Tu turno de actuar' : '⏳ Esperando al bot...'}
            </span>
            <button
              onClick={() => setActiveTab('tutorial')}
              className="text-[11px] text-amber-400 hover:underline font-bold"
            >
              Ver guía completa →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
