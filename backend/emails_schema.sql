-- =====================================================
-- SCHEMA SQL POUR LE SYSTÈME D'EMAILS CRM
-- À exécuter dans Supabase SQL Editor
-- Version compatible avec crm_contacts (id INTEGER)
-- =====================================================

-- Table des templates d'emails (créée en premier car référencée par crm_emails)
CREATE TABLE IF NOT EXISTS crm_email_templates (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'welcome', 'followup', 'reminder', 'thank_you', 'custom')),
  variables JSONB DEFAULT '[]', -- Variables disponibles dans le template (ex: {name}, {company})
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des emails envoyés
CREATE TABLE IF NOT EXISTS crm_emails (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  contact_id INTEGER REFERENCES crm_contacts(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL, -- ID de l'utilisateur qui envoie
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_id INTEGER REFERENCES crm_email_templates(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- Pour stocker des infos supplémentaires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS crm_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_sent', 'email_opened', 'contact_added', 'quote_created', 'quote_accepted', 'task_due', 'custom')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Lien vers la ressource concernée
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_crm_emails_owner ON crm_emails(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_contact ON crm_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_status ON crm_emails(status);
CREATE INDEX IF NOT EXISTS idx_crm_emails_sent_at ON crm_emails(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_email_templates_owner ON crm_email_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_templates_category ON crm_email_templates(category);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_user ON crm_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_notifications_read ON crm_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_crm_notifications_created ON crm_notifications(created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_crm_emails_updated_at ON crm_emails;
CREATE TRIGGER update_crm_emails_updated_at
  BEFORE UPDATE ON crm_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_email_templates_updated_at ON crm_email_templates;
CREATE TRIGGER update_crm_email_templates_updated_at
  BEFORE UPDATE ON crm_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertion de templates par défaut
-- Note: Utilisez votre propre owner_id (remplacez 1 par l'id de votre compte owner)
INSERT INTO crm_email_templates (owner_id, name, subject, body, category, is_default, variables) VALUES
  (
    1, -- Remplacer par votre owner_id
    'Bienvenue nouveau client',
    'Bienvenue chez {company_name} !',
    'Bonjour {contact_name},

Nous sommes ravis de vous accueillir parmi nos clients !

Notre équipe est à votre disposition pour répondre à toutes vos questions.

Cordialement,
{sender_name}',
    'welcome',
    true,
    '["contact_name", "company_name", "sender_name"]'::JSONB
  ),
  (
    1,
    'Follow-up devis',
    'Concernant votre devis {quote_number}',
    'Bonjour {contact_name},

Je reviens vers vous concernant le devis {quote_number} que nous vous avons envoyé.

Avez-vous eu l''occasion de le consulter ? Avez-vous des questions ?

Je reste à votre disposition.

Cordialement,
{sender_name}',
    'followup',
    true,
    '["contact_name", "quote_number", "sender_name"]'::JSONB
  ),
  (
    1,
    'Relance prospect',
    'Donnons vie à votre projet',
    'Bonjour {contact_name},

J''espère que vous allez bien.

Je souhaitais prendre de vos nouvelles concernant votre projet {project_name}.

Avez-vous avancé sur le sujet ? Pouvons-nous vous accompagner ?

Au plaisir d''échanger avec vous.

Cordialement,
{sender_name}',
    'reminder',
    true,
    '["contact_name", "project_name", "sender_name"]'::JSONB
  ),
  (
    1,
    'Remerciement',
    'Merci pour votre confiance',
    'Bonjour {contact_name},

Je tenais à vous remercier personnellement pour votre confiance.

C''est un plaisir de travailler avec vous.

N''hésitez pas à nous solliciter pour tout besoin futur.

Cordialement,
{sender_name}',
    'thank_you',
    true,
    '["contact_name", "sender_name"]'::JSONB
  )
ON CONFLICT DO NOTHING; -- Évite les erreurs si les templates existent déjà

-- Commentaires sur les tables
COMMENT ON TABLE crm_emails IS 'Historique des emails envoyés depuis le CRM';
COMMENT ON TABLE crm_email_templates IS 'Templates d''emails prédéfinis et personnalisés';
COMMENT ON TABLE crm_notifications IS 'Notifications in-app pour les utilisateurs';

COMMENT ON COLUMN crm_emails.status IS 'Statut de l''email : sent, delivered, opened, failed';
COMMENT ON COLUMN crm_emails.metadata IS 'Données supplémentaires (tracking, erreurs, etc.)';
COMMENT ON COLUMN crm_email_templates.variables IS 'Liste des variables utilisables dans le template';
