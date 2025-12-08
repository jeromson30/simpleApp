import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

// Composant Header avec titre dynamique
export function Header({ menuOpen, setMenuOpen }) {
  const location = useLocation();
  
  const getTitleByPath = (path) => {
    switch(path) {
      case '/':
        return 'Accueil';
      case '/stats':
        return 'Statistiques';
      case '/contact':
        return 'Contact';
      default:
        return 'Mon Application';
    }
  };

  const title = getTitleByPath(location.pathname);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <h1 className="navbar-title">Mon Application</h1>
          
          <div className="desktop-menu">
            <a href="/">Accueil</a>
            <a href="/stats">Stats</a>
            <a href="/contact">Contact</a>
          </div>

          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="mobile-menu-btn"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu">
          <a href="/">Accueil</a>
          <a href="/stats">Stats</a>
          <a href="/contact">Contact</a>
        </div>
      )}

      <div className="banner">
        <div className="banner-container">
          <h2 className="banner-title">{title}</h2>
          <p className="banner-subtitle">Découvrez vos statistiques Battlefield 6</p>
        </div>
      </div>
    </>
  );
}