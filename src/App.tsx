import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SongInfo from './pages/SongInfo';
import Editor from './pages/Editor';
import Pricing from './pages/Pricing';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import { authApi, User } from './lib/api';

export type Page = 'home' | 'song-info' | 'editor' | 'pricing' | 'auth' | 'profile';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let ignore = false;
    const token = localStorage.getItem('token');
    if (!token) return;
    authApi.me()
      .then(({ user }) => { if (!ignore) setUser(user); })
      .catch(() => { if (!ignore) localStorage.removeItem('token'); });
    return () => { ignore = true; };
  }, []);

  const navigate = (page: Page) => setCurrentPage(page);

  const handleLogin = (u: User) => setUser(u);

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    setUser(null);
    navigate('home');
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar currentPage={currentPage} navigate={navigate} isLoggedIn={!!user} />
      {currentPage === 'home' && <Home navigate={navigate} />}
      {currentPage === 'song-info' && <SongInfo />}
      {currentPage === 'editor' && <Editor />}
      {currentPage === 'pricing' && <Pricing navigate={navigate} />}
      {currentPage === 'auth' && <Auth navigate={navigate} onLogin={handleLogin} />}
      {currentPage === 'profile' && <Profile navigate={navigate} user={user} onLogout={handleLogout} />}
    </div>
  );
}

export default App;
