import { Crown, Users } from 'lucide-react';

// Types de licences
const LICENSE_TYPES = {
  starter: { name: 'Starter', maxUsers: 1, price: 'Gratuit', color: '#6b7280' },
  pro: { name: 'Pro', maxUsers: 5, price: '29€/mois', color: '#3b82f6' },
  business: { name: 'Business', maxUsers: 15, price: '79€/mois', color: '#8b5cf6' },
  enterprise: { name: 'Enterprise', maxUsers: 50, price: '199€/mois', color: '#f59e0b' }
};

// Composant pour la page Offres
export function OffersContent() {
  return (
    <main className="main-content" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #64c8ff, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Nos Offres d'Abonnement CRM
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Choisissez l'offre qui correspond le mieux à vos besoins professionnels
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {Object.entries(LICENSE_TYPES).map(([key, license]) => (
          <div key={key} style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '2rem',
            border: `2px solid rgba(255,255,255,0.1)`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.borderColor = license.color;
            e.currentTarget.style.boxShadow = `0 8px 32px ${license.color}40`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `${license.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                border: `2px solid ${license.color}`
              }}>
                <Crown size={30} color={license.color} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: license.color, marginBottom: '0.5rem' }}>
                {license.name}
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: 'white', marginBottom: '0.25rem' }}>
                {license.price}
              </p>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem' }}>
              <li style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Users size={18} color={license.color} />
                <span>{license.maxUsers} utilisateur{license.maxUsers > 1 ? 's' : ''}</span>
              </li>
              <li style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                <span>Gestion des contacts illimitée</span>
              </li>
              <li style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                <span>Création de devis professionnels</span>
              </li>
              <li style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                <span>Export PDF avec votre branding</span>
              </li>
              <li style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                <span>Pipeline de vente visuel</span>
              </li>
              {key !== 'starter' && (
                <>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Support prioritaire</span>
                  </li>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Statistiques avancées</span>
                  </li>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Historique des interactions</span>
                  </li>
                </>
              )}
              {(key === 'business' || key === 'enterprise') && (
                <>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Intégrations API</span>
                  </li>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Personnalisation avancée</span>
                  </li>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Rapports personnalisés</span>
                  </li>
                </>
              )}
              {key === 'enterprise' && (
                <>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Support dédié 24/7</span>
                  </li>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Formation personnalisée</span>
                  </li>
                  <li style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: license.color, fontSize: '1.2rem' }}>✓</span>
                    <span>Gestionnaire de compte dédié</span>
                  </li>
                </>
              )}
            </ul>

            <button
              style={{
                width: '100%',
                padding: '1rem',
                background: `linear-gradient(135deg, ${license.color}, ${license.color}dd)`,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 8px 20px ${license.color}60`;
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {key === 'starter' ? 'Commencer gratuitement' : `Choisir ${license.name}`}
            </button>
          </div>
        ))}
      </div>

      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '2.5rem',
        textAlign: 'center',
        marginTop: '3rem'
      }}>
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#64c8ff' }}>
          Besoin d'une offre sur mesure ?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
          Contactez notre équipe commerciale pour une solution personnalisée adaptée aux besoins spécifiques de votre entreprise
        </p>
        <button style={{
          padding: '1rem 2.5rem',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
          fontSize: '1.1rem',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }}>
          Nous contacter
        </button>
      </div>

      <div style={{
        marginTop: '3rem',
        padding: '2rem',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#64c8ff', textAlign: 'center' }}>
          Questions fréquentes
        </h3>
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          <div>
            <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Puis-je changer d'offre à tout moment ?</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              Oui, vous pouvez upgrader ou downgrader votre offre à tout moment. Les changements sont effectifs immédiatement.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Y a-t-il un engagement ?</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              Non, toutes nos offres sont sans engagement. Vous pouvez résilier à tout moment.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Que se passe-t-il si je dépasse le nombre d'utilisateurs ?</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              Nous vous proposerons automatiquement de passer à l'offre supérieure pour ajouter plus d'utilisateurs.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
