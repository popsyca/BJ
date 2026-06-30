import React, { useState, useEffect } from 'react';
import type { Card as CardType } from '../../../backend/src/game/blackjack';

interface CardProps {
  card: CardType;
}

interface PipPosition {
  x: number;
  y: number;
  size?: string;
  flip?: boolean;
}

export const Card: React.FC<CardProps> = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(card.hidden || false);

  useEffect(() => {
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
    return (suit === 'H' || suit === 'D') ? 'text-[#c62828]' : 'text-[#1c1c1c]';
  };

  const getPipPositions = (value: string): PipPosition[] => {
    switch (value) {
      case 'A': return [{ x: 50, y: 50, size: 'text-4xl md:text-5xl' }];
      case '2': return [
        { x: 50, y: 15 },
        { x: 50, y: 85, flip: true }
      ];
      case '3': return [
        { x: 50, y: 15 },
        { x: 50, y: 50 },
        { x: 50, y: 85, flip: true }
      ];
      case '4': return [
        { x: 25, y: 15 }, { x: 75, y: 15 },
        { x: 25, y: 85, flip: true }, { x: 75, y: 85, flip: true }
      ];
      case '5': return [
        { x: 25, y: 15 }, { x: 75, y: 15 },
        { x: 50, y: 50 },
        { x: 25, y: 85, flip: true }, { x: 75, y: 85, flip: true }
      ];
      case '6': return [
        { x: 25, y: 15 }, { x: 75, y: 15 },
        { x: 25, y: 50 }, { x: 75, y: 50 },
        { x: 25, y: 85, flip: true }, { x: 75, y: 85, flip: true }
      ];
      case '7': return [
        { x: 25, y: 15 }, { x: 75, y: 15 },
        { x: 50, y: 32.5 },
        { x: 25, y: 50 }, { x: 75, y: 50 },
        { x: 25, y: 85, flip: true }, { x: 75, y: 85, flip: true }
      ];
      case '8': return [
        { x: 25, y: 15 }, { x: 75, y: 15 },
        { x: 50, y: 32.5 },
        { x: 25, y: 50 }, { x: 75, y: 50 },
        { x: 50, y: 67.5, flip: true },
        { x: 25, y: 85, flip: true }, { x: 75, y: 85, flip: true }
      ];
      case '9': return [
        { x: 25, y: 15 }, { x: 75, y: 15 },
        { x: 25, y: 38.3 }, { x: 75, y: 38.3 },
        { x: 50, y: 50 },
        { x: 25, y: 61.6, flip: true }, { x: 75, y: 61.6, flip: true },
        { x: 25, y: 85, flip: true }, { x: 75, y: 85, flip: true }
      ];
      case '10': return [
        { x: 25, y: 15 }, { x: 75, y: 15 },
        { x: 50, y: 26.6 },
        { x: 25, y: 38.3 }, { x: 75, y: 38.3 },
        { x: 25, y: 61.6, flip: true }, { x: 75, y: 61.6, flip: true },
        { x: 50, y: 73.3, flip: true },
        { x: 25, y: 85, flip: true }, { x: 75, y: 85, flip: true }
      ];
      default: return [];
    }
  };

  const renderRoyaltyIllustration = (value: string, suit: string) => {
    // Generate a simple, stylized double-headed figure representing royalty (vintage style)
    const primaryColor = suit === 'H' || suit === 'D' ? '#c62828' : '#1c1c1c';
    const secondaryColor = '#eab308'; // Gold/Yellow
    const accentColor = suit === 'H' || suit === 'D' ? '#1565c0' : '#c62828'; // Contrasting Royal Blue or Red
    const skinTone = '#fde6cd';

    return (
      <svg className="w-full h-full" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#1c1c1c" strokeWidth="0.5">
          {/* Top Half */}
          <g>
            <rect x="15" y="0" width="30" height="40" fill={primaryColor} />
            <polygon points="15,40 45,40 45,10 30,25 15,10" fill={accentColor} />
            {/* Face */}
            <rect x="25" y="4" width="10" height="12" fill={skinTone} rx="2" />
            <circle cx="28" cy="8" r="0.8" fill="#1c1c1c" />
            <circle cx="32" cy="8" r="0.8" fill="#1c1c1c" />
            <path d="M 28 12 Q 30 14 32 12" stroke="#1c1c1c" fill="none" strokeWidth="0.5" />
            {/* Crown/Hair based on value */}
            {value === 'K' && (
              <path d="M 24 4 L 27 0 L 30 2 L 33 0 L 36 4 Z" fill={secondaryColor} />
            )}
            {value === 'Q' && (
              <path d="M 23 2 Q 30 -2 37 2 Q 30 8 23 2 Z" fill="#1c1c1c" />
            )}
            {value === 'J' && (
              <path d="M 24 2 L 30 0 L 36 2 L 34 6 L 26 6 Z" fill={secondaryColor} />
            )}
            {/* Weapon/Flower */}
            {value === 'K' && <line x1="20" y1="5" x2="20" y2="30" stroke="#1c1c1c" strokeWidth="1.5" />}
            {value === 'Q' && <circle cx="20" cy="15" r="2" fill="#e91e63" stroke="none" />}
            {value === 'J' && <path d="M 20 10 L 22 5 L 18 5 Z" fill="#1c1c1c" />}
          </g>
          
          {/* Bottom Half (Rotated) */}
          <g transform="rotate(180 30 40)">
            <rect x="15" y="0" width="30" height="40" fill={primaryColor} />
            <polygon points="15,40 45,40 45,10 30,25 15,10" fill={accentColor} />
            {/* Face */}
            <rect x="25" y="4" width="10" height="12" fill={skinTone} rx="2" />
            <circle cx="28" cy="8" r="0.8" fill="#1c1c1c" />
            <circle cx="32" cy="8" r="0.8" fill="#1c1c1c" />
            <path d="M 28 12 Q 30 14 32 12" stroke="#1c1c1c" fill="none" strokeWidth="0.5" />
            {/* Crown/Hair based on value */}
            {value === 'K' && (
              <path d="M 24 4 L 27 0 L 30 2 L 33 0 L 36 4 Z" fill={secondaryColor} />
            )}
            {value === 'Q' && (
              <path d="M 23 2 Q 30 -2 37 2 Q 30 8 23 2 Z" fill="#1c1c1c" />
            )}
            {value === 'J' && (
              <path d="M 24 2 L 30 0 L 36 2 L 34 6 L 26 6 Z" fill={secondaryColor} />
            )}
            {/* Weapon/Flower */}
            {value === 'K' && <line x1="20" y1="5" x2="20" y2="30" stroke="#1c1c1c" strokeWidth="1.5" />}
            {value === 'Q' && <circle cx="20" cy="15" r="2" fill="#e91e63" stroke="none" />}
            {value === 'J' && <path d="M 20 10 L 22 5 L 18 5 Z" fill="#1c1c1c" />}
          </g>
          
          {/* Diagonal separator line */}
          <line x1="15" y1="0" x2="45" y2="80" stroke="#1c1c1c" strokeWidth="0.5" />
        </g>
      </svg>
    );
  };

  return (
    <div className="card-container w-16 h-24 md:w-20 md:h-28 shadow-xl rounded select-none relative">
      <div className={`card-inner w-full h-full duration-500 transform-style-3d ${isFlipped ? 'card-flipped' : ''}`}>
        
        {/* Card Front (Vintage Ivory with Swirl Border) */}
        <div className="card-front bg-[#f2e5d3] text-[#1c1c1c] flex flex-col justify-between absolute w-full h-full backface-hidden rounded overflow-hidden">
          
          {/* Vintage Swirl Border SVG overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none p-[2px] md:p-[3px]">
            <svg className="w-full h-full" viewBox="0 0 100 140" fill="none" preserveAspectRatio="none">
              <rect x="4" y="4" width="92" height="132" rx="3" stroke="#5c5040" strokeWidth="0.8" />
              {/* Corner embellishments mimicking the image */}
              {/* Top-left loop */}
              <circle cx="8" cy="8" r="1.5" fill="#f2e5d3" stroke="#5c5040" strokeWidth="0.6" />
              <path d="M 4 8 Q 8 8 8 4" fill="none" stroke="#5c5040" strokeWidth="0.8" />
              {/* Top-right loop */}
              <circle cx="92" cy="8" r="1.5" fill="#f2e5d3" stroke="#5c5040" strokeWidth="0.6" />
              <path d="M 96 8 Q 92 8 92 4" fill="none" stroke="#5c5040" strokeWidth="0.8" />
              {/* Bottom-left loop */}
              <circle cx="8" cy="132" r="1.5" fill="#f2e5d3" stroke="#5c5040" strokeWidth="0.6" />
              <path d="M 4 132 Q 8 132 8 136" fill="none" stroke="#5c5040" strokeWidth="0.8" />
              {/* Bottom-right loop */}
              <circle cx="92" cy="132" r="1.5" fill="#f2e5d3" stroke="#5c5040" strokeWidth="0.6" />
              <path d="M 96 132 Q 92 132 92 136" fill="none" stroke="#5c5040" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Top Left Index */}
          <div className="absolute top-[4px] left-[6px] md:top-[6px] md:left-[8px] flex flex-col items-center leading-none z-10">
            <span className="font-serif font-bold text-[10px] md:text-sm">{card.value}</span>
            <span className={`${getSuitColor(card.suit)} text-[7px] md:text-[9px] -mt-[1px]`}>{getSuitSymbol(card.suit)}</span>
          </div>

          {/* Center Content */}
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            {['J', 'Q', 'K'].includes(card.value) ? (
              <div className="w-[50%] h-[60%] border-[0.5px] border-[#1c1c1c] bg-[#f2e5d3] overflow-hidden">
                {renderRoyaltyIllustration(card.value, card.suit)}
              </div>
            ) : (
              <div className="relative w-[50%] h-[65%]">
                {getPipPositions(card.value).map((pos, idx) => (
                  <span
                    key={`pip-${idx}`}
                    className={`absolute ${getSuitColor(card.suit)} ${pos.size || 'text-[13px] md:text-[18px]'} leading-none select-none`}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: `translate(-50%, -50%) ${pos.flip ? 'rotate(180deg)' : ''}`
                    }}
                  >
                    {getSuitSymbol(card.suit)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Right Index */}
          <div className="absolute bottom-[4px] right-[6px] md:bottom-[6px] md:right-[8px] flex flex-col items-center leading-none transform rotate-180 z-10">
            <span className="font-serif font-bold text-[10px] md:text-sm">{card.value}</span>
            <span className={`${getSuitColor(card.suit)} text-[7px] md:text-[9px] -mt-[1px]`}>{getSuitSymbol(card.suit)}</span>
          </div>
        </div>

        {/* Card Back (Vintage Classic Blue Pattern matching front border color style) */}
        <div className="card-back bg-[#f2e5d3] flex items-center justify-center absolute w-full h-full backface-hidden rounded shadow-inner overflow-hidden border border-[#d6c5b0]">
           <div className="w-[90%] h-[92%] border-[0.5px] border-[#1c1c1c] rounded-[2px] bg-[#294266] overflow-hidden relative">
              <svg className="w-full h-full opacity-60" viewBox="0 0 100 140" fill="none">
                <defs>
                  <pattern id="vintage-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="5" cy="5" r="3" fill="none" stroke="#f2e5d3" strokeWidth="0.5" />
                    <circle cx="5" cy="5" r="1" fill="#f2e5d3" />
                    <line x1="0" y1="0" x2="10" y2="10" stroke="#f2e5d3" strokeWidth="0.2" />
                    <line x1="10" y1="0" x2="0" y2="10" stroke="#f2e5d3" strokeWidth="0.2" />
                  </pattern>
                </defs>
                <rect width="100" height="140" fill="url(#vintage-pattern)" />
              </svg>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Card;
