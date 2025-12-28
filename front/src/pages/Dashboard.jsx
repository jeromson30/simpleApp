import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Euro, Target, Clock, Award,
  Calendar, Filter, RefreshCw, ArrowUp, ArrowDown
} from 'lucide-react';
import soundManager from '../utils/sounds';
import '../styles/components/dashboard.css';

const Dashboard = ({ API_BASE, AuthService }) => {
  const [analytics, setAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  const [topContacts, setTopContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // 7, 30, 90, 365

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    soundManager.click();
    try {
      const headers = AuthService.getAuthHeaders();

      // Charger toutes les analytics en parallèle
      const [overviewRes, revenueRes, conversionRes, topContactsRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/overview?period=${period}`, { headers }),
        fetch(`${API_BASE}/analytics/revenue?months=12`, { headers }),
        fetch(`${API_BASE}/analytics/conversion`, { headers }),
        fetch(`${API_BASE}/analytics/top-contacts?limit=5`, { headers })
      ]);

      if (overviewRes.ok) setAnalytics(await overviewRes.json());
      if (revenueRes.ok) setRevenueData(await revenueRes.json());
      if (conversionRes.ok) setConversionData(await conversionRes.json());
      if (topContactsRes.ok) {
        const data = await topContactsRes.json();
        setTopContacts(data.topContacts);
      }
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    soundManager.click();
    setPeriod(newPeriod);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        gap: '1rem'
      }}>
        <RefreshCw className="animate-spin" size={48} style={{ color: 'var(--brand-primary)' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Chargement des analytics...
        </p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <p style={{ color: 'var(--error)', fontSize: '1rem' }}>
          Erreur de chargement des données
        </p>
        <button onClick={loadAnalytics} className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
          <RefreshCw size={16} />
          Réessayer
        </button>
      </div>
    );
  }

  // Préparer les données pour les graphiques
  const contactsDistribution = [
    { name: 'Prospects', value: analytics.contacts.prospects, color: '#6366f1' },
    { name: 'Clients', value: analytics.contacts.clients, color: '#10b981' },
    { name: 'Perdus', value: analytics.contacts.lost, color: '#ef4444' }
  ];

  const quotesDistribution = [
    { name: 'Brouillon', value: analytics.quotes.draft, color: '#64748b' },
    { name: 'Envoyés', value: analytics.quotes.sent, color: '#6366f1' },
    { name: 'Acceptés', value: analytics.quotes.accepted, color: '#10b981' },
    { name: 'Refusés', value: analytics.quotes.rejected, color: '#ef4444' }
  ];

  return (
    <div className="animate-fadeIn">
      {/* Header avec filtres */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-8)',
        flexWrap: 'wrap',
        gap: 'var(--space-4)'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 'var(--space-2)'
          }}>
            Dashboard Analytics
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Vue d'ensemble de votre activité commerciale
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--surface-glass)', padding: 'var(--space-1)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            {['7', '30', '90', '365'].map(p => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`btn-sm transition-all ${period === p ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: '60px' }}
              >
                {p === '7' ? '7j' : p === '30' ? '30j' : p === '90' ? '90j' : '1an'}
              </button>
            ))}
          </div>
          <button
            onClick={loadAnalytics}
            className="btn-secondary hover-scale transition-all"
            style={{ padding: 'var(--space-3)' }}
            title="Rafraîchir"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 animate-fadeInUp" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="metric-card card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)'
            }}>
              <Users size={28} />
            </div>
          </div>
          <p className="metric-label">Total Contacts</p>
          <h3 className="metric-value">{analytics.contacts.total}</h3>
          <div className="metric-change positive">
            <ArrowUp size={14} />
            <span>+{analytics.contacts.newInPeriod} sur {period}j</span>
          </div>
        </div>

        <div className="metric-card card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)'
            }}>
              <Euro size={28} />
            </div>
          </div>
          <p className="metric-label">Revenu Total</p>
          <h3 className="metric-value">{parseFloat(analytics.revenue.total).toLocaleString('fr-FR')}€</h3>
          <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
            Potentiel: {parseFloat(analytics.revenue.potential).toLocaleString('fr-FR')}€
          </p>
        </div>

        <div className="metric-card card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-secondary)'
            }}>
              <Target size={28} />
            </div>
          </div>
          <p className="metric-label">Taux de Conversion</p>
          <h3 className="metric-value">{analytics.contacts.conversionRate}%</h3>
          <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
            {analytics.contacts.clients} clients / {analytics.contacts.total} contacts
          </p>
        </div>

        <div className="metric-card card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 146, 60, 0.2))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <Award size={28} />
            </div>
          </div>
          <p className="metric-label">Devis Moyen</p>
          <h3 className="metric-value">{parseFloat(analytics.revenue.average).toLocaleString('fr-FR')}€</h3>
          <p style={{ fontSize: '0.813rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
            Acceptation: {analytics.quotes.acceptanceRate}%
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-2" style={{ marginBottom: 'var(--space-8)' }}>
        {/* Évolution du CA */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <TrendingUp size={20} style={{ color: 'var(--brand-primary)' }} />
              Évolution du Chiffre d'Affaires
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="monthLabel"
                stroke="var(--text-tertiary)"
                style={{ fontSize: '12px', fill: 'var(--text-tertiary)' }}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                style={{ fontSize: '12px', fill: 'var(--text-tertiary)' }}
                tickFormatter={(value) => `${value}€`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3)',
                  boxShadow: 'var(--shadow-xl)',
                  backdropFilter: 'blur(20px)'
                }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--text-secondary)' }}
                formatter={(value) => [`${value}€`, 'Revenu']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--success)"
                strokeWidth={3}
                dot={{ fill: 'var(--success)', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des contacts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Users size={20} style={{ color: 'var(--brand-primary)' }} />
              Répartition des Contacts
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contactsDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '0.813rem', fill: 'var(--text-primary)' }}
              >
                {contactsDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3)',
                  boxShadow: 'var(--shadow-xl)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des devis */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Target size={20} style={{ color: 'var(--brand-primary)' }} />
              Statuts des Devis
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quotesDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="name"
                stroke="var(--text-tertiary)"
                style={{ fontSize: '12px', fill: 'var(--text-tertiary)' }}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                style={{ fontSize: '12px', fill: 'var(--text-tertiary)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3)',
                  boxShadow: 'var(--shadow-xl)'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {quotesDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Contacts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Award size={20} style={{ color: 'var(--brand-primary)' }} />
              Top 5 Clients par CA
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {topContacts.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-8)' }}>
                Aucun client avec CA pour le moment
              </p>
            ) : (
              topContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    background: 'var(--surface-glass)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all var(--transition-base)'
                  }}
                  className="hover-scale"
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {contact.name}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {contact.company || contact.email}
                    </p>
                  </div>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: 'var(--success)',
                    flexShrink: 0
                  }}>
                    {contact.revenue.toLocaleString('fr-FR')}€
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stats supplémentaires */}
      <div className="grid grid-cols-3">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-primary)',
            flexShrink: 0
          }}>
            <Clock size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Temps moyen de conversion
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {conversionData?.avgConversionDays || 0} jours
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success)',
            flexShrink: 0
          }}>
            <Calendar size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Nouveaux devis ({period}j)
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {analytics.quotes.newInPeriod}
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.2))',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-secondary)',
            flexShrink: 0
          }}>
            <Users size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Nouvelles interactions ({period}j)
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {analytics.interactions.newInPeriod}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
