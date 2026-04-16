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
    <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl transition-all backdrop-blur-md border flex flex-col md:flex-row gap-4 md:gap-8 items-center w-full max-w-full ${isCurrentTurn ? 'bg-cyan-900/25 border-cyan-300/50 shadow-[0_0_20px_rgba(34,211,238,0.25)]' : 'bg-black/25 border-white/10'}`}>
      
      <div className="flex-grow w-full">
        <div className="flex justify-between items-center mb-2 md:mb-4">
          <h3 className="text-base md:text-2xl font-bold flex items-center gap-2 md:gap-3 drop-shadow-md">
            {player.name}
            {isCurrentTurn && <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full animate-pulse shadow-lg">Tu Turno</span>}
          </h3>
          <div className="text-[10px] md:text-sm text-gray-100 bg-black/35 px-2 md:px-4 py-1 md:py-2 rounded-full border border-white/15">
            Virados: <span className="font-bold text-yellow-400">{player.virados}</span>
          </div>
        </div>
        
        <div className="flex justify-center gap-2 md:gap-4 h-[24vw] min-h-[4.5rem] max-h-[9rem] md:h-40 w-full overflow-visible">
          {hand.map((card, index) => {
            if (!card) return null;
            return (
              <div 
                key={card.id || `fallback-${index}`} 
                className={`relative ${isDealing ? 'animate-deal' : ''}`}
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
            <div className="h-full flex items-center justify-center text-xs md:text-sm text-gray-400 italic">
              Esperando cartas...
            </div>
          )}
        </div>
      </div>

      <div className="flex md:hidden w-full border-t border-white/10 pt-4 justify-center">
        <CollectedCardsDeck player={player} />
      </div>
      <div className="hidden md:flex flex-col items-center justify-center border-l border-white/10 pl-8">
        <CollectedCardsDeck player={player} />
      </div>
    </div>
  );
}
