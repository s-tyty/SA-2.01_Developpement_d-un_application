import { imageCollections } from './ImageCollection.js';
import { ApiService } from './ApiService.js';

const COPIES_PER_IMAGE = 4;

const DIFFICULTY_CONFIG = {
  'facile': { totalCards: 8, timeSeconds: 120 },
  'moyen': { totalCards: 16, timeSeconds: 180 },
  'difficile': { totalCards: 32, timeSeconds: 300 }
};

export class Game {
  /**
   * @type {number} id identifiant de la partie en cours
   */
  #id;
  constructor(domManager) {
    this.dom = domManager;
    this.id = null;
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 0;
    this.isLocked = false;
    this.timerInterval = null;
    this.timeLeft = 0;
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  get remainingPairs() {
    return this.totalPairs - this.matchedPairs;
  }

  prepareCards(collection, totalCards) {
    const col = imageCollections[collection] ?? imageCollections.animals;
    const numGroups = totalCards / COPIES_PER_IMAGE;
    const cards = [];
    for (let i = 0; i < numGroups; i++) {
      const img = col[i % col.length]; 
      const groupId = `${img.id}`;
      for (let c = 0; c < COPIES_PER_IMAGE; c++) {
        cards.push({ ...img, id: groupId, uniqueId: `${groupId}-${c}` });
      }
    }
    return this.shuffle(cards);
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.dom.updateTimer(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.isLocked = true;
        this.dom.showEndMessage('timeout', this.matchedPairs, this.totalPairs);
        this.endGame();
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  handleCardClick(card) {
    // Empêcher de cliquer si le plateau est verrouillé ou si la carte est déjà retournée/trouvée
    if (this.isLocked ||
      card.classList.contains('matched') ||
      card.classList.contains('flipped')) {
      return;
    }

    card.classList.add('flipped');
    this.flippedCards.push(card);

    // Déclencher la vérification seulement quand on a 4 cartes
    if (this.flippedCards.length === 4) {
      this.checkMatch();
    }
  }

  checkMatch() {
    this.isLocked = true;

    // On récupère les 4 cartes retournées
    const [c1, c2, c3, c4] = this.flippedCards;

    // On vérifie si les 4 ont le même ID d'image
    const isMatch = c1.dataset.imageId === c2.dataset.imageId &&
        c1.dataset.imageId === c3.dataset.imageId &&
        c1.dataset.imageId === c4.dataset.imageId;

    if (isMatch) {
      // Si ça match, on les marque toutes comme trouvées
      this.flippedCards.forEach(card => card.classList.add('matched'));
      this.matchedPairs++; // Ici, matchedPairs compte en réalité les "quatuors"

      this.dom.updatePairsInfo(this.totalPairs, this.remainingPairs);
      this.flippedCards = [];
      this.isLocked = false;

      if (this.matchedPairs === this.totalPairs) {
        this.endGame();
      }
    } else {
      // Si ça ne match pas, on les recache après 1 seconde
      setTimeout(() => {
        this.flippedCards.forEach(card => card.classList.remove('flipped'));
        this.flippedCards = [];
        this.isLocked = false;
      }, 1000);
    }
  }

  async endGame() {

    this.stopTimer();
    this.isLocked = true;

    const idARemplacer = this.id;
    const nombreDePairesRestanteARemplacer = this.remainingPairs;

    try {
      const result = await ApiService.updateGameResult(idARemplacer, nombreDePairesRestanteARemplacer);
      console.log('Fin de partie:', result);
      alert(`Félicitations ! Partie terminée. Score : ${this.matchedPairs} paires trouvées.`);

      this.dom.hideGameArea();
      this.dom.showSetupForm();
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Erreur lors de la fin de la partie');
    }

  }

  /**
   * Start a new game.
   * @param {number} id - The game ID.
   */
  startGame(id, difficulty, collection, playerName) {
    this.id = id;
    this.matchedPairs = 0;
    this.flippedCards = [];
    this.isLocked = false;

    const config = DIFFICULTY_CONFIG[difficulty];
    console.log("Config: ", config);
    this.timeLeft = config.timeSeconds;
    this.totalPairs = config.totalCards / 4;
    console.log(this.totalPairs);
    this.dom.hideSetupForm();
    this.dom.showGameArea();

    this.dom.createHeader(playerName, this.timeLeft, this.totalPairs, () => {
      this.onAbandon();
    });

    const cards = this.prepareCards(collection, config.totalCards);
    console.log("Cards prepared: ", cards);
    this.dom.createCards(cards, (card) => this.handleCardClick(card));
    this.startTimer();
  }

  onAbandon() {
    if (!confirm('Voulez-vous vraiment abandonner la partie ?')) return;
    this.stopTimer();
    this.dom.showEndMessage('abandon', this.matchedPairs, this.totalPairs);
    this.endGame();
  }

}
