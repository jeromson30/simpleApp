# 📧 Configuration du Système d'Emails CRM

Ce guide explique comment configurer les tables nécessaires pour le système d'emails dans Supabase.

## 🗄️ Étape 1 : Créer les tables dans Supabase

1. **Connectez-vous à votre projet Supabase**
   - Allez sur [https://supabase.com](https://supabase.com)
   - Ouvrez votre projet

2. **Ouvrez le SQL Editor**
   - Dans le menu de gauche, cliquez sur "SQL Editor"
   - Cliquez sur "New query"

3. **Exécutez le script SQL**
   - Copiez tout le contenu du fichier `emails_schema.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" pour exécuter

## ✅ Ce qui sera créé

### Tables

1. **crm_emails**
   - Stocke l'historique de tous les emails envoyés
   - Champs : id, owner_id, contact_id, sender_id, recipient_email, subject, body, status, sent_at, opened_at

2. **crm_email_templates**
   - Stocke les templates d'emails (prédéfinis et personnalisés)
   - Champs : id, owner_id, name, subject, body, category, variables, is_default

3. **crm_notifications**
   - Stocke les notifications in-app
   - Champs : id, user_id, owner_id, type, title, message, link, is_read

### Index
- Optimisations de performance pour les requêtes fréquentes

### Templates par défaut
- 4 templates pré-configurés :
  - Bienvenue nouveau client
  - Follow-up devis
  - Relance prospect
  - Remerciement

## 🔧 Endpoints API disponibles

### Emails

- `POST /api/crm/emails` - Envoyer un email
- `GET /api/crm/emails` - Liste des emails
- `GET /api/crm/emails/contact/:id` - Emails d'un contact
- `PATCH /api/crm/emails/:id/opened` - Marquer comme ouvert

### Templates

- `GET /api/crm/email-templates` - Liste des templates
- `POST /api/crm/email-templates` - Créer un template
- `PATCH /api/crm/email-templates/:id` - Modifier un template
- `DELETE /api/crm/email-templates/:id` - Supprimer un template

### Notifications

- `GET /api/crm/notifications` - Liste des notifications
- `PATCH /api/crm/notifications/:id/read` - Marquer comme lue
- `PATCH /api/crm/notifications/mark-all-read` - Tout marquer comme lu

## 🎯 Variables de template

Les templates supportent des variables dynamiques :

- `{contact_name}` - Nom du contact
- `{company_name}` - Nom de votre entreprise
- `{sender_name}` - Nom de l'expéditeur
- `{quote_number}` - Numéro de devis
- `{project_name}` - Nom du projet

Exemple d'utilisation :
```
Bonjour {contact_name},

Je reviens vers vous concernant le devis {quote_number}.

Cordialement,
{sender_name}
```

## ⚠️ Important

**IMPORTANT** : Avant d'utiliser les templates par défaut, vous devez :

1. Remplacer l'owner_id `00000000-0000-0000-0000-000000000000` dans le script SQL par un UUID valide
2. OU créer les templates via l'API après la première connexion

Pour créer les templates pour votre compte, vous pouvez :
- Les créer manuellement via l'interface CRM
- Les créer via un script d'initialisation

## 🧪 Test de l'installation

Après avoir exécuté le script SQL, vérifiez que les tables existent :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('crm_emails', 'crm_email_templates', 'crm_notifications');
```

Vous devriez voir les 3 tables listées.

## 📝 Notes

- Les emails ne sont PAS réellement envoyés par le backend actuel
- C'est un système de tracking/historique d'emails
- Pour l'envoi réel, intégrez un service comme SendGrid, Mailgun ou AWS SES
- Le statut 'sent' indique que l'email a été enregistré dans le CRM
- Le statut 'opened' peut être utilisé avec un pixel de tracking

## 🚀 Prochaines étapes

Une fois les tables créées :
1. Redémarrez votre serveur backend
2. Les endpoints API seront disponibles
3. L'interface frontend pourra envoyer et consulter les emails
