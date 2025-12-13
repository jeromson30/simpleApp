// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_securise_a_changer';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uaptwsvwucgyybsjknqx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'votre_clé_supabase';

// Middleware
app.use(cors());
app.use(express.json());

// Headers Supabase
const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ==================== HELPER: Vérifier si utilisateur suspendu ====================

const checkUserSuspended = async (userId) => {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('id', `eq.${userId}`);
    url.searchParams.append('select', 'suspended,owner_id');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const users = await response.json();

    if (!users || users.length === 0) {
      return { suspended: false, notFound: true };
    }

    const user = users[0];

    // Vérifier si l'utilisateur est suspendu
    if (user.suspended) {
      return { suspended: true, reason: 'Votre compte a été suspendu' };
    }

    // Si c'est un sous-compte, vérifier aussi si le propriétaire est suspendu
    if (user.owner_id) {
      const ownerUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
      ownerUrl.searchParams.append('id', `eq.${user.owner_id}`);
      ownerUrl.searchParams.append('select', 'suspended');

      const ownerResponse = await fetch(ownerUrl.toString(), { headers: supabaseHeaders });
      const owners = await ownerResponse.json();

      if (owners && owners.length > 0 && owners[0].suspended) {
        return { suspended: true, reason: 'Le compte principal a été suspendu' };
      }
    }

    return { suspended: false };
  } catch (error) {
    console.error('Erreur vérification suspension:', error);
    return { suspended: false };
  }
};

// ==================== MIDDLEWARE JWT ====================

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Token invalide' });
    }

    // ✅ NOUVEAU: Vérifier si l'utilisateur est suspendu
    const suspendedCheck = await checkUserSuspended(decoded.id);
    if (suspendedCheck.suspended) {
      return res.status(403).json({ 
        error: suspendedCheck.reason,
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    if (suspendedCheck.notFound) {
      return res.status(401).json({ error: 'Compte inexistant' });
    }
    
    req.user = decoded;
    next();
  });
};

// Middleware optionnel (pour les routes qui peuvent fonctionner avec ou sans auth)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  next();
};

// ==================== HELPERS ====================

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      license: user.license,
      isOwner: user.is_owner,
      ownerId: user.owner_id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const getLicenseMaxUsers = (license) => {
  const licenses = { starter: 1, pro: 5, business: 15, enterprise: 50 };
  return licenses[license] || 1;
};

const getLicenseName = (license) => {
  const names = { starter: 'Starter', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' };
  return names[license] || 'Starter';
};

// ==================== AUTH ROUTES ====================

// Inscription
app.post('/api/crm/auth/register', async (req, res) => {
  const { email, password, license } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    // Vérifier si l'utilisateur existe
    const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    checkUrl.searchParams.append('email', `eq.${email}`);
    checkUrl.searchParams.append('select', 'id');

    const checkResponse = await fetch(checkUrl.toString(), { headers: supabaseHeaders });
    const existing = await checkResponse.json();

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }

    // Hash du mot de passe
    const passwordHash = await hashPassword(password);

    // Créer l'utilisateur
    const userId = email.replace('@', '_').replace(/\./g, '_');
    const newUser = {
      id: userId,
      email,
      password_hash: passwordHash,
      license: license || 'starter',
      is_owner: true,
      owner_id: null,
      role: 'owner',
      suspended: false, // ✅ Nouveau compte = non suspendu
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_users`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newUser)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const created = await response.json();
    const user = created[0] || newUser;

    // Générer le token JWT
    const token = generateToken(user);

    // Réponse sans le mot de passe
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        license: user.license,
        licenseName: getLicenseName(user.license),
        maxUsers: getLicenseMaxUsers(user.license),
        isOwner: user.is_owner,
        ownerId: user.owner_id,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Connexion
app.post('/api/crm/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  try {
    // Chercher l'utilisateur
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('email', `eq.${email}`);
    url.searchParams.append('select', '*');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const users = await response.json();

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const user = users[0];

    // ✅ NOUVEAU: Vérifier si l'utilisateur est suspendu AVANT de vérifier le mot de passe
    if (user.suspended) {
      return res.status(403).json({ 
        error: 'Votre compte a été suspendu. Contactez l\'administrateur.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Si c'est un sous-compte, vérifier si le propriétaire est suspendu
    let licenseInfo = {
      license: user.license,
      maxUsers: getLicenseMaxUsers(user.license)
    };

    if (!user.is_owner && user.owner_id) {
      const ownerUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
      ownerUrl.searchParams.append('id', `eq.${user.owner_id}`);
      ownerUrl.searchParams.append('select', 'license,suspended');

      const ownerResponse = await fetch(ownerUrl.toString(), { headers: supabaseHeaders });
      const owners = await ownerResponse.json();

      if (owners && owners.length > 0) {
        // ✅ NOUVEAU: Vérifier si le propriétaire est suspendu
        if (owners[0].suspended) {
          return res.status(403).json({ 
            error: 'Le compte principal a été suspendu. Contactez l\'administrateur.',
            code: 'OWNER_SUSPENDED'
          });
        }
        licenseInfo.license = owners[0].license;
        licenseInfo.maxUsers = getLicenseMaxUsers(owners[0].license);
      }
    }

    // Générer le token JWT
    const token = generateToken({
      ...user,
      license: licenseInfo.license
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        license: licenseInfo.license,
        licenseName: getLicenseName(licenseInfo.license),
        maxUsers: licenseInfo.maxUsers,
        isOwner: user.is_owner,
        ownerId: user.owner_id,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

// Vérifier le token / Récupérer l'utilisateur courant
app.get('/api/crm/auth/me', authenticateToken, async (req, res) => {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('id', `eq.${req.user.id}`);
    url.searchParams.append('select', '*');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const users = await response.json();

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];

    // ✅ Double vérification de suspension (déjà fait dans le middleware mais sécurité supplémentaire)
    if (user.suspended) {
      return res.status(403).json({ 
        error: 'Votre compte a été suspendu',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Récupérer la licence effective
    let license = user.license;
    let maxUsers = getLicenseMaxUsers(license);

    if (!user.is_owner && user.owner_id) {
      const ownerUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
      ownerUrl.searchParams.append('id', `eq.${user.owner_id}`);
      ownerUrl.searchParams.append('select', 'license,suspended');

      const ownerResponse = await fetch(ownerUrl.toString(), { headers: supabaseHeaders });
      const owners = await ownerResponse.json();

      if (owners && owners.length > 0) {
        if (owners[0].suspended) {
          return res.status(403).json({ 
            error: 'Le compte principal a été suspendu',
            code: 'OWNER_SUSPENDED'
          });
        }
        license = owners[0].license;
        maxUsers = getLicenseMaxUsers(license);
      }
    }

    res.json({
      id: user.id,
      email: user.email,
      license,
      licenseName: getLicenseName(license),
      maxUsers,
      isOwner: user.is_owner,
      ownerId: user.owner_id,
      role: user.role
    });

  } catch (error) {
    console.error('Erreur /me:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rafraîchir le token
app.post('/api/crm/auth/refresh', authenticateToken, async (req, res) => {
  try {
    // Le middleware authenticateToken vérifie déjà la suspension
    // Générer un nouveau token avec les mêmes informations
    const newToken = generateToken(req.user);
    res.json({ token: newToken });
  } catch (error) {
    res.status(500).json({ error: 'Erreur rafraîchissement token' });
  }
});

// ==================== SUB-ACCOUNTS (PROTECTED) ====================

app.get('/api/crm/subaccounts', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('select', 'id,email,role,suspended,created_at');
    url.searchParams.append('order', 'created_at.desc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const data = await response.json();

    res.json(data || []);
  } catch (error) {
    console.error('Erreur chargement sous-comptes:', error);
    res.status(500).json({ error: 'Erreur chargement sous-comptes' });
  }
});

app.post('/api/crm/subaccounts', authenticateToken, async (req, res) => {
  const { email, password, role } = req.body;

  if (!req.user.isOwner) {
    return res.status(403).json({ error: 'Seul le propriétaire peut créer des sous-comptes' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    // Vérifier la limite de la licence
    const maxUsers = getLicenseMaxUsers(req.user.license);

    const countUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    countUrl.searchParams.append('or', `(id.eq.${req.user.id},owner_id.eq.${req.user.id})`);
    countUrl.searchParams.append('select', 'id');

    const countResponse = await fetch(countUrl.toString(), { headers: supabaseHeaders });
    const currentUsers = await countResponse.json();

    if (currentUsers.length >= maxUsers) {
      return res.status(403).json({
        error: `Limite atteinte (${maxUsers} utilisateurs max pour la licence ${getLicenseName(req.user.license)})`
      });
    }

    // Vérifier si l'email existe
    const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    checkUrl.searchParams.append('email', `eq.${email}`);
    checkUrl.searchParams.append('select', 'id');

    const checkResponse = await fetch(checkUrl.toString(), { headers: supabaseHeaders });
    const existing = await checkResponse.json();

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hash du mot de passe
    const passwordHash = await hashPassword(password);

    // Créer le sous-compte
    const subAccountId = email.replace('@', '_').replace(/\./g, '_');
    const newSubAccount = {
      id: subAccountId,
      email,
      password_hash: passwordHash,
      license: req.user.license,
      is_owner: false,
      owner_id: req.user.id,
      role: role || 'member',
      suspended: false, // ✅ Nouveau sous-compte = non suspendu
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_users`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newSubAccount)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const created = await response.json();

    res.status(201).json({
      id: created[0]?.id || subAccountId,
      email,
      role: role || 'member',
      suspended: false,
      created_at: newSubAccount.created_at
    });

  } catch (error) {
    console.error('Erreur création sous-compte:', error);
    res.status(500).json({ error: 'Erreur création sous-compte' });
  }
});

app.patch('/api/crm/subaccounts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!req.user.isOwner) {
    return res.status(403).json({ error: 'Seul le propriétaire peut modifier les rôles' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('id', `eq.${id}`);
    url.searchParams.append('owner_id', `eq.${req.user.id}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({ role, updated_at: new Date().toISOString() })
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Rôle mis à jour' });

  } catch (error) {
    console.error('Erreur modification sous-compte:', error);
    res.status(500).json({ error: 'Erreur modification sous-compte' });
  }
});

app.delete('/api/crm/subaccounts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (!req.user.isOwner) {
    return res.status(403).json({ error: 'Seul le propriétaire peut supprimer des utilisateurs' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('id', `eq.${id}`);
    url.searchParams.append('owner_id', `eq.${req.user.id}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: supabaseHeaders
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Sous-compte supprimé' });

  } catch (error) {
    console.error('Erreur suppression sous-compte:', error);
    res.status(500).json({ error: 'Erreur suppression sous-compte' });
  }
});

// ==================== CONTACTS (PROTECTED) ====================

app.get('/api/crm/contacts', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'created_at.desc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const data = await response.json();

    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch contacts:', error);
    res.status(500).json({ error: 'Erreur chargement contacts' });
  }
});

app.post('/api/crm/contacts', authenticateToken, async (req, res) => {
  const { name, email, phone, company, status, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nom et email requis' });
  }

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const newContact = {
      owner_id: ownerId,
      created_by: req.user.id,
      name,
      email,
      phone: phone || null,
      company: company || null,
      status: status || 'prospect',
      notes: notes || null,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_contacts`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newContact)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const inserted = await response.json();
    res.status(201).json(inserted[0] || newContact);

  } catch (error) {
    console.error('Erreur création contact:', error);
    res.status(500).json({ error: 'Erreur création contact' });
  }
});

app.patch('/api/crm/contacts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, company, status, notes } = req.body;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const updatedData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updatedData.name = name;
    if (email !== undefined) updatedData.email = email;
    if (phone !== undefined) updatedData.phone = phone;
    if (company !== undefined) updatedData.company = company;
    if (status !== undefined) updatedData.status = status;
    if (notes !== undefined) updatedData.notes = notes;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    url.searchParams.append('id', `eq.${id}`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const updated = await response.json();
    res.json(updated[0] || updatedData);

  } catch (error) {
    console.error('Erreur update contact:', error);
    res.status(500).json({ error: 'Erreur modification contact' });
  }
});

app.delete('/api/crm/contacts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    url.searchParams.append('id', `eq.${id}`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: supabaseHeaders
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Contact supprimé' });

  } catch (error) {
    console.error('Erreur suppression contact:', error);
    res.status(500).json({ error: 'Erreur suppression contact' });
  }
});

// ==================== INTERACTIONS (PROTECTED) ====================

app.get('/api/crm/interactions', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_interactions`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'created_at.desc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const data = await response.json();

    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch interactions:', error);
    res.status(500).json({ error: 'Erreur chargement interactions' });
  }
});

app.post('/api/crm/interactions', authenticateToken, async (req, res) => {
  const { contact_id, text, interaction_type } = req.body;

  if (!contact_id || !text) {
    return res.status(400).json({ error: 'contact_id et text requis' });
  }

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const newInteraction = {
      owner_id: ownerId,
      created_by: req.user.id,
      contact_id,
      text,
      interaction_type: interaction_type || 'note',
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_interactions`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newInteraction)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const inserted = await response.json();
    res.status(201).json(inserted[0] || newInteraction);

  } catch (error) {
    console.error('Erreur création interaction:', error);
    res.status(500).json({ error: 'Erreur création interaction' });
  }
});

// ==================== STATS (PROTECTED) ====================

app.get('/api/crm/stats', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('select', 'id,status');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
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

// ==================== LICENSES ====================

app.get('/api/crm/licenses', (req, res) => {
  res.json({
    starter: { name: 'Starter', maxUsers: 1, price: 'Gratuit', color: '#6b7280' },
    pro: { name: 'Pro', maxUsers: 5, price: '29€/mois', color: '#3b82f6' },
    business: { name: 'Business', maxUsers: 15, price: '79€/mois', color: '#8b5cf6' },
    enterprise: { name: 'Enterprise', maxUsers: 50, price: '199€/mois', color: '#f59e0b' }
  });
});

// ==================== ADMIN ROUTES ====================

// Admin middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    req.user = decoded;
    next();
  });
};

// Admin Login
app.post('/api/admin/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_admins`);
    url.searchParams.append('email', `eq.${email}`);
    url.searchParams.append('select', '*');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const admins = await response.json();

    if (!admins || admins.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const admin = admins[0];

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        isAdmin: true,
        role: admin.role || 'admin'
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        isAdmin: true,
        role: admin.role || 'admin'
      }
    });

  } catch (error) {
    console.error('Erreur login admin:', error);
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

// Admin - Get all users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('select', 'id,email,license,is_owner,owner_id,role,suspended,created_at');
    url.searchParams.append('order', 'created_at.desc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const users = await response.json();

    res.json(users || []);
  } catch (error) {
    console.error('Erreur fetch users:', error);
    res.status(500).json({ error: 'Erreur chargement utilisateurs' });
  }
});

// Admin - Suspend/Unsuspend user
app.patch('/api/admin/users/:id/suspend', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { suspended } = req.body;

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('id', `eq.${id}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({ 
        suspended: suspended,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: suspended ? 'Utilisateur suspendu' : 'Utilisateur réactivé' });
  } catch (error) {
    console.error('Erreur suspension:', error);
    res.status(500).json({ error: 'Erreur modification utilisateur' });
  }
});

// Admin - Update user license
app.patch('/api/admin/users/:id/license', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { license } = req.body;

  if (!['starter', 'pro', 'business', 'enterprise'].includes(license)) {
    return res.status(400).json({ error: 'Licence invalide' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('id', `eq.${id}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({ 
        license,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Licence mise à jour', license });
  } catch (error) {
    console.error('Erreur licence:', error);
    res.status(500).json({ error: 'Erreur modification licence' });
  }
});

// Admin - Delete user
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Supprimer les sous-comptes
    const subUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    subUrl.searchParams.append('owner_id', `eq.${id}`);
    await fetch(subUrl.toString(), { method: 'DELETE', headers: supabaseHeaders });

    // Supprimer les contacts
    const contactsUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    contactsUrl.searchParams.append('owner_id', `eq.${id}`);
    await fetch(contactsUrl.toString(), { method: 'DELETE', headers: supabaseHeaders });

    // Supprimer les interactions
    const interUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_interactions`);
    interUrl.searchParams.append('owner_id', `eq.${id}`);
    await fetch(interUrl.toString(), { method: 'DELETE', headers: supabaseHeaders });

    // Supprimer l'utilisateur
    const userUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    userUrl.searchParams.append('id', `eq.${id}`);
    await fetch(userUrl.toString(), { method: 'DELETE', headers: supabaseHeaders });

    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur suppression utilisateur' });
  }
});

// Admin - Stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const usersUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    usersUrl.searchParams.append('select', 'id,license,suspended,is_owner');
    const usersResponse = await fetch(usersUrl.toString(), { headers: supabaseHeaders });
    const users = await usersResponse.json();

    const contactsUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    contactsUrl.searchParams.append('select', 'id');
    const contactsResponse = await fetch(contactsUrl.toString(), { headers: supabaseHeaders });
    const contacts = await contactsResponse.json();

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => !u.suspended).length,
      suspendedUsers: users.filter(u => u.suspended).length,
      ownerAccounts: users.filter(u => u.is_owner).length,
      totalContacts: contacts.length,
      licenseDistribution: {
        starter: users.filter(u => u.license === 'starter').length,
        pro: users.filter(u => u.license === 'pro').length,
        business: users.filter(u => u.license === 'business').length,
        enterprise: users.filter(u => u.license === 'enterprise').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur stats admin:', error);
    res.status(500).json({ error: 'Erreur chargement stats' });
  }
});

// ==================== ROUTES EXISTANTES ====================

app.get('/api/data', (req, res) => {
  res.json({ data: [], message: 'API CRM opérationnelle' });
});

app.post('/api/data', (req, res) => {
  res.json({ received: req.body });
});

app.get('/api/bf6/player-stats', async (req, res) => {
  const { player, pplatform } = req.query;
  if (!player) return res.status(400).json({ error: 'Player name required' });

  res.json({
    name: player,
    platform: pplatform || 'pc',
    kd: (Math.random() * 3 + 0.5).toFixed(2),
    win: Math.floor(Math.random() * 500),
    playtimeHours: Math.floor(Math.random() * 200)
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Serveur CRM démarré sur le port ${PORT}`);
  console.log(`🔐 JWT activé (expire: ${JWT_EXPIRES_IN})`);
  console.log(`📊 API: http://localhost:${PORT}/api/crm`);
  console.log(`🛡️ Admin: http://localhost:${PORT}/api/admin`);
});