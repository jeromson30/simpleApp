-- =====================================================
-- Templates d'email par défaut
-- À exécuter APRÈS la migration complète
-- =====================================================

-- Templates par défaut (is_default = TRUE, owner_id = 0 pour signifier "global")
-- Note: Utilisez owner_id = votre ID si vous voulez des templates personnels

INSERT INTO crm_email_templates (owner_id, name, subject, body, category, variables, is_default) VALUES
(
  (SELECT MIN(id) FROM crm_users WHERE is_owner = TRUE), -- Premier owner
  'Bienvenue - Nouveau Contact',
  'Bienvenue {{contact_name}} !',
  E'Bonjour {{contact_name}},\n\nNous sommes ravis de vous accueillir parmi nos contacts.\n\nNotre équipe est à votre disposition pour répondre à toutes vos questions.\n\nCordialement,\n{{company_name}}',
  'welcome',
  '["contact_name", "company_name"]'::jsonb,
  TRUE
),
(
  (SELECT MIN(id) FROM crm_users WHERE is_owner = TRUE),
  'Suivi - Après Premier Contact',
  'Suite à notre échange',
  E'Bonjour {{contact_name}},\n\nJe vous remercie pour notre échange récent.\n\nComme convenu, je vous contacte pour faire le point sur {{subject}}.\n\nRestez-vous disponible pour un rendez-vous cette semaine ?\n\nCordialement,\n{{sender_name}}',
  'followup',
  '["contact_name", "subject", "sender_name"]'::jsonb,
  TRUE
),
(
  (SELECT MIN(id) FROM crm_users WHERE is_owner = TRUE),
  'Rappel - Devis en Attente',
  'Rappel concernant votre devis #{{quote_number}}',
  E'Bonjour {{contact_name}},\n\nJe me permets de revenir vers vous concernant le devis #{{quote_number}} que nous vous avons transmis.\n\nAvez-vous eu l''occasion de l''examiner ?\n\nJe reste à votre disposition pour toute question.\n\nCordialement,\n{{sender_name}}',
  'reminder',
  '["contact_name", "quote_number", "sender_name"]'::jsonb,
  TRUE
),
(
  (SELECT MIN(id) FROM crm_users WHERE is_owner = TRUE),
  'Remerciement - Devis Accepté',
  'Merci pour votre confiance !',
  E'Bonjour {{contact_name}},\n\nNous vous remercions d''avoir accepté notre proposition.\n\nNous allons maintenant procéder aux étapes suivantes :\n- Finalisation des détails\n- Planification de la mise en œuvre\n- Suivi personnalisé\n\nNous vous tiendrons informé de l''avancement.\n\nCordialement,\n{{company_name}}',
  'thank_you',
  '["contact_name", "company_name"]'::jsonb,
  TRUE
),
(
  (SELECT MIN(id) FROM crm_users WHERE is_owner = TRUE),
  'Information - Mise à Jour',
  'Actualité {{company_name}}',
  E'Bonjour {{contact_name}},\n\nNous souhaitions vous tenir informé de nos dernières actualités.\n\n{{news_content}}\n\nN''hésitez pas à nous contacter pour plus d''informations.\n\nCordialement,\n{{company_name}}',
  'general',
  '["contact_name", "company_name", "news_content"]'::jsonb,
  TRUE
);

-- Vérifier l'insertion
SELECT
  id,
  name,
  category,
  is_default,
  variables
FROM crm_email_templates
ORDER BY category, name;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ % templates par défaut insérés', (SELECT COUNT(*) FROM crm_email_templates WHERE is_default = TRUE);
END $$;
