import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  MessageSquare,
  Settings,
  Home,
  Briefcase,
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import soundManager from '../utils/sounds';
import '../styles/components/sidebar.css';

export function Sidebar({ currentUser, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleNavigation = (path) => {
    soundManager.click();
    navigate(path);
    // Close mobile menu after navigation
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const toggleCollapse = () => {
    soundManager.click();
    setCollapsed(!collapsed);
  };

  const mainLinks = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/offers', icon: Briefcase, label: 'Offres' },
    { path: '/contact', icon: Mail, label: 'Contact' },
  ];

  const crmLinks = currentUser ? [
    { path: '/crm/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/crm/contacts', icon: Users, label: 'Contacts' },
    { path: '/crm/devis', icon: FileText, label: 'Devis' },
    { path: '/crm/pipeline', icon: TrendingUp, label: 'Pipeline' },
    { path: '/crm/interactions', icon: MessageSquare, label: 'Interactions' },
    { path: '/crm/administration', icon: Settings, label: 'Administration' },
  ] : [];

  const isActive = (path) => {
    if (path === '/crm/dashboard') {
      return location.pathname === '/crm/dashboard' || location.pathname === '/crm';
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={onMobileClose}
      />

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo animate-fadeIn">
            <div className="logo-icon">
              <LayoutDashboard size={28} />
            </div>
            <div className="logo-text">
              <h2>Prism CRM</h2>
              <span>Professional Edition</span>
            </div>
          </div>
        )}
        <button
          className="sidebar-toggle hover-scale transition-all"
          onClick={toggleCollapse}
          title={collapsed ? 'Développer' : 'Réduire'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {/* Section Principale */}
        <div className="nav-section">
          {!collapsed && <div className="nav-section-title">Navigation</div>}
          {mainLinks.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              className={`nav-link ${isActive(path) ? 'active' : ''} transition-all`}
              onClick={() => handleNavigation(path)}
              title={collapsed ? label : ''}
            >
              <Icon size={20} className="nav-link-icon" />
              {!collapsed && <span className="nav-link-text">{label}</span>}
            </button>
          ))}
        </div>

        {/* Section CRM */}
        {currentUser && crmLinks.length > 0 && (
          <div className="nav-section">
            {!collapsed && <div className="nav-section-title">CRM</div>}
            {crmLinks.map(({ path, icon: Icon, label }) => (
              <button
                key={path}
                className={`nav-link ${isActive(path) ? 'active' : ''} transition-all`}
                onClick={() => handleNavigation(path)}
                title={collapsed ? label : ''}
              >
                <Icon size={20} className="nav-link-icon" />
                {!collapsed && <span className="nav-link-text">{label}</span>}
                {isActive(path) && <div className="nav-link-indicator" />}
              </button>
            ))}
          </div>
        )}
      </nav>
    </aside>
    </>
  );
}
