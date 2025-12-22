import { useLocation } from 'react-router-dom';
import { Menu, X, Lock, LogOut, Shield, Users, FileText, TrendingUp, MessageSquare, Settings, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import NotificationCenter from './NotificationCenter';

// Configuration API
const API_BASE = process.env.REACT_APP_API_URL || '/api/crm';

// AuthService pour NotificationCenter
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

// Composant Header avec titre dynamique et user menu CRM
export function Header({ menuOpen, setMenuOpen, onLogout, currentUser }) {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const getTitleByPath = (path) => {
    switch(path) {
      case '/':
        return 'Accueil';
      case '/offers':
        return 'Offres';
      case '/contact':
        return 'Contact';
      case '/crm':
        return 'CRM Pro';
      case '/admin':
        return 'Administration';
      default:
        return 'Mon Application';
    }
  };

  const title = getTitleByPath(location.pathname);

  const handleLogout = () => {
    setShowUserMenu(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <h1 className="navbar-title">Prism CRM</h1>
          
          <div className="desktop-menu">
            <a href="/">Accueil</a>
            <a href="/offers">Offres</a>
            <a href="/contact">Contact</a>

            {/* Séparateur visuel */}
            {currentUser && <div className="nav-separator"></div>}

            {/* Menu CRM si connecté */}
            {currentUser ? (
              <>
                <a href="/crm/dashboard" className={`nav-crm-link ${location.pathname === '/crm/dashboard' || location.pathname === '/crm' ? 'active' : ''}`}>
                  <LayoutDashboard size={16} /> Dashboard
                </a>
                <a href="/crm/contacts" className={`nav-crm-link ${location.pathname === '/crm/contacts' ? 'active' : ''}`}>
                  <Users size={16} /> Contacts
                </a>
                <a href="/crm/devis" className={`nav-crm-link ${location.pathname === '/crm/devis' ? 'active' : ''}`}>
                  <FileText size={16} /> Devis
                </a>
                <a href="/crm/pipeline" className={`nav-crm-link ${location.pathname === '/crm/pipeline' ? 'active' : ''}`}>
                  <TrendingUp size={16} /> Pipeline
                </a>
                <a href="/crm/interactions" className={`nav-crm-link ${location.pathname === '/crm/interactions' ? 'active' : ''}`}>
                  <MessageSquare size={16} /> Interactions
                </a>
                <a href="/crm/administration" className={`nav-crm-link ${location.pathname === '/crm/administration' ? 'active' : ''}`}>
                  <Settings size={16} /> Administration
                </a>
              </>
            ) : (
              <a href="/crm" className="nav-crm-btn" title="Accès CRM">
                <Lock size={18} />
              </a>
            )}

            <a href="/admin" className="nav-admin-btn" title="Administration">
              <Shield size={18} />
            </a>
          </div>

          {/* Notification Center (si connecté au CRM) */}
          {currentUser && (
            <NotificationCenter API_BASE={API_BASE} AuthService={AuthService} />
          )}

          {/* User Menu (si connecté au CRM) */}
          {currentUser && (
            <div className="user-menu-desktop">
              <button
                className="user-menu-toggle"
                onClick={() => setShowUserMenu(!showUserMenu)}
                title={currentUser.email}
              >
                <div className="user-avatar">
                  {currentUser.email.charAt(0).toUpperCase()}
                </div>
              </button>
              
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <p className="user-email">{currentUser.email}</p>
                  </div>
                  <button 
                    className="user-menu-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          )}

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
          <a href="/offers">Offres</a>
          <a href="/contact">Contact</a>

          {/* Séparateur dans le menu mobile */}
          {currentUser && <div className="mobile-nav-separator">CRM</div>}

          {/* Menu CRM si connecté */}
          {currentUser ? (
            <>
              <a href="/crm/dashboard" className="mobile-crm-link">
                <LayoutDashboard size={16} /> Dashboard
              </a>
              <a href="/crm/contacts" className="mobile-crm-link">
                <Users size={16} /> Contacts
              </a>
              <a href="/crm/devis" className="mobile-crm-link">
                <FileText size={16} /> Devis
              </a>
              <a href="/crm/pipeline" className="mobile-crm-link">
                <TrendingUp size={16} /> Pipeline
              </a>
              <a href="/crm/interactions" className="mobile-crm-link">
                <MessageSquare size={16} /> Interactions
              </a>
              <a href="/crm/administration" className="mobile-crm-link">
                <Settings size={16} /> Administration
              </a>
            </>
          ) : (
            <a href="/crm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} /> CRM
            </a>
          )}

          <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={18} /> Admin
          </a>
          {currentUser && (
            <button
              className="mobile-logout-btn"
              onClick={handleLogout}
            >
              <LogOut size={16} /> Déconnexion
            </button>
          )}
        </div>
      )}

      {location.pathname === '/stats' && !currentUser && (
        <div className="banner">
          <div className="banner-container">
            <h2 className="banner-title">{title}</h2>
            <p className="banner-subtitle">Découvrez nos offres d'abonnement CRM adaptées à vos besoins</p>
          </div>
        </div>
      )}
    </>
  );
}