
// Composant pour le contenu principal
export function HomeContent({ data, loading, nom, setNom, handleSubmit}) {
  return (
    <main className="main-content">
      <h3>Contenu Principal</h3>
      
      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          <input 
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Entrez votre nom"
          />
          <button type="submit">Envoyer</button>
        </form>
      </div>

      {loading ? (
        <p className="loading">Chargement des données...</p>
      ) : (
        <div className="data-grid">
          {data.length > 0 ? (
            data.map((item, index) => (
              <div key={index} className="data-card">
                <p>{JSON.stringify(item)}</p>
              </div>
            ))
          ) : (
            <p className="no-data">Aucune donnée</p>
          )}
        </div>
      )}
    </main>
  );
}