# API de Gestion des Devis (Quotes)

## Vue d'ensemble

L'API de gestion des devis permet aux utilisateurs de créer, gérer et suivre des devis pour leurs clients. Tous les endpoints nécessitent une authentification JWT.

## Endpoints

### 1. Récupérer tous les devis

**GET** `/api/crm/quotes`

Récupère tous les devis de l'utilisateur connecté (ou du propriétaire si c'est un sous-compte).

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse:**
```json
[
  {
    "id": 1,
    "owner_id": "user_123",
    "created_by": "user_123",
    "quote_number": "DEV-2024-001",
    "contact_id": 5,
    "client_name": "John Doe",
    "client_email": "john@example.com",
    "client_address": "123 Main St, Paris",
    "items": [
      {
        "description": "Développement site web",
        "quantity": 1,
        "unit_price": 5000,
        "total": 5000
      }
    ],
    "subtotal": 5000,
    "tax_rate": 20,
    "tax_amount": 1000,
    "total": 6000,
    "status": "sent",
    "valid_until": "2024-12-31",
    "payment_terms": "30 jours",
    "notes": "Merci pour votre confiance",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

### 2. Récupérer un devis spécifique

**GET** `/api/crm/quotes/:id`

Récupère un devis par son ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "id": 1,
  "quote_number": "DEV-2024-001",
  "client_name": "John Doe",
  ...
}
```

### 3. Créer un nouveau devis

**POST** `/api/crm/quotes`

Crée un nouveau devis.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "quote_number": "DEV-2024-001",
  "contact_id": 5,
  "client_name": "John Doe",
  "client_email": "john@example.com",
  "client_address": "123 Main St, Paris",
  "items": [
    {
      "description": "Développement site web",
      "quantity": 1,
      "unit_price": 5000,
      "total": 5000
    },
    {
      "description": "Hébergement annuel",
      "quantity": 1,
      "unit_price": 500,
      "total": 500
    }
  ],
  "subtotal": 5500,
  "tax_rate": 20,
  "tax_amount": 1100,
  "total": 6600,
  "status": "draft",
  "valid_until": "2024-12-31",
  "payment_terms": "30 jours",
  "notes": "Merci pour votre confiance"
}
```

**Champs requis:**
- `quote_number`: Numéro unique du devis
- `items`: Tableau d'articles (doit contenir au moins 1 élément)
- `client_name` OU `contact_id`: Soit le nom du client, soit l'ID d'un contact existant

**Champs optionnels:**
- `contact_id`: ID d'un contact existant dans le CRM
- `client_email`: Email du client
- `client_address`: Adresse du client
- `subtotal`: Montant HT (défaut: 0)
- `tax_rate`: Taux de TVA en % (défaut: 20)
- `tax_amount`: Montant de TVA (défaut: 0)
- `total`: Montant TTC (défaut: 0)
- `status`: Statut du devis - "draft", "sent", "accepted", "rejected", "expired" (défaut: "draft")
- `valid_until`: Date de validité du devis (format: YYYY-MM-DD)
- `payment_terms`: Conditions de paiement
- `notes`: Notes supplémentaires

**Réponse:**
```json
{
  "id": 1,
  "quote_number": "DEV-2024-001",
  ...
}
```

### 4. Modifier un devis

**PATCH** `/api/crm/quotes/:id`

Modifie un devis existant.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
Tous les champs sont optionnels. Seuls les champs fournis seront mis à jour.

```json
{
  "status": "sent",
  "notes": "Nouvelles notes"
}
```

**Réponse:**
```json
{
  "id": 1,
  "quote_number": "DEV-2024-001",
  "status": "sent",
  ...
}
```

### 5. Modifier le statut d'un devis

**PATCH** `/api/crm/quotes/:id/status`

Met à jour uniquement le statut d'un devis.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "status": "accepted"
}
```

**Statuts valides:**
- `draft`: Brouillon
- `sent`: Envoyé
- `accepted`: Accepté
- `rejected`: Refusé
- `expired`: Expiré

**Réponse:**
```json
{
  "message": "Statut mis à jour",
  "status": "accepted"
}
```

### 6. Supprimer un devis

**DELETE** `/api/crm/quotes/:id`

Supprime un devis.

**Headers:**
```
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "message": "Devis supprimé"
}
```

## Structure des articles (items)

Chaque article dans le tableau `items` doit avoir la structure suivante:

```json
{
  "description": "Description de l'article",
  "quantity": 1,
  "unit_price": 100,
  "total": 100
}
```

**Champs:**
- `description`: Description de l'article/service
- `quantity`: Quantité
- `unit_price`: Prix unitaire HT
- `total`: Total HT (quantity × unit_price)

## Codes d'erreur

- **400 Bad Request**: Données manquantes ou invalides
- **401 Unauthorized**: Token manquant ou invalide
- **403 Forbidden**: Compte suspendu ou accès non autorisé
- **404 Not Found**: Devis non trouvé
- **409 Conflict**: Numéro de devis déjà existant
- **500 Internal Server Error**: Erreur serveur

## Exemples d'utilisation

### Créer un devis simple

```bash
curl -X POST http://localhost:5000/api/crm/quotes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quote_number": "DEV-2024-001",
    "client_name": "Acme Corp",
    "client_email": "contact@acme.com",
    "items": [
      {
        "description": "Consultation",
        "quantity": 5,
        "unit_price": 100,
        "total": 500
      }
    ],
    "subtotal": 500,
    "tax_rate": 20,
    "tax_amount": 100,
    "total": 600,
    "status": "draft",
    "valid_until": "2024-12-31",
    "payment_terms": "Paiement à réception"
  }'
```

### Récupérer tous les devis

```bash
curl -X GET http://localhost:5000/api/crm/quotes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Marquer un devis comme envoyé

```bash
curl -X PATCH http://localhost:5000/api/crm/quotes/1/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "sent"}'
```

## Base de données

La table `crm_quotes` doit être créée dans Supabase avec la structure suivante:

```sql
CREATE TABLE crm_quotes (
  id BIGSERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  quote_number TEXT NOT NULL,
  contact_id BIGINT,
  client_name TEXT,
  client_email TEXT,
  client_address TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 20,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  valid_until DATE,
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(owner_id, quote_number)
);

CREATE INDEX idx_quotes_owner ON crm_quotes(owner_id);
CREATE INDEX idx_quotes_contact ON crm_quotes(contact_id);
CREATE INDEX idx_quotes_status ON crm_quotes(status);
```

## Notes importantes

1. **Isolation des données**: Chaque utilisateur ne peut accéder qu'à ses propres devis (ou ceux de son propriétaire si c'est un sous-compte)
2. **Numérotation**: Les numéros de devis doivent être uniques par propriétaire
3. **Calculs**: Les calculs (subtotal, tax_amount, total) doivent être effectués côté client avant l'envoi
4. **Contact vs Client**: Vous pouvez soit lier le devis à un contact existant (`contact_id`), soit fournir les informations client manuellement (`client_name`, `client_email`, etc.)
