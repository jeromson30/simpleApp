import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState('');
  
  // States pour BF6
  const [bfStats, setBfStats] = useState([]);
  const [loadingBf, setLoadingBf] = useState(true);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    fetchData();
    fetchBfStats();
  }, []);

  // Canvas animation (complet)
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

    const particleCount = 100;
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#c7ceea'];

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = Math.random() * 4 + 2;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = Math.random() * 0.5 + 0.3;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        this.x = Math.max(0, Math.min(canvas.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height, this.y));
      }

      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const maxDistance = 150;

    const render = () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update();
        p.draw(ctx);
      });

      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxDistance) {
            const alpha = (1 - distance / maxDistance) * 0.2;
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

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

  // ADAPTÉ pour ton backend /api/bf6/player-stats
  const fetchBfStats = async () => {
    try {
      const players = ['jeromson','trivett13']; // Ajoute d'autres pseudos ici
      
      const responses = await Promise.all(
        players.map(async (playerName) => {
          const res = await fetch(`/api/bf6/player-stats?player=${encodeURIComponent(playerName)}&platform=pc`);
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

      <header className="App-header">
        <h1>Mon Application</h1>
        {/* Stats BF6 adaptées à ton backend */}
        <div>
          <h2>Stats Battlefield 6</h2>
          {loadingBf ? (
            <p>Chargement des stats...</p>
          ) : bfStats.length === 0 ? (
            <p>Aucune stat disponible.</p>
          ) : (
            bfStats.map((player, index) => (
              <div key={index} style={{ 
                backgroundColor: 'rgba(58, 63, 71, 0.8)', 
                padding: '1.5rem', 
                borderRadius: '5px', 
                margin: '1rem 0',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ marginTop: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  {player.name} [{player.platform}]
                </h3>
                
                <ul style={{ listStyle: 'none', padding: 0 }}>
                
                  <li><strong>Meilleure classe:</strong> {player.bestClass || 'N/A'}</li>
                  <li><strong>Victoire:</strong> {player.win || 'N/A'}</li>
                  <li><strong>K/D:</strong> {player.kd || 'N/A'}</li>
                  <li><strong>Heures de jeu:</strong> {player.playtimeHours || 'N/A'}</li>
                </ul>
              </div>
            ))
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
