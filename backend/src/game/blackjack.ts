export interface Card {
  suit: 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades
  value: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  score: number;
  hidden?: boolean;
}

export interface Hand {
  cards: Card[];
  bet: number;
  status: 'waiting' | 'playing' | 'stand' | 'bust' | 'blackjack' | 'settled';
  score: number;
}

export interface PlayerSeat {
  userId: string;
  username: string;
  chips: number;
  seatIndex: number;
  hand: Hand;
  splitHand?: Hand;
  placedBet: boolean;
  socketId: string;
}

export type TableGameState = 'LOBBY' | 'BETTING' | 'DEALING' | 'INSURANCE_DECISION' | 'PLAYING' | 'DEALER_TURN' | 'SETTLED';

export const SUITS = ['H', 'D', 'C', 'S'] as const;
export const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export function createDeck(decksCount = 6): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < decksCount; i++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        let score = parseInt(value);
        if (['J', 'Q', 'K'].includes(value)) {
          score = 10;
        } else if (value === 'A') {
          score = 11;
        }
        deck.push({ suit, value, score });
      }
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateScore(cards: Card[]): number {
  let score = 0;
  let aceCount = 0;

  for (const card of cards) {
    if (card.hidden) continue;
    score += card.score;
    if (card.value === 'A') {
      aceCount++;
    }
  }

  while (score > 21 && aceCount > 0) {
    score -= 10;
    aceCount--;
  }

  return score;
}

export function isBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  return calculateScore(cards) === 21;
}
