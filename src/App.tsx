import { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SongInfo from './pages/SongInfo';
import Editor from './pages/Editor';
import Pricing from './pages/Pricing';

export type Page = 'home' | 'song-info' | 'editor' | 'pricing';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigate = (page: Page) => setCurrentPage(page);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar currentPage={currentPage} navigate={navigate} />
      {currentPage === 'home' && <Home navigate={navigate} />}
      {currentPage === 'song-info' && <SongInfo />}
      {currentPage === 'editor' && <Editor />}
      {currentPage === 'pricing' && <Pricing navigate={navigate} />}
    </div>
  );
}

export default App;
