// Composant pour la page Stats
export function StatsContent({ bfStats, loadingBf }) {
  return (
    <main className="main-content">
      <h3>Statistiques Battlefield 6</h3>
      
      {loadingBf ? (
        <p className="loading">Chargement des statistiques...</p>
      ) : bfStats.length > 0 ? (
        <div className="data-grid">
          {bfStats.map((player, index) => (
            <div key={index} className="data-card">
              <h4>{player.name}</h4>
              <div className="stat-content">
                <p><strong>K/D:</strong> {player.kd || 'N/A'}</p>
                <p><strong>Victoires:</strong> {player.win || 'N/A'}</p>
                <p><strong>Heures:</strong> {player.playtimeHours || 'N/A'}h</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-data">Aucune statistique disponible</p>
      )}
    </main>
  );
}