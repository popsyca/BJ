import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Card } from './Card';
import { ArrowLeft, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import type { Card as CardType, TableGameState } from '../../../backend/src/game/blackjack';

interface GameTableProps {
  socket: Socket | null;
  tableId: string;
  onBackToLobby: () => void;
}

// Simple Web Audio API Synth for Premium Casino Sound Effects
class CasinoAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playChip() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playCard() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);
    filter.Q.setValueAtTime(5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playWin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx!.currentTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.3);

      osc.start(this.ctx!.currentTime + idx * 0.08);
      osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.3);
    });
  }

  playBust() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.45);
  }
}

const audio = new CasinoAudio();

const renderCasinoChip = (amount: number, sizeClass = "w-10 h-10") => {
  // Determine color based on amount using premium custom theme
  let color = '#E0E0E0'; // Platinum (10)
  let stripesColor = '#390517'; // Burgundy stripes

  if (amount >= 500) {
    color = '#390517'; // Burgundy
    stripesColor = '#A38560'; // Gold stripes
  } else if (amount >= 100) {
    color = '#03110D'; // Spruce
    stripesColor = '#A38560'; // Gold stripes
  } else if (amount >= 50) {
    color = '#16302B'; // Forest
    stripesColor = '#E0E0E0'; // Platinum stripes
  } else if (amount >= 25) {
    color = '#A38560'; // Gold
    stripesColor = '#03110D'; // Spruce stripes
  }

  return (
    <div 
      className={`relative ${sizeClass} rounded-full flex items-center justify-center shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_1.5px_3px_rgba(255,255,255,0.2),inset_0_-1.5px_3px_rgba(0,0,0,0.4)] border-4 border-dashed select-none shrink-0`}
      style={{
        backgroundColor: color,
        borderColor: stripesColor,
      }}
    >
      {/* Inner Ring Layer */}
      <div className="absolute inset-[3px] rounded-full border border-dashed border-white/10 bg-black/20 flex items-center justify-center">
        {/* Denomination Center */}
        <div className="w-[75%] h-[75%] rounded-full bg-white/90 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.4)] flex items-center justify-center">
          <span className={`text-slate-950 font-black text-[9px] tracking-tight`}>{amount}</span>
        </div>
      </div>
      {/* Glossy Overlay Reflection */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none"></div>
    </div>
  );
};

export const GameTable: React.FC<GameTableProps> = ({
  socket,
  onBackToLobby,
}) => {
  const [table, setTable] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [betSelection, setBetSelection] = useState<number>(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  audio.enabled = soundEnabled;

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_game');

    socket.on('table_update', (updatedTable: any) => {
      setTable(updatedTable);
    });

    socket.on('error_message', (errMsg: string) => {
      setErrorMessage(errMsg);
      setTimeout(() => setErrorMessage(null), 3500);
    });

    return () => {
      socket.off('table_update');
      socket.off('error_message');
    };
  }, [socket]);

  // Audio trigger references
  const prevGameState = useRef<TableGameState | null>(null);
  const prevDealerCardCount = useRef<number>(0);
  const prevPlayerCardCount = useRef<number>(0);
  const prevSplitCardCount = useRef<number>(0);

  useEffect(() => {
    if (!table) return;

    let cardDrawn = false;

    // Check dealer card updates
    if (table.dealerHand.cards.length > prevDealerCardCount.current) {
      cardDrawn = true;
      prevDealerCardCount.current = table.dealerHand.cards.length;
    }

    // Check player card updates
    if (table.seat && table.seat.placedBet) {
      const currentCount = table.seat.hand.cards.length;
      if (currentCount > prevPlayerCardCount.current) {
        cardDrawn = true;
        prevPlayerCardCount.current = currentCount;
      }

      if (table.seat.splitHand) {
        const splitCount = table.seat.splitHand.cards.length;
        if (splitCount > prevSplitCardCount.current) {
          cardDrawn = true;
          prevSplitCardCount.current = splitCount;
        }
      }
    }

    if (cardDrawn) {
      audio.playCard();
    }

    // Game phase transitions
    if (prevGameState.current !== table.gameState) {
      if (table.gameState === 'BETTING') {
        prevDealerCardCount.current = 0;
        prevPlayerCardCount.current = 0;
        prevSplitCardCount.current = 0;
      }
      if (table.gameState === 'SETTLED' && table.seat && table.seat.placedBet) {
        const mainScore = table.seat.hand.score;
        const splitScore = table.seat.splitHand ? table.seat.splitHand.score : 0;
        const dealerScore = table.dealerHand.score;
        const dealerBust = table.dealerHand.status === 'bypass' || dealerScore > 21;

        const mainBJ = mainScore === 21 && table.seat.hand.cards.length === 2;
        
        let wonAny = false;
        let bustAny = false;

        // Check main hand
        if (mainScore > 21) {
          bustAny = true;
        } else if (dealerBust || mainScore > dealerScore || (mainBJ && dealerScore !== 21)) {
          wonAny = true;
        } else if (mainScore < dealerScore) {
          bustAny = true;
        }

        // Check split hand
        if (table.seat.splitHand) {
          const splitBJ = splitScore === 21 && table.seat.splitHand.cards.length === 2;
          if (splitScore > 21) {
            bustAny = true;
          } else if (dealerBust || splitScore > dealerScore || (splitBJ && dealerScore !== 21)) {
            wonAny = true;
          } else if (splitScore < dealerScore) {
            bustAny = true;
          }
        }

        if (wonAny) {
          audio.playWin();
        } else if (bustAny) {
          audio.playBust();
        }
      }
      prevGameState.current = table.gameState;
    }

  }, [table]);

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-spruce text-gold">
        <span className="font-semibold text-sm tracking-wider uppercase">Masa kuruluyor...</span>
      </div>
    );
  }

  const seat = table.seat;
  const isMyTurn = seat && table.gameState === 'PLAYING';

  const handlePlaceBet = (amount: number) => {
    audio.playChip();
    socket?.emit('place_bet', { amount });
  };

  const handleAction = (action: string) => {
    if (action === 'hit') socket?.emit('game_action_hit');
    if (action === 'stand') socket?.emit('game_action_stand');
    if (action === 'double') socket?.emit('game_action_double');
    if (action === 'split') socket?.emit('game_action_split');
  };

  const handleInsurance = (accept: boolean) => {
    audio.playChip();
    socket?.emit('buy_insurance', { accept });
  };

  // Check if player is eligible to split
  const canSplit = isMyTurn && seat && !seat.splitHand && 
    seat.hand.cards.length === 2 && 
    seat.hand.cards[0].value === seat.hand.cards[1].value && 
    seat.chips >= seat.hand.bet;

  // Active hand description
  const activeHand = isMyTurn && table.activeHandType === 'split' ? seat?.splitHand : seat?.hand;

  return (
    <div className="flex flex-col min-h-screen bg-spruce text-platinum select-none p-3 md:p-4 pb-8 relative">
      
      {/* Insurance Overlay Prompt Modal */}
      {table.gameState === 'INSURANCE_DECISION' && seat && (
        <div className="absolute inset-0 bg-spruce/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-forest border border-gold/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-fade-in">
            <div className="p-4 bg-gold/10 rounded-full border border-gold/25 text-gold mb-4 animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-platinum mb-2">Sigorta Satın Almak İster misiniz?</h3>
            <p className="text-gold/70 text-xs md:text-sm mb-6 leading-relaxed">
              Krupiyenin açık kartı **As**. Krupiyenin Blackjack yapma ihtimaline karşı sigorta bahsi koyabilirsiniz. 
              <br />
              <span className="text-gold font-semibold block mt-2">
                Sigorta Bedeli: {Math.floor(seat.hand.bet / 2)} Çip ({seat.hand.bet} bahsinin yarısı)
              </span>
              Kazanç durumunda 2:1 öder.
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => handleInsurance(true)}
                disabled={seat.chips < Math.floor(seat.hand.bet / 2)}
                className="flex-1 bg-gradient-to-r from-gold-dark to-gold text-spruce font-bold py-3 rounded-xl transition cursor-pointer text-sm uppercase tracking-wider"
              >
                Sigorta Al
              </button>
              <button
                onClick={() => handleInsurance(false)}
                className="flex-1 bg-forest-light hover:bg-forest text-gold border border-gold/25 font-bold py-3 rounded-xl transition cursor-pointer text-sm uppercase tracking-wider"
              >
                Pas Geç
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 items-center z-10 w-full max-w-5xl mx-auto mb-2 md:mb-4">
        <div className="flex justify-start">
          <button
            onClick={onBackToLobby}
            className="flex items-center gap-1.5 bg-forest/60 border border-gold/20 hover:bg-forest text-gold font-semibold px-2 sm:px-4 py-2 rounded-xl transition cursor-pointer text-xs sm:text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gold" /> <span className="hidden xs:inline">Lobiye Dön</span><span className="xs:hidden">Geri</span>
          </button>
        </div>

        <div className="text-center">
          <h2 className="font-extrabold text-[10px] sm:text-sm md:text-lg text-gold tracking-wider">TEK KİŞİLİK CASINO</h2>
          <p className="text-[8px] sm:text-xs text-gold/60 font-medium">Krupiye: {table.minBet}-{table.maxBet}$</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-forest/60 border border-gold/20 hover:bg-forest text-gold rounded-xl transition cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-gold" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-950/95 border border-red-800 text-red-300 px-6 py-2.5 rounded-full shadow-2xl text-xs md:text-sm font-semibold animate-pulse">
          {errorMessage}
        </div>
      )}

      {/* Turn notification banner */}
      {table.gameState === 'PLAYING' && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 bg-burgundy/95 border-2 border-gold text-gold px-8 py-3 rounded-2xl shadow-[0_10px_35px_rgba(163,133,96,0.3)] text-xs md:text-sm font-extrabold animate-bounce flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gold animate-ping"></div>
          <span>
            Karar Verme Sırası Sizde! {seat?.splitHand ? `(Aktif El: ${table.activeHandType === 'main' ? 'Birinci El' : 'İkinci El'})` : ''}
          </span>
        </div>
      )}

      {/* Outer Table Rim (Black Leather Bumper) */}
      <div className="flex-1 flex flex-col justify-between rounded-t-full w-full max-w-4xl mx-auto relative min-h-[220px] p-[10px] md:p-[14px] bg-zinc-950 shadow-[0_20px_40px_rgba(0,0,0,0.85),inset_0_3px_8px_rgba(255,255,255,0.06),inset_0_-8px_16px_rgba(0,0,0,0.95)] border-[3px] border-burgundy/25 select-none">
        
        {/* Inner Wood Panel Frame */}
        <div className="flex-1 flex flex-col justify-between rounded-t-full bg-gradient-to-b from-[#390517] via-[#24030e] to-[#160209] p-[10px] md:p-[16px] shadow-[inset_0_4px_10px_rgba(0,0,0,0.95),0_6px_12px_rgba(0,0,0,0.7)] border border-gold/15 relative">
          


          {/* Green Felt Inner Area */}
          <div className="flex-1 flex flex-col justify-between rounded-t-full bg-[radial-gradient(circle_at_center,_#16302B_0%,_#0c1a17_70%,_#03110D_100%)] shadow-[inset_0_6px_20px_rgba(0,0,0,0.9)] p-4 md:p-8 relative overflow-hidden border-b-0 min-h-[200px] z-10 [border-top-left-radius:inherit] [border-top-right-radius:inherit]">
            
            {/* Classic Casino Markings Container */}
            <div className="absolute inset-0 pointer-events-none select-none z-5 overflow-hidden rounded-t-full">
              
              {/* Giant BLACKJACK Logo */}
              <div className="absolute top-[52%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
                <h1 className="text-6xl md:text-8xl font-serif font-black tracking-[0.25em] text-gold/15 mix-blend-overlay">
                  BLACKJACK
                </h1>
              </div>

              {/* Insurance Curved Line SVG (Removed) */}
              {/* Dealer Rules Text (Removed) */}

              {/* Decorative Betting Circles (5 spots) */}
              <div className="absolute bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 w-full flex justify-center gap-1.5 sm:gap-6 md:gap-20">
                {[...Array(5)].map((_, i) => (
                  <div key={`bet-circle-${i}`} className={`w-7 h-7 sm:w-14 sm:h-14 md:w-20 md:h-20 rounded-full border-[1.5px] md:border-[2px] border-gold/25 p-[1px] md:p-1 ${i === 2 ? 'border-gold/45 bg-black/20 shadow-[inset_0_0_15px_rgba(163,133,96,0.15)]' : ''}`}>
                    <div className="w-full h-full rounded-full border border-gold/30 flex items-center justify-center">
                      <div className="w-[85%] h-[85%] rounded-full border-[0.5px] border-white/10" />
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Dealer Section */}
            <div className="flex flex-col items-center mt-2 z-10 relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gold drop-shadow-md">Krupiye Bot</span>
                {table.dealerHand.cards.length > 0 && (
                  <span className="bg-spruce border border-gold/20 text-gold px-2 md:px-2.5 py-0.5 rounded text-[10px] md:text-xs font-bold shadow-lg">
                    Skor: {table.dealerHand.score}
                  </span>
                )}
              </div>

              <div className="flex gap-2 justify-center min-h-[96px] md:min-h-[112px]">
                {table.dealerHand.cards.length === 0 ? (
                  <div className="w-16 h-24 md:w-20 md:h-28 border-[1.5px] border-dashed border-emerald-400/30 rounded-lg flex items-center justify-center text-emerald-400/20 font-bold bg-black/10">
                    Boş
                  </div>
                ) : (
                  table.dealerHand.cards.map((card: any, idx: number) => (
                    <Card key={`dealer-card-${idx}`} card={card} />
                  ))
                )}
              </div>
            </div>

            {/* Game Phase Notification HUD */}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 z-10 w-full text-center pointer-events-none select-none">
              {table.gameState === 'BETTING' && (
                <div className="inline-block bg-spruce/95 border border-gold/30 px-6 py-2 rounded-full text-gold text-xs md:text-sm font-bold shadow-lg">
                  Bahsinizi Belirleyin ve Oyunu Başlatın
                </div>
              )}
              {table.gameState === 'DEALING' && (
                <div className="inline-block bg-spruce/95 border border-gold/30 px-6 py-2 rounded-full text-gold text-xs md:text-sm font-bold shadow-lg animate-pulse">
                  Kartlar Dağıtılıyor...
                </div>
              )}
              {table.gameState === 'DEALER_TURN' && (
                <div className="inline-block bg-burgundy border border-gold/30 px-6 py-2 rounded-full text-gold text-xs md:text-sm font-bold shadow-lg">
                  Krupiye Bot Oynuyor...
                </div>
              )}
              {table.gameState === 'SETTLED' && (
                <div className="inline-block bg-forest/95 border border-gold/30 px-6 py-2 rounded-full text-platinum text-xs md:text-sm font-bold shadow-lg">
                  El Sonuçlandı! Yeni Bahisler Başlıyor.
                </div>
              )}
            </div>

            {/* Absolute-Positioned Player Hands & Profile Details */}
            {seat ? (
              <>
                {/* Main Hand (Positioned exactly over Box 3 when not split, or Box 2 when split) */}
                <div 
                  className={`absolute transition-all duration-300 flex flex-col items-center p-1 rounded-2xl z-20 ${
                    seat.splitHand 
                      ? 'left-[36%] top-[61%] -translate-x-1/2 -translate-y-1/2 -rotate-12'
                      : 'left-[50%] top-[58%] -translate-x-1/2 -translate-y-1/2'
                  } ${
                    seat.splitHand 
                      ? (table.activeHandType === 'main' && table.gameState === 'PLAYING'
                         ? 'bg-forest/90 border-2 border-gold shadow-[0_0_20px_rgba(163,133,96,0.3)] scale-[1.03]' 
                         : 'bg-spruce/60 border-2 border-gold/20 scale-95 opacity-80') 
                      : 'border-2 border-transparent bg-transparent'
                  }`}
                >
                  <div className="flex -space-x-8 md:-space-x-10 justify-center mb-1 px-1 min-h-[96px] md:min-h-[112px]">
                    {seat.hand.cards.map((card: CardType, cardIdx: number) => (
                      <Card key={`player-main-card-${cardIdx}`} card={card} />
                    ))}
                  </div>

                  {/* Score details */}
                  {seat.placedBet && seat.hand.cards.length > 0 && (
                    <div className="flex items-center gap-1 bg-spruce border border-gold/25 rounded px-1.5 py-0.5 mt-1 shadow-lg">
                      <span className="text-[8px] text-gold uppercase font-bold tracking-wider">
                        {seat.splitHand ? 'El 1' : 'Eliniz'}
                      </span>
                      <span className="bg-forest text-platinum px-1 py-0.2 rounded text-[9px] font-bold">
                        {seat.hand.score}
                      </span>
                      {seat.hand.status === 'bust' && <span className="bg-red-950/95 text-red-300 border border-red-800 px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">Bust</span>}
                      {seat.hand.status === 'blackjack' && <span className="bg-gold text-spruce px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">BJ</span>}
                      {seat.hand.status === 'stand' && <span className="bg-burgundy text-platinum px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">Stand</span>}
                    </div>
                  )}
                </div>

                {/* Split Hand (Positioned exactly over Box 4) */}
                {seat.splitHand && (
                  <div 
                    className={`absolute transition-all duration-300 flex flex-col items-center p-1 rounded-2xl z-20 left-[64%] top-[61%] -translate-x-1/2 -translate-y-1/2 rotate-12 ${
                      table.activeHandType === 'split' && table.gameState === 'PLAYING'
                        ? 'bg-forest/90 border-2 border-gold shadow-[0_0_20px_rgba(163,133,96,0.3)] scale-[1.03]' 
                        : 'bg-spruce/60 border-2 border-gold/20 scale-95 opacity-80'
                    }`}
                  >
                    <div className="flex -space-x-8 md:-space-x-10 justify-center mb-1 px-1 min-h-[96px] md:min-h-[112px]">
                      {seat.splitHand.cards.map((card: CardType, cardIdx: number) => (
                        <Card key={`player-split-card-${cardIdx}`} card={card} />
                      ))}
                    </div>

                    {/* Score details */}
                    {seat.splitHand.cards.length > 0 && (
                      <div className="flex items-center gap-1 bg-spruce border border-gold/25 rounded px-1.5 py-0.5 mt-1 shadow-lg">
                        <span className="text-[8px] text-gold uppercase font-bold tracking-wider">El 2</span>
                        <span className="bg-forest text-platinum px-1 py-0.2 rounded text-[9px] font-bold">
                          {seat.splitHand.score}
                        </span>
                        {seat.splitHand.status === 'bust' && <span className="bg-red-950/95 text-red-300 border border-red-800 px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">Bust</span>}
                        {seat.splitHand.status === 'blackjack' && <span className="bg-gold text-spruce px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">BJ</span>}
                        {seat.splitHand.status === 'stand' && <span className="bg-burgundy text-platinum px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">Stand</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Player Profile Details Card (Stable Bottom Center, holding the chips on the left) */}
                <div className="absolute left-1/2 bottom-3 -translate-x-1/2 z-30 bg-forest/90 border border-gold/30 rounded-2xl p-3 w-64 shadow-2xl flex items-center gap-3">
                  {/* Bet stack as real casino chips to the left of the user's name */}
                  {seat.placedBet && seat.hand.bet > 0 && (
                    <div className="flex gap-1 items-center justify-center border-r border-gold/20 pr-3">
                      {renderCasinoChip(seat.hand.bet, "w-10 h-10")}
                      {seat.splitHand && seat.splitHand.bet > 0 && (
                        <>
                          <span className="text-[9px] font-black text-gold">+</span>
                          {renderCasinoChip(seat.splitHand.bet, "w-10 h-10")}
                        </>
                      )}
                    </div>
                  )}

                  {/* Profile texts */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                      <p className="text-xs font-bold text-platinum truncate">{seat.username}</p>
                    </div>
                    <p className="text-[10px] text-gold font-semibold mt-0.5">{seat.chips.toLocaleString()} Çip</p>
                    
                    {/* Insurance Indicator Tag */}
                    {table.insuranceBet > 0 && (
                      <div className="mt-1 inline-flex items-center gap-1 bg-burgundy/30 border border-gold/25 text-gold-light px-2 py-0.5 rounded-full text-[8px] font-bold">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        <span>Sigorta: {table.insuranceBet} $</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-sm absolute left-1/2 bottom-10 -translate-x-1/2">
                Oyuncu koltuğu yükleniyor...
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Action Controls HUD */}
      <div className="z-10 bg-forest/60 backdrop-blur-md border border-gold/25 rounded-2xl p-3 md:p-4 w-full max-w-4xl mx-auto mt-2 md:mt-4 shadow-2xl">
        
        {/* Betting options */}
        {seat && table.gameState === 'BETTING' && !seat.placedBet && (
          <div className="flex flex-col items-center gap-2 md:gap-3">
            {/* Large Current Balance Display */}
            <div className="flex flex-col items-center mb-1 animate-fade-in">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-bold">Mevcut Bakiyeniz</span>
              <span className="text-3xl font-black text-gold tracking-wide mt-1">
                {seat.chips.toLocaleString()} ÇİP
              </span>
            </div>

            <span className="text-xs font-bold tracking-wider text-gold uppercase mt-1">Bahsinizi Seçin</span>
            <div className="flex flex-wrap gap-2 md:gap-5 justify-center items-center py-1">
              {[10, 25, 50, 100, 500].map((val) => (
                <button
                  key={`chip-select-${val}`}
                  onClick={() => setBetSelection(val)}
                  className={`transition cursor-pointer rounded-full p-0.5 select-none ${
                    betSelection === val 
                      ? 'ring-4 ring-gold scale-115 shadow-xl shadow-gold/20' 
                      : 'opacity-85 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  {renderCasinoChip(val, "w-10 h-10 md:w-14 md:h-14")}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePlaceBet(betSelection)}
              className="bg-gradient-to-r from-gold-dark to-gold text-spruce font-black px-8 py-2.5 rounded-xl shadow-lg shadow-gold/5 transition duration-200 cursor-pointer text-sm uppercase tracking-wider"
            >
              {betSelection} Çip ile Oyunu Başlat
            </button>
          </div>
        )}

        {/* Action Options (Hit, Stand, Double, Split) */}
        {isMyTurn && activeHand && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-bold tracking-wider text-gold uppercase">
              Hamlenizi Seçin {seat.splitHand ? `(${table.activeHandType === 'main' ? 'El 1' : 'El 2'})` : ''}
            </span>
            <div className="flex flex-wrap gap-3 w-full max-w-2xl justify-center">
              <button
                onClick={() => handleAction('hit')}
                className="flex-1 min-w-[120px] max-w-[160px] bg-burgundy hover:bg-burgundy-light text-platinum border border-gold/30 font-bold py-3 rounded-xl shadow-lg transition duration-200 cursor-pointer text-sm"
              >
                Hit (Kart Çek)
              </button>
              <button
                onClick={() => handleAction('stand')}
                className="flex-1 min-w-[120px] max-w-[160px] bg-forest-light hover:bg-forest text-gold border border-gold/25 font-bold py-3 rounded-xl transition duration-200 cursor-pointer text-sm"
              >
                Stand (Dur)
              </button>
              {activeHand.cards.length === 2 && seat.chips >= activeHand.bet && (
                <button
                  onClick={() => handleAction('double')}
                  className="flex-1 min-w-[120px] max-w-[160px] bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:from-gold hover:to-gold-light text-spruce font-black py-3 rounded-xl shadow-lg transition duration-200 cursor-pointer text-sm"
                >
                  Double Down
                </button>
              )}
              {canSplit && (
                <button
                  onClick={() => handleAction('split')}
                  className="flex-1 min-w-[120px] max-w-[160px] bg-forest hover:bg-forest-light text-platinum border border-gold/20 font-bold py-3 rounded-xl shadow-lg transition duration-200 cursor-pointer text-sm"
                >
                  Böl (Split)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Settled or dealing transition status messages */}
        {seat && seat.placedBet && table.gameState !== 'PLAYING' && table.gameState !== 'BETTING' && table.gameState !== 'INSURANCE_DECISION' && (
          <div className="text-center text-sm font-semibold text-gold/60 py-2">
            {table.gameState === 'DEALING' ? 'Kartlar veriliyor...' : 
             table.gameState === 'DEALER_TURN' ? 'Krupiye bot oynuyor...' : 
             'Tur sonlandı, kazançlar dağıtılıyor...'}
          </div>
        )}
      </div>

      <footer className="w-full text-center py-4 mt-6 text-[11px] text-gold/40 tracking-wider font-medium select-none z-10">
        Made by İrem TUNÇ and İncilay KURTULUŞ, 2026
      </footer>
    </div>
  );
};
export default GameTable;
