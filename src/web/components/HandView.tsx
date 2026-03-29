import React from 'react';
import { Player } from '../../domain/player';
import { DraggableCard } from './DraggableCard';
import { Card } from '../../domain/card';
import { CollectedCardsDeck } from './CollectedCardsDeck';

interface HandViewProps {
  player: Player;
  isCurrentTurn: boolean;
  selectedCardId: string | null;
  onCardClick: (card: Card) => void;
  isDealing?: boolean;
}

export function HandView({ player, isCurrentTurn, selectedCardId, onCardClick, isDealing }: HandViewProps) {
  // Cuando el jugador local se reconecta, si el server envía el estado sin "esconder" sus propias cartas
  // (ya que el index.ts clona el estado pero no oculta la mano del jugador a sí mismo),
  // a veces se pierde el tipo y React DnD falla. Verificamos que las cartas sean válidas.
  const hand = player.hand || [];

  return (
    <div className={`p-4 sm:p-6 rounded-3xl transition-colors backdrop-blur-md border flex gap-4 sm:gap-8 items-center ${isCurrentTurn ? 'bg-blue-900/30 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-black/20 border-white/10'}`}>
      
      <div className="flex-grow">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3 drop-shadow-md">
            {player.name}
            {isCurrentTurn && <span className="bg-gradient-to-r from-blue-500 to-blue-700 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full animate-pulse shadow-lg">Tu Turno</span>}
          </h3>
          <div className="text-xs sm:text-sm text-gray-200 bg-black/30 px-3 sm:px-4 py-2 rounded-full border border-white/10">
            Virados: <span className="font-bold text-yellow-400">{player.virados}</span>
          </div>
        </div>
        
        <div className="flex justify-start sm:justify-center gap-2 sm:gap-4 h-32 sm:h-40 overflow-x-auto px-1 sm:px-0 snap-x snap-mandatory">
          {hand.map((card, index) => {
            if (!card) return null;
            return (
              <div 
                key={card.id || `fallback-${index}`} 
                className={`relative ${isDealing ? 'animate-deal' : ''} snap-start`}
                style={{ animationDelay: isDealing ? `${index * 0.1}s` : '0s' }}
              >
                <DraggableCard
                  card={card}
                  selected={selectedCardId === card.id}
                  onClick={() => isCurrentTurn && onCardClick(card)}
                  disabled={!isCurrentTurn}
                />
              </div>
            );
          })}
          {hand.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-400 italic">
              Esperando cartas...
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center justify-center border-l border-white/10 pl-6 sm:pl-8">
        <CollectedCardsDeck player={player} />
      </div>
    </div>
  );
}
