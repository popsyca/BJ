import { Card, Hand, PlayerSeat, TableGameState, createDeck, shuffleDeck, calculateScore, isBlackjack } from './blackjack';

export class Table {
  public id: string;
  public name: string;
  public seat: PlayerSeat | null = null;
  public dealerHand: Hand;
  public deck: Card[];
  public gameState: TableGameState;
  public minBet = 10;
  public maxBet = 500;
  
  // Advanced Rules fields
  public activeHandType: 'main' | 'split' = 'main';
  public insuranceBet = 0;

  private onStateChange: (table: Table) => void;
  private onBalanceUpdate: (userId: string, newChips: number) => Promise<void>;

  constructor(
    id: string,
    name: string,
    onStateChange: (table: Table) => void,
    onBalanceUpdate: (userId: string, newChips: number) => Promise<void>
  ) {
    this.id = id;
    this.name = name;
    this.dealerHand = { cards: [], bet: 0, status: 'waiting', score: 0 };
    this.deck = shuffleDeck(createDeck(6));
    this.gameState = 'LOBBY';
    this.onStateChange = onStateChange;
    this.onBalanceUpdate = onBalanceUpdate;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      seat: this.seat ? {
        ...this.seat,
        hand: {
          ...this.seat.hand,
          score: calculateScore(this.seat.hand.cards),
        },
        splitHand: this.seat.splitHand ? {
          ...this.seat.splitHand,
          score: calculateScore(this.seat.splitHand.cards),
        } : null
      } : null,
      dealerHand: {
        ...this.dealerHand,
        // Hide second card in dealing, playing or insurance decision phases
        cards: this.dealerHand.cards.map((card, idx) => {
          if (idx === 1 && (this.gameState === 'DEALING' || this.gameState === 'PLAYING' || this.gameState === 'INSURANCE_DECISION')) {
            return { ...card, suit: 'H', value: '?', score: 0, hidden: true };
          }
          return card;
        }),
        score: (this.gameState === 'DEALING' || this.gameState === 'PLAYING' || this.gameState === 'INSURANCE_DECISION')
          ? (this.dealerHand.cards[0] ? calculateScore([this.dealerHand.cards[0]]) : 0)
          : calculateScore(this.dealerHand.cards),
      },
      gameState: this.gameState,
      activeHandType: this.activeHandType,
      insuranceBet: this.insuranceBet,
      minBet: this.minBet,
      maxBet: this.maxBet,
    };
  }

  private notify() {
    this.onStateChange(this);
  }

  public addPlayer(
    userId: string,
    username: string,
    chips: number,
    socketId: string
  ): boolean {
    if (this.seat && this.seat.userId === userId) {
      this.seat.socketId = socketId;
      this.notify();
      return true;
    }

    this.seat = {
      userId,
      username,
      chips,
      seatIndex: 0,
      hand: { cards: [], bet: 0, status: 'waiting', score: 0 },
      placedBet: false,
      socketId,
    };

    this.gameState = 'BETTING';
    this.notify();
    return true;
  }

  public removePlayer(): boolean {
    if (!this.seat) return false;

    if (this.gameState === 'BETTING' && this.seat.placedBet) {
      this.seat.chips += this.seat.hand.bet;
      this.onBalanceUpdate(this.seat.userId, this.seat.chips);
    }

    this.seat = null;
    this.gameState = 'LOBBY';
    this.resetTable();
    this.notify();
    return true;
  }

  public updateSocketId(userId: string, newSocketId: string) {
    if (this.seat && this.seat.userId === userId) {
      this.seat.socketId = newSocketId;
      this.notify();
    }
  }

  public placeBet(socketId: string, betAmount: number): boolean {
    if (this.gameState !== 'BETTING') return false;
    if (!this.seat || this.seat.socketId !== socketId) return false;
    if (betAmount < this.minBet || betAmount > this.maxBet) return false;
    if (this.seat.chips < betAmount) return false;

    this.seat.chips -= betAmount;
    this.seat.hand.bet = betAmount;
    this.seat.hand.status = 'playing';
    this.seat.placedBet = true;

    this.onBalanceUpdate(this.seat.userId, this.seat.chips);
    this.notify();

    this.startDealPhase();
    return true;
  }

  private startDealPhase() {
    this.gameState = 'DEALING';
    this.notify();

    if (this.deck.length < 52) {
      this.deck = shuffleDeck(createDeck(6));
    }

    setTimeout(() => {
      if (this.seat) this.seat.hand.cards.push(this.deck.pop()!);
      this.dealerHand.cards.push(this.deck.pop()!);
      this.notify();

      setTimeout(() => {
        if (this.seat) {
          this.seat.hand.cards.push(this.deck.pop()!);
          this.seat.hand.score = calculateScore(this.seat.hand.cards);
          if (isBlackjack(this.seat.hand.cards)) {
            this.seat.hand.status = 'blackjack';
          }
        }
        this.dealerHand.cards.push(this.deck.pop()!);
        this.dealerHand.score = calculateScore(this.dealerHand.cards);
        this.notify();

        // Check for Insurance situation: dealer shows Ace
        const dealerShowsAce = this.dealerHand.cards[0] && this.dealerHand.cards[0].value === 'A';
        
        if (dealerShowsAce && this.seat && this.seat.hand.status === 'playing') {
          // Pause and ask for insurance decision
          this.gameState = 'INSURANCE_DECISION';
          this.notify();
        } else {
          this.proceedAfterDealing();
        }
      }, 700);
    }, 700);
  }

  public async buyInsurance(socketId: string, accept: boolean) {
    if (this.gameState !== 'INSURANCE_DECISION') return;
    if (!this.seat || this.seat.socketId !== socketId) return;

    if (accept) {
      const insuranceCost = Math.floor(this.seat.hand.bet / 2);
      if (this.seat.chips >= insuranceCost) {
        this.seat.chips -= insuranceCost;
        this.insuranceBet = insuranceCost;
        await this.onBalanceUpdate(this.seat.userId, this.seat.chips);
      }
    }

    this.proceedAfterDealing();
  }

  private proceedAfterDealing() {
    const dealerBJ = isBlackjack(this.dealerHand.cards);
    const playerBJ = this.seat ? isBlackjack(this.seat.hand.cards) : false;

    if (dealerBJ || playerBJ) {
      this.gameState = 'DEALER_TURN';
      this.notify();
      setTimeout(() => {
        this.settleTable();
      }, 1200);
    } else {
      this.gameState = 'PLAYING';
      this.activeHandType = 'main';
      this.notify();
    }
  }

  public split(socketId: string): boolean {
    if (this.gameState !== 'PLAYING') return false;
    if (!this.seat || this.seat.socketId !== socketId) return false;
    if (this.seat.splitHand) return false; // Already split
    if (this.seat.hand.cards.length !== 2) return false;

    const [card1, card2] = this.seat.hand.cards;
    // Check if card ranks are identical (e.g. two 8s, or two Kings)
    if (card1.value !== card2.value) return false;
    if (this.seat.chips < this.seat.hand.bet) return false; // Not enough chips to match bet

    // Deduct chip balance for second hand
    this.seat.chips -= this.seat.hand.bet;
    this.onBalanceUpdate(this.seat.userId, this.seat.chips);

    // Split cards
    const splitCard = this.seat.hand.cards.pop()!;
    this.seat.splitHand = {
      cards: [splitCard],
      bet: this.seat.hand.bet,
      status: 'playing',
      score: 0
    };

    // Deal a new card to each hand
    this.seat.hand.cards.push(this.deck.pop()!);
    this.seat.splitHand.cards.push(this.deck.pop()!);

    // Update hand scores
    this.seat.hand.score = calculateScore(this.seat.hand.cards);
    this.seat.splitHand.score = calculateScore(this.seat.splitHand.cards);

    this.activeHandType = 'main';
    this.notify();
    return true;
  }

  public hit(socketId: string): boolean {
    if (this.gameState !== 'PLAYING') return false;
    if (!this.seat || this.seat.socketId !== socketId) return false;

    const activeHand = this.activeHandType === 'main' ? this.seat.hand : this.seat.splitHand;
    if (!activeHand) return false;

    activeHand.cards.push(this.deck.pop()!);
    const score = calculateScore(activeHand.cards);
    activeHand.score = score;

    if (score > 21) {
      activeHand.status = 'bust';
      this.notify();
      setTimeout(() => this.advancePlayingTurn(), 1000);
    } else if (score === 21) {
      activeHand.status = 'stand';
      this.notify();
      setTimeout(() => this.advancePlayingTurn(), 1000);
    } else {
      this.notify();
    }

    return true;
  }

  public stand(socketId: string): boolean {
    if (this.gameState !== 'PLAYING') return false;
    if (!this.seat || this.seat.socketId !== socketId) return false;

    const activeHand = this.activeHandType === 'main' ? this.seat.hand : this.seat.splitHand;
    if (!activeHand) return false;

    activeHand.status = 'stand';
    this.notify();
    this.advancePlayingTurn();
    return true;
  }

  public doubleDown(socketId: string): boolean {
    if (this.gameState !== 'PLAYING') return false;
    if (!this.seat || this.seat.socketId !== socketId) return false;

    const activeHand = this.activeHandType === 'main' ? this.seat.hand : this.seat.splitHand;
    if (!activeHand) return false;
    if (activeHand.cards.length !== 2) return false;
    if (this.seat.chips < activeHand.bet) return false;

    // Double the bet
    this.seat.chips -= activeHand.bet;
    activeHand.bet *= 2;
    this.onBalanceUpdate(this.seat.userId, this.seat.chips);

    activeHand.cards.push(this.deck.pop()!);
    const score = calculateScore(activeHand.cards);
    activeHand.score = score;

    if (score > 21) {
      activeHand.status = 'bust';
    } else {
      activeHand.status = 'stand';
    }

    this.notify();
    setTimeout(() => this.advancePlayingTurn(), 1000);
    return true;
  }

  private advancePlayingTurn() {
    if (this.activeHandType === 'main' && this.seat?.splitHand) {
      // Move from main hand to split hand
      this.activeHandType = 'split';
      this.notify();
    } else {
      // Done with turns, start dealer turn
      this.startDealerTurn();
    }
  }

  private startDealerTurn() {
    this.gameState = 'DEALER_TURN';
    this.notify();

    // If both hands busted, dealer doesn't need to draw
    const mainBusted = this.seat?.hand.status === 'bust';
    const splitBusted = this.seat?.splitHand ? this.seat.splitHand.status === 'bust' : true;
    const bothBusted = mainBusted && splitBusted;

    const mainBJ = this.seat ? isBlackjack(this.seat.hand.cards) : false;
    const splitBJ = this.seat?.splitHand ? isBlackjack(this.seat.splitHand.cards) : false;
    const bothBJorBusted = (mainBusted || mainBJ) && (splitBusted || splitBJ);

    const runDealerAI = () => {
      const dealerScore = calculateScore(this.dealerHand.cards);
      this.dealerHand.score = dealerScore;

      let shouldHit = dealerScore < 17;

      // İnsan gibi risk alan bot mantığı:
      const playerScore = this.seat && this.seat.hand.status !== 'bust' ? this.seat.hand.score : 0;
      const isLosing = playerScore > dealerScore && playerScore <= 21;

      if (dealerScore === 16 && Math.random() < 0.15 && !isLosing) {
        // %15 ihtimalle 16'da patlamaktan korkup durma riski alır (Eğer geride değilse)
        shouldHit = false;
      } else if ((dealerScore === 17 || dealerScore === 18) && isLosing) {
        // Eğer geride olduğunu görürse, %30 ihtimalle 17 veya 18'de riske girip kart çeker
        if (Math.random() < 0.30) {
          shouldHit = true;
        }
      }

      if (shouldHit && !bothBusted && !bothBJorBusted) {
        this.dealerHand.cards.push(this.deck.pop()!);
        this.notify();
        setTimeout(runDealerAI, 1000);
      } else {
        if (dealerScore > 21) {
          this.dealerHand.status = 'bust';
        } else {
          this.dealerHand.status = 'stand';
        }
        this.notify();
        setTimeout(() => this.settleTable(), 1200);
      }
    };

    setTimeout(runDealerAI, 1000);
  }

  private async settleTable() {
    this.gameState = 'SETTLED';
    if (!this.seat || !this.seat.placedBet) return;

    const dealerScore = calculateScore(this.dealerHand.cards);
    const dealerBJ = isBlackjack(this.dealerHand.cards);
    
    // Process insurance payout first
    if (this.insuranceBet > 0) {
      if (dealerBJ) {
        // Insurance pays 2:1 (original bet returns 2x + insurance bet returned = 3x total)
        this.seat.chips += this.insuranceBet * 3;
      }
      // insuranceBet is lost otherwise, which is already deducted
    }

    const settleHand = (hand: Hand) => {
      const playerScore = calculateScore(hand.cards);
      const playerBJ = isBlackjack(hand.cards);

      if (hand.status === 'bust') {
        // Busted, bet is lost
        hand.status = 'settled';
      } else if (this.dealerHand.status === 'bust') {
        // Dealer busted
        if (playerBJ) {
          this.seat!.chips += Math.floor(hand.bet * 2.5);
        } else {
          this.seat!.chips += hand.bet * 2;
        }
      } else {
        // Compare
        if (playerBJ && !dealerBJ) {
          this.seat!.chips += Math.floor(hand.bet * 2.5);
        } else if (!playerBJ && dealerBJ) {
          // Lost
        } else if (playerScore > dealerScore) {
          this.seat!.chips += hand.bet * 2;
        } else if (playerScore < dealerScore) {
          // Lost
        } else {
          // Push (Tie)
          this.seat!.chips += hand.bet;
        }
      }
      hand.status = 'settled';
    };

    // Settle main hand
    settleHand(this.seat.hand);

    // Settle split hand if it exists
    if (this.seat.splitHand) {
      settleHand(this.seat.splitHand);
    }

    await this.onBalanceUpdate(this.seat.userId, this.seat.chips);
    this.notify();

    // Restart game cycle
    setTimeout(() => {
      this.resetTable();
      if (this.seat) {
        this.gameState = 'BETTING';
        this.notify();
      } else {
        this.gameState = 'LOBBY';
        this.notify();
      }
    }, 4500);
  }

  private resetTable() {
    if (this.seat) {
      this.seat.hand = { cards: [], bet: 0, status: 'waiting', score: 0 };
      this.seat.splitHand = undefined;
      this.seat.placedBet = false;
    }
    this.dealerHand = { cards: [], bet: 0, status: 'waiting', score: 0 };
    this.activeHandType = 'main';
    this.insuranceBet = 0;
  }

  public destroy() {
    this.seat = null;
  }
}
