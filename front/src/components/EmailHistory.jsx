import React, { useState, useEffect } from 'react';
import { Mail, Clock, CheckCircle, AlertCircle, Eye, RefreshCw } from 'lucide-react';

const EmailHistory = ({ contactId, API_BASE, AuthService }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState(null);

  useEffect(() => {
    if (contactId) {
      loadEmails();
    }
  }, [contactId]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const headers = AuthService.getAuthHeaders();
      const response = await fetch(`${API_BASE}/emails/contact/${contactId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      }
    } catch (error) {
      console.error('Erreur chargement emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Mail size={16} className="email-status-icon sent" />;
      case 'delivered':
        return <CheckCircle size={16} className="email-status-icon delivered" />;
      case 'opened':
        return <Eye size={16} className="email-status-icon opened" />;
      case 'failed':
        return <AlertCircle size={16} className="email-status-icon failed" />;
      default:
        return <Mail size={16} className="email-status-icon" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      sent: 'Envoyé',
      delivered: 'Délivré',
      opened: 'Ouvert',
      failed: 'Échec'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (loading) {
    return (
      <div className="email-history-loading">
        <RefreshCw className="spinning" size={24} />
        <p>Chargement de l'historique...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="email-history-empty">
        <Mail size={48} style={{ opacity: 0.3 }} />
        <p>Aucun email envoyé à ce contact</p>
      </div>
    );
  }

  return (
    <div className="email-history">
      <div className="email-history-header">
        <h3>
          <Mail size={18} />
          Historique des emails ({emails.length})
        </h3>
        <button onClick={loadEmails} className="email-history-refresh" title="Rafraîchir">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="email-history-list">
        {emails.map((email) => (
          <div key={email.id} className="email-history-item">
            <div
              className="email-history-item-header"
              onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
            >
              <div className="email-history-item-left">
                {getStatusIcon(email.status)}
                <div>
                  <p className="email-history-subject">{email.subject}</p>
                  <p className="email-history-meta">
                    <Clock size={12} />
                    {formatDate(email.sent_at)}
                    <span className="email-history-status">
                      • {getStatusLabel(email.status)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="email-history-item-right">
                {email.opened_at && (
                  <span className="email-opened-badge">
                    <Eye size={12} />
                    Ouvert {formatDate(email.opened_at)}
                  </span>
                )}
              </div>
            </div>

            {expandedEmail === email.id && (
              <div className="email-history-item-body">
                <div className="email-history-details">
                  <div className="email-detail-row">
                    <span className="email-detail-label">À :</span>
                    <span className="email-detail-value">
                      {email.recipient_name || email.recipient_email}
                    </span>
                  </div>
                  <div className="email-detail-row">
                    <span className="email-detail-label">Email :</span>
                    <span className="email-detail-value">{email.recipient_email}</span>
                  </div>
                </div>
                <div className="email-history-content">
                  <p className="email-content-label">Message :</p>
                  <div className="email-content-body">
                    {email.body.split('\n').map((line, i) => (
                      <p key={i}>{line || <br />}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailHistory;
