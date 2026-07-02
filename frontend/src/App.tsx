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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const authChannel = new BroadcastChannel('auth_channel');

export default function App() {
  const [user, setUser] = useState<UserState | null>(null);
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth form states
  const [isLogin, setIsLogin] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [showWakingUpMessage, setShowWakingUpMessage] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Fetch current user details using cookie credentials
  const fetchUser = async (customToken?: string) => {
    try {
      const activeToken = customToken || localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
        headers,
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Initialize Socket (it will use withCredentials and auth.token under the hood)
        const socket = connectSocket(activeToken || undefined);

        // Listen for balance updates from the backend
        socket.on('balance_update', ({ chips }: { chips: number }) => {
          setUser((prev) => prev ? { ...prev, chips } : null);
        });

      } else {
        // Token invalid/expired or no cookie session
        setUser(null);
        localStorage.removeItem('token');
        disconnectSocket();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      localStorage.removeItem('token');
      disconnectSocket();
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTable = (tableId: string | null) => {
    setCurrentTableId(tableId);
    authChannel.postMessage({ type: 'TABLE_CHANGE', tableId });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWakingUpMessage(true);
    }, 3000);

    fetchUser().finally(() => {
      clearTimeout(timer);
      setShowWakingUpMessage(false);
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LOGIN') {
        if (event.data.token) {
          localStorage.setItem('token', event.data.token);
        }
        setUser(event.data.user);
        connectSocket(event.data.token);
      } else if (event.data.type === 'LOGOUT') {
        localStorage.removeItem('token');
        setUser(null);
        setCurrentTableId(null);
        disconnectSocket();
      } else if (event.data.type === 'TABLE_CHANGE') {
        setCurrentTableId(event.data.tableId);
      } else if (event.data.type === 'CHIPS_UPDATE') {
        setUser((prev) => prev ? { ...prev, chips: event.data.chips } : null);
      }
    };
    authChannel.addEventListener('message', handleMessage);

    return () => {
      disconnectSocket();
      authChannel.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (user) {
      authChannel.postMessage({ type: 'CHIPS_UPDATE', chips: user.chips });
    }
  }, [user?.chips]);

  const handleLogout = async () => {
    try {
      const activeToken = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    localStorage.removeItem('token');
    setUser(null);
    setCurrentTableId(null);
    disconnectSocket();
    authChannel.postMessage({ type: 'LOGOUT' });
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
      const response = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        setUsernameInput('');
        setPasswordInput('');
        if (!isLogin) {
          setAuthSuccessMessage('Başarıyla kaydoldunuz! Lobiye yönlendiriliyorsunuz...');
          authChannel.postMessage({ type: 'LOGIN', token: data.token, user: data.user });
          setTimeout(async () => {
            setAuthSuccessMessage(null);
            await fetchUser(data.token);
          }, 2000);
        } else {
          authChannel.postMessage({ type: 'LOGIN', token: data.token, user: data.user });
          await fetchUser(data.token);
        }
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-spruce text-gold px-4 text-center">
        <Sparkles className="w-10 h-10 animate-spin mb-4 text-gold" />
        <span className="font-semibold text-sm tracking-wider uppercase">Yükleniyor...</span>
        {showWakingUpMessage && (
          <div className="mt-6 max-w-xs animate-fade-in">
            <p className="text-xs text-gold/70 leading-relaxed font-bold">
              Sunucu Uyandırılıyor...
            </p>
            <p className="text-[10px] text-gold/40 mt-1.5 leading-relaxed">
              Render ücretsiz planı kullanıldığından, 15 dakika işlem yapılmadığında sunucu otomatik olarak uyku moduna geçer. İlk açılış 30-50 saniye sürebilir.
            </p>
          </div>
        )}
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

        <div className={`w-full max-w-md backdrop-blur-xl border p-8 rounded-3xl shadow-2xl relative z-10 transition-all duration-300 ${
          isLogin 
            ? 'bg-forest/50 border-gold/25' 
            : 'bg-burgundy/30 border-gold/40 shadow-burgundy/5'
        }`}>
          
          {/* Logo / Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 border transition-all duration-300 ${
              isLogin
                ? 'bg-gradient-to-tr from-gold-dark via-gold to-gold-light shadow-gold/20 border-gold/40'
                : 'bg-gradient-to-tr from-burgundy-light via-burgundy to-black shadow-burgundy/30 border-gold/50'
            }`}>
              <Coins className={`w-9 h-9 ${isLogin ? 'text-spruce' : 'text-gold'}`} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-platinum via-gold-light to-gold bg-clip-text text-transparent">
              {isLogin ? 'ROYAL BLACKJACK' : 'YENİ ÜYE KAYDI'}
            </h1>
            <p className="text-gold/70 text-xs mt-2 font-medium max-w-[280px]">
              {isLogin 
                ? 'Gerçek Zamanlı Çok Oyunculu Casino Deneyimi' 
                : 'Kaydolun ve 1.000 Bedava Casino Çipi Kazanın!'}
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

            {authSuccessMessage && (
              <div className="flex items-center gap-2 p-3 bg-forest/40 border border-gold/30 rounded-xl text-gold text-xs font-semibold animate-pulse">
                <Sparkles className="w-4 h-4 text-gold shrink-0 animate-spin" />
                <span>{authSuccessMessage}</span>
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
              className={`w-full font-black py-3.5 rounded-xl shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2 ${
                isLogin
                  ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:from-gold hover:to-gold-light text-spruce shadow-gold/5 hover:shadow-gold/15'
                  : 'bg-gradient-to-r from-burgundy-light via-burgundy to-black hover:opacity-90 text-gold border border-gold/30 shadow-burgundy/10 hover:shadow-burgundy/25'
              }`}
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

        <footer className="w-full text-center py-4 mt-6 text-[11px] text-gold/40 tracking-wider font-medium select-none z-10">
          Made by İrem TUNÇ and İncilay KURTULUŞ, 2026
        </footer>
      </div>
    );
  }

  // Seated at table: Show active GameTable screen
  if (currentTableId) {
    return (
      <GameTable
        socket={getSocket()}
        tableId={currentTableId}
        onBackToLobby={() => handleJoinTable(null)}
      />
    );
  }

  // Default: Show Lobby screen
  return (
    <Lobby
      user={user}
      onJoinTable={handleJoinTable}
      onLogout={handleLogout}
      onRefreshUser={() => fetchUser()}
    />
  );
}
