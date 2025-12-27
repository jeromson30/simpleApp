-- =====================================================
-- MIGRATION: Convertir crm_users id et owner_id de TEXT à INTEGER
-- ⚠️ IMPORTANT: Sauvegardez vos données avant d'exécuter ce script!
-- =====================================================

-- Étape 1: Créer une table temporaire avec le nouveau schéma INTEGER
CREATE TABLE crm_users_new (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_owner BOOLEAN DEFAULT FALSE,
  owner_id INTEGER REFERENCES crm_users_new(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Étape 2: Créer une table de mapping (ancien TEXT id -> nouveau INTEGER id)
CREATE TEMP TABLE user_id_mapping (
  old_id TEXT,
  new_id INTEGER
);

-- Étape 3: Insérer d'abord tous les owners (ceux qui n'ont pas de owner_id)
-- pour qu'ils existent avant de référencer
INSERT INTO crm_users_new (email, password_hash, is_owner, owner_id, is_active, created_at, updated_at)
SELECT email, password_hash, is_owner, NULL, is_active, created_at, updated_at
FROM crm_users
WHERE owner_id IS NULL OR owner_id = ''
RETURNING id, email;

-- Stocker le mapping pour les owners
INSERT INTO user_id_mapping (old_id, new_id)
SELECT u.id, un.id
FROM crm_users u
JOIN crm_users_new un ON u.email = un.email
WHERE u.owner_id IS NULL OR u.owner_id = '';

-- Étape 4: Insérer les sub-accounts (ceux qui ont un owner_id)
INSERT INTO crm_users_new (email, password_hash, is_owner, owner_id, is_active, created_at, updated_at)
SELECT
  u.email,
  u.password_hash,
  u.is_owner,
  m.new_id, -- Utiliser le nouveau ID du owner
  u.is_active,
  u.created_at,
  u.updated_at
FROM crm_users u
LEFT JOIN user_id_mapping m ON u.owner_id = m.old_id
WHERE u.owner_id IS NOT NULL AND u.owner_id != '';

-- Stocker le mapping pour les sub-accounts
INSERT INTO user_id_mapping (old_id, new_id)
SELECT u.id, un.id
FROM crm_users u
JOIN crm_users_new un ON u.email = un.email
WHERE u.owner_id IS NOT NULL AND u.owner_id != '';

-- Étape 5: Mettre à jour toutes les tables dépendantes
-- ⚠️ AJUSTEZ cette liste selon vos tables existantes

-- Mettre à jour crm_contacts
UPDATE crm_contacts c
SET
  owner_id = m.new_id,
  created_by = m2.new_id
FROM user_id_mapping m
LEFT JOIN user_id_mapping m2 ON c.created_by::text = m2.old_id
WHERE c.owner_id::text = m.old_id;

-- Mettre à jour crm_interactions
UPDATE crm_interactions i
SET owner_id = m.new_id
FROM user_id_mapping m
WHERE i.owner_id::text = m.old_id;

-- Mettre à jour crm_quotes
UPDATE crm_quotes q
SET
  owner_id = m.new_id,
  created_by = m2.new_id
FROM user_id_mapping m
LEFT JOIN user_id_mapping m2 ON q.created_by::text = m2.old_id
WHERE q.owner_id::text = m.old_id;

-- Mettre à jour crm_emails (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_emails') THEN
    EXECUTE '
      UPDATE crm_emails e
      SET
        owner_id = m.new_id,
        sender_id = m2.new_id
      FROM user_id_mapping m
      LEFT JOIN user_id_mapping m2 ON e.sender_id::text = m2.old_id
      WHERE e.owner_id::text = m.old_id
    ';
  END IF;
END $$;

-- Mettre à jour crm_email_templates (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_email_templates') THEN
    EXECUTE '
      UPDATE crm_email_templates t
      SET owner_id = m.new_id
      FROM user_id_mapping m
      WHERE t.owner_id::text = m.old_id
    ';
  END IF;
END $$;

-- Mettre à jour crm_notifications (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_notifications') THEN
    EXECUTE '
      UPDATE crm_notifications n
      SET
        user_id = m.new_id,
        owner_id = m2.new_id
      FROM user_id_mapping m
      LEFT JOIN user_id_mapping m2 ON n.owner_id::text = m2.old_id
      WHERE n.user_id::text = m.old_id
    ';
  END IF;
END $$;

-- Mettre à jour crm_companies (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_companies') THEN
    EXECUTE '
      UPDATE crm_companies c
      SET owner_id = m.new_id
      FROM user_id_mapping m
      WHERE c.owner_id::text = m.old_id
    ';
  END IF;
END $$;

-- Étape 6: Supprimer l'ancienne table crm_users
DROP TABLE IF EXISTS crm_users CASCADE;

-- Étape 7: Renommer la nouvelle table
ALTER TABLE crm_users_new RENAME TO crm_users;

-- Étape 8: Recréer les index
CREATE INDEX IF NOT EXISTS idx_crm_users_email ON crm_users(email);
CREATE INDEX IF NOT EXISTS idx_crm_users_owner ON crm_users(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_users_active ON crm_users(is_active);

-- Étape 9: Recréer la fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Étape 10: Recréer le trigger
DROP TRIGGER IF EXISTS update_crm_users_updated_at ON crm_users;
CREATE TRIGGER update_crm_users_updated_at
  BEFORE UPDATE ON crm_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Étape 11: Vérification finale
DO $$
DECLARE
  user_count INTEGER;
  owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM crm_users;
  SELECT COUNT(*) INTO owner_count FROM crm_users WHERE is_owner = TRUE;

  RAISE NOTICE '✅ Migration terminée!';
  RAISE NOTICE 'Total utilisateurs: %', user_count;
  RAISE NOTICE 'Total owners: %', owner_count;
  RAISE NOTICE 'Total sub-accounts: %', user_count - owner_count;
END $$;

-- Afficher les nouveaux IDs pour vérification
SELECT
  id as new_id,
  email,
  is_owner,
  owner_id,
  is_active
FROM crm_users
ORDER BY is_owner DESC, id;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- NOTES IMPORTANTES:
-- 1. Ce script crée de NOUVEAUX IDs séquentiels (1, 2, 3, etc.)
-- 2. Les anciens IDs (emails) sont complètement remplacés
-- 3. Tous les tokens JWT existants seront INVALIDES après cette migration
-- 4. Les utilisateurs devront se RECONNECTER après la migration
-- 5. Testez d'abord sur une copie de la base de données!
