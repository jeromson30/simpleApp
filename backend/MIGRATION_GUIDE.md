# Guide de Migration - Conversion des IDs en INTEGER

## 🎯 Objectif

Convertir toutes les colonnes `id` et `owner_id` de type TEXT vers INTEGER dans la base de données Supabase.

## ⚠️ Problème Actuel

L'erreur rencontrée lors de l'envoi d'emails :
```
invalid input syntax for type integer: "tester_tester_com"
```

**Cause** : Les colonnes `crm_users.id` et `owner_id` sont de type TEXT au lieu d'INTEGER, ce qui provoque des erreurs lors des insertions dans les tables qui attendent des INTEGER.

## 📋 Tables Affectées

| Table | Colonnes à corriger |
|-------|-------------------|
| `crm_users` | `id` (TEXT → INTEGER) |
| `crm_contacts` | `owner_id`, `created_by` (TEXT → INTEGER) |
| `crm_interactions` | `owner_id`, `created_by` (TEXT → INTEGER) |
| `crm_quotes` | `owner_id`, `created_by` (TEXT → INTEGER) |

**Note** : Les tables `crm_emails`, `crm_email_templates` et `crm_notifications` sont déjà correctes (INTEGER).

## 🚀 Procédure de Migration

### Étape 1 : Sauvegarde Complète ⚠️

**OBLIGATOIRE** : Créez une sauvegarde complète de votre base Supabase avant de commencer !

1. Allez dans Supabase Dashboard
2. Settings → Database → Database Backups
3. Créez une sauvegarde manuelle

### Étape 2 : Vérification (Optionnel)

Exécutez `check_column_types.sql` pour voir l'état actuel :

```sql
-- Dans Supabase SQL Editor
-- Copiez et collez le contenu de backend/check_column_types.sql
```

Cela affichera tous les types de colonnes actuels.

### Étape 3 : Migration Complète

**Fichier à exécuter** : `complete_schema_migration.sql`

1. Ouvrez Supabase SQL Editor
2. Copiez **TOUT** le contenu de `backend/complete_schema_migration.sql`
3. Collez dans l'éditeur SQL
4. Cliquez sur **Run**

⏱️ **Durée estimée** : 30 secondes à 2 minutes selon la taille de vos données

### Étape 4 : Templates d'Email Par Défaut

Après la migration, exécutez `insert_default_email_templates.sql` :

```sql
-- Dans Supabase SQL Editor
-- Copiez et collez le contenu de backend/insert_default_email_templates.sql
```

Cela créera 5 templates d'email par défaut :
- Bienvenue - Nouveau Contact
- Suivi - Après Premier Contact
- Rappel - Devis en Attente
- Remerciement - Devis Accepté
- Information - Mise à Jour

## ✅ Vérifications Post-Migration

### 1. Vérifier les Types de Colonnes

```sql
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'crm_%'
  AND (column_name = 'id' OR column_name LIKE '%_id')
ORDER BY table_name, column_name;
```

**Résultat attendu** : Toutes les colonnes `id` et `*_id` doivent être `integer`.

### 2. Vérifier les Données Migrées

```sql
-- Compter les utilisateurs
SELECT COUNT(*) as total_users FROM crm_users;

-- Compter les contacts
SELECT COUNT(*) as total_contacts FROM crm_contacts;

-- Compter les interactions
SELECT COUNT(*) as total_interactions FROM crm_interactions;

-- Compter les devis
SELECT COUNT(*) as total_quotes FROM crm_quotes;

-- Vérifier un échantillon
SELECT id, email, is_owner, owner_id FROM crm_users LIMIT 5;
SELECT id, name, email, owner_id FROM crm_contacts LIMIT 5;
```

### 3. Tester l'Application

1. **Déconnectez-vous** de l'application (obligatoire)
2. **Reconnectez-vous** avec vos identifiants
3. Testez les fonctionnalités :
   - ✅ Création de contact
   - ✅ Modification de contact
   - ✅ Création d'interaction
   - ✅ Création de devis
   - ✅ **Envoi d'email** (devrait fonctionner maintenant !)
   - ✅ Templates d'email

## 🔧 Ce qui Change

### Avant Migration
```javascript
// crm_users.id était TEXT
{
  id: "tester@example.com",  // ❌ TEXT
  email: "tester@example.com",
  owner_id: "admin@example.com"  // ❌ TEXT
}
```

### Après Migration
```javascript
// crm_users.id est INTEGER
{
  id: 1,  // ✅ INTEGER
  email: "tester@example.com",
  owner_id: null  // ✅ NULL pour les owners, INTEGER pour les sub-accounts
}
```

## ⚠️ Points Importants

### 1. Nouveaux IDs Générés
- Tous les utilisateurs auront de nouveaux IDs (1, 2, 3, ...)
- Les relations entre tables sont **préservées** grâce au mapping

### 2. Tokens JWT Invalides
- Tous les tokens JWT existants seront **invalides**
- Les utilisateurs **DOIVENT se reconnecter**
- Les sessions en cours seront perdues

### 3. Données Préservées
- ✅ Tous les utilisateurs
- ✅ Tous les contacts
- ✅ Toutes les interactions
- ✅ Tous les devis
- ✅ Toutes les relations (owner → contacts, contacts → interactions, etc.)

### 4. Pas de Retour Arrière Simple
- La migration utilise `BEGIN;` ... `COMMIT;`
- Si échec, transaction annulée automatiquement
- Si succès, retour arrière = restaurer la sauvegarde

## 🐛 Résolution de Problèmes

### Erreur : "relation does not exist"
**Cause** : Table manquante
**Solution** : Vérifiez que toutes vos tables existent avant migration

### Erreur : "duplicate key value"
**Cause** : Emails en doublon
**Solution** : Nettoyez les doublons avant migration :
```sql
SELECT email, COUNT(*)
FROM crm_users
GROUP BY email
HAVING COUNT(*) > 1;
```

### Migration Bloquée / Timeout
**Cause** : Trop de données
**Solution** :
1. Supprimez les données inutiles
2. Exécutez par étapes (contactez le support)

### Après Migration : 403 Forbidden
**Cause** : Token JWT invalide
**Solution** : Déconnectez-vous et reconnectez-vous

## 📞 Support

Si vous rencontrez des problèmes :

1. **NE PAS PANIQUER** - Vous avez une sauvegarde
2. Restaurez la sauvegarde si nécessaire
3. Notez l'erreur exacte reçue
4. Vérifiez les logs Supabase

## 📝 Checklist de Migration

- [ ] Sauvegarde complète créée
- [ ] Vérification des types actuels effectuée
- [ ] Script `complete_schema_migration.sql` exécuté avec succès
- [ ] Vérification des types post-migration OK
- [ ] Vérification du nombre de lignes OK
- [ ] Script `insert_default_email_templates.sql` exécuté
- [ ] Déconnexion de l'application
- [ ] Reconnexion réussie
- [ ] Test création de contact OK
- [ ] Test envoi d'email OK
- [ ] Toutes les fonctionnalités testées

## 🎉 Résultat Final

Après cette migration :
- ✅ Tous les IDs sont en INTEGER (conforme au schéma SQL standard)
- ✅ L'envoi d'emails fonctionne correctement
- ✅ Les performances sont améliorées (INTEGER vs TEXT)
- ✅ Les clés étrangères sont correctement typées
- ✅ Le système est prêt pour la suite du développement
