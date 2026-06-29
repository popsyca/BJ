import React, { useState } from 'react';
import { Coins, LogOut, User as UserIcon, Play } from 'lucide-react';

interface LobbyProps {
  user: { id: string; username: string; chips: number } | null;
  onJoinTable: (tableId: string) => void;
  onLogout: () => void;
  onRefreshUser: () => void;
}

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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/claim-chips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      <div className="w-full flex flex-col md:flex-row justify-between items-center bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 mb-8 gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-400">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 leading-tight">Hoş geldin, {user?.username}</h2>
            <p className="text-xs text-slate-400">Krupiye bota karşı oyna ve şansını dene!</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Chip Balance */}
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 rounded-xl text-emerald-400 font-bold text-lg">
            <Coins className="w-5 h-5 text-emerald-400" />
            <span>{user?.chips.toLocaleString()} Çip</span>
          </div>

          {/* Claim Chips Button */}
          {user && user.chips < 100 && (
            <button
              onClick={handleClaimChips}
              disabled={claiming}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 text-sm cursor-pointer"
            >
              {claiming ? 'Yükleniyor...' : '500 Çip Al'}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 font-medium px-4 py-2.5 rounded-xl border border-slate-700/50 transition duration-200 text-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`w-full max-w-xl text-center p-3.5 mb-6 rounded-xl text-sm font-semibold border ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Play Game Panel */}
      <div className="w-full max-w-xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl mt-4 text-center">
        <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
          Tek Oyunculu Mod
        </span>

        <h1 className="text-3xl font-serif font-extrabold text-slate-100 tracking-wide mb-3">
          Krupiyeye Karşı Meydan Oku
        </h1>
        <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
          Diğer oyuncuları beklemeden, kendi hızınızda blackjack (21) oynayın. Hit, Stand ve Double Down hamleleriyle dealer botu alt edin!
        </p>

        <button
          onClick={handleStartGame}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer text-lg uppercase tracking-wider"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Oyunu Başlat</span>
        </button>
      </div>

    </div>
  );
};
export default Lobby;
