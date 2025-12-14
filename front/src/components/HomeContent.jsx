import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users, TrendingUp, MessageSquare, Download, Zap, Shield, Activity, Eye, FileText, Settings } from 'lucide-react';

// Mapping des noms d'icônes vers les composants
const ICON_MAP = {
  Users,
  TrendingUp,
  MessageSquare,
  Download,
  Zap,
  Shield,
  Activity,
  Eye,
  FileText,
  Settings
};

// Données par défaut (fallback si l'API ne répond pas)
const DEFAULT_FEATURES = [
  {
    id: 1,
    icon: 'Users',
    title: 'Gestion des Contacts',
    description: 'Centralisez tous vos contacts avec des informations détaillées, notes et historique d\'interactions.',
    color: '#64c8ff',
    cta_text: 'Accéder au CRM →',
    cta_link: '/crm'
  },
  {
    id: 2,
    icon: 'TrendingUp',
    title: 'Pipeline Visuel',
    description: 'Visualisez vos prospects, clients et opportunités perdues dans un kanban intuitif et dynamique.',
    color: '#a855f7',
    cta_text: 'Accéder au CRM →',
    cta_link: '/crm'
  },
  {
    id: 3,
    icon: 'MessageSquare',
    title: 'Suivi des Interactions',
    description: 'Enregistrez chaque appel, email et réunion pour ne rien oublier de vos échanges.',
    color: '#64c8ff',
    cta_text: 'Accéder au CRM →',
    cta_link: '/crm'
  },
  {
    id: 4,
    icon: 'Download',
    title: 'Export de Données',
    description: 'Exportez facilement vos contacts et rapports pour une utilisation externe.',
    color: '#a855f7',
    cta_text: 'Accéder au CRM →',
    cta_link: '/crm'
  },
  {
    id: 5,
    icon: 'Zap',
    title: 'Statistiques en Temps Réel',
    description: 'Suivez votre taux de conversion, vos prospects et vos clients avec des graphiques en direct.',
    color: '#64c8ff',
    cta_text: 'Accéder au CRM →',
    cta_link: '/crm'
  }
];

const DEFAULT_NEWS = [
  {
    id: 1,
    date: '15 Décembre 2024',
    title: 'Lancement de CRM Pro v2.0',
    description: 'Découvrez la nouvelle interface et les fonctionnalités améliorées du CRM Pro avec support des interactions avancées.',
    image: '📊',
    category: 'Mise à jour',
    link: '#'
  },
  {
    id: 2,
    date: '10 Décembre 2024',
    title: 'Nouvelle Feature: Pipeline Kanban',
    description: 'Gérez visuellement vos prospects avec notre nouveau système de pipeline entièrement réconçu.',
    image: '🎯',
    category: 'Fonctionnalité',
    link: '#'
  },
  {
    id: 3,
    date: '5 Décembre 2024',
    title: 'Stats Battlefield 6 Intégrées',
    description: 'Consultez vos statistiques Battlefield 6 directement depuis la page Stats de l\'application.',
    image: '🎮',
    category: 'Intégration',
    link: '#'
  },
  {
    id: 4,
    date: '1 Décembre 2024',
    title: 'Optimisation des Performances',
    description: 'L\'application est 40% plus rapide grâce à nos optimisations de rendu et de stockage.',
    image: '⚡',
    category: 'Performance',
    link: '#'
  }
];

export function HomeContent({ data, loading, nom, setNom, handleSubmit }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [crmFeatures, setCrmFeatures] = useState(DEFAULT_FEATURES);
  const [news, setNews] = useState(DEFAULT_NEWS);
  const [contentLoading, setContentLoading] = useState(true);

  // Charger le contenu depuis l'API
  useEffect(() => {
    const loadContent = async () => {
      try {
        // Charger le carrousel
        const carouselResponse = await fetch('/api/content/carousel');
        if (carouselResponse.ok) {
          const carouselData = await carouselResponse.json();
          if (carouselData && carouselData.length > 0) {
            setCrmFeatures(carouselData);
          }
        }

        // Charger les actualités
        const newsResponse = await fetch('/api/content/news');
        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          if (newsData && newsData.length > 0) {
            setNews(newsData);
          }
        }
      } catch (error) {
        console.error('Erreur chargement contenu:', error);
        // En cas d'erreur, on garde les données par défaut
      } finally {
        setContentLoading(false);
      }
    };

    loadContent();
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % crmFeatures.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + crmFeatures.length) % crmFeatures.length);
  };

  // Obtenir le composant d'icône à partir du nom
  const getIconComponent = (iconName) => {
    return ICON_MAP[iconName] || Zap;
  };

  const currentFeature = crmFeatures[currentSlide];
  const CurrentIcon = getIconComponent(currentFeature?.icon);

  return (
    <main className="main-content">
      {/* ===== SECTION CARROUSEL CRM ===== */}
      <div style={{ marginBottom: '4rem' }}>
        
        <div className="crm-carousel-container">
          {contentLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Chargement...</p>
            </div>
          ) : (
            <>
              <div className="crm-carousel-slide">
                <div className="crm-carousel-icon">
                  <CurrentIcon size={64} color={currentFeature?.color || '#64c8ff'} />
                </div>
                <h2 className="crm-carousel-title">{currentFeature?.title}</h2>
                <p className="crm-carousel-description">{currentFeature?.description}</p>
                <a href={currentFeature?.cta_link || '/crm'} className="crm-carousel-cta">
                  {currentFeature?.cta_text || 'Accéder au CRM →'}
                </a>
              </div>

              <div className="crm-carousel-controls">
                <button 
                  className="carousel-btn-option2" 
                  onClick={prevSlide} 
                  aria-label="Slide précédent"
                  title="Slide précédent"
                >
                  <ChevronLeft size={24} />
                </button>
                
                <div className="carousel-indicators">
                  {crmFeatures.map((_, index) => (
                    <button
                      key={index}
                      className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                      onClick={() => setCurrentSlide(index)}
                      aria-label={`Aller au slide ${index + 1}`}
                      title={`Slide ${index + 1}`}
                    />
                  ))}
                </div>

                <button 
                  className="carousel-btn-option2" 
                  onClick={nextSlide} 
                  aria-label="Slide suivant"
                  title="Slide suivant"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="carousel-counter">
                {currentSlide + 1} / {crmFeatures.length}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== SECTION ACTUALITÉS ===== */}
      <div>
        <h3 style={{ textAlign: 'center', marginBottom: '2rem' }}>Dernières Actualités</h3>
        
        {contentLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Chargement des actualités...</p>
          </div>
        ) : (
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
                {item.link && item.link !== '#' ? (
                  <a href={item.link} className="news-link">Lire la suite →</a>
                ) : (
                  <span className="news-link" style={{ cursor: 'default', opacity: 0.5 }}>Lire la suite →</span>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ===== SECTION NEWSLETTER ===== */}
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