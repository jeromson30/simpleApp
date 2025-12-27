-- =====================================================
-- CORRECTION COMPLÈTE: Convertir toutes les colonnes ID en INTEGER
-- Ce script corrige crm_users ET toutes les tables dépendantes
-- ⚠️ IMPORTANT: Sauvegardez vos données avant d'exécuter!
-- =====================================================

-- =====================================================
-- PARTIE 1: Vérifier les types actuels
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== TYPES DE COLONNES ACTUELS ===';
END $$;

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('crm_users', 'crm_contacts', 'crm_interactions', 'crm_quotes', 'crm_emails', 'crm_email_templates', 'crm_notifications', 'crm_companies')
  AND (column_name = 'id' OR column_name LIKE '%_id')
ORDER BY table_name, column_name;

-- =====================================================
-- PARTIE 2: Modifier les colonnes dans l'ordre (dépendances)
-- =====================================================

-- D'abord, supprimer temporairement les contraintes de clé étrangère
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  RAISE NOTICE '=== SUPPRESSION DES CONTRAINTES DE CLÉ ÉTRANGÈRE ===';

  FOR constraint_rec IN
    SELECT
      tc.table_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name LIKE 'crm_%'
  LOOP
    EXECUTE 'ALTER TABLE ' || constraint_rec.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_rec.constraint_name || ' CASCADE';
    RAISE NOTICE 'Supprimé: %.%', constraint_rec.table_name, constraint_rec.constraint_name;
  END LOOP;
END $$;

-- =====================================================
-- PARTIE 3: Convertir crm_users en premier
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== CONVERSION DE crm_users ===';

  -- Créer table temporaire
  CREATE TEMP TABLE user_id_mapping (
    old_id TEXT PRIMARY KEY,
    new_id INTEGER
  );

  -- Créer nouvelle table users avec INTEGER
  DROP TABLE IF EXISTS crm_users_new CASCADE;
  CREATE TABLE crm_users_new (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_owner BOOLEAN DEFAULT FALSE,
    owner_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Insérer les owners d'abord
  INSERT INTO crm_users_new (email, password_hash, is_owner, owner_id, is_active, created_at, updated_at)
  SELECT email, password_hash, is_owner, NULL, is_active, created_at, updated_at
  FROM crm_users
  WHERE owner_id IS NULL OR owner_id = '' OR owner_id = id;

  -- Mapper les IDs des owners
  INSERT INTO user_id_mapping (old_id, new_id)
  SELECT u.id, un.id
  FROM crm_users u
  JOIN crm_users_new un ON u.email = un.email
  WHERE u.owner_id IS NULL OR u.owner_id = '' OR u.owner_id = u.id;

  -- Insérer les sub-accounts
  INSERT INTO crm_users_new (email, password_hash, is_owner, owner_id, is_active, created_at, updated_at)
  SELECT
    u.email,
    u.password_hash,
    u.is_owner,
    m.new_id,
    u.is_active,
    u.created_at,
    u.updated_at
  FROM crm_users u
  LEFT JOIN user_id_mapping m ON u.owner_id = m.old_id
  WHERE u.owner_id IS NOT NULL AND u.owner_id != '' AND u.owner_id != u.id;

  -- Mapper les IDs des sub-accounts
  INSERT INTO user_id_mapping (old_id, new_id)
  SELECT u.id, un.id
  FROM crm_users u
  JOIN crm_users_new un ON u.email = un.email
  WHERE u.owner_id IS NOT NULL AND u.owner_id != '' AND u.owner_id != u.id;

  -- Ajouter la contrainte owner_id après l'insertion
  ALTER TABLE crm_users_new ADD CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES crm_users_new(id) ON DELETE CASCADE;

  RAISE NOTICE 'crm_users converti: % utilisateurs', (SELECT COUNT(*) FROM crm_users_new);
END $$;

-- =====================================================
-- PARTIE 4: Convertir les tables dépendantes
-- =====================================================

-- crm_contacts
DO $$
BEGIN
  RAISE NOTICE '=== CONVERSION DE crm_contacts ===';

  -- Vérifier si la colonne id est TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_contacts' AND column_name = 'id' AND data_type = 'text'
  ) THEN
    -- Ajouter nouvelle colonne id_new
    ALTER TABLE crm_contacts ADD COLUMN id_new SERIAL;

    -- Créer table de mapping contacts
    CREATE TEMP TABLE contact_id_mapping (
      old_id TEXT PRIMARY KEY,
      new_id INTEGER
    );

    INSERT INTO contact_id_mapping (old_id, new_id)
    SELECT id::text, id_new FROM crm_contacts;

    -- Renommer les colonnes
    ALTER TABLE crm_contacts DROP COLUMN id CASCADE;
    ALTER TABLE crm_contacts RENAME COLUMN id_new TO id;
    ALTER TABLE crm_contacts ADD PRIMARY KEY (id);

    RAISE NOTICE 'Colonne id de crm_contacts convertie en INTEGER';
  END IF;

  -- Convertir owner_id et created_by
  ALTER TABLE crm_contacts ALTER COLUMN owner_id TYPE INTEGER USING (
    SELECT new_id FROM user_id_mapping WHERE old_id = owner_id::text
  );

  ALTER TABLE crm_contacts ALTER COLUMN created_by TYPE INTEGER USING (
    SELECT new_id FROM user_id_mapping WHERE old_id = created_by::text
  );

  RAISE NOTICE 'crm_contacts converti: % contacts', (SELECT COUNT(*) FROM crm_contacts);
END $$;

-- crm_interactions
DO $$
BEGIN
  RAISE NOTICE '=== CONVERSION DE crm_interactions ===';

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_interactions' AND column_name = 'id' AND data_type = 'text'
  ) THEN
    ALTER TABLE crm_interactions ADD COLUMN id_new SERIAL;
    ALTER TABLE crm_interactions DROP COLUMN id CASCADE;
    ALTER TABLE crm_interactions RENAME COLUMN id_new TO id;
    ALTER TABLE crm_interactions ADD PRIMARY KEY (id);
  END IF;

  ALTER TABLE crm_interactions ALTER COLUMN owner_id TYPE INTEGER USING (
    SELECT new_id FROM user_id_mapping WHERE old_id = owner_id::text
  );

  ALTER TABLE crm_interactions ALTER COLUMN contact_id TYPE INTEGER USING (
    SELECT new_id FROM contact_id_mapping WHERE old_id = contact_id::text
  );

  RAISE NOTICE 'crm_interactions converti';
END $$;

-- crm_quotes
DO $$
BEGIN
  RAISE NOTICE '=== CONVERSION DE crm_quotes ===';

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_quotes' AND column_name = 'id' AND data_type = 'text'
  ) THEN
    ALTER TABLE crm_quotes ADD COLUMN id_new SERIAL;
    ALTER TABLE crm_quotes DROP COLUMN id CASCADE;
    ALTER TABLE crm_quotes RENAME COLUMN id_new TO id;
    ALTER TABLE crm_quotes ADD PRIMARY KEY (id);
  END IF;

  ALTER TABLE crm_quotes ALTER COLUMN owner_id TYPE INTEGER USING (
    SELECT new_id FROM user_id_mapping WHERE old_id = owner_id::text
  );

  ALTER TABLE crm_quotes ALTER COLUMN contact_id TYPE INTEGER USING (
    SELECT new_id FROM contact_id_mapping WHERE old_id = contact_id::text
  );

  ALTER TABLE crm_quotes ALTER COLUMN created_by TYPE INTEGER USING (
    SELECT new_id FROM user_id_mapping WHERE old_id = created_by::text
  );

  RAISE NOTICE 'crm_quotes converti';
END $$;

-- crm_emails
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_emails') THEN
    RAISE NOTICE '=== CONVERSION DE crm_emails ===';

    ALTER TABLE crm_emails ALTER COLUMN owner_id TYPE INTEGER USING (
      SELECT new_id FROM user_id_mapping WHERE old_id = owner_id::text
    );

    ALTER TABLE crm_emails ALTER COLUMN sender_id TYPE INTEGER USING (
      SELECT new_id FROM user_id_mapping WHERE old_id = sender_id::text
    );

    ALTER TABLE crm_emails ALTER COLUMN contact_id TYPE INTEGER USING (
      SELECT new_id FROM contact_id_mapping WHERE old_id = contact_id::text
    );

    RAISE NOTICE 'crm_emails converti';
  END IF;
END $$;

-- crm_email_templates
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_email_templates') THEN
    RAISE NOTICE '=== CONVERSION DE crm_email_templates ===';

    ALTER TABLE crm_email_templates ALTER COLUMN owner_id TYPE INTEGER USING (
      SELECT new_id FROM user_id_mapping WHERE old_id = owner_id::text
    );

    RAISE NOTICE 'crm_email_templates converti';
  END IF;
END $$;

-- crm_notifications
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_notifications') THEN
    RAISE NOTICE '=== CONVERSION DE crm_notifications ===';

    ALTER TABLE crm_notifications ALTER COLUMN user_id TYPE INTEGER USING (
      SELECT new_id FROM user_id_mapping WHERE old_id = user_id::text
    );

    ALTER TABLE crm_notifications ALTER COLUMN owner_id TYPE INTEGER USING (
      SELECT new_id FROM user_id_mapping WHERE old_id = owner_id::text
    );

    RAISE NOTICE 'crm_notifications converti';
  END IF;
END $$;

-- crm_companies
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_companies') THEN
    RAISE NOTICE '=== CONVERSION DE crm_companies ===';

    ALTER TABLE crm_companies ALTER COLUMN owner_id TYPE INTEGER USING (
      SELECT new_id FROM user_id_mapping WHERE old_id = owner_id::text
    );

    RAISE NOTICE 'crm_companies converti';
  END IF;
END $$;

-- =====================================================
-- PARTIE 5: Remplacer l'ancienne table users
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== REMPLACEMENT DE crm_users ===';

  DROP TABLE IF EXISTS crm_users CASCADE;
  ALTER TABLE crm_users_new RENAME TO crm_users;

  RAISE NOTICE 'Table crm_users remplacée';
END $$;

-- =====================================================
-- PARTIE 6: Recréer toutes les contraintes
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== RECRÉATION DES CONTRAINTES ===';

  -- crm_contacts
  ALTER TABLE crm_contacts
    ADD CONSTRAINT fk_contacts_owner FOREIGN KEY (owner_id) REFERENCES crm_users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_contacts_creator FOREIGN KEY (created_by) REFERENCES crm_users(id) ON DELETE SET NULL;

  -- crm_interactions
  ALTER TABLE crm_interactions
    ADD CONSTRAINT fk_interactions_owner FOREIGN KEY (owner_id) REFERENCES crm_users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_interactions_contact FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE;

  -- crm_quotes
  ALTER TABLE crm_quotes
    ADD CONSTRAINT fk_quotes_owner FOREIGN KEY (owner_id) REFERENCES crm_users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_quotes_contact FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_quotes_creator FOREIGN KEY (created_by) REFERENCES crm_users(id) ON DELETE SET NULL;

  -- crm_emails
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_emails') THEN
    ALTER TABLE crm_emails
      ADD CONSTRAINT fk_emails_owner FOREIGN KEY (owner_id) REFERENCES crm_users(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_emails_sender FOREIGN KEY (sender_id) REFERENCES crm_users(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_emails_contact FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE;
  END IF;

  -- crm_email_templates
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_email_templates') THEN
    ALTER TABLE crm_email_templates
      ADD CONSTRAINT fk_templates_owner FOREIGN KEY (owner_id) REFERENCES crm_users(id) ON DELETE CASCADE;
  END IF;

  -- crm_notifications
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_notifications') THEN
    ALTER TABLE crm_notifications
      ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES crm_users(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_notifications_owner FOREIGN KEY (owner_id) REFERENCES crm_users(id) ON DELETE CASCADE;
  END IF;

  -- crm_companies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crm_companies') THEN
    ALTER TABLE crm_companies
      ADD CONSTRAINT fk_companies_owner FOREIGN KEY (owner_id) REFERENCES crm_users(id) ON DELETE CASCADE;
  END IF;

  RAISE NOTICE 'Contraintes recréées';
END $$;

-- =====================================================
-- PARTIE 7: Recréer les index
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== RECRÉATION DES INDEX ===';

  -- crm_users
  CREATE INDEX IF NOT EXISTS idx_crm_users_email ON crm_users(email);
  CREATE INDEX IF NOT EXISTS idx_crm_users_owner ON crm_users(owner_id);
  CREATE INDEX IF NOT EXISTS idx_crm_users_active ON crm_users(is_active);

  -- crm_contacts
  CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner ON crm_contacts(owner_id);
  CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(status);
  CREATE INDEX IF NOT EXISTS idx_crm_contacts_created ON crm_contacts(created_at DESC);

  -- crm_interactions
  CREATE INDEX IF NOT EXISTS idx_crm_interactions_owner ON crm_interactions(owner_id);
  CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact ON crm_interactions(contact_id);
  CREATE INDEX IF NOT EXISTS idx_crm_interactions_date ON crm_interactions(interaction_date DESC);

  -- crm_quotes
  CREATE INDEX IF NOT EXISTS idx_crm_quotes_owner ON crm_quotes(owner_id);
  CREATE INDEX IF NOT EXISTS idx_crm_quotes_contact ON crm_quotes(contact_id);
  CREATE INDEX IF NOT EXISTS idx_crm_quotes_status ON crm_quotes(status);

  RAISE NOTICE 'Index recréés';
END $$;

-- =====================================================
-- PARTIE 8: Recréer les triggers
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== RECRÉATION DES TRIGGERS ===';

  -- Fonction update_updated_at
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $func$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  -- Triggers pour chaque table
  DROP TRIGGER IF EXISTS update_crm_users_updated_at ON crm_users;
  CREATE TRIGGER update_crm_users_updated_at
    BEFORE UPDATE ON crm_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON crm_contacts;
  CREATE TRIGGER update_crm_contacts_updated_at
    BEFORE UPDATE ON crm_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  RAISE NOTICE 'Triggers recréés';
END $$;

-- =====================================================
-- PARTIE 9: Vérification finale
-- =====================================================

DO $$
DECLARE
  user_count INTEGER;
  contact_count INTEGER;
  interaction_count INTEGER;
  quote_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM crm_users;
  SELECT COUNT(*) INTO contact_count FROM crm_contacts;
  SELECT COUNT(*) INTO interaction_count FROM crm_interactions;
  SELECT COUNT(*) INTO quote_count FROM crm_quotes;

  RAISE NOTICE '=== MIGRATION TERMINÉE ===';
  RAISE NOTICE 'Utilisateurs: %', user_count;
  RAISE NOTICE 'Contacts: %', contact_count;
  RAISE NOTICE 'Interactions: %', interaction_count;
  RAISE NOTICE 'Devis: %', quote_count;
END $$;

-- Vérifier les types finaux
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('crm_users', 'crm_contacts', 'crm_interactions', 'crm_quotes')
  AND (column_name = 'id' OR column_name LIKE '%_id')
ORDER BY table_name, column_name;

-- =====================================================
-- NOTES IMPORTANTES
-- =====================================================
-- 1. Tous les IDs ont été convertis en INTEGER
-- 2. De nouveaux IDs séquentiels ont été générés
-- 3. Les tokens JWT existants sont INVALIDES
-- 4. Les utilisateurs doivent se RECONNECTER
-- 5. Testez toutes les fonctionnalités après migration
