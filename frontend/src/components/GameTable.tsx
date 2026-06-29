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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b13] text-slate-400">
        Masa kuruluyor...
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#070b13] text-slate-100 select-none p-4 relative">
      
      {/* Insurance Overlay Prompt Modal */}
      {table.gameState === 'INSURANCE_DECISION' && seat && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-fade-in">
            <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/25 text-amber-400 mb-4 animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Sigorta Satın Almak İster misiniz?</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed">
              Krupiyenin açık kartı **As**. Krupiyenin Blackjack yapma ihtimaline karşı sigorta bahsi koyabilirsiniz. 
              <br />
              <span className="text-amber-400 font-semibold block mt-2">
                Sigorta Bedeli: {Math.floor(seat.hand.bet / 2)} Çip ({seat.hand.bet} bahsinin yarısı)
              </span>
              Kazanç durumunda 2:1 öder.
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => handleInsurance(true)}
                disabled={seat.chips < Math.floor(seat.hand.bet / 2)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl transition cursor-pointer text-sm uppercase tracking-wider"
              >
                Sigorta Al
              </button>
              <button
                onClick={() => handleInsurance(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition cursor-pointer text-sm uppercase tracking-wider border border-slate-700/50"
              >
                Pas Geç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar controls */}
      <div className="flex justify-between items-center z-10 w-full max-w-5xl mx-auto mb-4">
        <button
          onClick={onBackToLobby}
          className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Lobiye Dön
        </button>

        <div className="text-center">
          <h2 className="font-extrabold text-sm md:text-lg text-slate-100 tracking-wider">TEK KİŞİLİK CASINO</h2>
          <p className="text-xs text-slate-500 font-medium">Krupiye Limit: {table.minBet} - {table.maxBet} $</p>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2.5 bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl transition cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-950 border border-red-500 text-red-300 px-6 py-2.5 rounded-full shadow-2xl text-xs md:text-sm font-semibold animate-pulse">
          {errorMessage}
        </div>
      )}

      {/* Blackjack Felt Table */}
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-[#14532d] to-[#064e3b] border-[12px] md:border-[18px] border-[#3f200d] rounded-t-full shadow-2xl p-6 md:p-8 w-full max-w-4xl mx-auto relative border-b-0 min-h-[380px]">
        
        {/* Rules printed on felt */}
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 text-center text-emerald-400/15 pointer-events-none w-full max-w-[85%] font-serif">
          <p className="text-lg md:text-2xl font-bold tracking-widest leading-relaxed">BLACKJACK PAYS 3 TO 2</p>
          <p className="text-xs md:text-sm mt-1.5 uppercase font-medium">Dealer must stand on 17 and draw to 16</p>
        </div>

        {/* Dealer Section */}
        <div className="flex flex-col items-center mt-2 z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">Krupiye Bot</span>
            {table.dealerHand.cards.length > 0 && (
              <span className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded text-xs font-bold">
                Skor: {table.dealerHand.score}
              </span>
            )}
          </div>

          <div className="flex gap-2 justify-center min-h-[96px] md:min-h-[112px]">
            {table.dealerHand.cards.length === 0 ? (
              <div className="w-16 h-24 md:w-20 md:h-28 border border-dashed border-emerald-400/20 rounded-lg flex items-center justify-center text-emerald-400/10">
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
        <div className="text-center my-4 z-10">
          {table.gameState === 'BETTING' && (
            <div className="inline-block bg-slate-950/90 border border-amber-500/20 px-6 py-2 rounded-full text-amber-400 text-xs md:text-sm font-bold shadow-lg">
              Bahsinizi Belirleyin ve Oyunu Başlatın
            </div>
          )}
          {table.gameState === 'DEALING' && (
            <div className="inline-block bg-slate-950/95 border border-indigo-500/20 px-6 py-2 rounded-full text-indigo-300 text-xs md:text-sm font-bold shadow-lg animate-pulse">
              Kartlar Dağıtılıyor...
            </div>
          )}
          {table.gameState === 'PLAYING' && (
            <div className="inline-block bg-slate-950/90 border border-emerald-500/20 px-6 py-2 rounded-full text-emerald-400 text-xs md:text-sm font-bold shadow-lg">
              Karar Verme Sırası Sizde! {seat?.splitHand ? `(Aktif El: ${table.activeHandType === 'main' ? 'Birinci El' : 'İkinci El'})` : ''}
            </div>
          )}
          {table.gameState === 'DEALER_TURN' && (
            <div className="inline-block bg-slate-950/90 border border-red-500/20 px-6 py-2 rounded-full text-red-400 text-xs md:text-sm font-bold shadow-lg">
              Krupiye Bot Oynuyor...
            </div>
          )}
          {table.gameState === 'SETTLED' && (
            <div className="inline-block bg-slate-950/90 border border-emerald-500/20 px-6 py-2 rounded-full text-slate-200 text-xs md:text-sm font-bold shadow-lg">
              El Sonuçlandı! Yeni Bahisler Başlıyor.
            </div>
          )}
        </div>

        {/* Single Player Hand Layout (Supports Split side-by-side) */}
        <div className="flex flex-col items-center justify-end z-10 mb-2 w-full">
          {seat ? (
            <div className="flex flex-col items-center w-full relative">
              
              {/* Cards Container */}
              <div className="flex flex-wrap md:flex-nowrap gap-6 md:gap-12 justify-center items-end w-full mb-3">
                
                {/* Main Hand */}
                <div className={`flex flex-col items-center p-3.5 rounded-2xl transition-all duration-300 relative border-2 ${
                  seat.splitHand 
                    ? (table.activeHandType === 'main' && table.gameState === 'PLAYING'
                       ? 'bg-slate-900/80 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.03]' 
                       : 'bg-slate-950/40 border-slate-800 scale-95 opacity-80') 
                    : 'border-transparent bg-transparent'
                }`}>
                  <div className="flex -space-x-8 md:-space-x-12 justify-center mb-2 px-2 min-h-[96px] md:min-h-[112px]">
                    {seat.hand.cards.map((card: CardType, cardIdx: number) => (
                      <Card key={`player-main-card-${cardIdx}`} card={card} />
                    ))}
                  </div>

                  {/* Bet stack for main hand */}
                  {seat.placedBet && seat.hand.bet > 0 && (
                    <div className="absolute -top-6 left-4 bg-amber-500 text-slate-950 font-extrabold w-8 h-8 rounded-full border border-dashed border-white shadow-lg flex items-center justify-center text-[10px] chip-active">
                      {seat.hand.bet}
                    </div>
                  )}

                  {/* Score details */}
                  {seat.placedBet && seat.hand.cards.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-0.5 mt-1">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                        {seat.splitHand ? 'El 1' : 'Eliniz'}
                      </span>
                      <span className="bg-slate-850 text-slate-200 px-1 py-0.2 rounded text-[10px] font-bold">
                        {seat.hand.score}
                      </span>
                      {seat.hand.status === 'bust' && <span className="bg-red-500/90 text-white px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">Bust</span>}
                      {seat.hand.status === 'blackjack' && <span className="bg-amber-500 text-slate-950 px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">BJ</span>}
                      {seat.hand.status === 'stand' && <span className="bg-indigo-500/90 text-white px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">Stand</span>}
                    </div>
                  )}
                </div>

                {/* Split Hand */}
                {seat.splitHand && (
                  <div className={`flex flex-col items-center p-3.5 rounded-2xl transition-all duration-300 relative border-2 ${
                    table.activeHandType === 'split' && table.gameState === 'PLAYING'
                      ? 'bg-slate-900/80 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.03]' 
                      : 'bg-slate-950/40 border-slate-800 scale-95 opacity-80'
                  }`}>
                    <div className="flex -space-x-8 md:-space-x-12 justify-center mb-2 px-2 min-h-[96px] md:min-h-[112px]">
                      {seat.splitHand.cards.map((card: CardType, cardIdx: number) => (
                        <Card key={`player-split-card-${cardIdx}`} card={card} />
                      ))}
                    </div>

                    {/* Bet stack for split hand */}
                    {seat.splitHand.bet > 0 && (
                      <div className="absolute -top-6 left-4 bg-amber-500 text-slate-950 font-extrabold w-8 h-8 rounded-full border border-dashed border-white shadow-lg flex items-center justify-center text-[10px] chip-active">
                        {seat.splitHand.bet}
                      </div>
                    )}

                    {/* Score details */}
                    {seat.splitHand.cards.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-0.5 mt-1">
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">El 2</span>
                        <span className="bg-slate-850 text-slate-200 px-1 py-0.2 rounded text-[10px] font-bold">
                          {seat.splitHand.score}
                        </span>
                        {seat.splitHand.status === 'bust' && <span className="bg-red-500/90 text-white px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">Bust</span>}
                        {seat.splitHand.status === 'blackjack' && <span className="bg-amber-500 text-slate-950 px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">BJ</span>}
                        {seat.splitHand.status === 'stand' && <span className="bg-indigo-500/90 text-white px-1.5 rounded text-[8px] font-bold uppercase tracking-wide">Stand</span>}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Player profile details card */}
              <div className="bg-slate-950/90 border border-slate-850 rounded-2xl p-2.5 w-52 text-center shadow-xl">
                <p className="text-xs font-bold text-slate-100">{seat.username}</p>
                <p className="text-[10px] text-emerald-400 font-semibold">{seat.chips.toLocaleString()} Çip</p>
                
                {/* Insurance Indicator Tag */}
                {table.insuranceBet > 0 && (
                  <div className="mt-1.5 inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-bold">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Sigorta: {table.insuranceBet} $</span>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-slate-400 text-sm">
              Oyuncu koltuğu yükleniyor...
            </div>
          )}
        </div>

      </div>

      {/* Action Controls HUD */}
      <div className="z-10 bg-slate-950/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 w-full max-w-4xl mx-auto mt-4 shadow-2xl">
        
        {/* Betting options */}
        {seat && table.gameState === 'BETTING' && !seat.placedBet && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Bahsinizi Seçin</span>
            <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
              {[10, 25, 50, 100, 500].map((val) => (
                <button
                  key={`chip-select-${val}`}
                  onClick={() => setBetSelection(val)}
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-dashed font-extrabold flex items-center justify-center transition cursor-pointer text-xs md:text-sm select-none shadow-lg ${
                    betSelection === val 
                      ? 'bg-amber-500 text-slate-950 border-slate-100 scale-110 shadow-amber-500/25' 
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePlaceBet(betSelection)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg transition duration-200 cursor-pointer text-sm uppercase tracking-wider"
            >
              {betSelection} Çip ile Oyunu Başlat
            </button>
          </div>
        )}

        {/* Action Options (Hit, Stand, Double, Split) */}
        {isMyTurn && activeHand && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              Hamlenizi Seçin {seat.splitHand ? `(${table.activeHandType === 'main' ? 'El 1' : 'El 2'})` : ''}
            </span>
            <div className="flex flex-wrap gap-3 w-full max-w-2xl justify-center">
              <button
                onClick={() => handleAction('hit')}
                className="flex-1 min-w-[120px] max-w-[160px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200 cursor-pointer text-sm"
              >
                Hit (Kart Çek)
              </button>
              <button
                onClick={() => handleAction('stand')}
                className="flex-1 min-w-[120px] max-w-[160px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition duration-200 cursor-pointer text-sm"
              >
                Stand (Dur)
              </button>
              {activeHand.cards.length === 2 && seat.chips >= activeHand.bet && (
                <button
                  onClick={() => handleAction('double')}
                  className="flex-1 min-w-[120px] max-w-[160px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg transition duration-200 cursor-pointer text-sm"
                >
                  Double Down
                </button>
              )}
              {canSplit && (
                <button
                  onClick={() => handleAction('split')}
                  className="flex-1 min-w-[120px] max-w-[160px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200 cursor-pointer text-sm"
                >
                  Böl (Split)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Settled or dealing transition status messages */}
        {seat && seat.placedBet && table.gameState !== 'PLAYING' && table.gameState !== 'BETTING' && table.gameState !== 'INSURANCE_DECISION' && (
          <div className="text-center text-sm font-semibold text-slate-500 py-2">
            {table.gameState === 'DEALING' ? 'Kartlar veriliyor...' : 
             table.gameState === 'DEALER_TURN' ? 'Krupiye bot oynuyor...' : 
             'Tur sonlandı, kazançlar dağıtılıyor...'}
          </div>
        )}
      </div>

    </div>
  );
};
export default GameTable;
