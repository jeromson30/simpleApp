import { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, Shield, Menu, X } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import soundManager from '../utils/sounds';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || '/api/crm';

const AuthService = {
  getAuthHeaders: () => {
    const token = localStorage.getItem('crm_token') || sessionStorage.getItem('crm_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  },
  getUser: () => {
    const userSession = sessionStorage.getItem('crm_user');
    const userLocal = localStorage.getItem('crm_user');
    const user = userLocal || userSession;
    return user ? JSON.parse(user) : null;
  }
};

export function Topbar({ currentUser, onLogout, onMenuToggle, menuOpen }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);

  // Close user menu when clicking outside
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

  const handleUserMenuToggle = () => {
    soundManager.click();
    setShowUserMenu(!showUserMenu);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      soundManager.click();
      // TODO: Implement search functionality
      toast('Recherche: ' + searchQuery, { icon: '🔍' });
    }
  };

  const handleMobileMenuToggle = () => {
    soundManager.click();
    if (onMenuToggle) {
      onMenuToggle();
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-container">
        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle hover-scale transition-all"
          onClick={handleMobileMenuToggle}
          title={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Search Bar */}
        <div className="topbar-search">
          <form onSubmit={handleSearch}>
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="topbar-actions">
          {/* Admin Button */}
          <a
            href="/admin"
            className="topbar-action-btn hover-scale transition-all"
            title="Administration"
            onClick={() => soundManager.click()}
          >
            <Shield size={20} />
          </a>

          {/* Notification Center */}
          {currentUser && (
            <NotificationCenter API_BASE={API_BASE} AuthService={AuthService} />
          )}

          {/* User Menu */}
          {currentUser && (
            <div className="topbar-user-menu" ref={userMenuRef}>
              <button
                className="topbar-user-toggle hover-scale transition-all"
                onClick={handleUserMenuToggle}
                title={currentUser.email}
              >
                <div className="user-avatar">
                  {currentUser.email.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{currentUser.email.split('@')[0]}</span>
                  <span className="user-role">Utilisateur</span>
                </div>
              </button>

              {showUserMenu && (
                <div className="user-dropdown animate-fadeInDown">
                  <div className="user-dropdown-header">
                    <div className="user-avatar-large">
                      {currentUser.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-dropdown-info">
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
          )}
        </div>
      </div>
    </header>
  );
}
