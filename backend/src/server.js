const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Le serveur fonctionne correctement' });
});

app.get('/api/data', (req, res) => {
  res.json({ 
    message: 'Données du backend',
    data: [
      { id: 1, nom: 'Élément 1' },
      { id: 2, nom: 'Élément 2' },
      { id: 3, nom: 'Élément 3' }
    ]
  });
});

app.post('/api/data', (req, res) => {
  const { nom } = req.body;
  res.json({ 
    message: 'Données reçues',
    received: { nom }
  });
});

app.get('/api/bf6/player-stats', async (req, res) => {
  const { player, platform = 'pc' } = req.query;
  if (!player) {
    return res.status(400).json({ error: 'Missing player parameter' });
  }

  try {
  
    const url = 'https://api.gametools.network/bf6/stats/?categories=multiplayer&raw=false&format_values=true&name='+player+'&skip_battlelog=true';
;
    const gtRes = await fetch(url);
    if (!gtRes.ok) {
      return res.status(gtRes.status).json({ error: 'Gametools error' });
    }

    const gtData = await gtRes.json();
    


    // Normalisation minimale pour le front
    const cleaned = {
      name: gtData.userName,
      platform: gtData.platform,
      bestClass: gtData.bestClass,
      win: gtData.winPercent,
      kd: gtData.killDeath,
      playtimeHours: gtData.timePlayed,
      avatar: gtData.avatar,
    };
    //console.log(cleaned);
    res.json(cleaned);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
