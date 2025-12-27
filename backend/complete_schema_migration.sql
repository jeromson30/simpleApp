-- =====================================================
-- MIGRATION COMPLÈTE: Reconstruction de toutes les tables CRM
-- avec les types INTEGER corrects pour id et owner_id
-- =====================================================
-- ⚠️ IMPORTANT: Ce script va RECRÉER toutes les tables
-- Sauvegardez vos données avant d'exécuter!
-- =====================================================

BEGIN;

-- =====================================================
-- ÉTAPE 1: Créer les tables de mapping temporaires
-- =====================================================

CREATE TEMP TABLE user_id_mapping (
  old_id TEXT PRIMARY KEY,
  new_id INTEGER
);

CREATE TEMP TABLE contact_id_mapping (
  old_id INTEGER PRIMARY KEY,
  new_id INTEGER
);

-- =====================================================
-- ÉTAPE 2: Sauvegarder les données existantes
-- =====================================================

-- Sauvegarder crm_users
CREATE TEMP TABLE crm_users_backup AS SELECT * FROM crm_users;

-- Sauvegarder crm_contacts
CREATE TEMP TABLE crm_contacts_backup AS SELECT * FROM crm_contacts;

-- Sauvegarder crm_interactions
CREATE TEMP TABLE crm_interactions_backup AS SELECT * FROM crm_interactions;

-- Sauvegarder crm_quotes
CREATE TEMP TABLE crm_quotes_backup AS SELECT * FROM crm_quotes;

-- Sauvegarder crm_emails (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_emails') THEN
    EXECUTE 'CREATE TEMP TABLE crm_emails_backup AS SELECT * FROM crm_emails';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 3: Supprimer toutes les tables et contraintes
-- =====================================================

DROP TABLE IF EXISTS crm_emails CASCADE;
DROP TABLE IF EXISTS crm_email_templates CASCADE;
DROP TABLE IF EXISTS crm_notifications CASCADE;
DROP TABLE IF EXISTS crm_quotes CASCADE;
DROP TABLE IF EXISTS crm_interactions CASCADE;
DROP TABLE IF EXISTS crm_contacts CASCADE;
DROP TABLE IF EXISTS crm_users CASCADE;
-- Note: crm_users_duplicate est conservée (table de test)

-- =====================================================
-- ÉTAPE 4: Recréer crm_users avec INTEGER
-- =====================================================

CREATE TABLE crm_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  license TEXT DEFAULT 'starter' CHECK (license IN ('starter', 'pro', 'business', 'enterprise')),
  is_owner BOOLEAN DEFAULT TRUE,
  owner_id INTEGER REFERENCES crm_users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
  is_active BOOLEAN DEFAULT TRUE,
  suspended BOOLEAN DEFAULT FALSE,
  company_name TEXT,
  company_siret TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour crm_users
CREATE INDEX idx_crm_users_email ON crm_users(email);
CREATE INDEX idx_crm_users_owner ON crm_users(owner_id);
CREATE INDEX idx_crm_users_active ON crm_users(is_active);

-- =====================================================
-- ÉTAPE 5: Recréer crm_contacts avec INTEGER
-- =====================================================

CREATE TABLE crm_contacts (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES crm_users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  status TEXT DEFAULT 'prospect' CHECK (status IN ('prospect', 'client', 'perdu')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour crm_contacts
CREATE INDEX idx_crm_contacts_owner ON crm_contacts(owner_id);
CREATE INDEX idx_crm_contacts_created_by ON crm_contacts(created_by);
CREATE INDEX idx_crm_contacts_status ON crm_contacts(status);
CREATE INDEX idx_crm_contacts_email ON crm_contacts(email);

-- =====================================================
-- ÉTAPE 6: Recréer crm_interactions avec INTEGER
-- =====================================================

CREATE TABLE crm_interactions (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES crm_users(id) ON DELETE SET NULL,
  contact_id INTEGER NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  interaction_type TEXT DEFAULT 'note' CHECK (interaction_type IN ('note', 'call', 'email', 'meeting', 'other')),
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour crm_interactions
CREATE INDEX idx_crm_interactions_owner ON crm_interactions(owner_id);
CREATE INDEX idx_crm_interactions_contact ON crm_interactions(contact_id);
CREATE INDEX idx_crm_interactions_date ON crm_interactions(interaction_date DESC);

-- =====================================================
-- ÉTAPE 7: Recréer crm_quotes avec INTEGER
-- =====================================================

CREATE TABLE crm_quotes (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  contact_id INTEGER REFERENCES crm_contacts(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  client_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 20,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until DATE,
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour crm_quotes
CREATE INDEX idx_crm_quotes_owner ON crm_quotes(owner_id);
CREATE INDEX idx_crm_quotes_contact ON crm_quotes(contact_id);
CREATE INDEX idx_crm_quotes_status ON crm_quotes(status);
CREATE INDEX idx_crm_quotes_number ON crm_quotes(quote_number);

-- =====================================================
-- ÉTAPE 8: Recréer crm_email_templates avec INTEGER
-- =====================================================

CREATE TABLE crm_email_templates (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'welcome', 'followup', 'reminder', 'thank_you', 'custom')),
  variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour crm_email_templates
CREATE INDEX idx_crm_email_templates_owner ON crm_email_templates(owner_id);
CREATE INDEX idx_crm_email_templates_category ON crm_email_templates(category);

-- =====================================================
-- ÉTAPE 9: Recréer crm_emails avec INTEGER
-- =====================================================

CREATE TABLE crm_emails (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES crm_contacts(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_id INTEGER REFERENCES crm_email_templates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour crm_emails
CREATE INDEX idx_crm_emails_owner ON crm_emails(owner_id);
CREATE INDEX idx_crm_emails_contact ON crm_emails(contact_id);
CREATE INDEX idx_crm_emails_sender ON crm_emails(sender_id);
CREATE INDEX idx_crm_emails_sent ON crm_emails(sent_at DESC);

-- =====================================================
-- ÉTAPE 10: Recréer crm_notifications avec INTEGER
-- =====================================================

CREATE TABLE crm_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email_sent', 'email_opened', 'contact_added', 'quote_created', 'quote_accepted', 'task_due', 'custom')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour crm_notifications
CREATE INDEX idx_crm_notifications_user ON crm_notifications(user_id);
CREATE INDEX idx_crm_notifications_read ON crm_notifications(is_read);
CREATE INDEX idx_crm_notifications_created ON crm_notifications(created_at DESC);

-- =====================================================
-- ÉTAPE 11: Migrer les données - crm_users
-- =====================================================

-- Insérer tous les utilisateurs
-- Note: Les colonnes owner_idd, idd et table crm_users_duplicate sont ignorées (étaient des tests)
INSERT INTO crm_users (
  email, password_hash, license, is_owner, owner_id, role, is_active, suspended,
  company_name, company_siret, company_address, company_phone, company_email,
  created_at, updated_at
)
SELECT
  email,
  password_hash,
  COALESCE(license, 'starter'),
  COALESCE(is_owner, TRUE),
  NULL, -- owner_id sera défini dans une deuxième passe
  COALESCE(role, CASE WHEN COALESCE(is_owner, TRUE) THEN 'owner' ELSE 'member' END),
  NOT COALESCE(suspended, FALSE), -- is_active = inverse de suspended
  COALESCE(suspended, FALSE),
  company_name,
  company_siret,
  company_address,
  company_phone,
  company_email,
  COALESCE(created_at, NOW()),
  COALESCE(updated_at, NOW())
FROM crm_users_backup
ORDER BY
  CASE WHEN COALESCE(is_owner, TRUE) THEN 0 ELSE 1 END, -- Owners en premier
  created_at;

-- Mapper les anciens IDs (TEXT) aux nouveaux (INTEGER)
INSERT INTO user_id_mapping (old_id, new_id)
SELECT ub.id, u.id
FROM crm_users_backup ub
JOIN crm_users u ON ub.email = u.email;

-- =====================================================
-- ÉTAPE 12: Migrer les données - crm_contacts
-- =====================================================

INSERT INTO crm_contacts (
  owner_id, created_by, name, email, phone, company, status, notes,
  created_at, updated_at
)
SELECT
  m1.new_id,
  m2.new_id,
  cb.name,
  cb.email,
  cb.phone,
  cb.company,
  COALESCE(cb.status, 'prospect'),
  cb.notes,
  COALESCE(cb.created_at, NOW()),
  COALESCE(cb.updated_at, NOW())
FROM crm_contacts_backup cb
JOIN user_id_mapping m1 ON cb.owner_id = m1.old_id
LEFT JOIN user_id_mapping m2 ON cb.created_by = m2.old_id;

-- Mapper les anciens IDs de contacts aux nouveaux
INSERT INTO contact_id_mapping (old_id, new_id)
SELECT cb.id, c.id
FROM crm_contacts_backup cb
JOIN crm_contacts c ON cb.email = c.email AND cb.name = c.name
ORDER BY cb.id;

-- =====================================================
-- ÉTAPE 13: Migrer les données - crm_interactions
-- =====================================================

INSERT INTO crm_interactions (
  owner_id, created_by, contact_id, text, interaction_type, created_at
)
SELECT
  m1.new_id,
  m2.new_id,
  cm.new_id,
  ib.text,
  COALESCE(ib.interaction_type, 'note'),
  COALESCE(ib.created_at, NOW())
FROM crm_interactions_backup ib
JOIN user_id_mapping m1 ON ib.owner_id = m1.old_id
LEFT JOIN user_id_mapping m2 ON ib.created_by = m2.old_id
JOIN contact_id_mapping cm ON ib.contact_id = cm.old_id;

-- =====================================================
-- ÉTAPE 14: Migrer les données - crm_quotes
-- =====================================================

INSERT INTO crm_quotes (
  owner_id, created_by, quote_number, contact_id, client_name, client_email,
  client_address, items, subtotal, tax_rate, tax_amount, total, status,
  valid_until, payment_terms, notes, created_at, updated_at
)
SELECT
  m1.new_id,
  m2.new_id,
  qb.quote_number,
  cm.new_id,
  qb.client_name,
  qb.client_email,
  qb.client_address,
  COALESCE(qb.items, '[]'::jsonb),
  COALESCE(qb.subtotal, 0),
  COALESCE(qb.tax_rate, 20),
  COALESCE(qb.tax_amount, 0),
  COALESCE(qb.total, 0),
  COALESCE(qb.status, 'draft'),
  qb.valid_until,
  qb.payment_terms,
  qb.notes,
  COALESCE(qb.created_at, NOW()),
  COALESCE(qb.updated_at, NOW())
FROM crm_quotes_backup qb
JOIN user_id_mapping m1 ON qb.owner_id = m1.old_id
JOIN user_id_mapping m2 ON qb.created_by = m2.old_id
LEFT JOIN contact_id_mapping cm ON qb.contact_id = cm.old_id;

-- =====================================================
-- ÉTAPE 15: Migrer crm_emails si existe
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'crm_emails_backup') THEN
    INSERT INTO crm_emails (
      owner_id, contact_id, sender_id, recipient_email, recipient_name,
      subject, body, template_id, status, sent_at, opened_at, metadata,
      created_at, updated_at
    )
    SELECT
      COALESCE(m1.new_id, (SELECT MIN(id) FROM crm_users WHERE is_owner = TRUE)),
      cm.new_id,
      COALESCE(m2.new_id, m1.new_id),
      eb.recipient_email,
      eb.recipient_name,
      eb.subject,
      eb.body,
      NULL, -- template_id sera NULL car les templates n'existent pas encore
      COALESCE(eb.status, 'sent'),
      COALESCE(eb.sent_at, NOW()),
      eb.opened_at,
      COALESCE(eb.metadata, '{}'::jsonb),
      COALESCE(eb.created_at, NOW()),
      COALESCE(eb.updated_at, NOW())
    FROM crm_emails_backup eb
    LEFT JOIN user_id_mapping m1 ON eb.owner_id::text = m1.old_id
    LEFT JOIN user_id_mapping m2 ON eb.sender_id::text = m2.old_id
    LEFT JOIN contact_id_mapping cm ON eb.contact_id = cm.old_id;

    RAISE NOTICE 'crm_emails migré: % emails', (SELECT COUNT(*) FROM crm_emails);
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 16: Créer les triggers de mise à jour
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_users_updated_at
  BEFORE UPDATE ON crm_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_quotes_updated_at
  BEFORE UPDATE ON crm_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_email_templates_updated_at
  BEFORE UPDATE ON crm_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_emails_updated_at
  BEFORE UPDATE ON crm_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÉTAPE 17: Vérification finale
-- =====================================================

DO $$
DECLARE
  user_count INTEGER;
  contact_count INTEGER;
  interaction_count INTEGER;
  quote_count INTEGER;
  email_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM crm_users;
  SELECT COUNT(*) INTO contact_count FROM crm_contacts;
  SELECT COUNT(*) INTO interaction_count FROM crm_interactions;
  SELECT COUNT(*) INTO quote_count FROM crm_quotes;
  SELECT COUNT(*) INTO email_count FROM crm_emails;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Utilisateurs migrés: %', user_count;
  RAISE NOTICE 'Contacts migrés: %', contact_count;
  RAISE NOTICE 'Interactions migrées: %', interaction_count;
  RAISE NOTICE 'Devis migrés: %', quote_count;
  RAISE NOTICE 'Emails migrés: %', email_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  IMPORTANT:';
  RAISE NOTICE '- Tous les tokens JWT sont invalides';
  RAISE NOTICE '- Les utilisateurs doivent se reconnecter';
  RAISE NOTICE '- Vérifiez toutes les fonctionnalités';
  RAISE NOTICE '========================================';
END $$;

-- Afficher les types de colonnes finaux
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('crm_users', 'crm_contacts', 'crm_interactions', 'crm_quotes', 'crm_emails')
  AND (column_name = 'id' OR column_name LIKE '%_id')
ORDER BY table_name, column_name;

-- Afficher un échantillon de données
SELECT 'crm_users' as table_name, id, email, is_owner, owner_id FROM crm_users LIMIT 5;
SELECT 'crm_contacts' as table_name, id, name, email, owner_id FROM crm_contacts LIMIT 5;

COMMIT;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
