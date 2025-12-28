import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, ArrowRight, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import soundManager from '../utils/sounds';
import toast from 'react-hot-toast';

export function Header({ menuOpen, setMenuOpen, onLogout, currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Fermer le menu utilisateur en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    soundManager.click();
    setShowUserMenu(false);
    toast.success('Déconnexion réussie', {
      duration: 2000,
      position: 'top-center',
    });
    if (onLogout) {
      onLogout();
    }
  };

  const handleMenuToggle = () => {
    soundManager.click();
    setMenuOpen(!menuOpen);
  };

  const handleUserMenuToggle = () => {
    soundManager.click();
    setShowUserMenu(!showUserMenu);
  };

  const handleCrmAccess = () => {
    soundManager.click();
    navigate('/crm');
  };

  return (
    <>
      <nav className="navbar-modern">
        <div className="navbar-modern-container">
          {/* Logo */}
          <a href="/" className="navbar-logo" onClick={() => soundManager.click()}>
            <div className="logo-icon-modern">
              <LayoutDashboard size={24} />
            </div>
            <span className="logo-text-modern">Prism CRM</span>
          </a>

          {/* Navigation - Seulement si NON connecté */}
          {!currentUser && (
            <div className="navbar-links">
              <a href="/" className={location.pathname === '/' ? 'active' : ''}>
                Accueil
              </a>
              <a href="/offers" className={location.pathname === '/offers' ? 'active' : ''}>
                Offres
              </a>
              <a href="/contact" className={location.pathname === '/contact' ? 'active' : ''}>
                Contact
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="navbar-actions">
            {currentUser ? (
              <>
                {/* Bouton CRM Principal */}
                <button
                  onClick={handleCrmAccess}
                  className="btn-crm-access"
                >
                  <LayoutDashboard size={18} />
                  <span>Accéder au CRM</span>
                  <ArrowRight size={16} />
                </button>

                {/* Menu Utilisateur */}
                <div className="user-menu-container" ref={userMenuRef}>
                  <button
                    className="user-menu-button"
                    onClick={handleUserMenuToggle}
                    title={currentUser.email}
                  >
                    <div className="user-avatar-modern">
                      {currentUser.email.charAt(0).toUpperCase()}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="user-dropdown-modern animate-fadeInDown">
                      <div className="user-dropdown-header">
                        <div className="user-avatar-large-modern">
                          {currentUser.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="user-dropdown-name">{currentUser.email.split('@')[0]}</p>
                          <p className="user-dropdown-email">{currentUser.email}</p>
                        </div>
                      </div>
                      <div className="user-dropdown-divider" />
                      <button
                        className="user-dropdown-logout"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Bouton Se connecter */}
                <button
                  onClick={handleCrmAccess}
                  className="btn-login"
                >
                  <User size={18} />
                  <span>Se connecter</span>
                </button>
              </>
            )}

            {/* Menu Mobile Toggle */}
            <button
              onClick={handleMenuToggle}
              className="mobile-menu-toggle-modern"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Mobile */}
      {menuOpen && (
        <div className="mobile-menu-modern animate-fadeInDown">
          {!currentUser && (
            <>
              <a href="/" onClick={() => soundManager.click()}>
                Accueil
              </a>
              <a href="/offers" onClick={() => soundManager.click()}>
                Offres
              </a>
              <a href="/contact" onClick={() => soundManager.click()}>
                Contact
              </a>
              <div className="mobile-divider" />
            </>
          )}

          {currentUser ? (
            <>
              <button
                onClick={handleCrmAccess}
                className="mobile-crm-btn"
              >
                <LayoutDashboard size={18} />
                <span>Accéder au CRM</span>
                <ArrowRight size={16} />
              </button>
              <div className="mobile-divider" />
              <button
                className="mobile-logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Déconnexion</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleCrmAccess}
              className="mobile-login-btn"
            >
              <User size={18} />
              <span>Se connecter</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
