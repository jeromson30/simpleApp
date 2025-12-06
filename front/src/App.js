import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Menu, X } from 'lucide-react';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  
  // States pour BF6
  const [bfStats, setBfStats] = useState([]);
  const [loadingBf, setLoadingBf] = useState(true);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    fetchData();
    fetchBfStats();
  }, []);

  // Canvas animation moderne avec particules fines et halos
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const orbs = [];
    const particleCount = 150;
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 1.5 + 0.5;
        this.opacity = Math.random() * 0.6 + 0.2;
        this.maxOpacity = this.opacity;
        this.pulseSpeed = Math.random() * 0.02 + 0.005;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        this.x = Math.max(0, Math.min(canvas.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height, this.y));

        this.opacity += this.pulseSpeed;
        if (this.opacity > this.maxOpacity || this.opacity < this.maxOpacity * 0.3) {
          this.pulseSpeed *= -1;
        }
      }

      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#64c8ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Orb {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 80 + 40;
        this.opacity = Math.random() * 0.15 + 0.05;
        this.color = Math.random() > 0.5 ? '#64c8ff' : '#a855f7';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -this.radius || this.x > canvas.width + this.radius) this.vx *= -1;
        if (this.y < -this.radius || this.y > canvas.height + this.radius) this.vy *= -1;
      }

      draw(ctx) {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, `rgba(${this.color === '#64c8ff' ? '100, 200, 255' : '168, 85, 247'}, ${this.opacity})`);
        gradient.addColorStop(1, `rgba(${this.color === '#64c8ff' ? '100, 200, 255' : '168, 85, 247'}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    for (let i = 0; i < 4; i++) {
      orbs.push(new Orb());
    }

    const maxDistance = 100;
    let time = 0;

    const render = () => {
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, '#0f0f1e');
      bgGradient.addColorStop(0.5, '#1a1a2e');
      bgGradient.addColorStop(1, '#16213e');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      orbs.forEach(orb => {
        orb.update();
        orb.draw(ctx);
      });

      particles.forEach(p => {
        p.update();
        p.draw(ctx);
      });

      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const alpha = (1 - distance / maxDistance) * 0.2;
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      time += 0.001;
//      const scanY = (Math.sin(time) * canvas.height * 0.5) + canvas.height * 0.5;
//      const scanGradient = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
//      scanGradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
//      scanGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.03)');
//      scanGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
//      ctx.fillStyle = scanGradient;
//      ctx.fillRect(0, scanY - 50, canvas.width, 100);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const fetchBfStats = async () => {
    try {
      const data = ['jeromson','pc','trivett13','pc','cursus666','pc','crntn_13','ps5'];
      
      const players = data.reduce((acc, val, i) => 
        i % 2 === 0 ? [...acc, { pseudo: val, plateforme: data[i + 1] }] : acc, []
      );
      
      const responses = await Promise.all(
        players.map(async (player) => {
          const res = await fetch(`/api/bf6/player-stats?player=${encodeURIComponent(player.pseudo)}&pplatform=${player.plateforme}`);
          if (!res.ok) return null;
          return await res.json();
        })
      );

      setBfStats(responses.filter(Boolean));
      setLoadingBf(false);
    } catch (error) {
      console.error('Erreur stats BF6:', error);
      setLoadingBf(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom })
      });
      const result = await response.json();
      alert('Données envoyées: ' + result.received.nom);
      setNom('');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <div className="App">
      <canvas ref={canvasRef} className="pixi-background" />

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <h1 className="navbar-title">Mon Application</h1>
          
          {/* Menu desktop */}
          <div className="desktop-menu">
            <a href="#">Accueil</a>
            <a href="#">Stats</a>
            <a href="#">Contact</a>
          </div>

          {/* Menu mobile */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="mobile-menu-btn"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Menu mobile déroulant */}
      {menuOpen && (
        <div className="mobile-menu">
          <a href="#">Accueil</a>
          <a href="#">Stats</a>
          <a href="#">Contact</a>
        </div>
      )}

      {/* Banner */}
      <div className="banner">
        <div className="banner-container">
          <h2 className="banner-title">Bienvenue</h2>
          <p className="banner-subtitle">Découvrez vos statistiques Battlefield 6</p>
        </div>
      </div>

      {/* Stats BF6 Bandeau */}
      {!loadingBf && bfStats.length > 0 && (
        <div className="stats-banner">
          <div className="stats-container">
            {bfStats.map((player, index) => (
              <div key={index} className="stat-card">
                <h4>{player.name}</h4>
                <div className="stat-content">
                  <p><strong>K/D:</strong> {player.kd || 'N/A'}</p>
                  <p><strong>Victoires:</strong> {player.win || 'N/A'}</p>
                  <p><strong>Heures:</strong> {player.playtimeHours || 'N/A'}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        <h3>Contenu Principal</h3>
        
        {/* Form */}
        <div className="form-container">
          <form onSubmit={handleSubmit} className="form">
            <input 
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Entrez votre nom"
            />
            <button type="submit">Envoyer</button>
          </form>
        </div>

        {/* Data Display */}
        {loading ? (
          <p className="loading">Chargement des données...</p>
        ) : (
          <div className="data-grid">
            {data.length > 0 ? (
              data.map((item, index) => (
                <div key={index} className="data-card">
                  <p>{JSON.stringify(item)}</p>
                </div>
              ))
            ) : (
              <p className="no-data">Aucune donnée</p>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <p>&copy; 2025 Mon Application. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;