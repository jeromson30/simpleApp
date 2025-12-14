import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Shield, ShieldOff, Trash2, Search, RefreshCw, 
  LayoutDashboard, Settings, LogOut, Plus, Edit2, Save, X, 
  Crown, AlertTriangle, UserCheck, UserX, Activity,
  ArrowUp, ArrowDown, Zap, TrendingUp, MessageSquare,
  Download, Eye, FileText, Image, Newspaper, Euro, PieChart, CreditCard
} from 'lucide-react';

const ADMIN_API = '/api/admin';

const AVAILABLE_ICONS = [
  { name: 'Users', component: Users },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'MessageSquare', component: MessageSquare },
  { name: 'Download', component: Download },
  { name: 'Zap', component: Zap },
  { name: 'Shield', component: Shield },
  { name: 'Activity', component: Activity },
  { name: 'Eye', component: Eye },
  { name: 'FileText', component: FileText },
  { name: 'Settings', component: Settings }
];

const PRESET_COLORS = ['#64c8ff', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
const PRESET_EMOJIS = ['📊', '🎯', '🎮', '⚡', '🚀', '💡', '🔥', '✨', '📰', '🎉', '💼', '🛠️'];

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
    return { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };
  }
};

const ApiService = {
  async request(endpoint, options = {}) {
    const response = await fetch(`${ADMIN_API}${endpoint}`, {
      ...options,
      headers: { ...AuthService.getAuthHeaders(), ...options.headers }
    });
    if (response.status === 401) {
      AuthService.clearAuth();
      window.location.reload();
    }
    return response;
  },
  adminLogin: (email, password) => fetch(`${ADMIN_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }),
  getAllUsers: () => ApiService.request('/users'),
  suspendUser: (id, suspended) => ApiService.request(`/users/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ suspended }) }),
  deleteUser: (id) => ApiService.request(`/users/${id}`, { method: 'DELETE' }),
  updateUserLicense: (id, license) => ApiService.request(`/users/${id}/license`, { method: 'PATCH', body: JSON.stringify({ license }) }),
  getAdminStats: () => ApiService.request('/stats'),
  getCarousel: () => ApiService.request('/content/carousel'),
  createCarouselSlide: (data) => ApiService.request('/content/carousel', { method: 'POST', body: JSON.stringify(data) }),
  updateCarouselSlide: (id, data) => ApiService.request(`/content/carousel/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCarouselSlide: (id) => ApiService.request(`/content/carousel/${id}`, { method: 'DELETE' }),
  reorderCarousel: (items) => ApiService.request('/content/carousel/reorder', { method: 'POST', body: JSON.stringify({ items }) }),
  getNews: () => ApiService.request('/content/news'),
  createNews: (data) => ApiService.request('/content/news', { method: 'POST', body: JSON.stringify(data) }),
  updateNews: (id, data) => ApiService.request(`/content/news/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNews: (id) => ApiService.request(`/content/news/${id}`, { method: 'DELETE' }),
  reorderNews: (items) => ApiService.request('/content/news/reorder', { method: 'POST', body: JSON.stringify({ items }) })
};

const getIconByName = (name) => AVAILABLE_ICONS.find(i => i.name === name)?.component || Zap;

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
  const [carouselSlides, setCarouselSlides] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [showCarouselModal, setShowCarouselModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState(null);
  const [editingNews, setEditingNews] = useState(null);
  const [carouselForm, setCarouselForm] = useState({ icon: 'Zap', title: '', description: '', cta_text: 'En savoir plus →', cta_link: '/crm', color: '#64c8ff' });
  const [newsForm, setNewsForm] = useState({ title: '', description: '', date: '', image: '📰', category: 'Actualité', link: '#' });

  useEffect(() => {
    if (AuthService.isAuthenticated()) {
      const user = AuthService.getUser();
      if (user?.isAdmin) { setAdminUser(user); setIsAuthenticated(true); }
      else AuthService.clearAuth();
    }
    setIsLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [usersRes, statsRes, carouselRes, newsRes] = await Promise.all([
        ApiService.getAllUsers(), ApiService.getAdminStats(), ApiService.getCarousel(), ApiService.getNews()
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (carouselRes.ok) setCarouselSlides(await carouselRes.json());
      if (newsRes.ok) setNewsItems(await newsRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const response = await ApiService.adminLogin(email, password);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!data.user.isAdmin) throw new Error('Accès non autorisé');
      AuthService.setToken(data.token);
      AuthService.setUser(data.user);
      setAdminUser(data.user);
      setIsAuthenticated(true);
      setEmail(''); setPassword('');
    } catch (e) { setLoginError(e.message); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { AuthService.clearAuth(); setIsAuthenticated(false); setAdminUser(null); };

  const handleSuspendUser = async (id, status) => {
    if (!window.confirm(`${status ? 'Réactiver' : 'Suspendre'} cet utilisateur ?`)) return;
    const res = await ApiService.suspendUser(id, !status);
    if (res.ok) setUsers(users.map(u => u.id === id ? { ...u, suspended: !status } : u));
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Supprimer ?')) return;
    const res = await ApiService.deleteUser(id);
    if (res.ok) setUsers(users.filter(u => u.id !== id));
  };

  const handleUpdateLicense = async (id, license) => {
    const res = await ApiService.updateUserLicense(id, license);
    if (res.ok) setUsers(users.map(u => u.id === id ? { ...u, license } : u));
  };

  const openCarouselModal = (slide = null) => {
    setEditingCarousel(slide);
    setCarouselForm(slide 
      ? { icon: slide.icon || 'Zap', title: slide.title || '', description: slide.description || '', cta_text: slide.cta_text || 'En savoir plus →', cta_link: slide.cta_link || '/crm', color: slide.color || '#64c8ff' }
      : { icon: 'Zap', title: '', description: '', cta_text: 'En savoir plus →', cta_link: '/crm', color: '#64c8ff' });
    setShowCarouselModal(true);
  };

  const handleSaveCarousel = async () => {
    if (!carouselForm.title || !carouselForm.description) return alert('Titre et description requis');
    setLoading(true);
    try {
      if (editingCarousel) {
        const res = await ApiService.updateCarouselSlide(editingCarousel.id, carouselForm);
        if (res.ok) setCarouselSlides(carouselSlides.map(s => s.id === editingCarousel.id ? { ...s, ...carouselForm } : s));
      } else {
        const res = await ApiService.createCarouselSlide(carouselForm);
        if (res.ok) setCarouselSlides([...carouselSlides, await res.json()]);
      }
      setShowCarouselModal(false);
    } catch (e) { alert('Erreur'); }
    finally { setLoading(false); }
  };

  const handleDeleteCarousel = async (id) => {
    if (!window.confirm('Supprimer ce slide ?')) return;
    const res = await ApiService.deleteCarouselSlide(id);
    if (res.ok) setCarouselSlides(carouselSlides.filter(s => s.id !== id));
  };

  const moveCarouselSlide = async (index, dir) => {
    const newIndex = dir === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= carouselSlides.length) return;
    const newSlides = [...carouselSlides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    setCarouselSlides(newSlides);
    await ApiService.reorderCarousel(newSlides.map((s, i) => ({ id: s.id, sort_order: i })));
  };

  const openNewsModal = (item = null) => {
    setEditingNews(item);
    setNewsForm(item 
      ? { title: item.title || '', description: item.description || '', date: item.date || '', image: item.image || '📰', category: item.category || 'Actualité', link: item.link || '#' }
      : { title: '', description: '', date: '', image: '📰', category: 'Actualité', link: '#' });
    setShowNewsModal(true);
  };

  const handleSaveNews = async () => {
    if (!newsForm.title || !newsForm.description) return alert('Titre et description requis');
    setLoading(true);
    try {
      if (editingNews) {
        const res = await ApiService.updateNews(editingNews.id, newsForm);
        if (res.ok) setNewsItems(newsItems.map(n => n.id === editingNews.id ? { ...n, ...newsForm } : n));
      } else {
        const res = await ApiService.createNews(newsForm);
        if (res.ok) setNewsItems([...newsItems, await res.json()]);
      }
      setShowNewsModal(false);
    } catch (e) { alert('Erreur'); }
    finally { setLoading(false); }
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm('Supprimer ?')) return;
    const res = await ApiService.deleteNews(id);
    if (res.ok) setNewsItems(newsItems.filter(n => n.id !== id));
  };

  const moveNewsItem = async (index, dir) => {
    const newIndex = dir === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newsItems.length) return;
    const newItems = [...newsItems];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setNewsItems(newItems);
    await ApiService.reorderNews(newItems.map((n, i) => ({ id: n.id, sort_order: i })));
  };

  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <RefreshCw size={48} className="spinning" style={{ color: '#3b82f6' }} />
          <p style={{ color: 'white', marginTop: '1rem' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <Shield size={48} style={{ color: '#3b82f6' }} />
            <h1 className="admin-login-title">Administration</h1>
            <p className="admin-login-subtitle">Prism CRM - Panel Admin</p>
          </div>
          {loginError && <div className="admin-error"><AlertTriangle size={16} />{loginError}</div>}
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="admin-input" required />
            <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="admin-input" required />
            <button type="submit" className="admin-btn-primary" disabled={loading}>
              {loading ? <RefreshCw size={18} className="spinning" /> : <Shield size={18} />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <p className="admin-hint">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Shield size={28} />
          <span className="admin-sidebar-title">Admin Panel</span>
        </div>
        <nav className="admin-nav">
          <button className={`admin-nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>
            <LayoutDashboard size={20} /><span>Dashboard</span>
          </button>
          <button className={`admin-nav-item ${activeSection === 'users' ? 'active' : ''}`} onClick={() => setActiveSection('users')}>
            <Users size={20} /><span>Utilisateurs</span>
          </button>
          <button className={`admin-nav-item ${activeSection === 'revenue' ? 'active' : ''}`} onClick={() => setActiveSection('revenue')}>
            <Euro size={20} /><span>Revenus</span>
          </button>
          <div className="admin-nav-section">Contenu</div>
          <button className={`admin-nav-item ${activeSection === 'carousel' ? 'active' : ''}`} onClick={() => setActiveSection('carousel')}>
            <Image size={20} /><span>Carrousel</span>
          </button>
          <button className={`admin-nav-item ${activeSection === 'news' ? 'active' : ''}`} onClick={() => setActiveSection('news')}>
            <Newspaper size={20} /><span>Actualités</span>
          </button>
          <div className="admin-nav-section">Système</div>
          <button className={`admin-nav-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => setActiveSection('settings')}>
            <Settings size={20} /><span>Paramètres</span>
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-nav-item logout" onClick={handleLogout}>
            <LogOut size={20} /><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">
            {activeSection === 'dashboard' && 'Dashboard'}
            {activeSection === 'users' && 'Utilisateurs'}
            {activeSection === 'revenue' && 'Revenus & Abonnements'}
            {activeSection === 'carousel' && 'Carrousel'}
            {activeSection === 'news' && 'Actualités'}
            {activeSection === 'settings' && 'Paramètres'}
          </h1>
          <div className="admin-header-right">
            <button className="admin-btn-icon" onClick={loadData} title="Rafraîchir"><RefreshCw size={18} /></button>
            <div className="admin-user-badge"><Crown size={16} /><span>{adminUser?.email}</span></div>
          </div>
        </header>

        <div className="admin-content">
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon blue"><Users size={24} /></div>
                  <div><h3 className="admin-stat-number">{stats?.totalUsers || 0}</h3><p className="admin-stat-label">Utilisateurs</p></div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon green"><UserCheck size={24} /></div>
                  <div><h3 className="admin-stat-number">{stats?.activeUsers || 0}</h3><p className="admin-stat-label">Actifs</p></div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon orange"><UserX size={24} /></div>
                  <div><h3 className="admin-stat-number">{stats?.suspendedUsers || 0}</h3><p className="admin-stat-label">Suspendus</p></div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon purple"><Activity size={24} /></div>
                  <div><h3 className="admin-stat-number">{stats?.totalContacts || 0}</h3><p className="admin-stat-label">Contacts</p></div>
                </div>
              </div>
              <div className="admin-dashboard-grid">
                <div className="admin-card">
                  <h3 className="admin-card-title">Slides du Carrousel</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>{carouselSlides.length} slide(s)</p>
                </div>
                <div className="admin-card">
                  <h3 className="admin-card-title">Actualités</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>{newsItems.length} actualité(s)</p>
                </div>
              </div>
              <div className="admin-card">
                <h3 className="admin-card-title">Derniers Utilisateurs</h3>
                {users.slice(0, 5).map(user => (
                  <div key={user.id} className="admin-user-row">
                    <div className="admin-user-avatar">{user.email?.charAt(0).toUpperCase()}</div>
                    <div className="admin-user-info">
                      <p className="admin-user-email">{user.email}</p>
                      <span className="admin-user-license">{user.license}</span>
                    </div>
                    {user.suspended && <span className="admin-badge suspended">Suspendu</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Users */}
          {activeSection === 'users' && (
            <>
              <div className="admin-toolbar">
                <div className="admin-search-box">
                  <Search size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="admin-search-input" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{filteredUsers.length} utilisateur(s)</span>
              </div>
              <div className="admin-card">
                <table className="admin-table">
                  <thead><tr><th>Utilisateur</th><th>Licence</th><th>Type</th><th>Statut</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="admin-user-avatar">{user.email?.charAt(0).toUpperCase()}</div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 500 }}>{user.email}</p>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select value={user.license} onChange={e => handleUpdateLicense(user.id, e.target.value)} className="admin-select">
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="business">Business</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td><span className={`admin-badge ${user.is_owner ? 'owner' : 'member'}`}>{user.is_owner ? <><Crown size={12} /> Owner</> : 'Member'}</span></td>
                        <td><span className={`admin-badge ${user.suspended ? 'suspended' : 'active'}`}>{user.suspended ? <><ShieldOff size={12} /> Suspendu</> : <><Shield size={12} /> Actif</>}</span></td>
                        <td>
                          <button className="admin-btn-icon" onClick={() => handleSuspendUser(user.id, user.suspended)} title={user.suspended ? 'Réactiver' : 'Suspendre'}>
                            {user.suspended ? <Shield size={16} /> : <ShieldOff size={16} />}
                          </button>
                          <button className="admin-btn-icon danger" onClick={() => handleDeleteUser(user.id)} title="Supprimer"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Revenue */}
          {activeSection === 'revenue' && (
            <>
              {/* Stats principales revenus */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon green"><Euro size={24} /></div>
                  <div>
                    <h3 className="admin-stat-number">{stats?.revenue?.monthly?.total || 0}€</h3>
                    <p className="admin-stat-label">Revenus mensuels</p>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon blue"><TrendingUp size={24} /></div>
                  <div>
                    <h3 className="admin-stat-number">{stats?.revenue?.annual?.total || 0}€</h3>
                    <p className="admin-stat-label">Revenus annuels (est.)</p>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon purple"><CreditCard size={24} /></div>
                  <div>
                    <h3 className="admin-stat-number">{stats?.revenue?.totalPaidSubscriptions || 0}</h3>
                    <p className="admin-stat-label">Abonnements payants</p>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon orange"><PieChart size={24} /></div>
                  <div>
                    <h3 className="admin-stat-number">{stats?.revenue?.conversionRate || 0}%</h3>
                    <p className="admin-stat-label">Taux de conversion</p>
                  </div>
                </div>
              </div>

              {/* Détail par licence */}
              <div className="admin-dashboard-grid">
                <div className="admin-card">
                  <h3 className="admin-card-title">Répartition des abonnements</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(107, 114, 128, 0.1)', borderRadius: '8px', borderLeft: '4px solid #6b7280' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>Starter (Gratuit)</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{stats?.revenue?.totalFreeAccounts || 0} compte(s)</p>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6b7280' }}>0€</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>Pro (29€/mois)</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{stats?.revenue?.paidSubscriptions?.pro || 0} abonnement(s)</p>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>{stats?.revenue?.monthly?.pro || 0}€</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>Business (79€/mois)</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{stats?.revenue?.paidSubscriptions?.business || 0} abonnement(s)</p>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>{stats?.revenue?.monthly?.business || 0}€</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>Enterprise (199€/mois)</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{stats?.revenue?.paidSubscriptions?.enterprise || 0} abonnement(s)</p>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{stats?.revenue?.monthly?.enterprise || 0}€</span>
                    </div>
                  </div>
                </div>

                <div className="admin-card">
                  <h3 className="admin-card-title">Statistiques clés</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Revenu moyen par client payant</span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>{stats?.revenue?.avgRevenuePerPaidUser || 0}€/mois</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total comptes propriétaires</span>
                      <span style={{ fontWeight: 600, color: 'white' }}>{stats?.ownerAccounts || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Comptes gratuits</span>
                      <span style={{ fontWeight: 600, color: 'white' }}>{stats?.revenue?.totalFreeAccounts || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Comptes payants</span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>{stats?.revenue?.totalPaidSubscriptions || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Projection annuelle</span>
                      <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{stats?.revenue?.annual?.total || 0}€</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Résumé */}
              <div className="admin-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>💰 Chiffre d'affaires mensuel récurrent (MRR)</h3>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                      Basé sur {stats?.revenue?.totalPaidSubscriptions || 0} abonnement(s) actif(s)
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{stats?.revenue?.monthly?.total || 0}€</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>/ mois</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Carousel */}
          {activeSection === 'carousel' && (
            <>
              <div className="admin-toolbar">
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Gérez les slides du carrousel</p>
                <button className="admin-btn-success" onClick={() => openCarouselModal()}><Plus size={18} /> Ajouter</button>
              </div>
              <div className="admin-card">
                {carouselSlides.length === 0 ? (
                  <p className="admin-empty-state">Aucun slide. Cliquez sur "Ajouter" pour commencer.</p>
                ) : carouselSlides.map((slide, index) => {
                  const Icon = getIconByName(slide.icon);
                  return (
                    <div key={slide.id} className="admin-content-item">
                      <div className="admin-content-item-drag">
                        <button className="admin-btn-icon admin-btn-icon-small" onClick={() => moveCarouselSlide(index, 'up')} disabled={index === 0}><ArrowUp size={14} /></button>
                        <button className="admin-btn-icon admin-btn-icon-small" onClick={() => moveCarouselSlide(index, 'down')} disabled={index === carouselSlides.length - 1}><ArrowDown size={14} /></button>
                      </div>
                      <div className="admin-content-item-preview" style={{ background: `${slide.color}20` }}><Icon size={32} color={slide.color} /></div>
                      <div className="admin-content-item-info">
                        <h4 className="admin-content-item-title">{slide.title}</h4>
                        <p className="admin-content-item-desc">{slide.description}</p>
                        <div className="admin-content-item-meta"><span>CTA: {slide.cta_text}</span><span>Lien: {slide.cta_link}</span></div>
                      </div>
                      <div className="admin-content-item-actions">
                        <button className="admin-btn-icon" onClick={() => openCarouselModal(slide)}><Edit2 size={16} /></button>
                        <button className="admin-btn-icon danger" onClick={() => handleDeleteCarousel(slide.id)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* News */}
          {activeSection === 'news' && (
            <>
              <div className="admin-toolbar">
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Gérez les actualités</p>
                <button className="admin-btn-success" onClick={() => openNewsModal()}><Plus size={18} /> Ajouter</button>
              </div>
              <div className="admin-card">
                {newsItems.length === 0 ? (
                  <p className="admin-empty-state">Aucune actualité. Cliquez sur "Ajouter" pour commencer.</p>
                ) : newsItems.map((item, index) => (
                  <div key={item.id} className="admin-content-item">
                    <div className="admin-content-item-drag">
                      <button className="admin-btn-icon admin-btn-icon-small" onClick={() => moveNewsItem(index, 'up')} disabled={index === 0}><ArrowUp size={14} /></button>
                      <button className="admin-btn-icon admin-btn-icon-small" onClick={() => moveNewsItem(index, 'down')} disabled={index === newsItems.length - 1}><ArrowDown size={14} /></button>
                    </div>
                    <div className="admin-content-item-preview" style={{ background: 'rgba(255,255,255,0.05)' }}>{item.image}</div>
                    <div className="admin-content-item-info">
                      <h4 className="admin-content-item-title">{item.title}</h4>
                      <p className="admin-content-item-desc">{item.description}</p>
                      <div className="admin-content-item-meta"><span>{item.category}</span><span>{item.date}</span></div>
                    </div>
                    <div className="admin-content-item-actions">
                      <button className="admin-btn-icon" onClick={() => openNewsModal(item)}><Edit2 size={16} /></button>
                      <button className="admin-btn-icon danger" onClick={() => handleDeleteNews(item.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Settings */}
          {activeSection === 'settings' && (
            <div className="admin-card">
              <h3 className="admin-card-title">Informations Admin</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}><strong style={{ color: 'white' }}>Email:</strong> {adminUser?.email}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}><strong style={{ color: 'white' }}>Rôle:</strong> Super Administrateur</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Carousel */}
      {showCarouselModal && (
        <div className="admin-modal" onClick={() => setShowCarouselModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">{editingCarousel ? 'Modifier le slide' : 'Nouveau slide'}</h2>
              <button className="admin-btn-icon" onClick={() => setShowCarouselModal(false)}><X size={20} /></button>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Titre *</label>
              <input type="text" className="admin-input" value={carouselForm.title} onChange={e => setCarouselForm({ ...carouselForm, title: e.target.value })} placeholder="Titre" />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Description *</label>
              <textarea className="admin-textarea" value={carouselForm.description} onChange={e => setCarouselForm({ ...carouselForm, description: e.target.value })} placeholder="Description" />
            </div>
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label className="admin-form-label">Texte du bouton</label>
                <input type="text" className="admin-input" value={carouselForm.cta_text} onChange={e => setCarouselForm({ ...carouselForm, cta_text: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Lien du bouton</label>
                <input type="text" className="admin-input" value={carouselForm.cta_link} onChange={e => setCarouselForm({ ...carouselForm, cta_link: e.target.value })} />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Icône</label>
              <div className="admin-icon-picker">
                {AVAILABLE_ICONS.map(({ name, component: Icon }) => (
                  <div key={name} className={`admin-icon-option ${carouselForm.icon === name ? 'selected' : ''}`}
                    style={{ borderColor: carouselForm.icon === name ? carouselForm.color : 'transparent', background: carouselForm.icon === name ? `${carouselForm.color}20` : undefined }}
                    onClick={() => setCarouselForm({ ...carouselForm, icon: name })}>
                    <Icon size={20} color={carouselForm.icon === name ? carouselForm.color : undefined} />
                  </div>
                ))}
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Couleur</label>
              <div className="admin-color-picker">
                {PRESET_COLORS.map(color => (
                  <div key={color} className={`admin-color-option ${carouselForm.color === color ? 'selected' : ''}`}
                    style={{ background: color }} onClick={() => setCarouselForm({ ...carouselForm, color })} />
                ))}
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn-secondary" onClick={() => setShowCarouselModal(false)}>Annuler</button>
              <button className="admin-btn-primary" onClick={handleSaveCarousel} disabled={loading}>
                {loading ? <RefreshCw size={18} className="spinning" /> : <Save size={18} />}
                {editingCarousel ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal News */}
      {showNewsModal && (
        <div className="admin-modal" onClick={() => setShowNewsModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">{editingNews ? 'Modifier l\'actualité' : 'Nouvelle actualité'}</h2>
              <button className="admin-btn-icon" onClick={() => setShowNewsModal(false)}><X size={20} /></button>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Titre *</label>
              <input type="text" className="admin-input" value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} placeholder="Titre" />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Description *</label>
              <textarea className="admin-textarea" value={newsForm.description} onChange={e => setNewsForm({ ...newsForm, description: e.target.value })} placeholder="Description" />
            </div>
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label className="admin-form-label">Date</label>
                <input type="text" className="admin-input" value={newsForm.date} onChange={e => setNewsForm({ ...newsForm, date: e.target.value })} placeholder="15 Décembre 2024" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Catégorie</label>
                <input type="text" className="admin-input" value={newsForm.category} onChange={e => setNewsForm({ ...newsForm, category: e.target.value })} placeholder="Mise à jour" />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Lien</label>
              <input type="text" className="admin-input" value={newsForm.link} onChange={e => setNewsForm({ ...newsForm, link: e.target.value })} placeholder="https://..." />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Emoji</label>
              <div className="admin-emoji-picker">
                {PRESET_EMOJIS.map(emoji => (
                  <div key={emoji} className={`admin-emoji-option ${newsForm.image === emoji ? 'selected' : ''}`}
                    onClick={() => setNewsForm({ ...newsForm, image: emoji })}>{emoji}</div>
                ))}
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn-secondary" onClick={() => setShowNewsModal(false)}>Annuler</button>
              <button className="admin-btn-primary" onClick={handleSaveNews} disabled={loading}>
                {loading ? <RefreshCw size={18} className="spinning" /> : <Save size={18} />}
                {editingNews ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;