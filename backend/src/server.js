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

/**
 * Checks if a user account is suspended, including cascading checks for owner accounts.
 *
 * This function performs a hierarchical suspension check:
 * 1. Verifies if the user's own account is suspended
 * 2. If the user is a sub-account (has an owner_id), checks if the owner account is suspended
 * 3. Returns detailed status information about the suspension state
 *
 * @async
 * @param {string} userId - The unique identifier of the user to check
 *
 * @returns {Promise<Object>} Suspension status object with the following properties:
 * @returns {boolean} returns.suspended - Whether the account is suspended (directly or via owner)
 * @returns {string} [returns.reason] - Human-readable reason for suspension (if suspended is true)
 * @returns {boolean} [returns.notFound] - Indicates if the user was not found in the database
 *
 * @example
 * // Check a regular user
 * const result = await checkUserSuspended('user_123');
 * // Returns: { suspended: false }
 *
 * @example
 * // Check a suspended user
 * const result = await checkUserSuspended('suspended_user');
 * // Returns: { suspended: true, reason: 'Votre compte a été suspendu' }
 *
 * @example
 * // Check a sub-account whose owner is suspended
 * const result = await checkUserSuspended('subaccount_456');
 * // Returns: { suspended: true, reason: 'Le compte principal a été suspendu' }
 *
 * @example
 * // Check a non-existent user
 * const result = await checkUserSuspended('nonexistent');
 * // Returns: { suspended: false, notFound: true }
 *
 * @throws {Error} Logs error to console but returns { suspended: false } on failure to prevent blocking
 */
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

/**
 * Generates a JSON Web Token (JWT) for user authentication.
 *
 * Creates a signed JWT containing user identity and authorization information.
 * The token is used for stateless authentication across API requests and expires
 * based on the JWT_EXPIRES_IN environment variable (default: 24h).
 *
 * @param {Object} user - User object from the database
 * @param {string} user.id - Unique user identifier
 * @param {string} user.email - User's email address
 * @param {string} user.license - License tier (starter, pro, business, enterprise)
 * @param {boolean} user.is_owner - Whether the user is an account owner
 * @param {string|null} user.owner_id - ID of the owner account (null if user is owner)
 * @param {string} user.role - User role (owner, member, admin)
 *
 * @returns {string} Signed JWT token string
 *
 * @example
 * const user = {
 *   id: 'user_123',
 *   email: 'john@example.com',
 *   license: 'pro',
 *   is_owner: true,
 *   owner_id: null,
 *   role: 'owner'
 * };
 * const token = generateToken(user);
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 * @see {@link https://jwt.io/|JWT.io} for token structure
 */
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

/**
 * Hashes a plain-text password using bcrypt with a salt.
 *
 * Generates a cryptographically secure hash suitable for database storage.
 * Uses bcrypt's adaptive hashing algorithm with 10 salt rounds, providing
 * strong protection against brute-force and rainbow table attacks.
 *
 * @async
 * @param {string} password - Plain-text password to hash
 *
 * @returns {Promise<string>} Hashed password string (60 characters, includes salt)
 *
 * @example
 * const hashedPassword = await hashPassword('mySecurePassword123');
 * // Returns: "$2a$10$N9qo8uLOickgx2ZMRZoMye1J7XmQ/UHhXiWZiMKfvELjUXwqLZqii"
 *
 * @throws {Error} If bcrypt operations fail
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plain-text password against a bcrypt hash.
 *
 * Securely validates user credentials during login by comparing the provided
 * password against the stored hash. Uses constant-time comparison to prevent
 * timing attacks.
 *
 * @async
 * @param {string} password - Plain-text password to verify
 * @param {string} hash - Stored bcrypt hash from database
 *
 * @returns {Promise<boolean>} True if password matches, false otherwise
 *
 * @example
 * const isValid = await comparePassword('userInput123', storedHash);
 * if (isValid) {
 *   // Grant access
 * } else {
 *   // Deny access
 * }
 *
 * @throws {Error} If bcrypt comparison fails
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Returns the maximum number of users allowed for a given license tier.
 *
 * Maps license tier identifiers to their user limits. Used for enforcing
 * subscription boundaries when creating sub-accounts.
 *
 * @param {string} license - License tier identifier
 *
 * @returns {number} Maximum number of users (including owner)
 * @returns {number} 1 - For 'starter' or invalid license
 * @returns {number} 5 - For 'pro' license
 * @returns {number} 15 - For 'business' license
 * @returns {number} 50 - For 'enterprise' license
 *
 * @example
 * const maxUsers = getLicenseMaxUsers('pro');
 * // Returns: 5
 *
 * @example
 * const maxUsers = getLicenseMaxUsers('invalid');
 * // Returns: 1 (defaults to starter)
 */
const getLicenseMaxUsers = (license) => {
  const licenses = { starter: 1, pro: 5, business: 15, enterprise: 50 };
  return licenses[license] || 1;
};

/**
 * Returns the display name for a given license tier.
 *
 * Converts internal license identifiers to human-readable names for UI display.
 * Used in API responses, user interfaces, and notifications.
 *
 * @param {string} license - License tier identifier
 *
 * @returns {string} Human-readable license name
 * @returns {string} 'Starter' - For 'starter' or invalid license
 * @returns {string} 'Pro' - For 'pro' license
 * @returns {string} 'Business' - For 'business' license
 * @returns {string} 'Enterprise' - For 'enterprise' license
 *
 * @example
 * const displayName = getLicenseName('business');
 * // Returns: "Business"
 *
 * @example
 * const displayName = getLicenseName('unknown');
 * // Returns: "Starter" (defaults to starter)
 */
const getLicenseName = (license) => {
  const names = { starter: 'Starter', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' };
  return names[license] || 'Starter';
};

// ==================== AUTH ROUTES ====================

// Inscription
app.post('/api/crm/auth/register', async (req, res) => {
  const { email, password, license, company_name, company_siret, company_address, company_phone, company_email } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et password requis' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  // Vérification des champs entreprise obligatoires
  if (!company_name || !company_siret || !company_address || !company_phone || !company_email) {
    return res.status(400).json({ error: 'Toutes les informations de l\'entreprise sont requises (nom, SIRET, adresse, téléphone, email)' });
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
      suspended: false,
      company_name,
      company_siret,
      company_address,
      company_phone,
      company_email,
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
        role: user.role,
        companyName: user.company_name,
        companySiret: user.company_siret,
        companyAddress: user.company_address,
        companyPhone: user.company_phone,
        companyEmail: user.company_email
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

    // Si c'est un sous-compte, vérifier si le propriétaire est suspendu et récupérer ses infos
    let licenseInfo = {
      license: user.license,
      maxUsers: getLicenseMaxUsers(user.license)
    };

    let companyInfo = {
      companyName: user.company_name,
      companySiret: user.company_siret,
      companyAddress: user.company_address,
      companyPhone: user.company_phone,
      companyEmail: user.company_email
    };

    if (!user.is_owner && user.owner_id) {
      const ownerUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
      ownerUrl.searchParams.append('id', `eq.${user.owner_id}`);
      ownerUrl.searchParams.append('select', 'license,suspended,company_name,company_siret,company_address,company_phone,company_email');

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

        // Récupérer les infos entreprise du propriétaire
        companyInfo = {
          companyName: owners[0].company_name,
          companySiret: owners[0].company_siret,
          companyAddress: owners[0].company_address,
          companyPhone: owners[0].company_phone,
          companyEmail: owners[0].company_email
        };
      }
    }

    // Récupérer l'IP du client
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.headers['x-real-ip'] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';

    // Mettre à jour last_login_ip et last_login_at
    try {
      const updateUrl = `${SUPABASE_URL}/rest/v1/crm_users?id=eq.${user.id}`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({
          last_login_ip: clientIp,
          last_login_at: new Date().toISOString()
        })
      });
    } catch (updateError) {
      console.error('Erreur mise à jour login info:', updateError);
      // Ne pas bloquer la connexion si la mise à jour échoue
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
        role: user.role,
        companyName: companyInfo.companyName,
        companySiret: companyInfo.companySiret,
        companyAddress: companyInfo.companyAddress,
        companyPhone: companyInfo.companyPhone,
        companyEmail: companyInfo.companyEmail
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

    // Récupérer la licence effective et les infos entreprise
    let license = user.license;
    let maxUsers = getLicenseMaxUsers(license);
    let companyInfo = {
      companyName: user.company_name,
      companySiret: user.company_siret,
      companyAddress: user.company_address,
      companyPhone: user.company_phone,
      companyEmail: user.company_email
    };

    if (!user.is_owner && user.owner_id) {
      const ownerUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
      ownerUrl.searchParams.append('id', `eq.${user.owner_id}`);
      ownerUrl.searchParams.append('select', 'license,suspended,company_name,company_siret,company_address,company_phone,company_email');

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
        companyInfo = {
          companyName: owners[0].company_name,
          companySiret: owners[0].company_siret,
          companyAddress: owners[0].company_address,
          companyPhone: owners[0].company_phone,
          companyEmail: owners[0].company_email
        };
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
      role: user.role,
      companyName: companyInfo.companyName,
      companySiret: companyInfo.companySiret,
      companyAddress: companyInfo.companyAddress,
      companyPhone: companyInfo.companyPhone,
      companyEmail: companyInfo.companyEmail
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

// Mettre à jour les informations de l'entreprise
app.patch('/api/crm/auth/company', authenticateToken, async (req, res) => {
  const { company_name, company_siret, company_address, company_phone, company_email } = req.body;

  if (!req.user.isOwner) {
    return res.status(403).json({ error: 'Seul le propriétaire peut modifier les informations de l\'entreprise' });
  }

  if (!company_name || !company_siret || !company_address || !company_phone || !company_email) {
    return res.status(400).json({ error: 'Toutes les informations de l\'entreprise sont requises' });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('id', `eq.${req.user.id}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        company_name,
        company_siret,
        company_address,
        company_phone,
        company_email,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({
      message: 'Informations de l\'entreprise mises à jour',
      companyName: company_name,
      companySiret: company_siret,
      companyAddress: company_address,
      companyPhone: company_phone,
      companyEmail: company_email
    });

  } catch (error) {
    console.error('Erreur mise à jour entreprise:', error);
    res.status(500).json({ error: 'Erreur mise à jour des informations de l\'entreprise' });
  }
});

// ==================== SUB-ACCOUNTS (PROTECTED) ====================

app.get('/api/crm/subaccounts', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('select', 'id,email,role,suspended,created_at,last_login_ip,last_login_at');
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

// ==================== QUOTES (PROTECTED) ====================

// Get all quotes for the user
app.get('/api/crm/quotes', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'created_at.desc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const data = await response.json();

    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch quotes:', error);
    res.status(500).json({ error: 'Erreur chargement devis' });
  }
});

// Get a specific quote by ID
app.get('/api/crm/quotes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
    url.searchParams.append('id', `eq.${id}`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('select', '*');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const quotes = await response.json();

    if (!quotes || quotes.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    res.json(quotes[0]);
  } catch (error) {
    console.error('Erreur fetch quote:', error);
    res.status(500).json({ error: 'Erreur chargement devis' });
  }
});

// Create a new quote
app.post('/api/crm/quotes', authenticateToken, async (req, res) => {
  const {
    quote_number,
    contact_id,
    client_name,
    client_email,
    client_address,
    items,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    status,
    valid_until,
    payment_terms,
    notes
  } = req.body;

  // Validation
  if (!quote_number) {
    return res.status(400).json({ error: 'Numéro de devis requis' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Au moins un article requis' });
  }

  if (!client_name && !contact_id) {
    return res.status(400).json({ error: 'Nom du client ou contact_id requis' });
  }

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    // Check if quote_number already exists for this owner
    const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
    checkUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    checkUrl.searchParams.append('quote_number', `eq.${quote_number}`);
    checkUrl.searchParams.append('select', 'id');

    const checkResponse = await fetch(checkUrl.toString(), { headers: supabaseHeaders });
    const existing = await checkResponse.json();

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de devis existe déjà' });
    }

    const newQuote = {
      owner_id: ownerId,
      created_by: req.user.id,
      quote_number,
      contact_id: contact_id || null,
      client_name: client_name || null,
      client_email: client_email || null,
      client_address: client_address || null,
      items: JSON.stringify(items),
      subtotal: subtotal || 0,
      tax_rate: tax_rate || 20,
      tax_amount: tax_amount || 0,
      total: total || 0,
      status: status || 'draft',
      valid_until: valid_until || null,
      payment_terms: payment_terms || null,
      notes: notes || null,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_quotes`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newQuote)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const inserted = await response.json();
    const createdQuote = inserted[0] || newQuote;

    // Parse items back to JSON for response
    if (createdQuote.items && typeof createdQuote.items === 'string') {
      createdQuote.items = JSON.parse(createdQuote.items);
    }

    res.status(201).json(createdQuote);

  } catch (error) {
    console.error('Erreur création devis:', error);
    res.status(500).json({ error: 'Erreur création devis' });
  }
});

// Update a quote
app.patch('/api/crm/quotes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    quote_number,
    contact_id,
    client_name,
    client_email,
    client_address,
    items,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    status,
    valid_until,
    payment_terms,
    notes
  } = req.body;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const updatedData = { updated_at: new Date().toISOString() };

    if (quote_number !== undefined) updatedData.quote_number = quote_number;
    if (contact_id !== undefined) updatedData.contact_id = contact_id;
    if (client_name !== undefined) updatedData.client_name = client_name;
    if (client_email !== undefined) updatedData.client_email = client_email;
    if (client_address !== undefined) updatedData.client_address = client_address;
    if (items !== undefined) updatedData.items = JSON.stringify(items);
    if (subtotal !== undefined) updatedData.subtotal = subtotal;
    if (tax_rate !== undefined) updatedData.tax_rate = tax_rate;
    if (tax_amount !== undefined) updatedData.tax_amount = tax_amount;
    if (total !== undefined) updatedData.total = total;
    if (status !== undefined) updatedData.status = status;
    if (valid_until !== undefined) updatedData.valid_until = valid_until;
    if (payment_terms !== undefined) updatedData.payment_terms = payment_terms;
    if (notes !== undefined) updatedData.notes = notes;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
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
    const updatedQuote = updated[0] || updatedData;

    // Parse items back to JSON for response
    if (updatedQuote.items && typeof updatedQuote.items === 'string') {
      updatedQuote.items = JSON.parse(updatedQuote.items);
    }

    res.json(updatedQuote);

  } catch (error) {
    console.error('Erreur update quote:', error);
    res.status(500).json({ error: 'Erreur modification devis' });
  }
});

// Update quote status
app.patch('/api/crm/quotes/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Statut invalide. Valeurs autorisées: draft, sent, accepted, rejected, expired'
    });
  }

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
    url.searchParams.append('id', `eq.${id}`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({
        status,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Statut mis à jour', status });

  } catch (error) {
    console.error('Erreur update status:', error);
    res.status(500).json({ error: 'Erreur modification statut' });
  }
});

// Delete a quote
app.delete('/api/crm/quotes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
    url.searchParams.append('id', `eq.${id}`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: supabaseHeaders
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Devis supprimé' });

  } catch (error) {
    console.error('Erreur suppression quote:', error);
    res.status(500).json({ error: 'Erreur suppression devis' });
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

// ==================== ANALYTICS ====================

// Analytics Overview - Vue d'ensemble complète
app.get('/api/crm/analytics/overview', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;
    const { period = '30' } = req.query; // period en jours (7, 30, 90, 365)

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateISO = startDate.toISOString();

    // Récupérer tous les contacts
    const contactsUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    contactsUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    contactsUrl.searchParams.append('select', 'id,status,created_at');

    const contactsResponse = await fetch(contactsUrl.toString(), { headers: supabaseHeaders });
    const contacts = await contactsResponse.json();

    // Récupérer tous les devis
    const quotesUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
    quotesUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    quotesUrl.searchParams.append('select', 'id,status,total,created_at');

    const quotesResponse = await fetch(quotesUrl.toString(), { headers: supabaseHeaders });
    const quotes = await quotesResponse.json();

    // Récupérer les interactions
    const interactionsUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_interactions`);
    interactionsUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    interactionsUrl.searchParams.append('select', 'id,created_at');

    const interactionsResponse = await fetch(interactionsUrl.toString(), { headers: supabaseHeaders });
    const interactions = await interactionsResponse.json();

    // Filtrer par période
    const contactsInPeriod = contacts.filter(c => new Date(c.created_at) >= startDate);
    const quotesInPeriod = quotes.filter(q => new Date(q.created_at) >= startDate);
    const interactionsInPeriod = interactions.filter(i => new Date(i.created_at) >= startDate);

    // Calculer les stats
    const totalContacts = contacts.length;
    const totalProspects = contacts.filter(c => c.status === 'prospect').length;
    const totalClients = contacts.filter(c => c.status === 'client').length;
    const totalLost = contacts.filter(c => c.status === 'perdu').length;

    const conversionRate = totalContacts > 0
      ? ((totalClients / totalContacts) * 100).toFixed(1)
      : 0;

    // Stats devis
    const totalQuotes = quotes.length;
    const draftQuotes = quotes.filter(q => q.status === 'draft').length;
    const sentQuotes = quotes.filter(q => q.status === 'sent').length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
    const rejectedQuotes = quotes.filter(q => q.status === 'rejected').length;

    // Calculs revenus
    const totalRevenue = quotes
      .filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0);

    const potentialRevenue = quotes
      .filter(q => q.status === 'sent')
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0);

    const averageQuoteValue = totalQuotes > 0
      ? (quotes.reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0) / totalQuotes).toFixed(2)
      : 0;

    // Nouveaux éléments dans la période
    const newContactsInPeriod = contactsInPeriod.length;
    const newQuotesInPeriod = quotesInPeriod.length;
    const newInteractionsInPeriod = interactionsInPeriod.length;

    res.json({
      period: periodDays,
      contacts: {
        total: totalContacts,
        prospects: totalProspects,
        clients: totalClients,
        lost: totalLost,
        conversionRate: parseFloat(conversionRate),
        newInPeriod: newContactsInPeriod
      },
      quotes: {
        total: totalQuotes,
        draft: draftQuotes,
        sent: sentQuotes,
        accepted: acceptedQuotes,
        rejected: rejectedQuotes,
        newInPeriod: newQuotesInPeriod,
        acceptanceRate: sentQuotes + acceptedQuotes > 0
          ? ((acceptedQuotes / (sentQuotes + acceptedQuotes)) * 100).toFixed(1)
          : 0
      },
      revenue: {
        total: totalRevenue.toFixed(2),
        potential: potentialRevenue.toFixed(2),
        average: averageQuoteValue
      },
      interactions: {
        total: interactions.length,
        newInPeriod: newInteractionsInPeriod
      }
    });

  } catch (error) {
    console.error('Erreur analytics overview:', error);
    res.status(500).json({ error: 'Erreur chargement analytics' });
  }
});

// Analytics Revenue - Évolution du CA par mois
app.get('/api/crm/analytics/revenue', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;
    const { months = '12' } = req.query;

    const monthsCount = parseInt(months);

    // Récupérer tous les devis acceptés
    const quotesUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
    quotesUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    quotesUrl.searchParams.append('status', `eq.accepted`);
    quotesUrl.searchParams.append('select', 'total,created_at');

    const response = await fetch(quotesUrl.toString(), { headers: supabaseHeaders });
    const quotes = await response.json();

    // Regrouper par mois
    const monthlyRevenue = {};
    const now = new Date();

    // Initialiser les mois
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = {
        month: monthKey,
        monthLabel: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue: 0,
        count: 0
      };
    }

    // Calculer les revenus par mois
    quotes.forEach(quote => {
      const date = new Date(quote.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey].revenue += parseFloat(quote.total) || 0;
        monthlyRevenue[monthKey].count += 1;
      }
    });

    res.json({
      data: Object.values(monthlyRevenue).map(m => ({
        ...m,
        revenue: parseFloat(m.revenue.toFixed(2))
      }))
    });

  } catch (error) {
    console.error('Erreur analytics revenue:', error);
    res.status(500).json({ error: 'Erreur chargement revenus' });
  }
});

// Analytics Conversion - Taux de conversion par statut
app.get('/api/crm/analytics/conversion', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    // Récupérer tous les contacts avec leur date de création
    const contactsUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    contactsUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    contactsUrl.searchParams.append('select', 'id,status,created_at');

    const response = await fetch(contactsUrl.toString(), { headers: supabaseHeaders });
    const contacts = await response.json();

    // Calculer le temps moyen de conversion (prospect -> client)
    const clients = contacts.filter(c => c.status === 'client');
    const prospects = contacts.filter(c => c.status === 'prospect');
    const lost = contacts.filter(c => c.status === 'perdu');

    // Pour le temps moyen, on estime en fonction de la date de création
    // (dans une vraie app, il faudrait tracker les changements de statut)
    const avgConversionTime = clients.length > 0
      ? Math.round(clients.reduce((sum, c) => {
          const daysSinceCreation = Math.floor((new Date() - new Date(c.created_at)) / (1000 * 60 * 60 * 24));
          return sum + daysSinceCreation;
        }, 0) / clients.length)
      : 0;

    res.json({
      funnel: [
        { stage: 'Prospects', count: prospects.length, percentage: 100 },
        {
          stage: 'Clients',
          count: clients.length,
          percentage: contacts.length > 0 ? ((clients.length / contacts.length) * 100).toFixed(1) : 0
        },
        {
          stage: 'Perdus',
          count: lost.length,
          percentage: contacts.length > 0 ? ((lost.length / contacts.length) * 100).toFixed(1) : 0
        }
      ],
      avgConversionDays: avgConversionTime,
      conversionRate: contacts.length > 0
        ? ((clients.length / contacts.length) * 100).toFixed(1)
        : 0
    });

  } catch (error) {
    console.error('Erreur analytics conversion:', error);
    res.status(500).json({ error: 'Erreur chargement conversion' });
  }
});

// Analytics Top Contacts - Top contacts par CA
app.get('/api/crm/analytics/top-contacts', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;
    const { limit = '5' } = req.query;

    // Récupérer tous les contacts
    const contactsUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    contactsUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    contactsUrl.searchParams.append('select', 'id,name,email,company,status');

    const contactsResponse = await fetch(contactsUrl.toString(), { headers: supabaseHeaders });
    const contacts = await contactsResponse.json();

    // Récupérer tous les devis acceptés
    const quotesUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_quotes`);
    quotesUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    quotesUrl.searchParams.append('status', `eq.accepted`);
    quotesUrl.searchParams.append('select', 'contact_id,total');

    const quotesResponse = await fetch(quotesUrl.toString(), { headers: supabaseHeaders });
    const quotes = await quotesResponse.json();

    // Calculer le CA par contact
    const contactRevenue = {};
    quotes.forEach(quote => {
      if (quote.contact_id) {
        if (!contactRevenue[quote.contact_id]) {
          contactRevenue[quote.contact_id] = 0;
        }
        contactRevenue[quote.contact_id] += parseFloat(quote.total) || 0;
      }
    });

    // Enrichir les contacts avec leur CA
    const contactsWithRevenue = contacts
      .map(contact => ({
        ...contact,
        revenue: contactRevenue[contact.id] || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit))
      .map(c => ({
        ...c,
        revenue: parseFloat(c.revenue.toFixed(2))
      }));

    res.json({
      topContacts: contactsWithRevenue
    });

  } catch (error) {
    console.error('Erreur analytics top contacts:', error);
    res.status(500).json({ error: 'Erreur chargement top contacts' });
  }
});

// ==================== EMAILS ====================

// Send an email
app.post('/api/crm/emails', authenticateToken, async (req, res) => {
  const {
    contact_id,
    recipient_email,
    recipient_name,
    subject,
    body,
    template_id
  } = req.body;

  // Validation
  if (!recipient_email || !subject || !body) {
    return res.status(400).json({ error: 'Email, sujet et corps requis' });
  }

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const newEmail = {
      owner_id: ownerId,
      sender_id: req.user.id,
      contact_id: contact_id || null,
      recipient_email,
      recipient_name: recipient_name || null,
      subject,
      body,
      template_id: template_id || null,
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_emails`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newEmail)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const inserted = await response.json();
    const createdEmail = inserted[0] || newEmail;

    // Créer une notification
    if (contact_id) {
      const notification = {
        user_id: req.user.id,
        owner_id: ownerId,
        type: 'email_sent',
        title: 'Email envoyé',
        message: `Email envoyé à ${recipient_name || recipient_email}`,
        link: `/crm/contacts`,
        created_at: new Date().toISOString()
      };

      await fetch(`${SUPABASE_URL}/rest/v1/crm_notifications`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify(notification)
      });
    }

    res.status(201).json(createdEmail);

  } catch (error) {
    console.error('Erreur envoi email:', error);
    res.status(500).json({ error: 'Erreur envoi email' });
  }
});

// Get all emails
app.get('/api/crm/emails', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;
    const { limit = '50', status } = req.query;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_emails`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'sent_at.desc');
    url.searchParams.append('limit', limit);

    if (status) {
      url.searchParams.append('status', `eq.${status}`);
    }

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const emails = await response.json();

    res.json(emails);

  } catch (error) {
    console.error('Erreur récupération emails:', error);
    res.status(500).json({ error: 'Erreur chargement emails' });
  }
});

// Get emails for a specific contact
app.get('/api/crm/emails/contact/:contactId', authenticateToken, async (req, res) => {
  const { contactId } = req.params;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_emails`);
    url.searchParams.append('owner_id', `eq.${ownerId}`);
    url.searchParams.append('contact_id', `eq.${contactId}`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'sent_at.desc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const emails = await response.json();

    res.json(emails);

  } catch (error) {
    console.error('Erreur récupération emails contact:', error);
    res.status(500).json({ error: 'Erreur chargement emails' });
  }
});

// Mark email as opened (for tracking)
app.patch('/api/crm/emails/:id/opened', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    // Vérifier que l'email appartient à cet owner
    const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_emails`);
    checkUrl.searchParams.append('id', `eq.${id}`);
    checkUrl.searchParams.append('owner_id', `eq.${ownerId}`);

    const checkResponse = await fetch(checkUrl.toString(), { headers: supabaseHeaders });
    const emails = await checkResponse.json();

    if (!emails || emails.length === 0) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    // Mettre à jour le statut
    const updateUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_emails`);
    updateUrl.searchParams.append('id', `eq.${id}`);

    const updateData = {
      status: 'opened',
      opened_at: new Date().toISOString()
    };

    const updateResponse = await fetch(updateUrl.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error('Erreur mise à jour');
    }

    const updated = await updateResponse.json();

    res.json(updated[0] || updateData);

  } catch (error) {
    console.error('Erreur marquage email ouvert:', error);
    res.status(500).json({ error: 'Erreur mise à jour email' });
  }
});

// ==================== EMAIL TEMPLATES ====================

// Get all email templates
app.get('/api/crm/email-templates', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_email_templates`);
    url.searchParams.append('or', `(owner_id.eq.${ownerId},is_default.eq.true)`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'category,name');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });

    // Vérifier si la réponse est OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur Supabase email-templates:', response.status, errorText);

      // Si la table n'existe pas, renvoyer un tableau vide avec un warning
      if (response.status === 404 || errorText.includes('relation') || errorText.includes('does not exist')) {
        console.warn('⚠️  Table crm_email_templates non trouvée. Veuillez exécuter emails_schema.sql dans Supabase.');
        return res.json([]);
      }

      return res.status(response.status).json({
        error: 'Erreur Supabase',
        details: errorText,
        hint: 'Avez-vous exécuté emails_schema.sql dans Supabase ?'
      });
    }

    const templates = await response.json();

    // Si pas de templates, retourner tableau vide
    if (!templates || templates.length === 0) {
      console.warn('⚠️  Aucun template trouvé. La table existe mais est vide.');
      return res.json([]);
    }

    // Parser les variables JSON
    const parsedTemplates = templates.map(t => ({
      ...t,
      variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : t.variables
    }));

    res.json(parsedTemplates);

  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({
      error: 'Erreur chargement templates',
      message: error.message,
      hint: 'Vérifiez que la table crm_email_templates existe dans Supabase'
    });
  }
});

// Create a custom email template
app.post('/api/crm/email-templates', authenticateToken, async (req, res) => {
  const { name, subject, body, category = 'custom', variables = [] } = req.body;

  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'Nom, sujet et corps requis' });
  }

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    const newTemplate = {
      owner_id: ownerId,
      name,
      subject,
      body,
      category,
      variables: JSON.stringify(variables),
      is_default: false,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_email_templates`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newTemplate)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const inserted = await response.json();
    const created = inserted[0] || newTemplate;

    // Parser les variables pour la réponse
    if (created.variables && typeof created.variables === 'string') {
      created.variables = JSON.parse(created.variables);
    }

    res.status(201).json(created);

  } catch (error) {
    console.error('Erreur création template:', error);
    res.status(500).json({ error: 'Erreur création template' });
  }
});

// Update email template
app.patch('/api/crm/email-templates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, subject, body, category, variables } = req.body;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    // Vérifier que le template appartient à cet owner (pas un template par défaut)
    const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_email_templates`);
    checkUrl.searchParams.append('id', `eq.${id}`);
    checkUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    checkUrl.searchParams.append('is_default', 'eq.false');

    const checkResponse = await fetch(checkUrl.toString(), { headers: supabaseHeaders });
    const templates = await checkResponse.json();

    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'Template non trouvé ou non modifiable' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (body !== undefined) updateData.body = body;
    if (category !== undefined) updateData.category = category;
    if (variables !== undefined) updateData.variables = JSON.stringify(variables);

    const updateUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_email_templates`);
    updateUrl.searchParams.append('id', `eq.${id}`);

    const updateResponse = await fetch(updateUrl.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      throw new Error('Erreur mise à jour');
    }

    const updated = await updateResponse.json();
    const result = updated[0] || updateData;

    // Parser les variables
    if (result.variables && typeof result.variables === 'string') {
      result.variables = JSON.parse(result.variables);
    }

    res.json(result);

  } catch (error) {
    console.error('Erreur mise à jour template:', error);
    res.status(500).json({ error: 'Erreur mise à jour template' });
  }
});

// Delete email template
app.delete('/api/crm/email-templates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const ownerId = req.user.isOwner ? req.user.id : req.user.ownerId;

    // Vérifier que le template appartient à cet owner (pas un template par défaut)
    const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_email_templates`);
    checkUrl.searchParams.append('id', `eq.${id}`);
    checkUrl.searchParams.append('owner_id', `eq.${ownerId}`);
    checkUrl.searchParams.append('is_default', 'eq.false');

    const checkResponse = await fetch(checkUrl.toString(), { headers: supabaseHeaders });
    const templates = await checkResponse.json();

    if (!templates || templates.length === 0) {
      return res.status(404).json({ error: 'Template non trouvé ou non supprimable' });
    }

    const deleteUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_email_templates`);
    deleteUrl.searchParams.append('id', `eq.${id}`);

    await fetch(deleteUrl.toString(), {
      method: 'DELETE',
      headers: supabaseHeaders
    });

    res.json({ message: 'Template supprimé' });

  } catch (error) {
    console.error('Erreur suppression template:', error);
    res.status(500).json({ error: 'Erreur suppression template' });
  }
});

// ==================== NOTIFICATIONS ====================

// Get user notifications
app.get('/api/crm/notifications', authenticateToken, async (req, res) => {
  try {
    const { limit = '20', unread_only = 'false' } = req.query;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_notifications`);
    url.searchParams.append('user_id', `eq.${req.user.id}`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'created_at.desc');
    url.searchParams.append('limit', limit);

    if (unread_only === 'true') {
      url.searchParams.append('is_read', 'eq.false');
    }

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const notifications = await response.json();

    res.json(notifications);

  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ error: 'Erreur chargement notifications' });
  }
});

// Mark notification as read
app.patch('/api/crm/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier que la notification appartient à cet utilisateur
    const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_notifications`);
    checkUrl.searchParams.append('id', `eq.${id}`);
    checkUrl.searchParams.append('user_id', `eq.${req.user.id}`);

    const checkResponse = await fetch(checkUrl.toString(), { headers: supabaseHeaders });
    const notifications = await checkResponse.json();

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    const updateUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_notifications`);
    updateUrl.searchParams.append('id', `eq.${id}`);

    const updateResponse = await fetch(updateUrl.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({ is_read: true })
    });

    if (!updateResponse.ok) {
      throw new Error('Erreur mise à jour');
    }

    const updated = await updateResponse.json();

    res.json(updated[0] || { is_read: true });

  } catch (error) {
    console.error('Erreur marquage notification lue:', error);
    res.status(500).json({ error: 'Erreur mise à jour notification' });
  }
});

// Mark all notifications as read
app.patch('/api/crm/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_notifications`);
    url.searchParams.append('user_id', `eq.${req.user.id}`);
    url.searchParams.append('is_read', 'eq.false');

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify({ is_read: true })
    });

    if (!response.ok) {
      throw new Error('Erreur mise à jour');
    }

    res.json({ message: 'Toutes les notifications marquées comme lues' });

  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error);
    res.status(500).json({ error: 'Erreur mise à jour notifications' });
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
  // Prix des licences en euros (mensuel)
  const LICENSE_PRICES = {
    starter: 0,
    pro: 29,
    business: 79,
    enterprise: 199
  };

  try {
    const usersUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_users`);
    usersUrl.searchParams.append('select', 'id,license,suspended,is_owner,created_at');
    const usersResponse = await fetch(usersUrl.toString(), { headers: supabaseHeaders });
    const users = await usersResponse.json();

    const contactsUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_contacts`);
    contactsUrl.searchParams.append('select', 'id');
    const contactsResponse = await fetch(contactsUrl.toString(), { headers: supabaseHeaders });
    const contacts = await contactsResponse.json();

    // Calculer les stats par licence (seulement les owners actifs pour les revenus)
    const activeOwners = users.filter(u => u.is_owner && !u.suspended);
    
    const licenseDistribution = {
      starter: users.filter(u => u.license === 'starter').length,
      pro: users.filter(u => u.license === 'pro').length,
      business: users.filter(u => u.license === 'business').length,
      enterprise: users.filter(u => u.license === 'enterprise').length
    };

    // Comptes payants actifs (owners non suspendus avec licence payante)
    const paidSubscriptions = {
      pro: activeOwners.filter(u => u.license === 'pro').length,
      business: activeOwners.filter(u => u.license === 'business').length,
      enterprise: activeOwners.filter(u => u.license === 'enterprise').length
    };

    // Calcul des revenus
    const monthlyRevenue = {
      pro: paidSubscriptions.pro * LICENSE_PRICES.pro,
      business: paidSubscriptions.business * LICENSE_PRICES.business,
      enterprise: paidSubscriptions.enterprise * LICENSE_PRICES.enterprise,
      total: (paidSubscriptions.pro * LICENSE_PRICES.pro) + 
             (paidSubscriptions.business * LICENSE_PRICES.business) + 
             (paidSubscriptions.enterprise * LICENSE_PRICES.enterprise)
    };

    const annualRevenue = {
      pro: monthlyRevenue.pro * 12,
      business: monthlyRevenue.business * 12,
      enterprise: monthlyRevenue.enterprise * 12,
      total: monthlyRevenue.total * 12
    };

    // Statistiques des abonnements
    const totalPaidSubscriptions = paidSubscriptions.pro + paidSubscriptions.business + paidSubscriptions.enterprise;
    const totalFreeAccounts = activeOwners.filter(u => u.license === 'starter').length;

    // Valeur moyenne par client payant
    const avgRevenuePerPaidUser = totalPaidSubscriptions > 0 
      ? (monthlyRevenue.total / totalPaidSubscriptions).toFixed(2) 
      : 0;

    // Taux de conversion (gratuit vers payant)
    const conversionRate = activeOwners.length > 0 
      ? ((totalPaidSubscriptions / activeOwners.length) * 100).toFixed(1) 
      : 0;

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => !u.suspended).length,
      suspendedUsers: users.filter(u => u.suspended).length,
      ownerAccounts: users.filter(u => u.is_owner).length,
      totalContacts: contacts.length,
      licenseDistribution,
      // Nouvelles stats de revenus
      revenue: {
        monthly: monthlyRevenue,
        annual: annualRevenue,
        paidSubscriptions,
        totalPaidSubscriptions,
        totalFreeAccounts,
        avgRevenuePerPaidUser: parseFloat(avgRevenuePerPaidUser),
        conversionRate: parseFloat(conversionRate),
        prices: LICENSE_PRICES
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur stats admin:', error);
    res.status(500).json({ error: 'Erreur chargement stats' });
  }
});

// ==================== CONTENT MANAGEMENT (Homepage) ====================

// Get carousel slides (public)
app.get('/api/content/carousel', async (req, res) => {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_carousel`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'sort_order.asc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const data = await response.json();

    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch carousel:', error);
    res.status(500).json({ error: 'Erreur chargement carousel' });
  }
});

// Get news/cards (public)
app.get('/api/content/news', async (req, res) => {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_news`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'sort_order.asc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const data = await response.json();

    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch news:', error);
    res.status(500).json({ error: 'Erreur chargement actualités' });
  }
});

// Admin - Get all carousel slides
app.get('/api/admin/content/carousel', authenticateAdmin, async (req, res) => {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_carousel`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'sort_order.asc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const data = await response.json();

    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch carousel:', error);
    res.status(500).json({ error: 'Erreur chargement carousel' });
  }
});

// Admin - Create carousel slide
app.post('/api/admin/content/carousel', authenticateAdmin, async (req, res) => {
  const { icon, title, description, cta_text, cta_link, color, sort_order } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Titre et description requis' });
  }

  try {
    // Récupérer le max sort_order si non fourni
    let finalOrderIndex = sort_order;
    if (finalOrderIndex === undefined) {
      const countUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_carousel`);
      countUrl.searchParams.append('select', 'sort_order');
      countUrl.searchParams.append('order', 'sort_order.desc');
      countUrl.searchParams.append('limit', '1');
      
      const countResponse = await fetch(countUrl.toString(), { headers: supabaseHeaders });
      const maxItems = await countResponse.json();
      finalOrderIndex = maxItems.length > 0 ? maxItems[0].sort_order + 1 : 0;
    }

    const newSlide = {
      icon: icon || 'Zap',
      title,
      description,
      cta_text: cta_text || 'En savoir plus →',
      cta_link: cta_link || '/crm',
      color: color || '#64c8ff',
      sort_order: finalOrderIndex,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_carousel`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newSlide)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const created = await response.json();
    res.status(201).json(created[0] || newSlide);

  } catch (error) {
    console.error('Erreur création slide:', error);
    res.status(500).json({ error: 'Erreur création slide' });
  }
});

// Admin - Update carousel slide
app.patch('/api/admin/content/carousel/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { icon, title, description, cta_text, cta_link, color, sort_order } = req.body;

  try {
    const updatedData = { updated_at: new Date().toISOString() };
    if (icon !== undefined) updatedData.icon = icon;
    if (title !== undefined) updatedData.title = title;
    if (description !== undefined) updatedData.description = description;
    if (cta_text !== undefined) updatedData.cta_text = cta_text;
    if (cta_link !== undefined) updatedData.cta_link = cta_link;
    if (color !== undefined) updatedData.color = color;
    if (sort_order !== undefined) updatedData.sort_order = sort_order;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_carousel`);
    url.searchParams.append('id', `eq.${id}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Slide mis à jour' });

  } catch (error) {
    console.error('Erreur update slide:', error);
    res.status(500).json({ error: 'Erreur modification slide' });
  }
});

// Admin - Delete carousel slide
app.delete('/api/admin/content/carousel/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_carousel`);
    url.searchParams.append('id', `eq.${id}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: supabaseHeaders
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Slide supprimé' });

  } catch (error) {
    console.error('Erreur suppression slide:', error);
    res.status(500).json({ error: 'Erreur suppression slide' });
  }
});

// Admin - Reorder carousel slides
app.post('/api/admin/content/carousel/reorder', authenticateAdmin, async (req, res) => {
  const { items } = req.body; // Array of { id, sort_order }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items requis' });
  }

  try {
    // Update each item's sort_order
    for (const item of items) {
      const url = new URL(`${SUPABASE_URL}/rest/v1/crm_carousel`);
      url.searchParams.append('id', `eq.${item.id}`);

      await fetch(url.toString(), {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({ sort_order: item.sort_order })
      });
    }

    res.json({ message: 'Ordre mis à jour' });

  } catch (error) {
    console.error('Erreur reorder:', error);
    res.status(500).json({ error: 'Erreur réorganisation' });
  }
});

// Admin - Get all news
app.get('/api/admin/content/news', authenticateAdmin, async (req, res) => {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_news`);
    url.searchParams.append('select', '*');
    url.searchParams.append('order', 'sort_order.asc');

    const response = await fetch(url.toString(), { headers: supabaseHeaders });
    const data = await response.json();

    res.json(data || []);
  } catch (error) {
    console.error('Erreur fetch news:', error);
    res.status(500).json({ error: 'Erreur chargement actualités' });
  }
});

// Admin - Create news
app.post('/api/admin/content/news', authenticateAdmin, async (req, res) => {
  const { date, title, description, image, category, link, sort_order } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Titre et description requis' });
  }

  try {
    let finalOrderIndex = sort_order;
    if (finalOrderIndex === undefined) {
      const countUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_news`);
      countUrl.searchParams.append('select', 'sort_order');
      countUrl.searchParams.append('order', 'sort_order.desc');
      countUrl.searchParams.append('limit', '1');
      
      const countResponse = await fetch(countUrl.toString(), { headers: supabaseHeaders });
      const maxItems = await countResponse.json();
      finalOrderIndex = maxItems.length > 0 ? maxItems[0].sort_order + 1 : 0;
    }

    const newNews = {
      date: date || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      title,
      description,
      image: image || '📰',
      category: category || 'Actualité',
      link: link || '#',
      sort_order: finalOrderIndex,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_news`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(newNews)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    const created = await response.json();
    res.status(201).json(created[0] || newNews);

  } catch (error) {
    console.error('Erreur création news:', error);
    res.status(500).json({ error: 'Erreur création actualité' });
  }
});

// Admin - Update news
app.patch('/api/admin/content/news/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { date, title, description, image, category, link, sort_order } = req.body;

  try {
    const updatedData = { updated_at: new Date().toISOString() };
    if (date !== undefined) updatedData.date = date;
    if (title !== undefined) updatedData.title = title;
    if (description !== undefined) updatedData.description = description;
    if (image !== undefined) updatedData.image = image;
    if (category !== undefined) updatedData.category = category;
    if (link !== undefined) updatedData.link = link;
    if (sort_order !== undefined) updatedData.sort_order = sort_order;

    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_news`);
    url.searchParams.append('id', `eq.${id}`);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Actualité mise à jour' });

  } catch (error) {
    console.error('Erreur update news:', error);
    res.status(500).json({ error: 'Erreur modification actualité' });
  }
});

// Admin - Delete news
app.delete('/api/admin/content/news/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/crm_news`);
    url.searchParams.append('id', `eq.${id}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: supabaseHeaders
    });

    if (!response.ok) {
      throw new Error('Erreur Supabase');
    }

    res.json({ message: 'Actualité supprimée' });

  } catch (error) {
    console.error('Erreur suppression news:', error);
    res.status(500).json({ error: 'Erreur suppression actualité' });
  }
});

// Admin - Reorder news
app.post('/api/admin/content/news/reorder', authenticateAdmin, async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items requis' });
  }

  try {
    for (const item of items) {
      const url = new URL(`${SUPABASE_URL}/rest/v1/crm_news`);
      url.searchParams.append('id', `eq.${item.id}`);

      await fetch(url.toString(), {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({ sort_order: item.sort_order })
      });
    }

    res.json({ message: 'Ordre mis à jour' });

  } catch (error) {
    console.error('Erreur reorder:', error);
    res.status(500).json({ error: 'Erreur réorganisation' });
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
  console.log(`📝 Content: http://localhost:${PORT}/api/content`);
});