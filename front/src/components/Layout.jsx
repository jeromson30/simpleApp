import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout({ children, currentUser, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentUser={currentUser}
        mobileOpen={mobileMenuOpen}
        onMobileClose={handleMobileMenuClose}
      />
      <Topbar
        currentUser={currentUser}
        onLogout={onLogout}
        onMenuToggle={handleMobileMenuToggle}
        menuOpen={mobileMenuOpen}
      />
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}
