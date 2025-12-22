import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Euro, Target, Clock, Award,
  Calendar, Filter, RefreshCw
} from 'lucide-react';

const Dashboard = ({ API_BASE, AuthService }) => {
  const [analytics, setAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  const [topContacts, setTopContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // 7, 30, 90, 365

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <RefreshCw className="spinning" size={32} style={{ color: '#3b82f6' }} />
      </div>
    );
  }

  if (!analytics) {
    return <div>Erreur de chargement des données</div>;
  }

  // Préparer les données pour les graphiques
  const contactsDistribution = [
    { name: 'Prospects', value: analytics.contacts.prospects, color: '#3b82f6' },
    { name: 'Clients', value: analytics.contacts.clients, color: '#10b981' },
    { name: 'Perdus', value: analytics.contacts.lost, color: '#ef4444' }
  ];

  const quotesDistribution = [
    { name: 'Brouillon', value: analytics.quotes.draft, color: '#6b7280' },
    { name: 'Envoyés', value: analytics.quotes.sent, color: '#3b82f6' },
    { name: 'Acceptés', value: analytics.quotes.accepted, color: '#10b981' },
    { name: 'Refusés', value: analytics.quotes.rejected, color: '#ef4444' }
  ];

  return (
    <div className="dashboard-container">
      {/* Header avec filtres */}
      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>
            📊 Dashboard Analytics
          </h2>
          <p style={{ margin: '0.5rem 0 0 0' }}>
            Vue d'ensemble de votre activité commerciale
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['7', '30', '90', '365'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`period-btn ${period === p ? 'active' : ''}`}
              >
                {p === '7' ? '7j' : p === '30' ? '30j' : p === '90' ? '90j' : '1an'}
              </button>
            ))}
          </div>
          <button onClick={loadAnalytics} className="refresh-btn" title="Rafraîchir">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">
            <Users size={28} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Total Contacts</p>
            <h3 className="kpi-value">{analytics.contacts.total}</h3>
            <p className="kpi-sublabel">
              +{analytics.contacts.newInPeriod} sur {period} jours
            </p>
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon">
            <Euro size={28} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Revenu Total</p>
            <h3 className="kpi-value">{parseFloat(analytics.revenue.total).toLocaleString('fr-FR')}€</h3>
            <p className="kpi-sublabel">
              Potentiel: {parseFloat(analytics.revenue.potential).toLocaleString('fr-FR')}€
            </p>
          </div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon">
            <Target size={28} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Taux de Conversion</p>
            <h3 className="kpi-value">{analytics.contacts.conversionRate}%</h3>
            <p className="kpi-sublabel">
              {analytics.contacts.clients} clients / {analytics.contacts.total} contacts
            </p>
          </div>
        </div>

        <div className="kpi-card orange">
          <div className="kpi-icon">
            <Award size={28} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Devis Moyen</p>
            <h3 className="kpi-value">{parseFloat(analytics.revenue.average).toLocaleString('fr-FR')}€</h3>
            <p className="kpi-sublabel">
              Taux d'acceptation: {analytics.quotes.acceptanceRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="charts-grid">
        {/* Évolution du CA */}
        <div className="chart-card">
          <h3 className="chart-title">
            <TrendingUp size={20} />
            Évolution du Chiffre d'Affaires
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="monthLabel"
                stroke="rgba(255, 255, 255, 0.4)"
                style={{ fontSize: '12px', fill: 'rgba(255, 255, 255, 0.7)' }}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.4)"
                style={{ fontSize: '12px', fill: 'rgba(255, 255, 255, 0.7)' }}
                tickFormatter={(value) => `${value}€`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 26, 36, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'white'
                }}
                formatter={(value) => [`${value}€`, 'Revenu']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des contacts */}
        <div className="chart-card">
          <h3 className="chart-title">
            <Users size={20} />
            Répartition des Contacts
          </h3>
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
              >
                {contactsDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des devis */}
        <div className="chart-card">
          <h3 className="chart-title">
            <Target size={20} />
            Statuts des Devis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quotesDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="name"
                stroke="rgba(255, 255, 255, 0.4)"
                style={{ fontSize: '12px', fill: 'rgba(255, 255, 255, 0.7)' }}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.4)"
                style={{ fontSize: '12px', fill: 'rgba(255, 255, 255, 0.7)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 26, 36, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'white'
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
        <div className="chart-card">
          <h3 className="chart-title">
            <Award size={20} />
            Top 5 Clients par CA
          </h3>
          <div className="top-contacts-list">
            {topContacts.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', padding: '2rem' }}>
                Aucun client avec CA pour le moment
              </p>
            ) : (
              topContacts.map((contact, index) => (
                <div key={contact.id} className="top-contact-item">
                  <div className="top-contact-rank">{index + 1}</div>
                  <div className="top-contact-info">
                    <p className="top-contact-name">{contact.name}</p>
                    <p className="top-contact-company">{contact.company || contact.email}</p>
                  </div>
                  <div className="top-contact-revenue">
                    {contact.revenue.toLocaleString('fr-FR')}€
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stats supplémentaires */}
      <div className="stats-row">
        <div className="stat-box">
          <Clock size={20} style={{ color: '#3b82f6' }} />
          <div>
            <p className="stat-label">Temps moyen de conversion</p>
            <p className="stat-value">{conversionData?.avgConversionDays || 0} jours</p>
          </div>
        </div>

        <div className="stat-box">
          <Calendar size={20} style={{ color: '#10b981' }} />
          <div>
            <p className="stat-label">Nouveaux devis ({period}j)</p>
            <p className="stat-value">{analytics.quotes.newInPeriod}</p>
          </div>
        </div>

        <div className="stat-box">
          <Users size={20} style={{ color: '#8b5cf6' }} />
          <div>
            <p className="stat-label">Nouvelles interactions ({period}j)</p>
            <p className="stat-value">{analytics.interactions.newInPeriod}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
