import React from 'react';
import {
  ArrowRight,
  Users,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Zap,
  Shield,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function HomeContent() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Gestion des Contacts',
      description: 'Centralisez tous vos contacts avec informations détaillées et historique complet.',
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
    },
    {
      icon: TrendingUp,
      title: 'Pipeline Visuel',
      description: 'Visualisez vos opportunités dans un pipeline intuitif et suivez vos conversions.',
      gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)'
    },
    {
      icon: MessageSquare,
      title: 'Communications',
      description: 'Envoyez des emails, enregistrez les interactions et ne manquez rien.',
      gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avancées',
      description: 'Tableaux de bord en temps réel avec métriques et graphiques détaillés.',
      gradient: 'linear-gradient(135deg, #10b981, #059669)'
    },
    {
      icon: Zap,
      title: 'Automatisations',
      description: 'Gagnez du temps avec des templates et workflows automatisés.',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
    },
    {
      icon: Shield,
      title: 'Sécurité Pro',
      description: 'Données chiffrées, backups automatiques et conformité RGPD.',
      gradient: 'linear-gradient(135deg, #ef4444, #dc2626)'
    }
  ];

  const benefits = [
    'Interface moderne et intuitive',
    'Multi-utilisateurs avec rôles',
    'Export PDF et Excel',
    'Support prioritaire',
    'Mises à jour gratuites',
    'API REST complète'
  ];

  const stats = [
    { value: '10K+', label: 'Contacts gérés' },
    { value: '95%', label: 'Satisfaction client' },
    { value: '24/7', label: 'Support disponible' },
    { value: '99.9%', label: 'Uptime garanti' }
  ];

  return (
    <main className="home-modern">
      {/* Hero Section */}
      <section className="hero-section animate-fadeIn">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>Nouvelle version 2.0</span>
          </div>

          <h1 className="hero-title">
            Gérez vos relations clients avec
            <span className="hero-gradient-text"> Prism CRM</span>
          </h1>

          <p className="hero-description">
            La solution CRM moderne et intuitive pour les entreprises qui veulent booster leurs ventes.
            Tableau de bord analytics, pipeline visuel, gestion des contacts et bien plus.
          </p>

          <div className="hero-cta">
            <button
              className="btn-hero-primary"
              onClick={() => navigate('/crm')}
            >
              Accéder au CRM
              <ArrowRight size={20} />
            </button>
            <button
              className="btn-hero-secondary"
              onClick={() => navigate('/offers')}
            >
              Voir les offres
            </button>
          </div>

          <div className="hero-stats">
            {stats.map((stat, index) => (
              <div key={index} className="hero-stat-item animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card-float">
            <div className="float-card card-1 animate-fadeInUp">
              <div className="mini-chart">
                <TrendingUp size={24} color="#10b981" />
              </div>
              <div className="mini-text">
                <div className="mini-value">+45%</div>
                <div className="mini-label">Conversions</div>
              </div>
            </div>
            <div className="float-card card-2 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
              <div className="mini-chart">
                <Users size={24} color="#6366f1" />
              </div>
              <div className="mini-text">
                <div className="mini-value">1,234</div>
                <div className="mini-label">Contacts</div>
              </div>
            </div>
            <div className="float-card card-3 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
              <div className="mini-chart">
                <MessageSquare size={24} color="#8b5cf6" />
              </div>
              <div className="mini-text">
                <div className="mini-value">89</div>
                <div className="mini-label">Messages</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Fonctionnalités Complètes</h2>
          <p className="section-subtitle">Tout ce dont vous avez besoin pour gérer vos relations clients efficacement</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="feature-icon" style={{ background: feature.gradient }}>
                <feature.icon size={28} />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="benefits-container">
          <div className="benefits-content">
            <h2 className="benefits-title">Pourquoi choisir Prism CRM?</h2>
            <p className="benefits-subtitle">
              Une solution complète pensée pour votre productivité
            </p>

            <div className="benefits-list">
              {benefits.map((benefit, index) => (
                <div key={index} className="benefit-item animate-fadeInUp" style={{ animationDelay: `${index * 50}ms` }}>
                  <CheckCircle2 size={20} className="benefit-icon" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <button
              className="btn-benefits"
              onClick={() => navigate('/crm')}
            >
              Commencer gratuitement
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="benefits-visual">
            <div className="benefits-glow" />
            <div className="benefits-mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="mockup-content">
                <div className="mockup-sidebar"></div>
                <div className="mockup-main">
                  <div className="mockup-line"></div>
                  <div className="mockup-line short"></div>
                  <div className="mockup-grid">
                    <div className="mockup-box"></div>
                    <div className="mockup-box"></div>
                    <div className="mockup-box"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Prêt à transformer votre gestion client?</h2>
          <p className="cta-subtitle">Rejoignez des milliers d'entreprises qui font confiance à Prism CRM</p>

          <div className="cta-buttons">
            <button
              className="btn-cta-primary"
              onClick={() => navigate('/crm')}
            >
              Démarrer maintenant
              <ArrowRight size={20} />
            </button>
            <button
              className="btn-cta-secondary"
              onClick={() => navigate('/contact')}
            >
              Nous contacter
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
