import { useState, useEffect } from 'react';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/GameTable';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
import { Coins, ShieldAlert, Sparkles, User, Lock, ArrowRight } from 'lucide-react';

interface UserState {
  id: string;
  username: string;
  chips: number;
}

export default function App() {
  const [user, setUser] = useState<UserState | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth form states
  const [isLogin, setIsLogin] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Fetch current user details
  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Initialize Socket
        const socket = connectSocket(authToken);

        // Listen for balance updates from the backend
        socket.on('balance_update', ({ chips }: { chips: number }) => {
          setUser((prev) => prev ? { ...prev, chips } : null);
        });

      } else {
        // Token invalid/expired
        handleLogout();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }

    return () => {
      disconnectSocket();
    };
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCurrentTableId(null);
    disconnectSocket();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (!usernameInput.trim() || !passwordInput.trim()) {
      setAuthError('Kullanıcı adı ve şifre gereklidir.');
      setAuthLoading(false);
      return;
    }

    const endpoint = isLogin ? 'login' : 'register';

    try {
      const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUsernameInput('');
        setPasswordInput('');
      } else {
        setAuthError(data.message || 'Giriş işlemi başarısız oldu.');
      }
    } catch (error) {
      setAuthError('Sunucu bağlantı hatası.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-spruce text-gold">
        <Sparkles className="w-10 h-10 animate-spin mb-4 text-gold" />
        <span className="font-semibold text-sm tracking-wider uppercase">Yükleniyor...</span>
      </div>
    );
  }

  // Not logged in: Show Login/Register view
  if (!user) {
    return (
      <div className="min-h-screen bg-spruce flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
        {/* Subtle glowing backgrounds */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-burgundy/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold/10 rounded-full blur-[120px]" />

        <div className="w-full max-w-md bg-forest/50 backdrop-blur-xl border border-gold/25 p-8 rounded-3xl shadow-2xl relative z-10">
          
          {/* Logo / Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-gold-dark via-gold to-gold-light rounded-2xl flex items-center justify-center shadow-lg shadow-gold/20 mb-4 border border-gold/40">
              <Coins className="w-9 h-9 text-spruce" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-platinum via-gold-light to-gold bg-clip-text text-transparent">
              ROYAL BLACKJACK
            </h1>
            <p className="text-gold/70 text-xs mt-2 font-medium max-w-[280px]">
              Gerçek Zamanlı Çok Oyunculu Casino Deneyimi
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gold/80 uppercase tracking-wider block">Kullanıcı Adı</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold/50">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Kullanıcı adınızı girin"
                  className="w-full bg-spruce/80 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-sm text-platinum placeholder:text-gold/30 focus:outline-none focus:border-gold transition duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gold/80 uppercase tracking-wider block">Şifre</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold/50">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-spruce/80 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-sm text-platinum placeholder:text-gold/30 focus:outline-none focus:border-gold transition duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:from-gold hover:to-gold-light text-spruce font-black py-3.5 rounded-xl shadow-xl shadow-gold/5 hover:shadow-gold/15 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{authLoading ? 'İşlem yapılıyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
              {!authLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-xs text-gold/60">
            {isLogin ? (
              <p>
                Hesabınız yok mu?{' '}
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setAuthError(null);
                  }}
                  className="text-gold hover:text-gold-light hover:underline font-semibold cursor-pointer ml-1"
                >
                  Kayıt Olun
                </button>
              </p>
            ) : (
              <p>
                Zaten hesabınız var mı?{' '}
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setAuthError(null);
                  }}
                  className="text-gold hover:text-gold-light hover:underline font-semibold cursor-pointer ml-1"
                >
                  Giriş Yapın
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    );
  }

  // Seated at table: Show active GameTable screen
  if (currentTableId) {
    return (
      <GameTable
        socket={getSocket()}
        tableId={currentTableId}
        onBackToLobby={() => setCurrentTableId(null)}
      />
    );
  }

  // Default: Show Lobby screen
  return (
    <Lobby
      user={user}
      onJoinTable={(tableId) => setCurrentTableId(tableId)}
      onLogout={handleLogout}
      onRefreshUser={() => token && fetchUser(token)}
    />
  );
}
