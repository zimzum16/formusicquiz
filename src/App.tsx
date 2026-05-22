import { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SongInfo from './pages/SongInfo';
import Editor from './pages/Editor';
import Pricing from './pages/Pricing';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

export type Page = 'home' | 'song-info' | 'editor' | 'pricing' | 'auth' | 'profile';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigate = (page: Page) => setCurrentPage(page);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar currentPage={currentPage} navigate={navigate} isLoggedIn={isLoggedIn} />
      {currentPage === 'home' && <Home navigate={navigate} />}
      {currentPage === 'song-info' && <SongInfo />}
      {currentPage === 'editor' && <Editor />}
      {currentPage === 'pricing' && <Pricing navigate={navigate} />}
      {currentPage === 'auth' && <Auth navigate={navigate} onLogin={() => setIsLoggedIn(true)} />}
      {currentPage === 'profile' && <Profile navigate={navigate} onLogout={() => { setIsLoggedIn(false); navigate('home'); }} />}
    </div>
  );
}

export default App;
