import { imageCollections } from './ImageCollection.js';
import { ApiService }        from './ApiService.js';
import { HistoryService }    from './HistoryService.js';

/**
 * Nombre de cartes identiques par image.
 */
const COPIES_PER_IMAGE = 2;

/**
 * Tableau de configuration de chaque niveau de difficulté.
 *
 * Chaque niveau définit :
 * - `totalCards`   : nombre total de cartes sur le plateau
 * - `timeSeconds`  : durée de la partie en secondes
 * - `label`        : texte affiché dans l'interface et l'historique
 * - `multiplier`   : coefficient qui augmente le score selon la difficulté
 */
const DIFFICULTY_CONFIG = {
  facile:    { totalCards: 8,  timeSeconds: 120, label: '😊 Facile',    multiplier: 1 },
  normal:    { totalCards: 10, timeSeconds: 150, label: '🙂 Normal',    multiplier: 1.25 },
  moyen:     { totalCards: 12, timeSeconds: 180, label: '🤔 Moyen',     multiplier: 1.5 },
  difficile: { totalCards: 16, timeSeconds: 240, label: '😈 Difficile', multiplier: 2 },
};

/**
 * Classe principale qui gère toute la logique du jeu Memory.
 *
 * Elle s'occupe de :
 * - préparer et mélanger les cartes
 * - gérer les clics du joueur
 * - vérifier si deux cartes forment une paire
 * - faire tourner le chronomètre
 * - déclencher la fin de partie
 */
export class Game {

  /**
   * Crée une nouvelle instance du jeu.
   * @param {DOMManager} domManager - L'objet qui gère l'affichage à l'écran
   */
  constructor(domManager) {
    /** @type {DOMManager} Référence vers le gestionnaire d'affichage */
    this.dom = domManager;

    /** @type {string|number|null} Identifiant de la partie renvoyé par le serveur */
    this.id = null;

    /** @type {string|null} Niveau de difficulté choisi ('facile', 'normal', 'moyen', 'difficile') */
    this.difficulty = null;

    /** @type {string|null} Pseudo du joueur */
    this.playerName = null;

    /** @type {string|null} Collection d'images choisie ('animals', 'fruits', 'cars') */
    this._collection = null;

    /** @type {HTMLElement[]} Les deux cartes actuellement retournées par le joueur */
    this.flippedCards = [];

    /** @type {number} Nombre de paires déjà trouvées pendant la partie */
    this.matchedPairs = 0;

    /** @type {number} Nombre total de paires à trouver pour gagner */
    this.totalPairs = 0;

    /**
     * @type {boolean} Verrou qui empêche le joueur de cliquer pendant
     * qu'une vérification de paire est en cours (ex: le délai de 1 s avant de recacher les cartes)
     */
    this.isLocked = false;

    /** @type {number|null} Référence vers l'intervalle du chronomètre (pour pouvoir l'arrêter) */
    this.timerInterval = null;

    /** @type {number} Secondes restantes avant la fin de la partie */
    this.timeLeft = 0;

    /** @type {number} Durée totale de la partie en secondes (utilisée pour la barre de progression) */
    this.maxTime = 0;
  }

  /**
   * Mélange un tableau de façon aléatoire en utilisant l'algorithme Fisher-Yates.
   *
   * Principe : on part de la fin du tableau et on échange chaque élément
   * avec un élément choisi au hasard parmi ceux qui le précèdent (lui inclus).
   * Cela garantit que toutes les permutations sont équiprobables.
   *
   * @param {Array} array - Le tableau à mélanger (non modifié, on travaille sur une copie)
   * @returns {Array} Un nouveau tableau avec les mêmes éléments dans un ordre aléatoire
   */
  shuffle(array) {
    // On copie le tableau pour ne pas modifier l'original
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      // On choisit un index aléatoire entre 0 et i (inclus)
      const j = Math.floor(Math.random() * (i + 1));
      // On échange les éléments aux positions i et j
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Calcule le nombre de paires qu'il reste à trouver.
   * C'est une propriété calculée automatiquement à partir des compteurs existants.
   * @returns {number}
   */
  get remainingPairs() {
    return this.totalPairs - this.matchedPairs;
  }

  /**
   * Calcule le score final du joueur à la fin d'une partie.
   *
   * Formule :
   *   (paires trouvées × 100 + secondes restantes × 2) × multiplicateur du niveau
   *
   * - Les paires trouvées rapportent 100 points chacune.
   * - Chaque seconde non utilisée rapporte 2 points (bonus de rapidité).
   * - Le tout est multiplié par le coefficient du niveau pour récompenser
   *   les niveaux plus difficiles.
   *
   * @returns {number} Le score arrondi à l'entier le plus proche
   */
  computeScore() {
    const config = DIFFICULTY_CONFIG[this.difficulty];
    const base   = this.matchedPairs * 100 + this.timeLeft * 2;
    return Math.round(base * (config?.multiplier ?? 1));
  }

  /**
   * Prépare la liste des cartes pour une partie.
   *
   * Étapes :
   * 1. On récupère la collection d'images choisie (animaux, fruits, voitures).
   * 2. On mélange cette collection pour sélectionner des images différentes à chaque partie.
   * 3. On garde uniquement le bon nombre d'images (= nombre de paires).
   * 4. Pour chaque image, on crée 2 cartes identiques (la paire).
   * 5. On mélange toutes les cartes pour les disposer aléatoirement sur le plateau.
   *
   * Chaque carte reçoit un `uniqueId` pour la distinguer de son jumeau
   * (ex: "3-0" et "3-1" pour les deux cartes de l'image 3).
   *
   * @param {string} collection - Nom de la collection ('animals', 'fruits', 'cars')
   * @param {number} totalCards - Nombre total de cartes à afficher sur le plateau
   * @returns {Array} Tableau de cartes mélangées, prêtes à être affichées
   */
  prepareCards(collection, totalCards) {
    // Si la collection demandée n'existe pas, on utilise les animaux par défaut
    const col      = imageCollections[collection] ?? imageCollections.animals;
    const numPairs = totalCards / COPIES_PER_IMAGE;

    // On mélange la collection pour ne pas toujours prendre les mêmes images
    const shuffledCol    = this.shuffle(col);
    const selectedImages = shuffledCol.slice(0, numPairs);

    // On crée 2 cartes pour chaque image sélectionnée
    const cards = [];
    selectedImages.forEach(img => {
      const groupId = String(img.id);
      for (let c = 0; c < COPIES_PER_IMAGE; c++) {
        // uniqueId permet de distinguer les deux cartes d'une même paire
        cards.push({ ...img, id: groupId, uniqueId: `${groupId}-${c}` });
      }
    });

    // Mélange final pour disposer les cartes dans un ordre aléatoire
    return this.shuffle(cards);
  }

  /**
   * Lance le chronomètre de la partie.
   *
   * Toutes les secondes, on diminue `timeLeft` d'une unité et on met
   * à jour l'affichage. Quand le temps atteint 0, la partie se termine
   * automatiquement.
   */
  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.dom.updateTimer(this.timeLeft);

      // Si le temps est écoulé, on bloque les clics et on termine la partie
      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.isLocked = true;
        this.endGame();
      }
    }, 1000); // s'exécute toutes les 1000 ms (1 seconde)
  }

  /**
   * Arrête le chronomètre.
   * On efface l'intervalle et on remet la référence à null pour éviter
   * des appels en double si stopTimer() est appelé plusieurs fois.
   */
  stopTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  /**
   * Gère ce qui se passe quand le joueur clique sur une carte.
   *
   * On ignore le clic si :
   * - le jeu est verrouillé (une vérification de paire est en cours)
   * - la paire trouvée
   * - la carte est déjà retournée (évite de retourner deux fois la même carte)
   *
   * Sinon, on retourne la carte et on vérifie s'il s'agit de la deuxième
   * carte retournée. Si oui, on lance la vérification de paire.
   *
   * @param {HTMLElement} card - L'élément DOM de la carte cliquée
   */
  handleCardClick(card) {
    // On ignore le clic dans ces trois situations
    if (
      this.isLocked ||
      card.classList.contains('matched') ||
      card.classList.contains('flipped')
    ) return;

    // On retourne la carte (la classe CSS 'flipped' déclenche l'animation 3D)
    card.classList.add('flipped');
    this.flippedCards.push(card);

    // Si deux cartes sont retournées, on vérifie si elles forment une paire
    if (this.flippedCards.length === 2) {
      this.checkMatch();
    }
  }

  /**
   * Vérifie si les deux cartes retournées forment une paire.
   *
   * On compare leur `imageId` (l'identifiant de l'image, commun aux deux
   * cartes d'une même paire). Si c'est identique → paire trouvée.
   *
   * CAS PAIRE TROUVÉE :
   * - Les deux cartes reçoivent la classe 'matched' (elles restent visibles)
   * - On joue une animation de succès
   * - On met à jour le compteur de paires
   * - Si toutes les paires sont trouvées, la partie se termine
   *
   * CAS PAIRE NON TROUVÉE :
   * - On attend 1 seconde (pour que le joueur voie les cartes)
   * - Puis on les retourne à nouveau face cachée
   * - Le verrou `isLocked` empêche de cliquer pendant cette seconde
   */
  checkMatch() {
    // On verrouille pour empêcher de cliquer pendant la vérification
    this.isLocked = true;
    const [c1, c2] = this.flippedCards;

    // On compare les identifiants d'image (pas les uniqueId, qui sont différents pour chaque carte)
    const isMatch = c1.dataset.imageId === c2.dataset.imageId;

    if (isMatch) {
      // Paire trouvée : les cartes restent visibles et sont marquées comme appariées
      c1.classList.add('matched');
      c2.classList.add('matched');
      this.matchedPairs++;

      // Animation de rebond sur les cartes trouvées
      this.dom.playMatchAnimation(c1, c2);
      this.dom.updatePairsInfo(this.remainingPairs, this.totalPairs);

      // On vide la liste et on déverrouille immédiatement (pas besoin d'attendre)
      this.flippedCards = [];
      this.isLocked     = false;

      // Si toutes les paires sont trouvées, on termine la partie (victoire)
      if (this.matchedPairs === this.totalPairs) {
        this.endGame();
      }
    } else {
      // Paire non trouvée : on attend 1 seconde avant de recacher les cartes
      setTimeout(() => {
        c1.classList.remove('flipped');
        c2.classList.remove('flipped');
        this.flippedCards = [];
        this.isLocked     = false; // On déverrouille après le délai
      }, 1000);
    }
  }

  /**
   * Termine la partie en cours, quelle qu'en soit la raison
   * (victoire, temps écoulé ou abandon).
   *
   * Étapes :
   * 1. On arrête le chronomètre et on bloque les clics.
   * 2. On envoie le résultat au serveur (nombre de paires restantes).
   * 3. On calcule le score final.
   * 4. On sauvegarde la partie dans l'historique local.
   * 5. On détermine le message à afficher selon la raison de fin.
   * 6. On cache le plateau et on affiche le modal de résultat.
   */
  async endGame() {
    this.stopTimer();
    this.isLocked = true;

    // Envoi du résultat au serveur — on continue même si ça échoue
    try {
      await ApiService.updateGameResult(this.id, this.remainingPairs);
    } catch (error) {
      console.error('Erreur fin de partie :', error);
    }

    const score = this.computeScore();

    // Sauvegarde de la partie dans le localStorage (historique local)
    HistoryService.save({
      pseudo:       this.playerName,
      difficulty:   DIFFICULTY_CONFIG[this.difficulty]?.label ?? this.difficulty,
      score,
      matchedPairs: this.matchedPairs,
      totalPairs:   this.totalPairs,
      timeLeft:     this.timeLeft,
    });

    // On choisit le titre et l'icône selon la raison de fin de partie
    let title, icon;
    if (this.remainingPairs === 0) {
      // Toutes les paires ont été trouvées → victoire
      title = 'Félicitations !';
      icon  = '🎉';
    } else if (this.timeLeft <= 0) {
      // Le temps est tombé à 0 avant la fin
      title = 'Temps écoulé !';
      icon  = '⏰';
    } else {
      // Le joueur a cliqué sur "Abandonner"
      title = 'Partie abandonnée';
      icon  = '🏳️';
    }

    this.dom.hideGameArea();

    // Affichage du modal de fin avec les boutons Rejouer et Menu
    this.dom.showEndModal({
      title,
      icon,
      score,
      matchedPairs: this.matchedPairs,
      totalPairs:   this.totalPairs,
      timeLeft:     this.timeLeft,
      onReplay: () => {
        // Rejouer : on relance une partie avec les mêmes paramètres
        this.dom.hideEndModal();
        this.startGame(null, this.difficulty, this._collection, this.playerName, true);
      },
      onMenu: () => {
        // Menu : on retourne au formulaire d'accueil
        this.dom.hideEndModal();
        this.dom.renderHistory(HistoryService.load());
        this.dom.showSetupForm();
      },
    });
  }

  /**
   * Démarre une nouvelle partie avec les paramètres choisis par le joueur.
   *
   * Si `isReplay` est vrai (bouton "Rejouer"), on recrée une partie côté
   * serveur avant de démarrer, car l'identifiant précédent n'est plus valide.
   *
   * @param {string|number|null} id         - Identifiant de partie renvoyé par le serveur (null si replay)
   * @param {string}             difficulty - Niveau choisi ('facile', 'normal', 'moyen', 'difficile')
   * @param {string}             collection - Collection d'images ('animals', 'fruits', 'cars')
   * @param {string}             playerName - Pseudo du joueur
   * @param {boolean}            [isReplay] - Si true, on recrée une partie avant de démarrer
   */
  async startGame(id, difficulty, collection, playerName, isReplay = false) {
    // En mode replay, on demande un nouvel identifiant au serveur
    if (isReplay) {
      try {
        const data = await ApiService.createGame(playerName, difficulty);
        id = data.id;
      } catch (error) {
        console.error('Erreur création partie (replay) :', error);
        // En cas d'échec, on retourne au formulaire plutôt que de bloquer
        this.dom.showSetupForm();
        return;
      }
    }

    // Initialisation des propriétés de la partie
    this.id           = id;
    this.difficulty   = difficulty;
    this.playerName   = playerName;
    this._collection  = collection;
    this.matchedPairs = 0;
    this.flippedCards = [];
    this.isLocked     = false;

    // Récupération de la configuration du niveau choisi
    const config = DIFFICULTY_CONFIG[difficulty];
    if (!config) {
      // Ce cas ne devrait pas arriver si le formulaire est bien rempli
      console.error('Niveau de difficulté inconnu :', difficulty);
      return;
    }

    this.timeLeft   = config.timeSeconds;
    this.maxTime    = config.timeSeconds;
    this.totalPairs = config.totalCards / COPIES_PER_IMAGE;

    // Affichage du plateau et masquage du formulaire
    this.dom.hideSetupForm();
    this.dom.showGameArea();

    // Création de l'en-tête (pseudo, chrono, compteur de paires, bouton abandon)
    this.dom.createHeader(playerName, this.timeLeft, this.totalPairs, () => this.onAbandon());

    // Préparation et affichage des cartes mélangées
    const cards = this.prepareCards(collection, config.totalCards);
    this.dom.createCards(cards, card => this.handleCardClick(card));

    // Lancement du chronomètre
    this.startTimer();
  }

  /**
   * Demande une confirmation au joueur avant d'abandonner la partie.
   * Si le joueur confirme, on appelle endGame() qui gère la suite.
   */
  onAbandon() {
    if (!confirm('Voulez-vous vraiment abandonner la partie ?')) return;
    this.endGame();
  }

  /**
   * Retourne temporairement toutes les cartes non trouvées du plateau
   * pour aider au développement ou tester les fins de partie.
   */
  activateCheatMode() {
    if (this.isLocked) return;

    console.log("⚡ Mode triche activé !");
    this.isLocked = true;

    // On récupère toutes les cartes masquées qui n'ont pas encore été validées
    const hiddenCards = document.querySelectorAll('.card:not(.matched)');

    // On les affiche toutes d'un coup
    hiddenCards.forEach(card => card.classList.add('flipped'));

    // Au bout de 2 secondes, on recache celles qui n'étaient pas sélectionnées par le joueur
    setTimeout(() => {
      hiddenCards.forEach(card => {
        if (!this.flippedCards.includes(card)) {
          card.classList.remove('flipped');
        }
      });
      this.isLocked = false;
    }, 2000);
  }
}
