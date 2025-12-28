import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, Edit2, Search, Download, Users, Crown, UserPlus, LogOut, Shield, RefreshCw, Settings, Send, X, TrendingUp, FileText, MessageSquare } from 'lucide-react';
import Dashboard from './Dashboard';
import EmailComposer from '../components/EmailComposer';
import EmailHistory from '../components/EmailHistory';
import { Layout } from '../components/Layout';
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
  // Déterminer quel storage utiliser (localStorage si remember me, sinon sessionStorage)
  getStorage: () => {
    // Vérifier d'abord dans localStorage, puis sessionStorage
    return localStorage.getItem('crm_token') ? localStorage : sessionStorage;
  },

  // Stockage du token
  getToken: () => {
    return localStorage.getItem('crm_token') || sessionStorage.getItem('crm_token');
  },

  setToken: (token, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('crm_token', token);
    // Si on passe à remember, on supprime de l'autre storage
    if (remember) sessionStorage.removeItem('crm_token');
    else localStorage.removeItem('crm_token');
  },

  removeToken: () => {
    sessionStorage.removeItem('crm_token');
    localStorage.removeItem('crm_token');
  },

  // Stockage des infos utilisateur
  getUser: () => {
    const userSession = sessionStorage.getItem('crm_user');
    const userLocal = localStorage.getItem('crm_user');
    const user = userLocal || userSession;
    return user ? JSON.parse(user) : null;
  },

  setUser: (user, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('crm_user', JSON.stringify(user));
    // Si on passe à remember, on supprime de l'autre storage
    if (remember) sessionStorage.removeItem('crm_user');
    else localStorage.removeItem('crm_user');
  },

  removeUser: () => {
    sessionStorage.removeItem('crm_user');
    localStorage.removeItem('crm_user');
  },

  // Clear all auth data
  clearAuth: () => {
    sessionStorage.removeItem('crm_token');
    sessionStorage.removeItem('crm_user');
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
  },

  // Vérifier si connecté
  isAuthenticated: () => !!(localStorage.getItem('crm_token') || sessionStorage.getItem('crm_token')),

  // Headers avec token
  getAuthHeaders: () => {
    const token = localStorage.getItem('crm_token') || sessionStorage.getItem('crm_token');
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
        alert('Votre session a expiré. Veuillez vous reconnecter.');
        window.location.href = '/';
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
            window.location.href = '/';
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
  },

  // Quotes
  async getQuotes() {
    return this.request('/quotes');
  },

  async getQuote(id) {
    return this.request(`/quotes/${id}`);
  },

  async createQuote(data) {
    return this.request('/quotes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateQuote(id, data) {
    return this.request(`/quotes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async updateQuoteStatus(id, status) {
    return this.request(`/quotes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async deleteQuote(id) {
    return this.request(`/quotes/${id}`, { method: 'DELETE' });
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
  const [suspendedMessage, setSuspendedMessage] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Company info for registration
  const [companyName, setCompanyName] = useState('');
  const [companySiret, setCompanySiret] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  
  // Sub-accounts states
  const [subAccounts, setSubAccounts] = useState([]);
  const [showSubAccountForm, setShowSubAccountForm] = useState(false);
  const [newSubAccount, setNewSubAccount] = useState({ email: '', password: '', role: 'member' });

  // Company info management states
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    company_name: '',
    company_siret: '',
    company_address: '',
    company_phone: '',
    company_email: ''
  });
  
  // CRM states
  const [contacts, setContacts] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [interactionText, setInteractionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', status: 'prospect', notes: ''
  });

  // Quotes states
  const [quotes, setQuotes] = useState([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [quoteFormData, setQuoteFormData] = useState({
    quote_number: '',
    contact_id: null,
    client_name: '',
    client_email: '',
    client_address: '',
    items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    tax_rate: 20,
    tax_amount: 0,
    total: 0,
    status: 'draft',
    valid_until: '',
    payment_terms: '',
    notes: ''
  });
  const [quoteFilter, setQuoteFilter] = useState('all');

  // Email states
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailContact, setEmailContact] = useState(null);
  const [showContactDetail, setShowContactDetail] = useState(false);
  const [detailContact, setDetailContact] = useState(null);

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

  // Initialize company form data when user changes
  useEffect(() => {
    if (currentUser) {
      setCompanyFormData({
        company_name: currentUser.companyName || '',
        company_siret: currentUser.companySiret || '',
        company_address: currentUser.companyAddress || '',
        company_phone: currentUser.companyPhone || '',
        company_email: currentUser.companyEmail || ''
      });
    }
  }, [currentUser]);

  // ==================== LOAD DATA ====================

  const loadContacts = useCallback(async () => {
    try {
      const response = await ApiService.getContacts();
      if (response.ok) {
        const data = await response.json();
        setContacts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
      setContacts([]);
    }
  }, []);

  const loadInteractions = useCallback(async () => {
    try {
      const response = await ApiService.getInteractions();
      if (response.ok) {
        const data = await response.json();
        setInteractions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erreur chargement interactions:', error);
      setInteractions([]);
    }
  }, []);

  const loadSubAccounts = useCallback(async () => {
    try {
      const response = await ApiService.getSubAccounts();
      if (response.ok) {
        const data = await response.json();
        setSubAccounts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erreur chargement sous-comptes:', error);
      setSubAccounts([]);
    }
  }, []);

  const loadQuotes = useCallback(async () => {
    try {
      const response = await ApiService.getQuotes();
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        if (!Array.isArray(data)) {
          setQuotes([]);
          return;
        }
        // Parse items if they are strings
        const parsedData = data.map(quote => ({
          ...quote,
          items: typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items
        }));
        setQuotes(parsedData);
      }
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      setQuotes([]);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadContacts();
      loadInteractions();
      loadQuotes();
      if (currentUser.isOwner) {
        loadSubAccounts();
      }
    }
  }, [currentUser, loadContacts, loadInteractions, loadQuotes, loadSubAccounts]);

  // Charger l'email sauvegardé si "Se souvenir de moi" était coché
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('crm_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

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

    if (!companyName || !companySiret || !companyAddress || !companyPhone || !companyEmail) {
      alert('Toutes les informations de l\'entreprise sont requises');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          license: selectedLicense,
          company_name: companyName,
          company_siret: companySiret,
          company_address: companyAddress,
          company_phone: companyPhone,
          company_email: companyEmail
        })
      });

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
      setCompanyName('');
      setCompanySiret('');
      setCompanyAddress('');
      setCompanyPhone('');
      setCompanyEmail('');
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

      // Stocker le token et l'utilisateur (avec remember me si coché)
      AuthService.setToken(data.token, rememberMe);
      AuthService.setUser(data.user, rememberMe);

      // Sauvegarder l'email pour auto-complétion si remember me
      if (rememberMe) {
        localStorage.setItem('crm_remembered_email', email);
      } else {
        localStorage.removeItem('crm_remembered_email');
      }

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

  // ==================== EMAIL HANDLERS ====================

  const handleOpenEmailComposer = (contact) => {
    setEmailContact(contact);
    setShowEmailComposer(true);
  };

  const handleEmailSent = () => {
    // Reload contacts or show success message
    loadContacts();
  };

  const handleOpenContactDetail = (contact) => {
    setDetailContact(contact);
    setShowContactDetail(true);
  };

  const handleCloseContactDetail = () => {
    setShowContactDetail(false);
    setDetailContact(null);
  };

  // ==================== QUOTES HANDLERS ====================

  const generateQuoteNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DEV-${year}${month}-${random}`;
  };

  const calculateQuoteTotals = (items, taxRate) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleQuoteItemChange = (index, field, value) => {
    const newItems = [...quoteFormData.items];
    newItems[index][field] = value;

    // Recalculate item total
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }

    // Recalculate quote totals
    const { subtotal, taxAmount, total } = calculateQuoteTotals(newItems, quoteFormData.tax_rate);

    setQuoteFormData({
      ...quoteFormData,
      items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total
    });
  };

  const handleAddQuoteItem = () => {
    setQuoteFormData({
      ...quoteFormData,
      items: [...quoteFormData.items, { description: '', quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const handleRemoveQuoteItem = (index) => {
    if (quoteFormData.items.length === 1) {
      alert('Un devis doit contenir au moins un article');
      return;
    }
    const newItems = quoteFormData.items.filter((_, i) => i !== index);
    const { subtotal, taxAmount, total } = calculateQuoteTotals(newItems, quoteFormData.tax_rate);

    setQuoteFormData({
      ...quoteFormData,
      items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total
    });
  };

  const handleContactSelect = (contactId) => {
    const contact = contacts.find(c => c.id === parseInt(contactId));
    if (contact) {
      setQuoteFormData({
        ...quoteFormData,
        contact_id: contact.id,
        client_name: contact.name,
        client_email: contact.email,
        client_address: contact.company || ''
      });
    } else {
      setQuoteFormData({
        ...quoteFormData,
        contact_id: null,
        client_name: '',
        client_email: '',
        client_address: ''
      });
    }
  };

  const handleCreateQuote = async (e) => {
    e.preventDefault();

    if (!quoteFormData.quote_number) {
      alert('Numéro de devis requis');
      return;
    }

    if (!quoteFormData.client_name && !quoteFormData.contact_id) {
      alert('Veuillez sélectionner un contact ou saisir un nom de client');
      return;
    }

    if (quoteFormData.items.length === 0 || !quoteFormData.items[0].description) {
      alert('Veuillez ajouter au moins un article');
      return;
    }

    setLoading(true);
    try {
      if (editingQuoteId) {
        const response = await ApiService.updateQuote(editingQuoteId, quoteFormData);
        if (response.ok) {
          const updated = await response.json();
          setQuotes(quotes.map(q => q.id === editingQuoteId ? updated : q));
          alert('Devis modifié avec succès');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Erreur modification');
        }
      } else {
        const response = await ApiService.createQuote(quoteFormData);
        if (response.ok) {
          const newQuote = await response.json();
          setQuotes([newQuote, ...quotes]);
          alert('Devis créé avec succès');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Erreur création');
        }
      }

      // Reset form
      setQuoteFormData({
        quote_number: '',
        contact_id: null,
        client_name: '',
        client_email: '',
        client_address: '',
        items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
        subtotal: 0,
        tax_rate: 20,
        tax_amount: 0,
        total: 0,
        status: 'draft',
        valid_until: '',
        payment_terms: '',
        notes: ''
      });
      setShowQuoteForm(false);
      setEditingQuoteId(null);

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuote = (quote) => {
    setQuoteFormData({
      ...quote,
      items: quote.items || [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
    });
    setEditingQuoteId(quote.id);
    setShowQuoteForm(true);
  };

  const handleDeleteQuote = async (id) => {
    if (!window.confirm('Confirmer la suppression de ce devis ?')) return;

    setLoading(true);
    try {
      const response = await ApiService.deleteQuote(id);
      if (response.ok) {
        setQuotes(quotes.filter(q => q.id !== id));
        alert('Devis supprimé');
      }
    } catch (error) {
      alert('Erreur suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeQuoteStatus = async (quoteId, newStatus) => {
    try {
      const response = await ApiService.updateQuoteStatus(quoteId, newStatus);
      if (response.ok) {
        setQuotes(quotes.map(q =>
          q.id === quoteId ? { ...q, status: newStatus } : q
        ));
      }
    } catch (error) {
      alert('Erreur changement statut');
    }
  };

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

  const generateQuotePDF = (quote) => {
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '', 'width=800,height=600');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Devis ${quote.quote_number}</title>
        <style>
          @media print {
            @page { margin: 2cm; }
          }
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
          }
          .company-info h1 {
            color: #3b82f6;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .company-info p {
            margin: 3px 0;
            font-size: 13px;
          }
          .quote-info {
            text-align: right;
          }
          .quote-info h2 {
            color: #3b82f6;
            margin: 0 0 10px 0;
          }
          .quote-info p {
            margin: 3px 0;
            font-size: 13px;
          }
          .client-info {
            margin: 30px 0;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
          }
          .client-info h3 {
            margin: 0 0 10px 0;
            color: #3b82f6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          th {
            background: #3b82f6;
            color: white;
            padding: 12px;
            text-align: left;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:hover {
            background: #f8f9fa;
          }
          .totals {
            margin: 30px 0;
            text-align: right;
          }
          .totals table {
            margin-left: auto;
            width: 300px;
          }
          .totals td {
            padding: 8px 12px;
          }
          .totals .total-row {
            background: #3b82f6;
            color: white;
            font-weight: bold;
            font-size: 18px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          .notes {
            margin: 30px 0;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #3b82f6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${currentUser.companyName || 'Entreprise'}</h1>
            <p><strong>SIRET:</strong> ${currentUser.companySiret || ''}</p>
            <p>${currentUser.companyAddress || ''}</p>
            <p><strong>Tél:</strong> ${currentUser.companyPhone || ''}</p>
            <p><strong>Email:</strong> ${currentUser.companyEmail || ''}</p>
          </div>
          <div class="quote-info">
            <h2>DEVIS</h2>
            <p><strong>N° ${quote.quote_number}</strong></p>
            <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
            ${quote.valid_until ? `<p>Valide jusqu'au: ${new Date(quote.valid_until).toLocaleDateString('fr-FR')}</p>` : ''}
          </div>
        </div>

        <div class="client-info">
          <h3>Client</h3>
          <p><strong>${quote.client_name}</strong></p>
          ${quote.client_email ? `<p>Email: ${quote.client_email}</p>` : ''}
          ${quote.client_address ? `<p>${quote.client_address}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="width: 100px; text-align: center;">Quantité</th>
              <th style="width: 120px; text-align: right;">Prix unitaire</th>
              <th style="width: 120px; text-align: right;">Total HT</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${item.unit_price.toFixed(2)}€</td>
                <td style="text-align: right;">${item.total.toFixed(2)}€</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr>
              <td>Sous-total HT:</td>
              <td style="text-align: right;"><strong>${quote.subtotal.toFixed(2)}€</strong></td>
            </tr>
            <tr>
              <td>TVA (${quote.tax_rate}%):</td>
              <td style="text-align: right;"><strong>${quote.tax_amount.toFixed(2)}€</strong></td>
            </tr>
            <tr class="total-row">
              <td>TOTAL TTC:</td>
              <td style="text-align: right;">${quote.total.toFixed(2)}€</td>
            </tr>
          </table>
        </div>

        ${quote.payment_terms ? `
          <div class="notes">
            <strong>Conditions de paiement:</strong><br>
            ${quote.payment_terms}
          </div>
        ` : ''}

        ${quote.notes ? `
          <div class="notes">
            <strong>Notes:</strong><br>
            ${quote.notes}
          </div>
        ` : ''}

        <div class="footer">
          <p>Ce devis est valable ${quote.valid_until ? `jusqu'au ${new Date(quote.valid_until).toLocaleDateString('fr-FR')}` : '30 jours'}.</p>
          <p>${currentUser.companyName} - ${currentUser.companySiret ? `SIRET: ${currentUser.companySiret}` : ''}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Attendre que le contenu soit chargé avant d'imprimer
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 100);
    };
  };

  // ==================== RENDER HELPERS ====================

  const [pipelineFilter, setPipelineFilter] = React.useState('all');

  const renderPipeline = () => {
    const filteredPipelineContacts = pipelineFilter === 'all'
      ? contacts
      : contacts.filter(c => c.status === pipelineFilter);

    const stats = {
      prospect: contacts.filter(c => c.status === 'prospect').length,
      client: contacts.filter(c => c.status === 'client').length,
      perdu: contacts.filter(c => c.status === 'perdu').length,
    };

    return (
      <>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            ...(pipelineFilter === 'prospect' && {
              background: 'rgba(99, 102, 241, 0.15)',
              borderColor: 'rgba(99, 102, 241, 0.3)'
            })
          }} onClick={() => setPipelineFilter(pipelineFilter === 'prospect' ? 'all' : 'prospect')}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Prospects</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#818cf8' }}>{stats.prospect}</div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            ...(pipelineFilter === 'client' && {
              background: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.3)'
            })
          }} onClick={() => setPipelineFilter(pipelineFilter === 'client' ? 'all' : 'client')}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Clients</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#34d399' }}>{stats.client}</div>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            ...(pipelineFilter === 'perdu' && {
              background: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.3)'
            })
          }} onClick={() => setPipelineFilter(pipelineFilter === 'perdu' ? 'all' : 'perdu')}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Perdus</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f87171' }}>{stats.perdu}</div>
          </div>
        </div>

        {/* Pipeline Table */}
        <div className="crm-table-container">
          {filteredPipelineContacts.length > 0 ? (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Entreprise</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPipelineContacts.map(contact => (
                  <tr key={contact.id}>
                    <td>
                      <span className="cell-name" onClick={() => setSelectedContact(contact)}>
                        {contact.name}
                      </span>
                    </td>
                    <td className="cell-company">{contact.company || '—'}</td>
                    <td className="cell-email">{contact.email}</td>
                    <td className="cell-phone">{contact.phone || '—'}</td>
                    <td>
                      <span className={`status-pill ${contact.status}`}>
                        {contact.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleOpenContactDetail(contact)}
                          className="table-action-btn"
                          title="Détails"
                        >
                          <Users size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(contact)}
                          className="table-action-btn"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <TrendingUp size={64} />
              </div>
              <div className="empty-state-title">Aucun contact dans le pipeline</div>
              <div className="empty-state-description">
                {pipelineFilter === 'all'
                  ? 'Ajoutez des contacts pour commencer'
                  : `Aucun contact avec le statut ${pipelineFilter}`}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderTeamManagement = () => {
    const license = LICENSE_TYPES[currentUser.license] || LICENSE_TYPES.starter;
    const usedSlots = subAccounts.length + 1;
    const availableSlots = currentUser.maxUsers - usedSlots;

    const handleUpdateCompany = async () => {
      if (!companyFormData.company_name || !companyFormData.company_siret || !companyFormData.company_address || !companyFormData.company_phone || !companyFormData.company_email) {
        alert('Tous les champs sont requis');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/auth/company`, {
          method: 'PATCH',
          headers: AuthService.getAuthHeaders(),
          body: JSON.stringify(companyFormData)
        });

        if (response.ok) {
          const updatedUser = {
            ...currentUser,
            companyName: companyFormData.company_name,
            companySiret: companyFormData.company_siret,
            companyAddress: companyFormData.company_address,
            companyPhone: companyFormData.company_phone,
            companyEmail: companyFormData.company_email
          };
          setCurrentUser(updatedUser);
          AuthService.setUser(updatedUser);
          setShowCompanyForm(false);
          alert('Informations de l\'entreprise mises à jour');
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Erreur mise à jour');
        }
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="crm-team-container">
        {/* Section informations entreprise */}
        {currentUser.isOwner && (
          <div className="crm-form-container" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="crm-form-title">Informations de l'entreprise</h3>
              <button
                className="crm-button-add"
                onClick={() => setShowCompanyForm(!showCompanyForm)}
              >
                <Edit2 size={18} /> <span>Modifier</span>
              </button>
            </div>

            {!showCompanyForm ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px'
              }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Nom de l'entreprise</p>
                  <p style={{ color: 'white', fontWeight: '500' }}>{currentUser.companyName || 'Non renseigné'}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>SIRET</p>
                  <p style={{ color: 'white', fontWeight: '500' }}>{currentUser.companySiret || 'Non renseigné'}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Adresse</p>
                  <p style={{ color: 'white', fontWeight: '500' }}>{currentUser.companyAddress || 'Non renseigné'}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Téléphone</p>
                  <p style={{ color: 'white', fontWeight: '500' }}>{currentUser.companyPhone || 'Non renseigné'}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Email</p>
                  <p style={{ color: 'white', fontWeight: '500' }}>{currentUser.companyEmail || 'Non renseigné'}</p>
                </div>
              </div>
            ) : (
              <div className="crm-form-grid">
                <input
                  type="text"
                  placeholder="Nom de l'entreprise*"
                  value={companyFormData.company_name}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, company_name: e.target.value })}
                  className="crm-form-input"
                />
                <input
                  type="text"
                  placeholder="SIRET*"
                  value={companyFormData.company_siret}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, company_siret: e.target.value })}
                  className="crm-form-input"
                />
                <input
                  type="text"
                  placeholder="Adresse*"
                  value={companyFormData.company_address}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, company_address: e.target.value })}
                  className="crm-form-input"
                />
                <input
                  type="tel"
                  placeholder="Téléphone*"
                  value={companyFormData.company_phone}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, company_phone: e.target.value })}
                  className="crm-form-input"
                />
                <input
                  type="email"
                  placeholder="Email*"
                  value={companyFormData.company_email}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, company_email: e.target.value })}
                  className="crm-form-input"
                />
                <div className="crm-form-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
                  <button onClick={handleUpdateCompany} className="crm-form-submit" disabled={loading}>
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button onClick={() => setShowCompanyForm(false)} className="crm-form-cancel">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistiques de l'équipe */}
        {currentUser.isOwner && (
          <div className="crm-stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="crm-stat-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))' }}>
              <div className="crm-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                <Users size={24} style={{ color: '#3b82f6' }} />
              </div>
              <div className="crm-stat-details">
                <p className="crm-stat-label">Sous-comptes</p>
                <h3 className="crm-stat-value">{subAccounts.length}</h3>
                <p className="crm-stat-sublabel">{subAccounts.length === 0 ? 'Aucun sous-compte créé' : `sur ${currentUser.maxUsers - 1} disponibles`}</p>
              </div>
            </div>
            <div className="crm-stat-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))' }}>
              <div className="crm-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                <Crown size={24} style={{ color: '#8b5cf6' }} />
              </div>
              <div className="crm-stat-details">
                <p className="crm-stat-label">Licence</p>
                <h3 className="crm-stat-value">{license.name}</h3>
                <p className="crm-stat-sublabel">{usedSlots} / {currentUser.maxUsers} utilisateurs</p>
              </div>
            </div>
          </div>
        )}

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

        {/* En-tête de la liste des utilisateurs */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0 0.5rem'
        }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>
            👥 Liste des utilisateurs
          </h3>
          {currentUser.isOwner && subAccounts.length > 0 && (
            <span style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.9rem'
            }}>
              {subAccounts.length} sous-compte{subAccounts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

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
                {currentUser.isOwner && account.last_login_at && (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                    <div>Dernière connexion : {new Date(account.last_login_at).toLocaleString('fr-FR')}</div>
                    {account.last_login_ip && <div>IP : {account.last_login_ip}</div>}
                  </div>
                )}
              </div>
              {currentUser.isOwner && (
                <div className="crm-team-actions">
                  <select value={account.role} onChange={(e) => handleUpdateSubAccountRole(account.id, e.target.value)}
                    className="crm-role-select">
                    <option value="member">Membre</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleDeleteSubAccount(account.id)}
                    className="crm-btn-delete-small"
                    title="Supprimer ce sous-compte"
                  >
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <span>Se souvenir de moi</span>
                  </label>
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
                  <h3 style={{ color: '#64c8ff', marginBottom: '0.5rem', fontSize: '1rem' }}>Informations de connexion</h3>
                  <input type="email" placeholder="Email*" value={email}
                    onChange={(e) => setEmail(e.target.value)} className="crm-login-input" />
                  <input type="password" placeholder="Mot de passe* (min 6 caractères)" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="crm-login-input" />

                  <h3 style={{ color: '#64c8ff', marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1rem' }}>Informations de l'entreprise</h3>
                  <input type="text" placeholder="Nom de l'entreprise*" value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)} className="crm-login-input" />
                  <input type="text" placeholder="Numéro SIRET*" value={companySiret}
                    onChange={(e) => setCompanySiret(e.target.value)} className="crm-login-input" />
                  <input type="text" placeholder="Adresse complète*" value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)} className="crm-login-input" />
                  <input type="tel" placeholder="Téléphone*" value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)} className="crm-login-input" />
                  <input type="email" placeholder="Email entreprise*" value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)} className="crm-login-input" />

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
    <Layout currentUser={currentUser} onLogout={handleLogout}>
      {/* Routes */}
      <Routes>
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/crm/dashboard" replace />} />

          {/* Dashboard Route */}
          <Route path="/dashboard" element={
            <Dashboard API_BASE={API_BASE} AuthService={AuthService} />
          } />

          {/* Contacts Route */}
          <Route path="/contacts" element={
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
                    className="crm-button-add"><Plus size={18} /> <span>Nouveau</span></button>
                  <button onClick={exportToPDF} className="crm-button-export"><Download size={18} /> <span>Export</span></button>
                </div>
              </div>
            </div>

            <div className="crm-table-container">
              {filteredContacts.length > 0 ? (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Entreprise</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map(contact => (
                      <tr key={contact.id}>
                        <td>
                          <span className="cell-name" onClick={() => setSelectedContact(contact)}>
                            {contact.name}
                          </span>
                        </td>
                        <td className="cell-company">{contact.company || '—'}</td>
                        <td className="cell-email">{contact.email}</td>
                        <td className="cell-phone">{contact.phone || '—'}</td>
                        <td>
                          <span className={`status-pill ${contact.status}`}>
                            {contact.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              onClick={() => handleOpenEmailComposer(contact)}
                              className="table-action-btn success"
                              title="Envoyer email"
                            >
                              <Send size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenContactDetail(contact)}
                              className="table-action-btn"
                              title="Détails"
                            >
                              <Users size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(contact)}
                              className="table-action-btn"
                              title="Modifier"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(contact.id)}
                              className="table-action-btn danger"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Users size={64} />
                  </div>
                  <div className="empty-state-title">Aucun contact trouvé</div>
                  <div className="empty-state-description">
                    Commencez par ajouter votre premier contact
                  </div>
                </div>
              )}
            </div>
          </>
          } />

          {/* Quotes Route */}
          <Route path="/devis" element={
          <>
            {showQuoteForm && (
              <div className="crm-form-container">
                <h2 className="crm-form-title">{editingQuoteId ? 'Modifier' : 'Créer'} un devis</h2>

                {/* Contact selection */}
                <div className="crm-form-grid">
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                      Contact existant (optionnel)
                    </label>
                    <select
                      value={quoteFormData.contact_id || ''}
                      onChange={(e) => handleContactSelect(e.target.value)}
                      className="crm-form-select"
                    >
                      <option value="">-- Saisie manuelle --</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Numéro de devis*"
                    value={quoteFormData.quote_number}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, quote_number: e.target.value })}
                    className="crm-form-input"
                  />

                  <input
                    type="text"
                    placeholder="Nom du client*"
                    value={quoteFormData.client_name}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, client_name: e.target.value })}
                    className="crm-form-input"
                  />

                  <input
                    type="email"
                    placeholder="Email du client"
                    value={quoteFormData.client_email}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, client_email: e.target.value })}
                    className="crm-form-input"
                  />

                  <input
                    type="text"
                    placeholder="Adresse du client"
                    value={quoteFormData.client_address}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, client_address: e.target.value })}
                    className="crm-form-input"
                  />

                  <input
                    type="date"
                    placeholder="Date de validité"
                    value={quoteFormData.valid_until}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, valid_until: e.target.value })}
                    className="crm-form-input"
                  />

                  <input
                    type="text"
                    placeholder="Conditions de paiement"
                    value={quoteFormData.payment_terms}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, payment_terms: e.target.value })}
                    className="crm-form-input"
                  />

                  {/* Items */}
                  <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Articles</label>
                      <button
                        type="button"
                        onClick={handleAddQuoteItem}
                        className="crm-button-add"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        + Ajouter un article
                      </button>
                    </div>

                    {quoteFormData.items.map((item, index) => (
                      <div key={index} className="quote-item-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}>
                        <input
                          type="text"
                          placeholder="Description*"
                          value={item.description}
                          onChange={(e) => handleQuoteItemChange(index, 'description', e.target.value)}
                          className="crm-form-input"
                          style={{ margin: 0 }}
                        />
                        <input
                          type="number"
                          placeholder="Quantité"
                          value={item.quantity}
                          onChange={(e) => handleQuoteItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="crm-form-input"
                          style={{ margin: 0 }}
                          min="1"
                        />
                        <input
                          type="number"
                          placeholder="Prix unitaire"
                          value={item.unit_price}
                          onChange={(e) => handleQuoteItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="crm-form-input"
                          style={{ margin: 0 }}
                          step="0.01"
                        />
                        <div className="quote-item-total" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.9)',
                          fontWeight: '500'
                        }}>
                          Total: {item.total.toFixed(2)}€
                        </div>
                        {quoteFormData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuoteItem(index)}
                            className="crm-btn-delete"
                            style={{ margin: 0, padding: '0.5rem' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1rem', background: 'rgba(100,200,255,0.05)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                      <span>Sous-total HT:</span>
                      <span style={{ fontWeight: '500', color: 'white' }}>{quoteFormData.subtotal.toFixed(2)}€</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                      <span>TVA ({quoteFormData.tax_rate}%):</span>
                      <span style={{ fontWeight: '500', color: 'white' }}>{quoteFormData.tax_amount.toFixed(2)}€</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '1.1rem' }}>
                      <span style={{ fontWeight: '600', color: 'white' }}>Total TTC:</span>
                      <span style={{ fontWeight: '700', color: '#64c8ff' }}>{quoteFormData.total.toFixed(2)}€</span>
                    </div>
                  </div>

                  <textarea
                    placeholder="Notes"
                    value={quoteFormData.notes}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, notes: e.target.value })}
                    className="crm-form-textarea"
                    style={{ gridColumn: '1 / -1' }}
                  />

                  <div className="crm-form-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
                    <button onClick={handleCreateQuote} disabled={loading} className="crm-form-submit">
                      {loading ? 'En cours...' : editingQuoteId ? 'Mettre à jour' : 'Créer le devis'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuoteForm(false);
                        setEditingQuoteId(null);
                        setQuoteFormData({
                          quote_number: '',
                          contact_id: null,
                          client_name: '',
                          client_email: '',
                          client_address: '',
                          items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
                          subtotal: 0,
                          tax_rate: 20,
                          tax_amount: 0,
                          total: 0,
                          status: 'draft',
                          valid_until: '',
                          payment_terms: '',
                          notes: ''
                        });
                      }}
                      className="crm-form-cancel"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="filter-bar">
              {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map(status => (
                <button
                  key={status}
                  onClick={() => setQuoteFilter(status)}
                  className={`filter-pill ${quoteFilter === status ? 'active' : ''}`}
                >
                  {status === 'all' ? 'Tous' :
                   status === 'draft' ? 'Brouillon' :
                   status === 'sent' ? 'Envoyé' :
                   status === 'accepted' ? 'Accepté' :
                   status === 'rejected' ? 'Refusé' : 'Expiré'}
                </button>
              ))}
            </div>

            {/* Quotes Table */}
            <div className="crm-table-container">
              {quotes.filter(q => quoteFilter === 'all' || q.status === quoteFilter).length > 0 ? (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>N° Devis</th>
                      <th>Client</th>
                      <th>Email</th>
                      <th>Montant TTC</th>
                      <th>Articles</th>
                      <th>Validité</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes
                      .filter(q => quoteFilter === 'all' || q.status === quoteFilter)
                      .map(quote => (
                      <tr key={quote.id}>
                        <td className="cell-name">{quote.quote_number}</td>
                        <td>{quote.client_name}</td>
                        <td className="cell-email">{quote.client_email || '—'}</td>
                        <td className="cell-amount">{quote.total.toFixed(2)}€</td>
                        <td className="cell-company">{quote.items?.length || 0}</td>
                        <td className="cell-date">
                          {quote.valid_until
                            ? new Date(quote.valid_until).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                        <td>
                          <select
                            value={quote.status}
                            onChange={(e) => handleChangeQuoteStatus(quote.id, e.target.value)}
                            className={`status-pill ${quote.status}`}
                            style={{
                              cursor: 'pointer',
                              border: 'none',
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          >
                            <option value="draft">Brouillon</option>
                            <option value="sent">Envoyé</option>
                            <option value="accepted">Accepté</option>
                            <option value="rejected">Refusé</option>
                            <option value="expired">Expiré</option>
                          </select>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              onClick={() => generateQuotePDF(quote)}
                              className="table-action-btn success"
                              title="Télécharger PDF"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleEditQuote(quote)}
                              className="table-action-btn"
                              title="Modifier"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteQuote(quote.id)}
                              className="table-action-btn danger"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <FileText size={64} />
                  </div>
                  <div className="empty-state-title">Aucun devis trouvé</div>
                  <div className="empty-state-description">
                    Créez votre premier devis pour commencer
                  </div>
                </div>
              )}
            </div>

            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <p className="crm-toolbar-text">Gérez vos devis clients</p>
                <button
                  onClick={() => {
                    setShowQuoteForm(true);
                    setQuoteFormData({
                      ...quoteFormData,
                      quote_number: generateQuoteNumber()
                    });
                  }}
                  className="crm-button-add"
                >
                  <Plus size={18} /> <span>Nouveau devis</span>
                </button>
              </div>
            </div>
          </>
          } />

          {/* Pipeline Route */}
          <Route path="/pipeline" element={
          <>
            {renderPipeline()}
            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <p className="crm-toolbar-text">Organisez vos prospects par statut</p>
                <button onClick={exportToPDF} className="crm-button-export"><Download size={18} /> <span>Export</span></button>
              </div>
            </div>
          </>
          } />

          {/* Interactions Route */}
          <Route path="/interactions" element={
          <>
            {/* Add Interaction Section */}
            {selectedContact && (
              <div className="crm-form-container" style={{ marginBottom: '1.5rem' }}>
                <h3 className="crm-form-title">Nouvelle interaction - {selectedContact.name}</h3>
                <textarea
                  placeholder="Décrivez l'interaction..."
                  value={interactionText}
                  onChange={(e) => setInteractionText(e.target.value)}
                  className="crm-form-textarea"
                  rows="3"
                  style={{ marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={addInteraction} disabled={loading} className="btn-compact primary">
                    <MessageSquare size={16} />
                    <span>{loading ? 'Ajout...' : 'Ajouter l\'interaction'}</span>
                  </button>
                  <button onClick={() => setSelectedContact(null)} className="btn-compact secondary">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Contact Filter */}
            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <div className="crm-search-container">
                  <select
                    value={selectedContact?.id || ''}
                    onChange={(e) => setSelectedContact(contacts.find(c => c.id === parseInt(e.target.value)) || null)}
                    className="crm-form-select"
                    style={{ minWidth: '250px' }}
                  >
                    <option value="">Tous les contacts</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="crm-action-buttons">
                  <button
                    onClick={() => setSelectedContact(contacts[0] || null)}
                    className="crm-button-add"
                    disabled={!contacts.length}
                  >
                    <Plus size={18} />
                    <span>Nouvelle interaction</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Interactions Table */}
            <div className="crm-table-container">
              {(selectedContact ? getContactInteractions(selectedContact.id) : interactions).length > 0 ? (
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Contact</th>
                      <th>Entreprise</th>
                      <th>Interaction</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedContact ? getContactInteractions(selectedContact.id) : interactions).map(interaction => {
                      const contact = contacts.find(c => c.id === interaction.contact_id);
                      return (
                        <tr key={interaction.id}>
                          <td className="cell-name">
                            {contact?.name || 'Contact supprimé'}
                          </td>
                          <td className="cell-company">{contact?.company || '—'}</td>
                          <td style={{ maxWidth: '400px' }}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'rgba(255,255,255,0.9)'
                            }}>
                              {interaction.text}
                            </div>
                          </td>
                          <td className="cell-date">
                            {new Date(interaction.created_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                onClick={() => setSelectedContact(contact)}
                                className="table-action-btn"
                                title="Voir le contact"
                              >
                                <Users size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Supprimer cette interaction ?')) {
                                    // TODO: implement delete
                                  }
                                }}
                                className="table-action-btn danger"
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <MessageSquare size={64} />
                  </div>
                  <div className="empty-state-title">Aucune interaction</div>
                  <div className="empty-state-description">
                    {selectedContact
                      ? `Aucune interaction enregistrée pour ${selectedContact.name}`
                      : 'Sélectionnez un contact pour ajouter une interaction'}
                  </div>
                </div>
              )}
            </div>
          </>
          } />

          {/* Administration Route */}
          <Route path="/administration" element={
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
          } />
        </Routes>

        {/* Email Composer Modal */}
        <EmailComposer
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          contact={emailContact}
          API_BASE={API_BASE}
          AuthService={AuthService}
          onEmailSent={handleEmailSent}
        />

        {/* Contact Detail Modal with Email History */}
        {showContactDetail && detailContact && (
          <div className="email-composer-overlay" onClick={handleCloseContactDetail}>
            <div className="email-composer-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
              {/* Header */}
              <div className="email-composer-header">
                <div>
                  <h2 className="email-composer-title">
                    <Users size={20} />
                    Détails du contact
                  </h2>
                  <p className="email-composer-subtitle">
                    {detailContact.name} - {detailContact.email}
                  </p>
                </div>
                <button onClick={handleCloseContactDetail} className="email-composer-close">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="email-composer-body">
                {/* Contact Info */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px'
                }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Nom</p>
                    <p style={{ color: 'white', fontWeight: '500' }}>{detailContact.name}</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Email</p>
                    <p style={{ color: 'white', fontWeight: '500' }}>{detailContact.email}</p>
                  </div>
                  {detailContact.phone && (
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Téléphone</p>
                      <p style={{ color: 'white', fontWeight: '500' }}>{detailContact.phone}</p>
                    </div>
                  )}
                  {detailContact.company && (
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Entreprise</p>
                      <p style={{ color: 'white', fontWeight: '500' }}>{detailContact.company}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Statut</p>
                    <span className={`crm-status-badge crm-status-${detailContact.status}`}>
                      {detailContact.status}
                    </span>
                  </div>
                </div>

                {/* Email History */}
                <EmailHistory
                  contactId={detailContact.id}
                  API_BASE={API_BASE}
                  AuthService={AuthService}
                />
              </div>

              {/* Footer */}
              <div className="email-composer-footer">
                <button
                  onClick={() => {
                    handleCloseContactDetail();
                    handleOpenEmailComposer(detailContact);
                  }}
                  className="email-btn-primary"
                >
                  <Send size={16} />
                  Envoyer un email
                </button>
                <button
                  onClick={handleCloseContactDetail}
                  className="email-btn-secondary"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
    </Layout>
  );
}