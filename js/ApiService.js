import { MEMORY_URL } from './config.js';

export class ApiService {

  /**
   * Crée une nouvelle partie sur le serveur et récupère son identifiant.
   *
   * On envoie le pseudo du joueur et le niveau de difficulté sous forme numérique
   * (le serveur attend un nombre, pas un mot comme 'facile').
   * En retour, le serveur renvoie un objet avec un champ `id` qu'on utilisera
   * jusqu'à la fin de la partie.
   *
   * Correspondance niveau → valeur numérique envoyée au serveur :
   * - facile: 2
   * - normal: 3
   * - moyen: 4
   * - difficile: 5
   *
   * @param {string} pseudo     - Pseudo saisi par le joueur dans le formulaire
   * @param {string} difficulty - Niveau choisi ('facile', 'normal', 'moyen', 'difficile')
   * @returns {Promise<{id: string}>} L'identifiant de la partie créée sur le serveur
   * @throws {Error} Si le serveur répond avec une erreur HTTP
   */
  static async createGame(pseudo, difficulty) {
    // Conversion du nom du niveau en valeur numérique pour le serveur
    const difficultyMap = {
      'facile':    2,
      'normal':    3,
      'moyen':     4,
      'difficile': 5
    };

    // Si le niveau n'est pas reconnu, on envoie 2 par défaut (facile)
    const pairsValue = difficultyMap[difficulty] ?? 2;

    const response = await fetch(`${MEMORY_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name:       pseudo,
        difficulty: pairsValue
      })
    });

    // Si le serveur répond avec une erreur (4xx ou 5xx), on lève une exception
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Erreur lors de la création de la partie : ${response.status}`);
    }

    // On renvoie l'objet JSON qui contient l'identifiant de partie (champ `id`)
    return response.json();
  }

  /**
   * Envoie le résultat de la partie au serveur à la fin du jeu.
   *
   * On transmet le nombre de paires que le joueur n'a pas réussi à trouver.
   *
   * @param {string|number} gameId         - Identifiant de la partie (reçu lors de createGame)
   * @param {number}        pairsRemaining - Nombre de paires que le joueur n'a pas trouvées
   * @returns {Promise<void>}
   * @throws {Error} Si le serveur répond avec une erreur HTTP
   */
  static async updateGameResult(gameId, pairsRemaining) {
    const response = await fetch(`${MEMORY_URL}/${gameId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Nom du champ imposé par le protocole du serveur
        nombreCoupsRestant: pairsRemaining
      })
    });

    // Si le serveur répond avec une erreur (4xx ou 5xx), on lève une exception
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Erreur lors de la mise à jour du score : ${response.status}`);
    }

    // La réponse du serveur n'est volontairement pas lue (protocole imposé)
  }
}
