// === AJOUT au fichier backend/src/server.js ===

const SUPABASE_URL = 'https://uaptwsvwucgyybsjknqx.supabase.co';
const SUPABASE_KEY = 'sb_secret_79mRewfnd6ynNvk-LXQ8Cw_xMk3-wjS';

// ========== AUTH ==========
app.post('/api/crm/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  try {
    // En production: utiliser Supabase Auth
    // Pour démo: générer un user_id depuis l'email
    const user = {
      id: email.replace('@', '_').replace('.', '_'),
      email,
      created_at: new Date().toISOString()
    };
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur authentification' });
  }
});

// ========== CONTACTS ==========
app.get('/api/crm/contacts', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id requis' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/contacts`);
    url.searchParams.append('user_id', `eq.${user_id}`);
    url.searchParams.append('select', '*');

    const response = await fetch(url.toString(), {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('Supabase error');
    }

    const data = await response.json();
    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch contacts:', error);
    res.status(500).json({ error: 'Erreur chargement contacts' });
  }
});

app.post('/api/crm/contacts', async (req, res) => {
  const { user_id, name, email, phone, company, status, notes } = req.body;

  if (!user_id || !name || !email) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  try {
    const newContact = {
      user_id,
      name,
      email,
      phone: phone || null,
      company: company || null,
      status: status || 'prospect',
      notes: notes || null,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(newContact)
    });

    if (!response.ok) {
      throw new Error('Supabase error');
    }

    const inserted = await response.json();
    res.status(201).json(inserted[0] || newContact);
  } catch (error) {
    console.error('Erreur création contact:', error);
    res.status(500).json({ error: 'Erreur création contact' });
  }
});

app.patch('/api/crm/contacts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, company, status, notes } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID requis' });
  }

  try {
    const updatedData = {
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      status: status || undefined,
      notes: notes || undefined,
      updated_at: new Date().toISOString()
    };

    // Supprimer les undefined
    Object.keys(updatedData).forEach(key => 
      updatedData[key] === undefined && delete updatedData[key]
    );

    const url = new URL(`${SUPABASE_URL}/rest/v1/contacts`);
    url.searchParams.append('id', `eq.${id}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      throw new Error('Supabase error');
    }

    const updated = await response.json();
    res.json(updated[0] || updatedData);
  } catch (error) {
    console.error('Erreur update contact:', error);
    res.status(500).json({ error: 'Erreur modification contact' });
  }
});

app.delete('/api/crm/contacts/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'ID requis' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/contacts`);
    url.searchParams.append('id', `eq.${id}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('Supabase error');
    }

    res.json({ message: 'Contact supprimé' });
  } catch (error) {
    console.error('Erreur suppression contact:', error);
    res.status(500).json({ error: 'Erreur suppression contact' });
  }
});

// ========== INTERACTIONS ==========
app.get('/api/crm/interactions', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id requis' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/interactions`);
    url.searchParams.append('user_id', `eq.${user_id}`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'created_at.desc');

    const response = await fetch(url.toString(), {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('Supabase error');
    }

    const data = await response.json();
    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch interactions:', error);
    res.status(500).json({ error: 'Erreur chargement interactions' });
  }
});

app.post('/api/crm/interactions', async (req, res) => {
  const { user_id, contact_id, text } = req.body;

  if (!user_id || !contact_id || !text) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  try {
    const newInteraction = {
      user_id,
      contact_id,
      text,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(newInteraction)
    });

    if (!response.ok) {
      throw new Error('Supabase error');
    }

    const inserted = await response.json();
    res.status(201).json(inserted[0] || newInteraction);
  } catch (error) {
    console.error('Erreur création interaction:', error);
    res.status(500).json({ error: 'Erreur création interaction' });
  }
});

// ========== STATS ==========
app.get('/api/crm/stats', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id requis' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/contacts`);
    url.searchParams.append('user_id', `eq.${user_id}`);
    url.searchParams.append('select', 'id,status');

    const response = await fetch(url.toString(), {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error('Supabase error');
    }

    const contacts = await response.json();
    
    const stats = {
      total: contacts.length,
      prospects: contacts.filter(c => c.status === 'prospect').length,
      clients: contacts.filter(c => c.status === 'client').length,
      lost: contacts.filter(c => c.status === 'perdu').length,
      conversionRate: contacts.length > 0 
        ? ((contacts.filter(c => c.status === 'client').length / contacts.length) * 100).toFixed(1)
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur chargement stats' });
  }
});