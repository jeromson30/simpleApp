import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Shield, ShieldOff, Trash2, Search, RefreshCw, 
  LayoutDashboard, FileText, Image, Settings, LogOut,
  Plus, Edit2, Save, X, Crown, AlertTriangle,
  UserCheck, UserX, Activity, ChevronDown,
  Grip, ArrowUp, ArrowDown, Zap
} from 'lucide-react';

// Configuration API
const ADMIN_API = '/api/admin';

// Styles inline
const styles = {
  // Login
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    padding: '2rem'
  },
  loginCard: {
    background: '#1a1a24',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '3rem',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center'
  },
  loginHeader: {
    marginBottom: '2rem',
    color: 'white'
  },
  loginTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'white',
    margin: '1rem 0 0.5rem 0'
  },
  loginSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    margin: 0
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.95rem',
    marginBottom: '1rem',
    boxSizing: 'border-box'
  },
  btnPrimary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '0.9rem',
    marginBottom: '1rem'
  },
  hint: {
    marginTop: '1.5rem',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.85rem'
  },
  // Main layout
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a0f'
  },
  sidebar: {
    width: '260px',
    background: '#12121a',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    zIndex: 100
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#3b82f6'
  },
  sidebarTitle: {
    fontWeight: '700',
    fontSize: '1.1rem',
    color: 'white',
    margin: 0
  },
  nav: {
    flex: 1,
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontSize: '0.95rem'
  },
  navItemActive: {
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6'
  },
  sidebarFooter: {
    padding: '1rem 0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)'
  },
  main: {
    flex: 1,
    marginLeft: '260px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    background: '#12121a',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 50
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'white',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '20px',
    color: '#8b5cf6',
    fontSize: '0.85rem'
  },
  content: {
    padding: '2rem',
    color: 'white'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    background: '#1a1a24',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white'
  },
  statNumber: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    margin: 0,
    fontSize: '0.9rem'
  },
  card: {
    background: '#1a1a24',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 1rem 0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '1rem 1.25rem',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  td: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'white'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  badgeActive: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981'
  },
  badgeSuspended: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444'
  },
  badgeOwner: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b'
  },
  btnIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    marginRight: '0.5rem'
  },
  select: {
    padding: '0.4rem 0.75rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    width: '300px'
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '0.9rem',
    outline: 'none'
  }
};

// ==================== AUTH SERVICE ====================

const AuthService = {
  getToken: () => sessionStorage.getItem('admin_token'),
  setToken: (token) => sessionStorage.setItem('admin_token', token),
  getUser: () => {
    const user = sessionStorage.getItem('admin_user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user) => sessionStorage.setItem('admin_user', JSON.stringify(user)),
  clearAuth: () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
  },
  isAuthenticated: () => !!sessionStorage.getItem('admin_token'),
  getAuthHeaders: () => {
    const token = sessionStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
};

// ==================== API SERVICE ====================

const ApiService = {
  async request(endpoint, options = {}) {
    const url = `${ADMIN_API}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...AuthService.getAuthHeaders(),
        ...options.headers
      }
    };

    const response = await fetch(url, config);
    
    if (response.status === 401) {
      AuthService.clearAuth();
      window.location.reload();
      throw new Error('Session expirée');
    }
    
    return response;
  },

  async adminLogin(email, password) {
    const response = await fetch(`${ADMIN_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response;
  },

  async getAllUsers() {
    return this.request('/users');
  },

  async suspendUser(userId, suspended) {
    return this.request(`/users/${userId}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ suspended })
    });
  },

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, { method: 'DELETE' });
  },

  async updateUserLicense(userId, license) {
    return this.request(`/users/${userId}/license`, {
      method: 'PATCH',
      body: JSON.stringify({ license })
    });
  },

  async getAdminStats() {
    return this.request('/stats');
  }
};

// ==================== ADMIN PANEL COMPONENT ====================

function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      if (AuthService.isAuthenticated()) {
        const user = AuthService.getUser();
        if (user?.isAdmin) {
          setAdminUser(user);
          setIsAuthenticated(true);
        } else {
          AuthService.clearAuth();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        ApiService.getAllUsers(),
        ApiService.getAdminStats()
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const response = await ApiService.adminLogin(email, password);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

      if (!data.user.isAdmin) {
        throw new Error('Accès non autorisé');
      }

      AuthService.setToken(data.token);
      AuthService.setUser(data.user);
      setAdminUser(data.user);
      setIsAuthenticated(true);
      setEmail('');
      setPassword('');

    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.clearAuth();
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  // User management
  const handleSuspendUser = async (userId, currentStatus) => {
    if (!window.confirm(`Voulez-vous ${currentStatus ? 'réactiver' : 'suspendre'} cet utilisateur ?`)) return;

    try {
      const response = await ApiService.suspendUser(userId, !currentStatus);
      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, suspended: !currentStatus } : u));
      }
    } catch (error) {
      alert('Erreur');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;

    try {
      const response = await ApiService.deleteUser(userId);
      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (error) {
      alert('Erreur');
    }
  };

  const handleUpdateLicense = async (userId, license) => {
    try {
      const response = await ApiService.updateUserLicense(userId, license);
      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, license } : u));
      }
    } catch (error) {
      alert('Erreur');
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Loading
  if (isLoading) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <RefreshCw size={48} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'white', marginTop: '1rem' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <Shield size={48} style={{ color: '#3b82f6' }} />
            <h1 style={styles.loginTitle}>Administration</h1>
            <p style={styles.loginSubtitle}>Prism CRM - Panel Admin</p>
          </div>

          {loginError && (
            <div style={styles.error}>
              <AlertTriangle size={16} />
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email administrateur"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? <RefreshCw size={18} /> : <Shield size={18} />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p style={styles.hint}>Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  // Main interface
  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <Shield size={28} />
          <span style={styles.sidebarTitle}>Admin Panel</span>
        </div>

        <nav style={styles.nav}>
          <button
            style={{ ...styles.navItem, ...(activeSection === 'dashboard' ? styles.navItemActive : {}) }}
            onClick={() => setActiveSection('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            style={{ ...styles.navItem, ...(activeSection === 'users' ? styles.navItemActive : {}) }}
            onClick={() => setActiveSection('users')}
          >
            <Users size={20} />
            <span>Utilisateurs</span>
          </button>
          <button
            style={{ ...styles.navItem, ...(activeSection === 'settings' ? styles.navItemActive : {}) }}
            onClick={() => setActiveSection('settings')}
          >
            <Settings size={20} />
            <span>Paramètres</span>
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <button style={{ ...styles.navItem, color: '#ef4444' }} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>
            {activeSection === 'dashboard' && 'Dashboard'}
            {activeSection === 'users' && 'Gestion des Utilisateurs'}
            {activeSection === 'settings' && 'Paramètres'}
          </h1>
          <div style={styles.headerRight}>
            <button style={styles.btnIcon} onClick={loadData} title="Rafraîchir">
              <RefreshCw size={18} />
            </button>
            <div style={styles.userBadge}>
              <Crown size={16} />
              <span>{adminUser?.email}</span>
            </div>
          </div>
        </header>

        <div style={styles.content}>
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 style={styles.statNumber}>{stats?.totalUsers || 0}</h3>
                    <p style={styles.statLabel}>Utilisateurs</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <h3 style={styles.statNumber}>{stats?.activeUsers || 0}</h3>
                    <p style={styles.statLabel}>Actifs</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    <UserX size={24} />
                  </div>
                  <div>
                    <h3 style={styles.statNumber}>{stats?.suspendedUsers || 0}</h3>
                    <p style={styles.statLabel}>Suspendus</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 style={styles.statNumber}>{stats?.totalContacts || 0}</h3>
                    <p style={styles.statLabel}>Contacts CRM</p>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Derniers Utilisateurs</h3>
                {users.slice(0, 5).map(user => (
                  <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600' }}>
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, color: 'white' }}>{user.email}</p>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{user.license}</span>
                    </div>
                    {user.suspended && <span style={{ ...styles.badge, ...styles.badgeSuspended }}>Suspendu</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Users */}
          {activeSection === 'users' && (
            <>
              <div style={styles.toolbar}>
                <div style={styles.searchBox}>
                  <Search size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{filteredUsers.length} utilisateur(s)</span>
              </div>

              <div style={styles.card}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Utilisateur</th>
                      <th style={styles.th}>Licence</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Statut</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600' }}>
                              {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: '500' }}>{user.email}</p>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <select
                            value={user.license}
                            onChange={(e) => handleUpdateLicense(user.id, e.target.value)}
                            style={styles.select}
                          >
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="business">Business</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          {user.is_owner ? (
                            <span style={{ ...styles.badge, ...styles.badgeOwner }}><Crown size={12} /> Owner</span>
                          ) : (
                            <span style={{ ...styles.badge, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>Member</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {user.suspended ? (
                            <span style={{ ...styles.badge, ...styles.badgeSuspended }}><ShieldOff size={12} /> Suspendu</span>
                          ) : (
                            <span style={{ ...styles.badge, ...styles.badgeActive }}><Shield size={12} /> Actif</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <button
                            style={styles.btnIcon}
                            onClick={() => handleSuspendUser(user.id, user.suspended)}
                            title={user.suspended ? 'Réactiver' : 'Suspendre'}
                          >
                            {user.suspended ? <Shield size={16} /> : <ShieldOff size={16} />}
                          </button>
                          <button
                            style={{ ...styles.btnIcon, color: '#ef4444' }}
                            onClick={() => handleDeleteUser(user.id)}
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Settings */}
          {activeSection === 'settings' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Informations Admin</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}><strong style={{ color: 'white' }}>Email:</strong> {adminUser?.email}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}><strong style={{ color: 'white' }}>Rôle:</strong> Super Administrateur</p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AdminPanel;