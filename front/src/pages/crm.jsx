import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, LogOut, Download, MessageSquare, TrendingUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uaptwsvwucgyybsjknqx.supabase.co';
const SUPABASE_KEY = 'sb_secret_79mRewfnd6ynNvk-LXQ8Cw_xMk3-wjS';

// Client Supabase simplifié
const supabaseClient = {
  async request(method, table, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    
    // Ajouter les filtres
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        url.searchParams.append(key, `eq.${value}`);
      });
    }
    if (options.select) {
      url.searchParams.append('select', options.select);
    }

    const config = {
      method,
      headers,
      ...(method !== 'GET' && { body: JSON.stringify(options.data || {}) })
    };

    try {
      const response = await fetch(url.toString(), config);
      if (!response.ok) {
        throw new Error(`Supabase error: ${response.status}`);
      }
      return method === 'DELETE' ? null : await response.json();
    } catch (error) {
      console.error('Supabase request error:', error);
      return null;
    }
  },

  // SELECT
  async from(table) {
    return {
      select: (cols) => ({
        eq: async (field, value) => {
          return supabaseClient.request('GET', table, {
            select: cols,
            eq: { [field]: value }
          });
        },
        single: async () => {
          const result = await supabaseClient.request('GET', table, { select: cols });
          return result?.[0] || null;
        },
        async execute() {
          return supabaseClient.request('GET', table, { select: cols });
        }
      })
    };
  },

  // INSERT
  async insert(table, data) {
    return supabaseClient.request('POST', table, { data });
  },

  // UPDATE
  async update(table, data, field, value) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.append(field, `eq.${value}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });

    return response.ok ? await response.json() : null;
  },

  // DELETE
  async delete(table, field, value) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.append(field, `eq.${value}`);
    
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    await fetch(url.toString(), {
      method: 'DELETE',
      headers
    });
  }
};

// ========== COMPOSANT PRINCIPAL ==========
export function CRM() {
  const [currentUser, setCurrentUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'prospect',
    notes: ''
  });

  // Charger les données au login
  useEffect(() => {
    if (currentUser?.id) {
      loadContacts();
      loadInteractions();
    }
  }, [currentUser?.id]);

  // ========== AUTH ==========
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      // En vrai, utiliser Supabase Auth
      // Pour démo, on stocke localement
      const user = {
        id: email.replace('@', '_').replace('.', '_'),
        email,
        created_at: new Date().toISOString()
      };
      
      setCurrentUser(user);
      setEmail('');
      setPassword('');
    } catch (error) {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setContacts([]);
    setInteractions([]);
  };

  // ========== CONTACTS ==========
  const loadContacts = async () => {
    try {
      // GET http://supabase.co/rest/v1/contacts?user_id=eq.USER_ID
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/contacts?user_id=eq.${currentUser.id}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setContacts(data);
      }
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Nom et email requis');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        // UPDATE
        await fetch(
          `${SUPABASE_URL}/rest/v1/contacts?id=eq.${editingId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
              ...formData,
              updated_at: new Date().toISOString()
            })
          }
        );
        
        setContacts(contacts.map(c => c.id === editingId ? { ...formData, id: editingId } : c));
        setEditingId(null);
      } else {
        // INSERT
        const newContact = {
          ...formData,
          user_id: currentUser.id,
          created_at: new Date().toISOString()
        };

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/contacts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify(newContact)
          }
        );

        const inserted = await response.json();
        if (inserted && inserted[0]) {
          setContacts([...contacts, inserted[0]]);
        }
      }

      setFormData({ name: '', email: '', phone: '', company: '', status: 'prospect', notes: '' });
      setShowForm(false);
    } catch (error) {
      alert('Erreur lors de l\'ajout du contact');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmer la suppression ?')) return;

    setLoading(true);
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/contacts?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      setContacts(contacts.filter(c => c.id !== id));
    } catch (error) {
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contact) => {
    setFormData(contact);
    setEditingId(contact.id);
    setShowForm(true);
  };

  // ========== INTERACTIONS ==========
  const loadInteractions = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interactions?user_id=eq.${currentUser.id}&select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      const data = await response.json();
      if (Array.isArray(data)) {
        setInteractions(data);
      }
    } catch (error) {
      console.error('Erreur chargement interactions:', error);
    }
  };

  const addInteraction = async () => {
    if (!interactionText || !selectedContact) return;

    setLoading(true);
    try {
      const newInteraction = {
        user_id: currentUser.id,
        contact_id: selectedContact.id,
        text: interactionText,
        created_at: new Date().toISOString()
      };

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify(newInteraction)
        }
      );

      const inserted = await response.json();
      if (inserted && inserted[0]) {
        setInteractions([inserted[0], ...interactions]);
        setInteractionText('');
      }
    } catch (error) {
      alert('Erreur lors de l\'ajout de l\'interaction');
    } finally {
      setLoading(false);
    }
  };

  const getContactInteractions = (contactId) => {
    return interactions.filter(i => i.contact_id === contactId);
  };

  // ========== EXPORT PDF ==========
  const exportToPDF = () => {
    let content = 'CRM - Rapport de Contacts\n';
    content += `Date: ${new Date().toLocaleString('fr-FR')}\n\n`;
    
    contacts.forEach(contact => {
      content += `${contact.name}\n`;
      content += `Email: ${contact.email}\n`;
      content += `Téléphone: ${contact.phone || 'N/A'}\n`;
      content += `Entreprise: ${contact.company || 'N/A'}\n`;
      content += `Statut: ${contact.status}\n`;
      content += `Notes: ${contact.notes || 'N/A'}\n`;
      content += '---\n\n';
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'crm-contacts.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ========== PIPELINE ==========
  const renderPipeline = () => {
    const stages = ['prospect', 'client', 'perdu'];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stages.map(stage => (
          <div key={stage} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
            <h3 className="text-xl font-bold text-white mb-4 capitalize">
              {stage === 'prospect' ? '🎯 Prospects' : stage === 'client' ? '✅ Clients' : '❌ Perdus'}
            </h3>
            <div className="space-y-3 min-h-96">
              {contacts.filter(c => c.status === stage).map(contact => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className="bg-white/20 hover:bg-white/30 rounded-lg p-3 cursor-pointer transition border border-white/10"
                >
                  <p className="font-semibold text-white">{contact.name}</p>
                  <p className="text-sm text-gray-300">{contact.company}</p>
                  <p className="text-xs text-gray-400 mt-2">{contact.email}</p>
                </div>
              ))}
              {contacts.filter(c => c.status === stage).length === 0 && (
                <p className="text-gray-400 text-center py-20">Aucun contact</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: contacts.length,
    prospects: contacts.filter(c => c.status === 'prospect').length,
    clients: contacts.filter(c => c.status === 'client').length,
    lost: contacts.filter(c => c.status === 'perdu').length,
    conversionRate: contacts.length > 0 ? ((contacts.filter(c => c.status === 'client').length / contacts.length) * 100).toFixed(1) : 0
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-2 text-center">CRM Pro</h1>
            <p className="text-gray-300 text-center mb-8">Avec Supabase 🚀</p>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition transform hover:scale-105 disabled:opacity-50"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>

            <p className="text-gray-400 text-sm text-center mt-4">
              💡 Connexion simulée (remplacer par Supabase Auth en production)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">CRM Pro</h1>
            <p className="text-gray-300 text-sm">Connecté: {currentUser.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition"
          >
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 text-center">
            <p className="text-gray-300 text-sm">Total</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-blue-500/20 backdrop-blur-md border border-blue-400/30 rounded-lg p-4 text-center">
            <p className="text-gray-300 text-sm">Prospects</p>
            <p className="text-3xl font-bold text-blue-300">{stats.prospects}</p>
          </div>
          <div className="bg-green-500/20 backdrop-blur-md border border-green-400/30 rounded-lg p-4 text-center">
            <p className="text-gray-300 text-sm">Clients</p>
            <p className="text-3xl font-bold text-green-300">{stats.clients}</p>
          </div>
          <div className="bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-lg p-4 text-center">
            <p className="text-gray-300 text-sm">Perdus</p>
            <p className="text-3xl font-bold text-red-300">{stats.lost}</p>
          </div>
          <div className="bg-purple-500/20 backdrop-blur-md border border-purple-400/30 rounded-lg p-4 text-center">
            <p className="text-gray-300 text-sm">Conversion</p>
            <p className="text-3xl font-bold text-purple-300">{stats.conversionRate}%</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-6 py-3 font-semibold transition whitespace-nowrap ${activeTab === 'contacts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300 hover:text-white'}`}
          >
            📋 Contacts
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-6 py-3 font-semibold transition whitespace-nowrap ${activeTab === 'pipeline' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300 hover:text-white'}`}
          >
            <TrendingUp size={20} className="inline mr-2" /> Pipeline
          </button>
          <button
            onClick={() => setActiveTab('interactions')}
            className={`px-6 py-3 font-semibold transition whitespace-nowrap ${activeTab === 'interactions' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-300 hover:text-white'}`}
          >
            <MessageSquare size={20} className="inline mr-2" /> Interactions
          </button>
        </div>

        {/* CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingId(null);
                  setFormData({ name: '', email: '', phone: '', company: '', status: 'prospect', notes: '' });
                }}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                disabled={loading}
              >
                <Plus size={20} /> Ajouter
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                <Download size={20} /> Export
              </button>
            </div>

            {showForm && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Modifier' : 'Ajouter'} un contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nom*"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500"
                  />
                  <input
                    type="email"
                    placeholder="Email*"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Entreprise"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500"
                  />
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-white/90 text-gray-900"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="client">Client</option>
                    <option value="perdu">Perdu</option>
                  </select>
                  <textarea
                    placeholder="Notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-white/90 text-gray-900 md:col-span-2 h-24 resize-none"
                  />
                  <button
                    onClick={handleAddContact}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition md:col-span-2 disabled:opacity-50"
                  >
                    {loading ? 'Chargement...' : editingId ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <div key={contact.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 hover:bg-white/15 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 cursor-pointer" onClick={() => setSelectedContact(contact)}>
                        <h3 className="text-lg font-bold text-white">{contact.name}</h3>
                        <p className="text-gray-300">{contact.company}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        contact.status === 'prospect' ? 'bg-blue-500/30 text-blue-300' :
                        contact.status === 'client' ? 'bg-green-500/30 text-green-300' :
                        'bg-red-500/30 text-red-300'
                      }`}>
                        {contact.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm text-gray-300">
                      <p>📧 {contact.email}</p>
                      {contact.phone && <p>📱 {contact.phone}</p>}
                    </div>
                    {contact.notes && <p className="text-gray-400 text-sm mb-3">📝 {contact.notes}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="flex items-center gap-1 bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 px-3 py-1 rounded transition text-sm"
                      >
                        <Edit2 size={16} /> Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        disabled={loading}
                        className="flex items-center gap-1 bg-red-500/30 hover:bg-red-500/50 text-red-300 px-3 py-1 rounded transition text-sm disabled:opacity-50"
                      >
                        <Trash2 size={16} /> Supprimer
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">Aucun contact trouvé</p>
              )}
            </div>
          </>
        )}

        {/* PIPELINE TAB */}
        {activeTab === 'pipeline' && renderPipeline()}

        {/* INTERACTIONS TAB */}
        {activeTab === 'interactions' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  {selectedContact ? `Interactions - ${selectedContact.name}` : 'Sélectionnez un contact'}
                </h3>
                
                {selectedContact && (
                  <>
                    <div className="mb-6">
                      <textarea
                        placeholder="Ajouter une interaction (appel, email, réunion...)"
                        value={interactionText}
                        onChange={(e) => setInteractionText(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500 h-24 resize-none mb-3"
                      />
                      <button
                        onClick={addInteraction}
                        disabled={loading}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                      >
                        {loading ? 'Ajout...' : 'Ajouter interaction'}
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {getContactInteractions(selectedContact.id).length > 0 ? (
                        getContactInteractions(selectedContact.id).map(interaction => (
                          <div key={interaction.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <p className="text-gray-300 text-sm">{interaction.text}</p>
                            <p className="text-gray-500 text-xs mt-2">📅 {new Date(interaction.created_at).toLocaleString('fr-FR')}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">Aucune interaction</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 sticky top-6">
                <h3 className="text-xl font-bold text-white mb-4">Contacts rapides</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {contacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition ${
                        selectedContact?.id === contact.id
                          ? 'bg-blue-500/50 border border-blue-400'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <p className="font-semibold text-white text-sm">{contact.name}</p>
                      <p className="text-gray-400 text-xs">{contact.company}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}