-- =====================================================
-- VÉRIFICATION DES TYPES DE COLONNES
-- Script pour vérifier l'état actuel des colonnes avant migration
-- =====================================================

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

-- Vérifier spécifiquement crm_users
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'crm_users'
ORDER BY ordinal_position;

-- Compter les utilisateurs
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_owner = TRUE) as owners,
  COUNT(*) FILTER (WHERE is_owner = FALSE) as sub_accounts
FROM crm_users;

-- Afficher quelques exemples d'IDs actuels
SELECT
  id,
  email,
  is_owner,
  owner_id,
  LENGTH(id) as id_length
FROM crm_users
LIMIT 10;
