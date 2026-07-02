import React, { useState } from 'react';
import { Coins, LogOut, User as UserIcon, Play } from 'lucide-react';

interface LobbyProps {
  user: { id: string; username: string; chips: number } | null;
  onJoinTable: (tableId: string) => void;
  onLogout: () => void;
  onRefreshUser: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const Lobby: React.FC<LobbyProps> = ({
  user,
  onJoinTable,
  onLogout,
  onRefreshUser,
}) => {
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleClaimChips = async () => {
    if (!user) return;
    setClaiming(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/claim-chips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ text: data.message, type: 'success' });
        onRefreshUser();
      } else {
        setMessage({ text: data.message || 'Çip talep edilirken bir hata oluştu.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Sunucuyla bağlantı kurulamadı.', type: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  const handleStartGame = () => {
    // Navigate directly to their single-player table
    onJoinTable('single_player');
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-start p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header Info */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center bg-forest/50 backdrop-blur-md border border-gold/20 rounded-2xl p-6 mb-8 gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gold/10 rounded-full border border-gold/20 text-gold">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-platinum leading-tight">Hoş geldin, {user?.username}</h2>
            <p className="text-xs text-gold/60">Krupiye bota karşı oyna ve şansını dene!</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Chip Balance */}
          <div className="flex items-center gap-3 bg-burgundy/20 border border-burgundy/40 px-5 py-2.5 rounded-xl text-gold font-bold text-lg">
            <Coins className="w-5 h-5 text-gold" />
            <span>{user?.chips.toLocaleString()} Çip</span>
          </div>

          {/* Claim Chips Button */}
          {user && user.chips < 100 && (
            <button
              onClick={handleClaimChips}
              disabled={claiming}
              className="bg-gradient-to-r from-gold-dark to-gold hover:from-gold hover:to-gold-light text-spruce font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 text-sm cursor-pointer"
            >
              {claiming ? 'Yükleniyor...' : '500 Çip Al'}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-forest-light hover:bg-forest text-gold font-medium px-4 py-2.5 rounded-xl border border-gold/25 transition duration-200 text-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-gold" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`w-full max-w-xl text-center p-3.5 mb-6 rounded-xl text-sm font-semibold border ${
          message.type === 'success' 
            ? 'bg-forest/40 border-gold/30 text-gold' 
            : 'bg-red-950/40 border-red-900/50 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Play Game Panel */}
      <div className="w-full max-w-xl bg-gradient-to-b from-forest/70 to-spruce/95 backdrop-blur-md border border-gold/25 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl mt-4 text-center">
        <span className="px-4 py-1.5 bg-burgundy/30 border border-gold/25 text-gold-light rounded-full text-xs font-bold uppercase tracking-wider mb-4">
          Tek Oyunculu Mod
        </span>

        <h1 className="text-3xl font-extrabold text-platinum tracking-wide mb-3">
          Krupiyeye Karşı Meydan Oku
        </h1>
        <p className="text-gold/70 text-sm max-w-md mb-8 leading-relaxed">
          Diğer oyuncuları beklemeden, kendi hızınızda blackjack (21) oynayın. Hit, Stand ve Double Down hamleleriyle dealer botu alt edin!
        </p>

        <button
          onClick={handleStartGame}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-spruce font-black py-4 px-8 rounded-2xl shadow-xl shadow-gold/5 hover:shadow-gold/20 hover:scale-[1.02] transition-all duration-300 cursor-pointer text-lg uppercase tracking-wider"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Oyunu Başlat</span>
        </button>

        {/* Large Chip Balance Display Under the Button */}
        <div className="mt-8 flex flex-col items-center gap-2 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-bold">Mevcut Bakiyeniz</span>
          <div className="flex items-center gap-4 bg-spruce/60 border border-gold/20 px-6 py-3 rounded-2xl shadow-inner backdrop-blur-sm">
            {/* A large, beautiful golden casino chip SVG representation */}
            <div className="relative w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-tr from-gold-dark via-gold to-gold-light border-4 border-dashed border-spruce shadow-lg shrink-0">
              <div className="absolute inset-[3px] rounded-full border border-dashed border-spruce/20 bg-spruce/30 flex items-center justify-center">
                <Coins className="w-5 h-5 text-spruce" />
              </div>
            </div>
            <span className="text-3xl font-black text-gold tracking-wide">
              {user?.chips.toLocaleString()} <span className="text-2xl font-black text-gold">ÇİP</span>
            </span>
          </div>
        </div>
      </div>

      <footer className="w-full text-center py-4 mt-8 text-[11px] text-gold/40 tracking-wider font-medium select-none z-10">
        Made by İrem TUNÇ and İncilay KURTULUŞ, 2026
      </footer>
    </div>
  );
};
export default Lobby;
