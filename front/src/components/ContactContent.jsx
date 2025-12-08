// Composant pour la page Contact
export function ContactContent() {
  return (
    <main className="main-content">
      <h3>Contact</h3>
      <div className="form-container">
        <form className="form">
          <input 
            type="email"
            placeholder="Votre email"
          />
          <input 
            type="text"
            placeholder="Sujet"
          />
          <button type="submit">Envoyer un message</button>
        </form>
      </div>
    </main>
  );
}