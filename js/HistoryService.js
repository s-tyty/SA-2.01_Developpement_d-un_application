/**
 * Service de gestion de l'historique des parties en localStorage.
 * Conserve les 5 dernières parties jouées.
 */

const STORAGE_KEY  = 'memory_history';
const MAX_ENTRIES  = 5;

export class HistoryService {

  /**
   * Sauvegarde une entrée dans l'historique.
   * @param {Object} entry
   * @param {string} entry.pseudo
   * @param {string} entry.difficulty
   * @param {number} entry.score
   * @param {number} entry.matchedPairs
   * @param {number} entry.totalPairs
   * @param {number} entry.timeLeft
   */
  static save(entry) {
    const history = HistoryService.load();
    // Ajoute en tête de liste
    history.unshift({ ...entry, date: new Date().toISOString() });
    // Limite à MAX_ENTRIES entrées
    const trimmed = history.slice(0, MAX_ENTRIES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('localStorage indisponible :', e);
    }
  }

  /**
   * Charge l'historique depuis le localStorage.
   * @returns {Array}
   */
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Erreur lecture localStorage :', e);
      return [];
    }
  }

  /** Efface l'historique. */
  static clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Erreur suppression localStorage :', e);
    }
  }
}
