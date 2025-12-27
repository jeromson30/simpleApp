# 📧 Configuration SMTP pour l'Envoi d'Emails

Ce guide vous explique comment configurer l'envoi d'emails réels via SMTP dans votre CRM.

## 🚀 Configuration Rapide

### 1. Copier le fichier d'exemple

```bash
cp .env.example .env
```

### 2. Éditer le fichier `.env`

Ajoutez vos paramètres SMTP dans le fichier `.env` :

```bash
# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=votre_mot_de_passe_application
SMTP_FROM="Votre Entreprise <votre.email@gmail.com>"
```

### 3. Redémarrer le serveur

```bash
npm start
```

Vous verrez ce message si la configuration est réussie :
```
📧 Configuration SMTP activée: smtp.gmail.com
```

## 📮 Configuration par Fournisseur

### Gmail

#### Étape 1 : Activer la validation en 2 étapes
1. Allez sur https://myaccount.google.com/security
2. Activez la "Validation en deux étapes"

#### Étape 2 : Créer un mot de passe d'application
1. Allez sur https://myaccount.google.com/apppasswords
2. Sélectionnez "Autre" et donnez un nom (ex: "CRM")
3. Copiez le mot de passe généré (16 caractères)

#### Étape 3 : Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Le mot de passe d'application
SMTP_FROM="Ma Société <votre.email@gmail.com>"
```

**Limites Gmail** : ~500 emails/jour

---

### Outlook / Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@outlook.com
SMTP_PASS=votre_mot_de_passe
SMTP_FROM="Ma Société <votre.email@outlook.com>"
```

**Note** : Utilisez votre mot de passe normal Outlook

**Limites Outlook** : ~300 emails/jour

---

### SendGrid (Recommandé pour la production)

SendGrid est un service professionnel d'envoi d'emails avec meilleure délivrabilité.

#### Étape 1 : Créer un compte
1. Inscrivez-vous sur https://sendgrid.com (100 emails/jour gratuits)
2. Vérifiez votre email

#### Étape 2 : Créer une API Key
1. Settings → API Keys → Create API Key
2. Donnez un nom et copiez la clé

#### Étape 3 : Configuration
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Votre API Key
SMTP_FROM="Ma Société <votre@domaine.com>"
```

**Avantages** :
- ✅ Meilleure délivrabilité
- ✅ Statistiques d'ouverture et clics
- ✅ Pas de limite quotidienne stricte
- ✅ Support technique

---

### Office 365 / Microsoft 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@votredomaine.com
SMTP_PASS=votre_mot_de_passe
SMTP_FROM="Ma Société <votre.email@votredomaine.com>"
```

---

### Autre serveur SMTP personnalisé

```env
SMTP_HOST=mail.votredomaine.com
SMTP_PORT=587  # ou 465 pour SSL
SMTP_SECURE=false  # true si port 465
SMTP_USER=votre.email@votredomaine.com
SMTP_PASS=votre_mot_de_passe
SMTP_FROM="Ma Société <votre.email@votredomaine.com>"
```

## 🔧 Paramètres Détaillés

### SMTP_HOST
Le serveur SMTP de votre fournisseur d'email

### SMTP_PORT
- **587** : TLS/STARTTLS (recommandé)
- **465** : SSL
- **25** : Non sécurisé (déconseillé)

### SMTP_SECURE
- `false` : Pour port 587 (TLS/STARTTLS)
- `true` : Pour port 465 (SSL direct)

### SMTP_USER
Votre adresse email complète

### SMTP_PASS
- Gmail : Mot de passe d'application
- Outlook : Mot de passe normal
- SendGrid : API Key

### SMTP_FROM
Format : `"Nom Affiché <email@domaine.com>"`

## 🧪 Test de Configuration

### Test rapide

Envoyez un email de test via l'interface CRM :
1. Créez un contact
2. Cliquez sur "Envoyer email"
3. Rédigez et envoyez

### Vérifier les logs

Dans la console du serveur, vous verrez :
```
📤 Tentative envoi email à: contact@example.com
📧 Email envoyé avec succès: <message-id>
✅ Email délivré avec succès
💾 Email enregistré dans la DB: 123
```

### Statuts d'email

Dans la base de données `crm_emails`, le champ `status` indique :
- **delivered** : Email envoyé avec succès via SMTP ✅
- **sent** : Enregistré mais SMTP non configuré ⚠️
- **failed** : Échec d'envoi SMTP ❌

## ⚠️ Résolution de Problèmes

### Erreur : "SMTP non configuré"

**Cause** : Variables d'environnement manquantes

**Solution** :
1. Vérifiez que le fichier `.env` existe
2. Vérifiez que toutes les variables SMTP sont renseignées
3. Redémarrez le serveur

---

### Erreur : "Invalid login"

**Gmail** : Utilisez un mot de passe d'application, pas votre mot de passe normal

**Outlook** : Vérifiez que vous utilisez le bon mot de passe

---

### Erreur : "Connection timeout"

**Causes possibles** :
- Port bloqué par un firewall
- Mauvais nom d'hôte SMTP

**Solutions** :
1. Essayez le port 465 avec `SMTP_SECURE=true`
2. Vérifiez votre connexion internet
3. Désactivez temporairement le firewall pour tester

---

### Les emails vont dans les spams

**Solutions** :
1. Utilisez SendGrid pour meilleure délivrabilité
2. Configurez SPF et DKIM pour votre domaine
3. Évitez les mots "spam" dans le sujet
4. N'envoyez pas trop d'emails d'un coup

---

### Mode Développement

Pour développer sans vraiment envoyer d'emails :

1. **Ne pas configurer SMTP** : Laissez les variables vides
2. Les emails seront seulement stockés dans la DB avec status `sent`
3. Consultez-les dans l'historique EmailHistory

---

## 📊 Surveillance

### Logs du serveur

Les logs indiquent :
- ✅ Emails envoyés avec succès
- ❌ Erreurs d'envoi
- ⚠️ SMTP non configuré

### Base de données

Consultez la table `crm_emails` :
```sql
SELECT
  id,
  recipient_email,
  subject,
  status,
  sent_at,
  metadata
FROM crm_emails
ORDER BY sent_at DESC
LIMIT 10;
```

Le champ `metadata` contient :
- `smtp_configured` : true/false
- `smtp_result` : Raison d'échec si erreur
- `message_id` : ID du message SMTP

## 🔐 Sécurité

### ⚠️ Important

1. **Ne jamais commit le fichier `.env`** dans Git
2. Le fichier `.gitignore` doit contenir `.env`
3. Utilisez des mots de passe d'application (Gmail)
4. Changez vos mots de passe régulièrement

### Production

Pour la production, utilisez :
- SendGrid ou service professionnel
- Variables d'environnement du serveur (pas de fichier .env)
- Rotation des clés API

## 📚 Ressources

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail SMTP](https://support.google.com/mail/answer/7126229)
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Outlook SMTP](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353)
