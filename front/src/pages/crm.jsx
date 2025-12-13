import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Search, Download, Users, Crown, UserPlus, LogOut, Shield, RefreshCw } from 'lucide-react';
import '../App.css';

// Configuration API
const API_BASE = process.env.REACT_APP_API_URL || '/api/crm';

// Types de licences
const LICENSE_TYPES = {
  starter: { name: 'Starter', maxUsers: 1, price: 'Gratuit', color: '#6b7280' },
  pro: { name: 'Pro', maxUsers: 5, price: '29€/mois', color: '#3b82f6' },
  business: { name: 'Business', maxUsers: 15, price: '79€/mois', color: '#8b5cf6' },
  enterprise: { name: 'Enterprise', maxUsers: 50, price: '199€/mois', color: '#f59e0b' }
};

// ==================== AUTH SERVICE ====================

const AuthService = {
  // Stockage du token dans sessionStorage
  getToken: () => sessionStorage.getItem('crm_token'),
  
  setToken: (token) => sessionStorage.setItem('crm_token', token),
  
  removeToken: () => sessionStorage.removeItem('crm_token'),
  
  // Stockage des infos utilisateur
  getUser: () => {
    const user = sessionStorage.getItem('crm_user');
    return user ? JSON.parse(user) : null;
  },
  
  setUser: (user) => sessionStorage.setItem('crm_user', JSON.stringify(user)),
  
  removeUser: () => sessionStorage.removeItem('crm_user'),
  
  // Clear all auth data
  clearAuth: () => {
    sessionStorage.removeItem('crm_token');
    sessionStorage.removeItem('crm_user');
  },
  
  // Vérifier si connecté
  isAuthenticated: () => !!sessionStorage.getItem('crm_token'),
  
  // Headers avec token
  getAuthHeaders: () => {
    const token = sessionStorage.getItem('crm_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
};

// ==================== API SERVICE ====================

const ApiService = {
  // Callback pour gérer la suspension (sera défini par le composant)
  onSuspended: null,

  // Requête générique avec gestion du token
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...AuthService.getAuthHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      // Token expiré
      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'TOKEN_EXPIRED') {
          // Tenter de rafraîchir le token
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry la requête avec le nouveau token
            config.headers = AuthService.getAuthHeaders();
            const retryResponse = await fetch(url, config);
            return retryResponse;
          }
        }
        // Token invalide ou refresh échoué
        AuthService.clearAuth();
        window.location.reload();
        throw new Error('Session expirée');
      }

      // ✅ NOUVEAU: Gérer la suspension
      if (response.status === 403) {
        const data = await response.json();
        if (data.code === 'ACCOUNT_SUSPENDED' || data.code === 'OWNER_SUSPENDED') {
          AuthService.clearAuth();
          if (this.onSuspended) {
            this.onSuspended(data.error);
          } else {
            alert(data.error);
            window.location.reload();
          }
          throw new Error(data.error);
        }
      }
      
      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  async refreshToken() {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        AuthService.setToken(data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Auth
  async register(email, password, license) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, license })
    });
    return response;
  },

  async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  // Sub-accounts
  async getSubAccounts() {
    return this.request('/subaccounts');
  },

  async createSubAccount(data) {
    return this.request('/subaccounts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateSubAccountRole(id, role) {
    return this.request(`/subaccounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },

  async deleteSubAccount(id) {
    return this.request(`/subaccounts/${id}`, { method: 'DELETE' });
  },

  // Contacts
  async getContacts() {
    return this.request('/contacts');
  },

  async createContact(data) {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateContact(id, data) {
    return this.request(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteContact(id) {
    return this.request(`/contacts/${id}`, { method: 'DELETE' });
  },

  // Interactions
  async getInteractions() {
    return this.request('/interactions');
  },

  async createInteraction(data) {
    return this.request('/interactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ==================== MAIN COMPONENT ====================

export function CRM({ onLogin, onLogout }) {
  // Auth states
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState('starter');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [suspendedMessage, setSuspendedMessage] = useState(null); // ✅ NOUVEAU
  
  // Sub-accounts states
  const [subAccounts, setSubAccounts] = useState([]);
  const [showSubAccountForm, setShowSubAccountForm] = useState(false);
  const [newSubAccount, setNewSubAccount] = useState({ email: '', password: '', role: 'member' });
  
  // CRM states
  const [contacts, setContacts] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('contacts');
  const [selectedContact, setSelectedContact] = useState(null);
  const [interactionText, setInteractionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', status: 'prospect', notes: ''
  });

  // ✅ NOUVEAU: Configurer le callback de suspension
  useEffect(() => {
    ApiService.onSuspended = (message) => {
      setCurrentUser(null);
      setContacts([]);
      setInteractions([]);
      setSubAccounts([]);
      setSuspendedMessage(message);
      if (onLogout) onLogout();
    };

    return () => {
      ApiService.onSuspended = null;
    };
  }, [onLogout]);

  // ==================== AUTH CHECK ON MOUNT ====================

  useEffect(() => {
    const checkAuth = async () => {
      if (AuthService.isAuthenticated()) {
        try {
          const response = await ApiService.getMe();
          if (response.ok) {
            const user = await response.json();
            setCurrentUser(user);
            AuthService.setUser(user);
            if (onLogin) onLogin(user);
          } else {
            // Vérifier si c'est une suspension
            const data = await response.json().catch(() => ({}));
            if (data.code === 'ACCOUNT_SUSPENDED' || data.code === 'OWNER_SUSPENDED') {
              setSuspendedMessage(data.error);
            }
            AuthService.clearAuth();
          }
        } catch {
          AuthService.clearAuth();
        }
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [onLogin]);

  // ==================== LOAD DATA ====================

  const loadContacts = useCallback(async () => {
    try {
      const response = await ApiService.getContacts();
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
    }
  }, []);

  const loadInteractions = useCallback(async () => {
    try {
      const response = await ApiService.getInteractions();
      if (response.ok) {
        const data = await response.json();
        setInteractions(data);
      }
    } catch (error) {
      console.error('Erreur chargement interactions:', error);
    }
  }, []);

  const loadSubAccounts = useCallback(async () => {
    try {
      const response = await ApiService.getSubAccounts();
      if (response.ok) {
        const data = await response.json();
        setSubAccounts(data);
      }
    } catch (error) {
      console.error('Erreur chargement sous-comptes:', error);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadContacts();
      loadInteractions();
      if (currentUser.isOwner) {
        loadSubAccounts();
      }
    }
  }, [currentUser, loadContacts, loadInteractions, loadSubAccounts]);

  // ==================== AUTH HANDLERS ====================

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.register(email, password, selectedLicense);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur inscription');
      }

      // Stocker le token et l'utilisateur
      AuthService.setToken(data.token);
      AuthService.setUser(data.user);
      
      setCurrentUser(data.user);
      if (onLogin) onLogin(data.user);
      
      setEmail('');
      setPassword('');
      setIsRegistering(false);

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setSuspendedMessage(null); // Reset le message de suspension
    
    try {
      const response = await ApiService.login(email, password);
      const data = await response.json();

      if (!response.ok) {
        // ✅ NOUVEAU: Gérer la suspension à la connexion
        if (data.code === 'ACCOUNT_SUSPENDED' || data.code === 'OWNER_SUSPENDED') {
          setSuspendedMessage(data.error);
          return;
        }
        throw new Error(data.error || 'Erreur connexion');
      }

      // Stocker le token et l'utilisateur
      AuthService.setToken(data.token);
      AuthService.setUser(data.user);
      
      setCurrentUser(data.user);
      if (onLogin) onLogin(data.user);
      
      setEmail('');
      setPassword('');

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.clearAuth();
    setCurrentUser(null);
    setContacts([]);
    setInteractions([]);
    setSubAccounts([]);
    setSuspendedMessage(null); // ✅ Reset le message
    if (onLogout) onLogout();
  };

  // ==================== SUB-ACCOUNTS HANDLERS ====================

  const handleAddSubAccount = async (e) => {
    e.preventDefault();
    if (!currentUser.isOwner) {
      alert('Seul le propriétaire peut ajouter des utilisateurs');
      return;
    }

    if (!newSubAccount.email || !newSubAccount.password) {
      alert('Email et mot de passe requis');
      return;
    }

    if (newSubAccount.password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.createSubAccount(newSubAccount);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur création');
      }

      setSubAccounts([...subAccounts, data]);
      setNewSubAccount({ email: '', password: '', role: 'member' });
      setShowSubAccountForm(false);
      alert(`Utilisateur ${data.email} créé avec succès !`);

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubAccount = async (subAccountId) => {
    if (!currentUser.isOwner) return;
    if (!window.confirm('Supprimer cet utilisateur ?')) return;

    try {
      const response = await ApiService.deleteSubAccount(subAccountId);
      if (response.ok) {
        setSubAccounts(subAccounts.filter(sa => sa.id !== subAccountId));
      }
    } catch (error) {
      alert('Erreur suppression');
    }
  };

  const handleUpdateSubAccountRole = async (subAccountId, newRole) => {
    if (!currentUser.isOwner) return;

    try {
      const response = await ApiService.updateSubAccountRole(subAccountId, newRole);
      if (response.ok) {
        setSubAccounts(subAccounts.map(sa =>
          sa.id === subAccountId ? { ...sa, role: newRole } : sa
        ));
      }
    } catch (error) {
      alert('Erreur modification');
    }
  };

  // ==================== CONTACTS HANDLERS ====================

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Nom et email requis');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const response = await ApiService.updateContact(editingId, formData);
        if (response.ok) {
          setContacts(contacts.map(c => c.id === editingId ? { ...c, ...formData } : c));
        }
        setEditingId(null);
      } else {
        const response = await ApiService.createContact(formData);
        if (response.ok) {
          const newContact = await response.json();
          setContacts([newContact, ...contacts]);
        }
      }

      setFormData({ name: '', email: '', phone: '', company: '', status: 'prospect', notes: '' });
      setShowForm(false);

    } catch (error) {
      alert('Erreur lors de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmer la suppression ?')) return;

    setLoading(true);
    try {
      const response = await ApiService.deleteContact(id);
      if (response.ok) {
        setContacts(contacts.filter(c => c.id !== id));
      }
    } catch (error) {
      alert('Erreur suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contact) => {
    setFormData(contact);
    setEditingId(contact.id);
    setShowForm(true);
  };

  // ==================== INTERACTIONS HANDLERS ====================

  const addInteraction = async () => {
    if (!interactionText || !selectedContact) return;

    setLoading(true);
    try {
      const response = await ApiService.createInteraction({
        contact_id: selectedContact.id,
        text: interactionText
      });

      if (response.ok) {
        const newInteraction = await response.json();
        setInteractions([newInteraction, ...interactions]);
        setInteractionText('');
      }
    } catch (error) {
      alert('Erreur ajout interaction');
    } finally {
      setLoading(false);
    }
  };

  const getContactInteractions = (contactId) =>
    interactions.filter(i => i.contact_id === contactId);

  // ==================== EXPORT ====================

  const exportToPDF = () => {
    let content = `CRM - Rapport de Contacts\nDate: ${new Date().toLocaleString('fr-FR')}\nLicence: ${currentUser.licenseName}\n\n`;

    contacts.forEach(contact => {
      content += `${contact.name}\nEmail: ${contact.email}\nTéléphone: ${contact.phone || 'N/A'}\nEntreprise: ${contact.company || 'N/A'}\nStatut: ${contact.status}\nNotes: ${contact.notes || 'N/A'}\n---\n\n`;
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'crm-contacts.txt');
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ==================== RENDER HELPERS ====================

  const renderPipeline = () => {
    const stages = ['prospect', 'client', 'perdu'];
    return (
      <div className="crm-pipeline-grid">
        {stages.map(stage => (
          <div key={stage} className="crm-pipeline-column">
            <h3 className="crm-pipeline-title">
              {stage === 'prospect' ? '🎯 Prospects' : stage === 'client' ? '✅ Clients' : '❌ Perdus'}
            </h3>
            <div className="crm-pipeline-cards">
              {contacts.filter(c => c.status === stage).map(contact => (
                <div key={contact.id} onClick={() => setSelectedContact(contact)} className="crm-pipeline-card">
                  <h4>{contact.name}</h4>
                  <p>{contact.company || 'Sans entreprise'}</p>
                </div>
              ))}
              {contacts.filter(c => c.status === stage).length === 0 && (
                <p className="crm-pipeline-empty">Aucun contact</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTeamManagement = () => {
    const license = LICENSE_TYPES[currentUser.license] || LICENSE_TYPES.starter;
    const usedSlots = subAccounts.length + 1;
    const availableSlots = currentUser.maxUsers - usedSlots;

    return (
      <div className="crm-team-container">
        <div className="crm-license-header">
          <div className="crm-license-info">
            <div className="crm-license-badge" style={{ backgroundColor: license.color }}>
              <Crown size={20} />
              <span>{license.name}</span>
            </div>
            <div className="crm-license-details">
              <p><strong>{usedSlots}</strong> / {currentUser.maxUsers} utilisateurs</p>
              <div className="crm-license-bar">
                <div className="crm-license-bar-fill" style={{
                  width: `${(usedSlots / currentUser.maxUsers) * 100}%`,
                  backgroundColor: availableSlots === 0 ? '#ef4444' : license.color
                }} />
              </div>
              {availableSlots === 0 && <p className="crm-license-warning">⚠️ Limite atteinte</p>}
            </div>
          </div>

          {currentUser.isOwner && availableSlots > 0 && (
            <button className="crm-button-add" onClick={() => setShowSubAccountForm(true)}>
              <UserPlus size={18} /><span>Ajouter un utilisateur</span>
            </button>
          )}
        </div>

        {showSubAccountForm && currentUser.isOwner && (
          <div className="crm-form-container">
            <h3 className="crm-form-title">Nouvel utilisateur</h3>
            <div className="crm-form-grid">
              <input type="email" placeholder="Email*" value={newSubAccount.email}
                onChange={(e) => setNewSubAccount({ ...newSubAccount, email: e.target.value })}
                className="crm-form-input" />
              <input type="password" placeholder="Mot de passe* (min 6 car.)" value={newSubAccount.password}
                onChange={(e) => setNewSubAccount({ ...newSubAccount, password: e.target.value })}
                className="crm-form-input" />
              <select value={newSubAccount.role}
                onChange={(e) => setNewSubAccount({ ...newSubAccount, role: e.target.value })}
                className="crm-form-select">
                <option value="member">Membre</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <div className="crm-form-actions">
                <button onClick={handleAddSubAccount} className="crm-form-submit" disabled={loading}>
                  {loading ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
                <button onClick={() => setShowSubAccountForm(false)} className="crm-form-cancel">Annuler</button>
              </div>
            </div>
          </div>
        )}

        <div className="crm-team-list">
          <div className="crm-team-member crm-team-owner">
            <div className="crm-team-avatar"><Crown size={20} /></div>
            <div className="crm-team-info">
              <h4>{currentUser.isOwner ? currentUser.email : 'Propriétaire'}</h4>
              <span className="crm-role-badge crm-role-owner">Propriétaire</span>
            </div>
          </div>

          {subAccounts.map(account => (
            <div key={account.id} className="crm-team-member">
              <div className="crm-team-avatar"><Users size={20} /></div>
              <div className="crm-team-info">
                <h4>{account.email}</h4>
                <span className={`crm-role-badge crm-role-${account.role}`}>
                  {account.role === 'admin' ? 'Admin' : account.role === 'manager' ? 'Manager' : 'Membre'}
                </span>
              </div>
              {currentUser.isOwner && (
                <div className="crm-team-actions">
                  <select value={account.role} onChange={(e) => handleUpdateSubAccountRole(account.id, e.target.value)}
                    className="crm-role-select">
                    <option value="member">Membre</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => handleDeleteSubAccount(account.id)} className="crm-btn-delete-small">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {subAccounts.length === 0 && <p className="crm-empty-message">Aucun autre utilisateur</p>}
        </div>

        {currentUser.isOwner && availableSlots <= 1 && (
          <div className="crm-upgrade-cta">
            <h4>Besoin de plus d'utilisateurs ?</h4>
            <p>Passez à une licence supérieure</p>
            <div className="crm-upgrade-options">
              {Object.entries(LICENSE_TYPES)
                .filter(([key]) => LICENSE_TYPES[key].maxUsers > currentUser.maxUsers)
                .map(([key, lic]) => (
                  <div key={key} className="crm-upgrade-option" style={{ borderColor: lic.color }}>
                    <h5 style={{ color: lic.color }}>{lic.name}</h5>
                    <p>{lic.maxUsers} utilisateurs</p>
                    <p className="crm-upgrade-price">{lic.price}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Stats
  const filteredContacts = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: contacts.length,
    prospects: contacts.filter(c => c.status === 'prospect').length,
    clients: contacts.filter(c => c.status === 'client').length,
    lost: contacts.filter(c => c.status === 'perdu').length,
    conversionRate: contacts.length > 0
      ? ((contacts.filter(c => c.status === 'client').length / contacts.length) * 100).toFixed(1)
      : 0
  };

  // ==================== LOADING STATE ====================

  if (isCheckingAuth) {
    return (
      <div className="crm-login-container">
        <div className="crm-login-box">
          <div className="crm-login-card" style={{ textAlign: 'center' }}>
            <RefreshCw size={48} className="spinning" style={{ color: '#64c8ff', marginBottom: '1rem' }} />
            <p>Vérification de la session...</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== LOGIN SCREEN ====================

  if (!currentUser) {
    return (
      <div className="crm-login-container">
        <div className="crm-login-box">
          <div className="crm-login-card">
            <h1>Prism CRM</h1>
            <p>Gestion complète de vos contacts 💎</p>

            {/* ✅ NOUVEAU: Message de suspension */}
            {suspendedMessage && (
              <div style={{
                padding: '1rem',
                marginBottom: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Shield size={18} />
                {suspendedMessage}
              </div>
            )}

            {!isRegistering ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input type="email" placeholder="Email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setSuspendedMessage(null); }} className="crm-login-input" />
                  <input type="password" placeholder="Mot de passe" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="crm-login-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)} />
                  <button onClick={handleLogin} disabled={loading} className="crm-login-button">
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </button>
                </div>
                <p className="crm-login-hint">
                  Pas encore de compte ?{' '}
                  <button onClick={() => setIsRegistering(true)} className="crm-link-button">Créer un compte</button>
                </p>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input type="email" placeholder="Email" value={email}
                    onChange={(e) => setEmail(e.target.value)} className="crm-login-input" />
                  <input type="password" placeholder="Mot de passe (min 6 caractères)" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="crm-login-input" />

                  <div className="crm-license-selection">
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Choisissez votre licence :
                    </p>
                    <div className="crm-license-grid">
                      {Object.entries(LICENSE_TYPES).map(([key, license]) => (
                        <div key={key}
                          className={`crm-license-card ${selectedLicense === key ? 'selected' : ''}`}
                          onClick={() => setSelectedLicense(key)}
                          style={{ borderColor: selectedLicense === key ? license.color : 'rgba(255,255,255,0.1)' }}>
                          <h4 style={{ color: license.color }}>{license.name}</h4>
                          <p className="crm-license-price">{license.price}</p>
                          <p className="crm-license-users">
                            <Users size={14} /> {license.maxUsers} utilisateur{license.maxUsers > 1 ? 's' : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleRegister} disabled={loading} className="crm-login-button">
                    {loading ? 'Création...' : 'Créer mon compte'}
                  </button>
                </div>
                <p className="crm-login-hint">
                  Déjà un compte ?{' '}
                  <button onClick={() => setIsRegistering(false)} className="crm-link-button">Se connecter</button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN CRM INTERFACE ====================

  return (
    <div className="crm-container">
      <div className="crm-main">

        {/* User Banner */}
        <div className="crm-user-banner">
          <div className="crm-user-info">
            <span className="crm-user-email">{currentUser.email}</span>
            <span className="crm-license-badge-small"
              style={{ backgroundColor: LICENSE_TYPES[currentUser.license]?.color || '#6b7280' }}>
              {currentUser.isOwner ? <Crown size={12} /> : <Shield size={12} />}
              {currentUser.licenseName}
              {!currentUser.isOwner && ` (${currentUser.role})`}
            </span>
          </div>
          <button onClick={handleLogout} className="crm-logout-btn">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>

        {/* Stats */}
        <div className="crm-stats-grid">
          <div className="crm-stat-card"><h3>Total</h3><p className="crm-stat-number">{stats.total}</p></div>
          <div className="crm-stat-card"><h3>Prospects</h3><p className="crm-stat-number">{stats.prospects}</p></div>
          <div className="crm-stat-card"><h3>Clients</h3><p className="crm-stat-number">{stats.clients}</p></div>
          <div className="crm-stat-card"><h3>Perdus</h3><p className="crm-stat-number">{stats.lost}</p></div>
          <div className="crm-stat-card"><h3>Conversion</h3><p className="crm-stat-number">{stats.conversionRate}%</p></div>
        </div>

        {/* Tabs */}
        <div className="crm-tabs-wrapper">
          <button onClick={() => setActiveTab('contacts')}
            className={`crm-tab-button ${activeTab === 'contacts' ? 'active' : ''}`}>📋 Contacts</button>
          <button onClick={() => setActiveTab('pipeline')}
            className={`crm-tab-button ${activeTab === 'pipeline' ? 'active' : ''}`}>🎯 Pipeline</button>
          <button onClick={() => setActiveTab('interactions')}
            className={`crm-tab-button ${activeTab === 'interactions' ? 'active' : ''}`}>💬 Interactions</button>
          <button onClick={() => setActiveTab('team')}
            className={`crm-tab-button ${activeTab === 'team' ? 'active' : ''}`}>👥 Équipe</button>
        </div>

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <>
            {showForm && (
              <div className="crm-form-container">
                <h2 className="crm-form-title">{editingId ? 'Modifier' : 'Ajouter'} un contact</h2>
                <div className="crm-form-grid">
                  <input type="text" placeholder="Nom*" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="crm-form-input" />
                  <input type="email" placeholder="Email*" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="crm-form-input" />
                  <input type="tel" placeholder="Téléphone" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="crm-form-input" />
                  <input type="text" placeholder="Entreprise" value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="crm-form-input" />
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="crm-form-select">
                    <option value="prospect">Prospect</option>
                    <option value="client">Client</option>
                    <option value="perdu">Perdu</option>
                  </select>
                  <textarea placeholder="Notes" value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="crm-form-textarea" />
                  <button onClick={handleAddContact} disabled={loading} className="crm-form-submit">
                    {loading ? 'Chargement...' : editingId ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}

            <div className="crm-contacts-list">
              {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                <div key={contact.id} className="crm-contact-card">
                  <div className="crm-contact-header">
                    <div className="crm-contact-info" onClick={() => setSelectedContact(contact)} style={{ cursor: 'pointer', flex: 1 }}>
                      <h3>{contact.name}</h3>
                      <p className="crm-contact-company">{contact.company || 'Sans entreprise'}</p>
                    </div>
                    <span className={`crm-status-badge crm-status-${contact.status}`}>{contact.status}</span>
                  </div>
                  <div className="crm-contact-details">
                    <p>📧 {contact.email}</p>
                    {contact.phone && <p>📱 {contact.phone}</p>}
                  </div>
                  {contact.notes && <p className="crm-contact-notes">📝 {contact.notes}</p>}
                  <div className="crm-contact-actions">
                    <button onClick={() => handleEdit(contact)} className="crm-btn-edit"><Edit2 size={16} /> Modifier</button>
                    <button onClick={() => handleDelete(contact.id)} className="crm-btn-delete"><Trash2 size={16} /> Supprimer</button>
                  </div>
                </div>
              )) : <p className="crm-empty-message">Aucun contact trouvé</p>}
            </div>

            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <div className="crm-search-container">
                  <div className="crm-search-wrapper">
                    <input type="text" placeholder="Rechercher..." value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)} className="crm-search-input" />
                    <Search size={18} className="crm-search-icon" />
                  </div>
                </div>
                <div className="crm-action-buttons">
                  <button onClick={() => {
                    setShowForm(!showForm); setEditingId(null);
                    setFormData({ name: '', email: '', phone: '', company: '', status: 'prospect', notes: '' });
                  }}
                    className="crm-button-add"><Plus size={18} /> <span>Ajouter</span></button>
                  <button onClick={exportToPDF} className="crm-button-export"><Download size={18} /> <span>Export</span></button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <>
            {renderPipeline()}
            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <p className="crm-toolbar-text">Organisez vos prospects par statut</p>
                <button onClick={exportToPDF} className="crm-button-export"><Download size={18} /> <span>Export</span></button>
              </div>
            </div>
          </>
        )}

        {/* Interactions Tab */}
        {activeTab === 'interactions' && (
          <>
            <div className="crm-interactions-grid">
              <div>
                <div className="crm-interactions-main">
                  <h3 className="crm-interactions-title">
                    {selectedContact ? `Interactions - ${selectedContact.name}` : 'Sélectionnez un contact'}
                  </h3>
                  {selectedContact && (
                    <>
                      <textarea placeholder="Ajouter une interaction..." value={interactionText}
                        onChange={(e) => setInteractionText(e.target.value)} className="crm-interactions-textarea" />
                      <button onClick={addInteraction} disabled={loading} className="crm-interactions-button">
                        {loading ? 'Ajout...' : 'Ajouter'}
                      </button>
                      <div className="crm-interactions-list">
                        {getContactInteractions(selectedContact.id).length > 0
                          ? getContactInteractions(selectedContact.id).map(i => (
                            <div key={i.id} className="crm-interaction-item">
                              <p className="crm-interaction-text">{i.text}</p>
                              <p className="crm-interaction-date">📅 {new Date(i.created_at).toLocaleString('fr-FR')}</p>
                            </div>
                          ))
                          : <p className="crm-empty-message">Aucune interaction</p>
                        }
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="crm-interactions-sidebar">
                  <h3 className="crm-sidebar-title">Contacts</h3>
                  <div className="crm-contact-list">
                    {contacts.map(c => (
                      <button key={c.id} onClick={() => setSelectedContact(c)}
                        className={`crm-contact-button ${selectedContact?.id === c.id ? 'active' : ''}`}>
                        <h4>{c.name}</h4><p>{c.company || ''}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <p className="crm-toolbar-text">Sélectionnez un contact pour voir ses interactions</p>
              </div>
            </div>
          </>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <>
            {renderTeamManagement()}
            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <p className="crm-toolbar-text">
                  {currentUser.isOwner ? 'Gérez votre équipe' : 'Seul le propriétaire peut gérer l\'équipe'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}