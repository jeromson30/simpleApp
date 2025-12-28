import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { ContactContent } from './components/ContactContent';
import { HomeContent } from './components/HomeContent';
import { OffersContent } from './components/OffersContent';
import { CRM } from './pages/crm';
import AdminPanel from './pages/AdminPanel';
import './App.css';

// Composant principal
function AppContent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bfStats, setBfStats] = useState([]);
  const [loadingBf, setLoadingBf] = useState(true);
  const [currentCrmUser, setCurrentCrmUser] = useState(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const location = useLocation();

  // Vérifier si on est sur la page admin ou CRM (pour masquer le header/footer)
  const isAdminPage = location.pathname.startsWith('/admin');
  const isCrmPage = location.pathname.startsWith('/crm');

  useEffect(() => {
    fetchData();
    fetchBfStats();
  }, []);

  useEffect(() => {
    // Ne pas afficher le canvas sur la page admin ou CRM
    if (isAdminPage || isCrmPage) return;

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
    var time = 0;

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
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAdminPage, isCrmPage]);

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
  
  useEffect(() => {
    const pageName = location.pathname === '/' ? 'Accueil' : 
                     location.pathname === '/admin' ? 'Administration' :
                     location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);
    document.title = `Prism CRM - ${pageName}`;
  }, [location.pathname]);

  // Gestionnaires pour le CRM
  const handleCrmLogin = (user) => {
    setCurrentCrmUser(user);
  };

  const handleCrmLogout = () => {
    setCurrentCrmUser(null);
  };

  // Si on est sur la page admin, afficher uniquement le panel admin
  if (isAdminPage) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminPanel />} />
      </Routes>
    );
  }

  return (
    <div className="App">
      <canvas ref={canvasRef} className="pixi-background" />

      {/* Header uniquement pour les pages publiques (pas CRM) */}
      {!isCrmPage && (
        <Header
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onLogout={handleCrmLogout}
          currentUser={currentCrmUser}
        />
      )}

      <Routes>
        <Route
          path="/"
          element={<HomeContent />}
        />
        <Route
          path="/offers"
          element={<OffersContent />}
        />
        <Route
          path="/contact"
          element={<ContactContent />}
        />
        <Route
          path="/crm/*"
          element={<CRM onLogin={handleCrmLogin} onLogout={handleCrmLogout} />}
        />
      </Routes>

      {/* Footer uniquement pour les pages publiques (pas CRM) */}
      {!isCrmPage && (
        <footer className="footer">
          <div className="footer-container">
            <p>&copy; 2025 Prism CRM. Tous droits réservés.</p>
          </div>
        </footer>
      )}
    </div>
  );
}

// Composant App avec Router
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}