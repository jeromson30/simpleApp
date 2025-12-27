import React, { useState, useEffect } from 'react';
import { X, Send, FileText, Sparkles } from 'lucide-react';

const EmailComposer = ({
  isOpen,
  onClose,
  contact,
  API_BASE,
  AuthService,
  onEmailSent
}) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    recipient_name: '',
    subject: '',
    body: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      // Pre-fill with contact data if available
      if (contact) {
        setEmailData(prev => ({
          ...prev,
          recipient_email: contact.email || '',
          recipient_name: contact.name || ''
        }));
      }
    }
  }, [isOpen, contact]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const headers = AuthService.getAuthHeaders();
      const response = await fetch(`${API_BASE}/email-templates`, { headers });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);

    // Replace variables in template (using {{variable}} syntax)
    let subject = template.subject;
    let body = template.body;

    const replacements = {
      '{{contact_name}}': contact?.name || '[Nom]',
      '{{company_name}}': 'Votre Entreprise',
      '{{sender_name}}': AuthService.getUser()?.email?.split('@')[0] || 'Votre nom',
      '{{quote_number}}': 'DEVIS-001',
      '{{subject}}': '[Sujet]',
      '{{news_content}}': '[Contenu]'
    };

    Object.entries(replacements).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
      body = body.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    setEmailData(prev => ({
      ...prev,
      subject,
      body
    }));
  };

  const handleSend = async () => {
    if (!emailData.recipient_email || !emailData.subject || !emailData.body) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const headers = AuthService.getAuthHeaders();
      const payload = {
        contact_id: contact?.id || null,
        recipient_email: emailData.recipient_email,
        recipient_name: emailData.recipient_name,
        subject: emailData.subject,
        body: emailData.body,
        template_id: selectedTemplate?.id || null
      };

      const response = await fetch(`${API_BASE}/emails`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Email envoyé avec succès !');
        if (onEmailSent) onEmailSent();
        handleClose();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur envoi email:', error);
      alert('Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmailData({
      recipient_email: '',
      recipient_name: '',
      subject: '',
      body: ''
    });
    setSelectedTemplate(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="email-composer-overlay" onClick={handleClose}>
      <div className="email-composer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="email-composer-header">
          <div>
            <h2 className="email-composer-title">
              <Send size={20} />
              Envoyer un email
            </h2>
            {contact && (
              <p className="email-composer-subtitle">
                À : {contact.name} ({contact.email})
              </p>
            )}
          </div>
          <button onClick={handleClose} className="email-composer-close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="email-composer-body">
          {/* Templates selector */}
          <div className="email-form-group">
            <label className="email-form-label">
              <FileText size={16} />
              Utiliser un template (optionnel)
            </label>
            <select
              className="email-form-select"
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = templates.find(t => t.id === e.target.value);
                if (template) handleTemplateSelect(template);
              }}
              disabled={loadingTemplates}
            >
              <option value="">-- Aucun template --</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="email-template-badge">
                <Sparkles size={14} />
                Template : {selectedTemplate.name}
              </div>
            )}
          </div>

          {/* Recipient */}
          <div className="email-form-group">
            <label className="email-form-label">Email destinataire *</label>
            <input
              type="email"
              className="email-form-input"
              value={emailData.recipient_email}
              onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
              placeholder="contact@example.com"
              required
            />
          </div>

          {/* Recipient name */}
          <div className="email-form-group">
            <label className="email-form-label">Nom destinataire</label>
            <input
              type="text"
              className="email-form-input"
              value={emailData.recipient_name}
              onChange={(e) => setEmailData({ ...emailData, recipient_name: e.target.value })}
              placeholder="Jean Dupont"
            />
          </div>

          {/* Subject */}
          <div className="email-form-group">
            <label className="email-form-label">Objet *</label>
            <input
              type="text"
              className="email-form-input"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              placeholder="Objet de votre email"
              required
            />
          </div>

          {/* Body */}
          <div className="email-form-group">
            <label className="email-form-label">Message *</label>
            <textarea
              className="email-form-textarea"
              value={emailData.body}
              onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
              placeholder="Votre message..."
              rows={10}
              required
            />
          </div>

          {/* Variables helper */}
          {selectedTemplate && selectedTemplate.variables?.length > 0 && (
            <div className="email-variables-helper">
              <p className="email-variables-title">Variables disponibles :</p>
              <div className="email-variables-list">
                {selectedTemplate.variables.map(variable => (
                  <span key={variable} className="email-variable-tag">
                    {variable}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="email-composer-footer">
          <button
            onClick={handleClose}
            className="email-btn-secondary"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            className="email-btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>Envoi en cours...</>
            ) : (
              <>
                <Send size={16} />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;
