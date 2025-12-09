import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Users, TrendingUp, MessageSquare, Download, Zap } from 'lucide-react';

export function HomeContent({ data, loading, nom, setNom, handleSubmit }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fonctionnalités du CRM pour le carrousel
  const crmFeatures = [
    {
      id: 1,
      icon: Users,
      title: 'Gestion des Contacts',
      description: 'Centralisez tous vos contacts avec des informations détaillées, notes et historique d\'interactions.',
      color: '#64c8ff'
    },
    {
      id: 2,
      icon: TrendingUp,
      title: 'Pipeline Visuel',
      description: 'Visualisez vos prospects, clients et opportunités perdues dans un kanban intuitif et dynamique.',
      color: '#a855f7'
    },
    {
      id: 3,
      icon: MessageSquare,
      title: 'Suivi des Interactions',
      description: 'Enregistrez chaque appel, email et réunion pour ne rien oublier de vos échanges.',
      color: '#64c8ff'
    },
    {
      id: 4,
      icon: Download,
      title: 'Export de Données',
      description: 'Exportez facilement vos contacts et rapports pour une utilisation externe.',
      color: '#a855f7'
    },
    {
      id: 5,
      icon: Zap,
      title: 'Statistiques en Temps Réel',
      description: 'Suivez votre taux de conversion, vos prospects et vos clients avec des graphiques en direct.',
      color: '#64c8ff'
    }
  ];

  // Actualités
  const news = [
    {
      id: 1,
      date: '15 Décembre 2024',
      title: 'Lancement de CRM Pro v2.0',
      description: 'Découvrez la nouvelle interface et les fonctionnalités améliorées du CRM Pro avec support des interactions avancées.',
      image: '📊',
      category: 'Mise à jour'
    },
    {
      id: 2,
      date: '10 Décembre 2024',
      title: 'Nouvelle Feature: Pipeline Kanban',
      description: 'Gérez visuellement vos prospects avec notre nouveau système de pipeline entièrement réconçu.',
      image: '🎯',
      category: 'Fonctionnalité'
    },
    {
      id: 3,
      date: '5 Décembre 2024',
      title: 'Stats Battlefield 6 Intégrées',
      description: 'Consultez vos statistiques Battlefield 6 directement depuis la page Stats de l\'application.',
      image: '🎮',
      category: 'Intégration'
    },
    {
      id: 4,
      date: '1 Décembre 2024',
      title: 'Optimisation des Performances',
      description: 'L\'application est 40% plus rapide grâce à nos optimisations de rendu et de stockage.',
      image: '⚡',
      category: 'Performance'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % crmFeatures.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + crmFeatures.length) % crmFeatures.length);
  };

  const CurrentIcon = crmFeatures[currentSlide].icon;

  return (
    <main className="main-content">
      {/* ===== SECTION CARROUSEL CRM ===== */}
      <div style={{ marginBottom: '4rem' }}>
        
        <div className="crm-carousel-container">
          <div className="crm-carousel-slide">
            <div className="crm-carousel-icon">
              <CurrentIcon size={64} color={crmFeatures[currentSlide].color} />
            </div>
            <h2 className="crm-carousel-title">{crmFeatures[currentSlide].title}</h2>
            <p className="crm-carousel-description">{crmFeatures[currentSlide].description}</p>
            <a href="/crm" className="crm-carousel-cta">Accéder au CRM →</a>
          </div>

          <div className="crm-carousel-controls">
            <button className="carousel-btn carousel-btn-prev" onClick={prevSlide} aria-label="Slide précédent">
              <ChevronLeft size={24} />
            </button>
            
            <div className="carousel-indicators">
              {crmFeatures.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Aller au slide ${index + 1}`}
                />
              ))}
            </div>

            <button className="carousel-btn carousel-btn-next" onClick={nextSlide} aria-label="Slide suivant">
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="carousel-counter">
            {currentSlide + 1} / {crmFeatures.length}
          </div>
        </div>
      </div>

      {/* ===== SECTION ACTUALITÉS ===== */}
      <div>
        <h3 style={{ textAlign: 'center', marginBottom: '2rem' }}>Dernières Actualités</h3>
        
        <div className="news-grid">
          {news.map((item) => (
            <article key={item.id} className="news-card">
              <div className="news-header">
                <span className="news-image">{item.image}</span>
                <div className="news-meta">
                  <span className="news-category">{item.category}</span>
                  <time className="news-date">{item.date}</time>
                </div>
              </div>
              <h4 className="news-title">{item.title}</h4>
              <p className="news-description">{item.description}</p>
              <a href="#" className="news-link">Lire la suite →</a>
            </article>
          ))}
        </div>
      </div>

      {/* ===== SECTION NEWSLETTER (anciennement formulaire) ===== */}
      <div style={{ marginTop: '4rem', textAlign: 'center' }}>
        <h3>Restez Informé</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>Abonnez-vous à notre newsletter pour recevoir les dernières actualités</p>
        
        <div className="form-container" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit} className="form">
            <input 
              type="email"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Votre email"
              style={{ flex: 1 }}
            />
            <button type="submit">S'abonner</button>
          </form>
        </div>
      </div>
    </main>
  );
}