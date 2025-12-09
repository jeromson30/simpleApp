import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, Download } from 'lucide-react';
import '../App.css';

export function CRM({ onLogin, onLogout }) {
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

  useEffect(() => {
    if (currentUser?.id) {
      loadContacts();
      loadInteractions();
    }
  }, [currentUser?.id]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const user = {
        id: email.replace('@', '_').replace('.', '_'),
        email,
        created_at: new Date().toISOString()
      };
      
      setCurrentUser(user);
      if (onLogin) {
        onLogin(user);
      }
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
    setEmail('');
    setPassword('');
    if (onLogout) {
      onLogout();
    }
  };

  const loadContacts = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/contacts?user_id=eq.${currentUser.id}&select=*`,
        {
          headers: {
            'apikey': process.env.REACT_APP_SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_KEY}`
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
        setContacts(contacts.map(c => c.id === editingId ? { ...formData, id: editingId } : c));
        setEditingId(null);
      } else {
        const newContact = {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
          user_id: currentUser.id,
          created_at: new Date().toISOString()
        };
        setContacts([...contacts, newContact]);
      }

      setFormData({ name: '', email: '', phone: '', company: '', status: 'prospect', notes: '' });
      setShowForm(false);
    } catch (error) {
      alert('Erreur lors de l\'ajout du contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmer la suppression ?')) return;

    setLoading(true);
    try {
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

  const loadInteractions = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/interactions?user_id=eq.${currentUser.id}&select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': process.env.REACT_APP_SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_KEY}`
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
        id: Math.random().toString(36).substr(2, 9),
        user_id: currentUser.id,
        contact_id: selectedContact.id,
        text: interactionText,
        created_at: new Date().toISOString()
      };

      setInteractions([newInteraction, ...interactions]);
      setInteractionText('');
    } catch (error) {
      alert('Erreur lors de l\'ajout de l\'interaction');
    } finally {
      setLoading(false);
    }
  };

  const getContactInteractions = (contactId) => {
    return interactions.filter(i => i.contact_id === contactId);
  };

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
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className="crm-pipeline-card"
                >
                  <h4>{contact.name}</h4>
                  <p>{contact.company}</p>
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
      <div className="crm-login-container">
        <div className="crm-login-box">
          <div className="crm-login-card">
            <h1>Prism CRM</h1>
            <p>Gestion complète de vos contacts 💎</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="crm-login-input"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="crm-login-input"
              />
              <button
                onClick={handleLogin}
                disabled={loading}
                className="crm-login-button"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>

            <p className="crm-login-hint">
              💡 Connexion simulée
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-container">
      <div className="crm-main">
        
        {/* STATS GRID */}
        <div className="crm-stats-grid">
          <div className="crm-stat-card">
            <h3>Total Contacts</h3>
            <p className="crm-stat-number">{stats.total}</p>
          </div>
          <div className="crm-stat-card">
            <h3>Prospects</h3>
            <p className="crm-stat-number">{stats.prospects}</p>
          </div>
          <div className="crm-stat-card">
            <h3>Clients</h3>
            <p className="crm-stat-number">{stats.clients}</p>
          </div>
          <div className="crm-stat-card">
            <h3>Perdus</h3>
            <p className="crm-stat-number">{stats.lost}</p>
          </div>
          <div className="crm-stat-card">
            <h3>Conversion</h3>
            <p className="crm-stat-number">{stats.conversionRate}%</p>
          </div>
        </div>

        {/* TABS */}
        <div className="crm-tabs-wrapper">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`crm-tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
            title="Liste des contacts"
          >
            📋 Contacts
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`crm-tab-button ${activeTab === 'pipeline' ? 'active' : ''}`}
            title="Pipeline kanban"
          >
            🎯 Pipeline
          </button>
          <button
            onClick={() => setActiveTab('interactions')}
            className={`crm-tab-button ${activeTab === 'interactions' ? 'active' : ''}`}
            title="Suivi des interactions"
          >
            💬 Interactions
          </button>
        </div>

        {/* ===== CONTACTS TAB ===== */}
        {activeTab === 'contacts' && (
          <>
            {showForm && (
              <div className="crm-form-container">
                <h2 className="crm-form-title">{editingId ? 'Modifier' : 'Ajouter'} un contact</h2>
                <div className="crm-form-grid">
                  <input
                    type="text"
                    placeholder="Nom*"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="crm-form-input"
                  />
                  <input
                    type="email"
                    placeholder="Email*"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="crm-form-input"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="crm-form-input"
                  />
                  <input
                    type="text"
                    placeholder="Entreprise"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="crm-form-input"
                  />
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="crm-form-select"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="client">Client</option>
                    <option value="perdu">Perdu</option>
                  </select>
                  <textarea
                    placeholder="Notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="crm-form-textarea"
                  />
                  <button
                    onClick={handleAddContact}
                    disabled={loading}
                    className="crm-form-submit"
                  >
                    {loading ? 'Chargement...' : editingId ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}

            <div className="crm-contacts-list">
              {filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <div key={contact.id} className="crm-contact-card">
                    <div className="crm-contact-header">
                      <div className="crm-contact-info" onClick={() => setSelectedContact(contact)} style={{ cursor: 'pointer', flex: 1 }}>
                        <h3>{contact.name}</h3>
                        <p className="crm-contact-company">{contact.company}</p>
                      </div>
                      <span className={`crm-status-badge crm-status-${contact.status}`}>
                        {contact.status}
                      </span>
                    </div>
                    <div className="crm-contact-details">
                      <p>📧 {contact.email}</p>
                      {contact.phone && <p>📱 {contact.phone}</p>}
                    </div>
                    {contact.notes && <p className="crm-contact-notes">📝 {contact.notes}</p>}
                    <div className="crm-contact-actions">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="crm-btn-edit"
                      >
                        <Edit2 size={16} /> Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        disabled={loading}
                        className="crm-btn-delete"
                      >
                        <Trash2 size={16} /> Supprimer
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="crm-empty-message">Aucun contact trouvé</p>
              )}
            </div>

            {/* TOOLBAR CONTACTS - EN DERNIER */}
            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                
                {/* RECHERCHE */}
                <div className="crm-search-container">
                  <div className="crm-search-wrapper">
                    <input
                      type="text"
                      placeholder="Rechercher un contact..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="crm-search-input"
                    />
                    <Search size={18} className="crm-search-icon" />
                  </div>
                </div>

                {/* BOUTONS D'ACTION */}
                <div className="crm-action-buttons">
                  <button
                    onClick={() => {
                      setShowForm(!showForm);
                      setEditingId(null);
                      setFormData({ 
                        name: '', 
                        email: '', 
                        phone: '', 
                        company: '', 
                        status: 'prospect', 
                        notes: '' 
                      });
                    }}
                    className="crm-button-add"
                    disabled={loading}
                    title="Ajouter un nouveau contact"
                  >
                    <Plus size={18} /> 
                    <span>Ajouter</span>
                  </button>

                  <button
                    onClick={exportToPDF}
                    className="crm-button-export"
                    title="Exporter les contacts"
                  >
                    <Download size={18} /> 
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== PIPELINE TAB ===== */}
        {activeTab === 'pipeline' && (
          <>
            {/* CONTENU EN PREMIER */}
            {renderPipeline()}

            {/* TOOLBAR PIPELINE - EN DERNIER */}
            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <p className="crm-toolbar-text">Organisez vos prospects par statut</p>
                <button
                  onClick={exportToPDF}
                  className="crm-button-export"
                  title="Exporter les contacts"
                >
                  <Download size={18} /> 
                  <span>Export</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== INTERACTIONS TAB ===== */}
        {activeTab === 'interactions' && (
          <>
            {/* CONTENU EN PREMIER */}
            <div className="crm-interactions-grid">
              <div>
                <div className="crm-interactions-main">
                  <h3 className="crm-interactions-title">
                    {selectedContact ? `Interactions - ${selectedContact.name}` : 'Sélectionnez un contact'}
                  </h3>
                  
                  {selectedContact && (
                    <>
                      <textarea
                        placeholder="Ajouter une interaction (appel, email, réunion...)"
                        value={interactionText}
                        onChange={(e) => setInteractionText(e.target.value)}
                        className="crm-interactions-textarea"
                      />
                      <button
                        onClick={addInteraction}
                        disabled={loading}
                        className="crm-interactions-button"
                      >
                        {loading ? 'Ajout...' : 'Ajouter interaction'}
                      </button>

                      <div className="crm-interactions-list">
                        {getContactInteractions(selectedContact.id).length > 0 ? (
                          getContactInteractions(selectedContact.id).map(interaction => (
                            <div key={interaction.id} className="crm-interaction-item">
                              <p className="crm-interaction-text">{interaction.text}</p>
                              <p className="crm-interaction-date">📅 {new Date(interaction.created_at).toLocaleString('fr-FR')}</p>
                            </div>
                          ))
                        ) : (
                          <p className="crm-empty-message">Aucune interaction</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="crm-interactions-sidebar">
                  <h3 className="crm-sidebar-title">Contacts rapides</h3>
                  <div className="crm-contact-list">
                    {contacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={`crm-contact-button ${selectedContact?.id === contact.id ? 'active' : ''}`}
                      >
                        <h4>{contact.name}</h4>
                        <p>{contact.company}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* TOOLBAR INTERACTIONS - EN DERNIER */}
            <div className="crm-toolbar">
              <div className="crm-toolbar-content">
                <p className="crm-toolbar-text">Sélectionnez un contact pour voir ses interactions</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}