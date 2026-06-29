import React, { useState, useEffect } from 'react';
import type { Card as CardType } from '../../../backend/src/game/blackjack';

interface CardProps {
  card: CardType;
}

export const Card: React.FC<CardProps> = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(card.hidden || false);

  useEffect(() => {
    // If card was hidden and now is revealed, trigger flip animation
    if (!card.hidden) {
      setIsFlipped(false);
    } else {
      setIsFlipped(true);
    }
  }, [card.hidden]);

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'H': return '♥';
      case 'D': return '♦';
      case 'C': return '♣';
      case 'S': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit: string) => {
    return (suit === 'H' || suit === 'D') ? 'text-red-500' : 'text-slate-800';
  };

  return (
    <div className="card-container w-16 h-24 md:w-20 md:h-28 shadow-lg rounded-lg select-none relative">
      <div className={`card-inner w-full h-full duration-500 transform-style-3d ${isFlipped ? 'card-flipped' : ''}`}>
        
        {/* Card Front */}
        <div className="card-front bg-white border border-slate-200 text-slate-900 p-2 flex flex-col justify-between absolute w-full h-full backface-hidden rounded-lg">
          {/* Top Left */}
          <div className="flex flex-col items-start leading-none">
            <span className="font-bold text-sm md:text-lg">{card.value}</span>
            <span className={`${getSuitColor(card.suit)} text-xs md:text-sm`}>{getSuitSymbol(card.suit)}</span>
          </div>

          {/* Center Suit */}
          <div className={`text-center ${getSuitColor(card.suit)} text-2xl md:text-4xl leading-none`}>
            {getSuitSymbol(card.suit)}
          </div>

          {/* Bottom Right */}
          <div className="flex flex-col items-end leading-none transform rotate-180">
            <span className="font-bold text-sm md:text-lg">{card.value}</span>
            <span className={`${getSuitColor(card.suit)} text-xs md:text-sm`}>{getSuitSymbol(card.suit)}</span>
          </div>
        </div>

        {/* Card Back */}
        <div className="card-back bg-gradient-to-br from-red-700 to-red-950 border-2 border-white flex items-center justify-center absolute w-full h-full backface-hidden rounded-lg shadow-inner">
          {/* Elegant geometric pattern */}
          <div className="w-[85%] h-[85%] border border-red-500/50 rounded flex items-center justify-center bg-red-900/20">
            <div className="text-red-400 text-xs font-serif uppercase tracking-widest text-center select-none font-bold opacity-75">
              ♠ ♥<br />♦ ♣
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Card;
