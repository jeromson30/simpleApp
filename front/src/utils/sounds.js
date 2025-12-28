// Sound Effects Utility
// Utilise l'API Web Audio pour générer des effets sonores simples

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.3; // Volume par défaut (30%)

    // Initialiser le contexte audio au premier clic utilisateur
    if (typeof window !== 'undefined') {
      document.addEventListener('click', () => this.init(), { once: true });
    }
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume)); // Entre 0 et 1
  }

  playTone(frequency, duration, type = 'sine') {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Effet sonore de succès (mélodie ascendante)
  success() {
    this.init();
    this.playTone(523.25, 0.1); // Do
    setTimeout(() => this.playTone(659.25, 0.1), 100); // Mi
    setTimeout(() => this.playTone(783.99, 0.15), 200); // Sol
  }

  // Effet sonore d'erreur (ton descendant)
  error() {
    this.init();
    this.playTone(392, 0.15); // Sol
    setTimeout(() => this.playTone(293.66, 0.2), 150); // Ré
  }

  // Effet sonore de clic/interaction (bip court)
  click() {
    this.init();
    this.playTone(800, 0.05, 'square');
  }

  // Effet sonore de notification (double bip)
  notification() {
    this.init();
    this.playTone(880, 0.1);
    setTimeout(() => this.playTone(880, 0.1), 150);
  }

  // Effet sonore d'envoi (swoosh)
  send() {
    this.init();
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);

    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  // Effet sonore d'ouverture de modal
  modalOpen() {
    this.init();
    this.playTone(600, 0.08);
    setTimeout(() => this.playTone(750, 0.08), 80);
  }

  // Effet sonore de fermeture de modal
  modalClose() {
    this.init();
    this.playTone(750, 0.08);
    setTimeout(() => this.playTone(600, 0.08), 80);
  }
}

// Instance singleton
const soundManager = new SoundManager();

export default soundManager;
