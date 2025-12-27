-- =====================================================
-- CRÉATION COMPLÈTE DU SCHÉMA CRM
-- Toutes les colonnes id et owner_id sont en INTEGER (int4)
-- =====================================================

-- =====================================================
-- TABLE: crm_admins
-- =====================================================

CREATE TABLE crm_admins (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_admins_email ON crm_admins(email);

-- =====================================================
-- TABLE: crm_carousel
-- =====================================================

CREATE TABLE crm_carousel (
  id SERIAL PRIMARY KEY,
  icon TEXT DEFAULT 'Zap',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_text TEXT DEFAULT 'En savoir plus →',
  cta_link TEXT DEFAULT '/crm',
  color TEXT DEFAULT '#64c8ff',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_carousel_sort ON crm_carousel(sort_order);

-- =====================================================
-- TABLE: crm_news
-- =====================================================

CREATE TABLE crm_news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT,
  image TEXT DEFAULT '📰',
  category TEXT DEFAULT 'Actualité',
  link TEXT DEFAULT '#',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_news_sort ON crm_news(sort_order);

-- =====================================================
-- TABLE: crm_users
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

CREATE INDEX idx_crm_users_email ON crm_users(email);
CREATE INDEX idx_crm_users_owner ON crm_users(owner_id);
CREATE INDEX idx_crm_users_active ON crm_users(is_active);
CREATE INDEX idx_crm_users_suspended ON crm_users(suspended);

-- =====================================================
-- TABLE: crm_contacts
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

CREATE INDEX idx_crm_contacts_owner ON crm_contacts(owner_id);
CREATE INDEX idx_crm_contacts_created_by ON crm_contacts(created_by);
CREATE INDEX idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX idx_crm_contacts_status ON crm_contacts(status);
CREATE INDEX idx_crm_contacts_created_at ON crm_contacts(created_at DESC);

-- =====================================================
-- TABLE: crm_interactions
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

CREATE INDEX idx_crm_interactions_owner ON crm_interactions(owner_id);
CREATE INDEX idx_crm_interactions_contact ON crm_interactions(contact_id);
CREATE INDEX idx_crm_interactions_created_by ON crm_interactions(created_by);
CREATE INDEX idx_crm_interactions_date ON crm_interactions(interaction_date DESC);
CREATE INDEX idx_crm_interactions_type ON crm_interactions(interaction_type);

-- =====================================================
-- TABLE: crm_quotes
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

CREATE INDEX idx_crm_quotes_owner ON crm_quotes(owner_id);
CREATE INDEX idx_crm_quotes_created_by ON crm_quotes(created_by);
CREATE INDEX idx_crm_quotes_contact ON crm_quotes(contact_id);
CREATE INDEX idx_crm_quotes_number ON crm_quotes(quote_number);
CREATE INDEX idx_crm_quotes_status ON crm_quotes(status);
CREATE INDEX idx_crm_quotes_created_at ON crm_quotes(created_at DESC);

-- =====================================================
-- TABLE: crm_email_templates
-- =====================================================

CREATE TABLE crm_email_templates (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES crm_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'welcome', 'followup', 'reminder', 'thank_you', 'custom')),
  variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_email_templates_owner ON crm_email_templates(owner_id);
CREATE INDEX idx_crm_email_templates_category ON crm_email_templates(category);
CREATE INDEX idx_crm_email_templates_default ON crm_email_templates(is_default);

-- =====================================================
-- TABLE: crm_emails
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
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'failed', 'pending_retry')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_emails_owner ON crm_emails(owner_id);
CREATE INDEX idx_crm_emails_contact ON crm_emails(contact_id);
CREATE INDEX idx_crm_emails_sender ON crm_emails(sender_id);
CREATE INDEX idx_crm_emails_template ON crm_emails(template_id);
CREATE INDEX idx_crm_emails_status ON crm_emails(status);
CREATE INDEX idx_crm_emails_sent_at ON crm_emails(sent_at DESC);
CREATE INDEX idx_crm_emails_retry ON crm_emails(next_retry_at) WHERE status = 'pending_retry';

-- =====================================================
-- TABLE: crm_notifications
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

CREATE INDEX idx_crm_notifications_user ON crm_notifications(user_id);
CREATE INDEX idx_crm_notifications_owner ON crm_notifications(owner_id);
CREATE INDEX idx_crm_notifications_type ON crm_notifications(type);
CREATE INDEX idx_crm_notifications_read ON crm_notifications(is_read);
CREATE INDEX idx_crm_notifications_created_at ON crm_notifications(created_at DESC);

-- =====================================================
-- TABLE: crm_settings (Configuration système)
-- =====================================================

CREATE TABLE crm_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_settings_key ON crm_settings(key);
CREATE INDEX idx_crm_settings_category ON crm_settings(category);

-- Insérer les paramètres par défaut
INSERT INTO crm_settings (key, value, description, category) VALUES
('email_retry_interval_minutes', '15', 'Intervalle en minutes entre chaque tentative de renvoi d''email', 'email'),
('email_max_retries', '3', 'Nombre maximum de tentatives de renvoi d''email', 'email'),
('smtp_enabled', 'false', 'Activer l''envoi SMTP d''emails', 'email');

-- =====================================================
-- TRIGGERS: Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour crm_admins
CREATE TRIGGER update_crm_admins_updated_at
  BEFORE UPDATE ON crm_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour crm_carousel
CREATE TRIGGER update_crm_carousel_updated_at
  BEFORE UPDATE ON crm_carousel
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour crm_news
CREATE TRIGGER update_crm_news_updated_at
  BEFORE UPDATE ON crm_news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour crm_users
CREATE TRIGGER update_crm_users_updated_at
  BEFORE UPDATE ON crm_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour crm_contacts
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour crm_quotes
CREATE TRIGGER update_crm_quotes_updated_at
  BEFORE UPDATE ON crm_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour crm_email_templates
CREATE TRIGGER update_crm_email_templates_updated_at
  BEFORE UPDATE ON crm_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour crm_emails
CREATE TRIGGER update_crm_emails_updated_at
  BEFORE UPDATE ON crm_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Lister toutes les tables créées
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'crm_%'
ORDER BY table_name;

-- Vérifier les types de colonnes id et owner_id
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'crm_%'
  AND (column_name = 'id' OR column_name LIKE '%_id')
ORDER BY table_name, column_name;

-- Message de confirmation
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'crm_%';

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCHÉMA CRM CRÉÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Nombre de tables créées: %', table_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées:';
  RAISE NOTICE '- crm_admins';
  RAISE NOTICE '- crm_carousel';
  RAISE NOTICE '- crm_news';
  RAISE NOTICE '- crm_users';
  RAISE NOTICE '- crm_contacts';
  RAISE NOTICE '- crm_interactions';
  RAISE NOTICE '- crm_quotes';
  RAISE NOTICE '- crm_email_templates';
  RAISE NOTICE '- crm_emails';
  RAISE NOTICE '- crm_notifications';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Toutes les colonnes id et owner_id sont en INTEGER';
  RAISE NOTICE '✅ Toutes les contraintes de clé étrangère sont créées';
  RAISE NOTICE '✅ Tous les index sont créés';
  RAISE NOTICE '✅ Tous les triggers sont créés';
  RAISE NOTICE '========================================';
END $$;
