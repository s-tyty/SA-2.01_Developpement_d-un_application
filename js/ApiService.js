import {MEMORY_URL} from './config.js';

/**
 * Service pour centraliser les appels API du jeu Memory.
*/

export class ApiService {
  /**
   * Crée une nouvelle partie sur le serveur.
   * @param {string} pseudo nom du joueur
   * @param {number} difficulty niveau de difficulé
   * @returns {Promise<GameReturn>}
   */
  static async createGame(pseudo, difficulty,collection) {
    const difficultyMap = { 'facile': 1, 'moyen': 2, 'difficile': 3 };
    const diffValue = difficultyMap[difficulty] || 2;

    const response = await fetch(`${MEMORY_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
            name: pseudo,
            difficulty: diffValue,
            collection: collection
      })
    });
    console.log('API Response:', response);

    if (!response.ok) {
      const errorDetail = await response.json();
      console.log("Détails de l'erreur du serveur :", errorDetail);
      throw new Error('Erreur lors de la création de la partie');
    }

    return response.json();
  }

  /**
   * Met à jour le score à la fin d'une partie.
   * @param {number} gameId
   * @param {number} pairsRemaining
   * @returns {Promise<any>}
   */
  static async updateGameResult(gameId, pairsRemaining) {
    const response = await fetch(`${MEMORY_URL}/${gameId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        nombreCoupsRestant: pairsRemaining,
      })
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la mise à jour du score');
    }

    return response.json();
  }
}
