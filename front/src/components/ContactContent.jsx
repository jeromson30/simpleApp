import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';

export function ContactContent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState(null); // 'success', 'error', null

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Simulation d'envoi
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setStatus(null), 5000);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      value: 'contact@prismcrm.fr',
      link: 'mailto:contact@prismcrm.fr'
    },
    {
      icon: Phone,
      title: 'Téléphone',
      value: '+33 1 23 45 67 89',
      link: 'tel:+33123456789'
    },
    {
      icon: MapPin,
      title: 'Adresse',
      value: '123 Avenue des Champs-Élysées, 75008 Paris',
      link: null
    }
  ];

  return (
    <main className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <h1 className="contact-title">
            Contactez-nous
          </h1>
          <p className="contact-subtitle">
            Notre équipe est à votre écoute pour répondre à toutes vos questions
            et vous accompagner dans votre projet CRM.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="contact-content-wrapper">
        <div className="contact-grid">
          {/* Contact Information Cards */}
          <div className="contact-info-section">
            <h2 className="section-heading">Informations de contact</h2>
            <div className="contact-info-cards">
              {contactInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <div key={index} className="contact-info-card">
                    <div className="contact-info-icon">
                      <Icon size={24} />
                    </div>
                    <div className="contact-info-content">
                      <h3 className="contact-info-title">{info.title}</h3>
                      {info.link ? (
                        <a href={info.link} className="contact-info-value">
                          {info.value}
                        </a>
                      ) : (
                        <p className="contact-info-value">{info.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Additional Info */}
            <div className="contact-extra-info">
              <h3 className="extra-info-title">Horaires d'ouverture</h3>
              <div className="extra-info-list">
                <div className="extra-info-item">
                  <span className="extra-info-label">Lundi - Vendredi</span>
                  <span className="extra-info-value">9h00 - 18h00</span>
                </div>
                <div className="extra-info-item">
                  <span className="extra-info-label">Week-end</span>
                  <span className="extra-info-value">Fermé</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-section">
            <h2 className="section-heading">Envoyez-nous un message</h2>

            {status === 'success' && (
              <div className="alert alert-success">
                <CheckCircle size={20} />
                <span>Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.</span>
              </div>
            )}

            {status === 'error' && (
              <div className="alert alert-error">
                <AlertCircle size={20} />
                <span>Une erreur est survenue. Veuillez réessayer.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">Nom complet</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Jean Dupont"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="jean.dupont@exemple.fr"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject" className="form-label">Sujet</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Demande d'information"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="form-textarea"
                  placeholder="Décrivez votre demande en détail..."
                  rows="6"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="form-submit-btn"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Envoyer le message</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
