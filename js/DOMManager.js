/**
 * Classe qui gère tout ce qui est affiché à l'écran.
 */
export class DOMManager {

  /**
   * Initialise le gestionnaire d'affichage.
   * On récupère une fois pour toutes les éléments HTML dont on aura besoin,
   * pour éviter de les chercher dans le DOM à chaque mise à jour.
   */
  constructor() {
    /** @type {HTMLElement} Le panneau du formulaire d'accueil */
    this.setupForm = document.querySelector('.setup-form');

    /** @type {HTMLElement} La zone de jeu (plateau + en-tête) */
    this.gameArea = document.querySelector('.game-area');

    /** @type {HTMLElement} La grille qui contient les cartes */
    this.gameBoard = document.querySelector('.game-board');

    /** @type {HTMLElement} La barre d'en-tête au-dessus du plateau */
    this.gameAreaHeader = document.querySelector('.game-area-header');

    /** @type {HTMLElement|null} L'élément texte du chronomètre (créé dans createHeader) */
    this.timerEl = null;

    /** @type {HTMLElement|null} L'élément texte du compteur de paires (créé dans createHeader) */
    this.pairsEl = null;

    /** @type {HTMLElement|null} La barre de progression du chronomètre */
    this.timerBar = document.getElementById('timer-bar');

    /** @type {number} Durée totale de la partie, pour calculer le pourcentage de la barre */
    this.maxTime = 0;

    /**
     * Callbacks stockés pour les boutons du modal.
     * On les définit ici pour pouvoir les changer à chaque nouvelle fin de partie.
     * @type {Function|null}
     */
    this._onReplay = null;
    this._onMenu   = null;

    // On branche les boutons du modal une seule fois au démarrage.
    // Ils appellent la fonction stockée dans _onReplay / _onMenu,
    // qui est mise à jour à chaque appel de showEndModal().
    document.getElementById('modal-replay').addEventListener('click', () => {
      this._onReplay && this._onReplay();
    });
    document.getElementById('modal-menu').addEventListener('click', () => {
      this._onMenu && this._onMenu();
    });
  }

  /** Cache le formulaire d'accueil (quand la partie démarre). */
  hideSetupForm()  { this.setupForm.classList.add('hidden'); }

  /** Affiche le formulaire d'accueil (quand on revient au menu). */
  showSetupForm()  { this.setupForm.classList.remove('hidden'); }

  /** Affiche la zone de jeu (plateau + en-tête). */
  showGameArea()   { this.gameArea.classList.remove('hidden'); }

  /** Cache la zone de jeu (quand la partie est terminée). */
  hideGameArea()   { this.gameArea.classList.add('hidden'); }


  /**
   * Construit et affiche l'en-tête au-dessus du plateau de jeu.
   *
   * On repart d'un en-tête vide à chaque nouvelle partie pour éviter
   * les doublons si le joueur rejoue plusieurs fois.
   *
   * @param {string}   playerName  - Pseudo du joueur à afficher
   * @param {number}   timeSeconds - Durée totale de la partie en secondes
   * @param {number}   totalGroups - Nombre total de paires à trouver
   * @param {Function} onAbandon   - Fonction à appeler quand on clique sur "Abandonner"
   */
  createHeader(playerName, timeSeconds, totalGroups, onAbandon) {
    // On vide l'en-tête précédent avant d'en créer un nouveau
    this.gameAreaHeader.innerHTML = '';
    this.maxTime = timeSeconds;

    // Affichage du pseudo du joueur
    const nameEl = document.createElement('span');
    nameEl.className   = 'header-player';
    nameEl.textContent = `👤 ${playerName}`;

    // Compteur de paires (ex: "0 / 6 paires")
    this.pairsEl = document.createElement('span');
    this.pairsEl.className = 'header-pairs';
    // Au départ, aucune paire n'est trouvée donc remaining = total
    this.updatePairsInfo(totalGroups, totalGroups);

    // Chronomètre textuel (ex: "⏱ 03:00")
    this.timerEl = document.createElement('span');
    this.timerEl.className = 'game-timer';
    this.updateTimer(timeSeconds);

    // Bouton d'abandon
    const btn = document.createElement('button');
    btn.id          = 'abandon';
    btn.textContent = '🏳️ Abandonner';
    btn.addEventListener('click', onAbandon);

    // On ajoute tous les éléments dans l'en-tête
    this.gameAreaHeader.append(nameEl, this.pairsEl, this.timerEl, btn);

    // On remet la barre de progression à 100% (pleine) au début de la partie
    if (this.timerBar) {
      this.timerBar.style.width = '100%';
      this.timerBar.className   = 'timer-bar';
    }
  }

  /**
   * Met à jour l'affichage du chronomètre et de la barre de progression.
   *
   * Appelée toutes les secondes par Game.js.
   *
   * Pour la barre de progression :
   * - On calcule le pourcentage de temps restant.
   * - On change la couleur selon ce pourcentage :
   *     > 50 % → verte
   *     25–50 % → orange
   *     < 25 % → rouge clignotant
   *
   * @param {number} timeSeconds - Nombre de secondes restantes
   */
  updateTimer(timeSeconds) {
    if (!this.timerEl) return;

    // Formatage en MM:SS (ex: 150 s → "02:30")
    const m = String(Math.floor(timeSeconds / 60)).padStart(2, '0');
    const s = String(timeSeconds % 60).padStart(2, '0');
    this.timerEl.textContent = `⏱ ${m}:${s}`;

    // Clignotement rouge si moins de 30 secondes
    this.timerEl.classList.toggle('timer-warning', timeSeconds <= 30);

    // Mise à jour de la barre de progression
    if (this.timerBar && this.maxTime > 0) {
      // Pourcentage de temps restant (de 100% à 0%)
      const pct = (timeSeconds / this.maxTime) * 100;
      this.timerBar.style.width = `${pct}%`;

      // On retire les classes de couleur précédentes avant d'en mettre une nouvelle
      this.timerBar.classList.remove('bar-ok', 'bar-warn', 'bar-danger');
      if (pct > 50)      this.timerBar.classList.add('bar-ok');      // vert
      else if (pct > 25) this.timerBar.classList.add('bar-warn');    // orange
      else               this.timerBar.classList.add('bar-danger');  // rouge
    }
  }

  /**
   * Met à jour le compteur de paires trouvées affiché dans l'en-tête.
   * Exemple : "3 / 6 paires"
   *
   * @param {number} remaining - Nombre de paires pas encore trouvées
   * @param {number} total     - Nombre total de paires dans la partie
   */
  updatePairsInfo(remaining, total) {
    if (!this.pairsEl) return;
    // On affiche les paires trouvées = total - restantes
    this.pairsEl.textContent = ` ${total - remaining} / ${total} paires`;
  }

  /**
   * Affiche la fenêtre modale à la fin de la partie avec le résultat du joueur.
   *
   * @param {Object}   opts
   * @param {string}   opts.title        - Titre affiché en haut du modal
   * @param {string}   opts.icon         - Emoji représentant le résultat
   * @param {number}   opts.score        - Score calculé par Game.computeScore()
   * @param {number}   opts.matchedPairs - Nombre de paires trouvées
   * @param {number}   opts.totalPairs   - Nombre total de paires dans la partie
   * @param {number}   opts.timeLeft     - Secondes restantes au moment de la fin
   * @param {Function} opts.onReplay     - Fonction appelée quand on clique sur "Rejouer"
   * @param {Function} opts.onMenu       - Fonction appelée quand on clique sur "Menu"
   */
  showEndModal({ title, icon, score, matchedPairs, totalPairs, timeLeft, onReplay, onMenu }) {
    // On mémorise les callbacks pour que les boutons du modal puissent les appeler
    this._onReplay = onReplay;
    this._onMenu   = onMenu;

    // Remplissage du contenu du modal
    document.getElementById('modal-icon').textContent  = icon;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-score').textContent = score;
    document.getElementById('modal-pairs').textContent = `${matchedPairs} / ${totalPairs}`;

    // Formatage du temps restant en MM:SS
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    document.getElementById('modal-time').textContent = `${m}:${s}`;

    const modal = document.getElementById('end-modal');
    modal.classList.remove('hidden');

    // requestAnimationFrame garantit que le navigateur a peint l'élément
    // avant qu'on ajoute la classe d'animation, sinon la transition CSS ne se joue pas
    requestAnimationFrame(() => modal.classList.add('modal-visible'));
  }

  /**
   * Cache le modal de fin de partie avec une animation de sortie.
   * On retire d'abord la classe visible (ce qui joue l'animation CSS de fermeture),
   * puis on cache l'élément après 300 ms (durée de la transition).
   */
  hideEndModal() {
    const modal = document.getElementById('end-modal');
    modal.classList.remove('modal-visible');
    // On attend la fin de l'animation CSS avant de cacher complètement l'élément
    setTimeout(() => modal.classList.add('hidden'), 300);
  }

  /**
   * Affiche le tableau des dernières parties sous le formulaire d'accueil.
   *
   * Si l'historique est vide, la section est cachée.
   * Sinon, on génère une ligne de tableau par partie enregistrée.
   *
   * @param {Array} entries - Tableau de parties enregistrées par HistoryService
   *   Chaque entrée contient : pseudo, difficulty, score, matchedPairs, totalPairs, timeLeft
   */
  renderHistory(entries) {
    const section = document.getElementById('history-section');
    const body    = document.getElementById('history-body');

    // Pas d'historique → on cache la section entière
    if (!entries || entries.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');
    body.innerHTML = ''; // On efface l'ancien tableau avant de le reconstruire

    entries.forEach(e => {
      const tr = document.createElement('tr');

      // Formatage du temps restant en MM:SS
      const m = String(Math.floor(e.timeLeft / 60)).padStart(2, '0');
      const s = String(e.timeLeft % 60).padStart(2, '0');

      tr.innerHTML = `
        <td>${e.pseudo}</td>
        <td>${e.difficulty}</td>
        <td class="score-cell">${e.score}</td>
        <td>${e.matchedPairs}/${e.totalPairs}</td>
        <td>${m}:${s}</td>
      `;
      body.appendChild(tr);
    });
  }

  /**
   * Génère et affiche toutes les cartes sur le plateau de jeu.
   *
   * Le flip est déclenché par la classe CSS 'flipped' ou 'matched'
   * qui applique une rotation rotateY(180deg) sur .card-inner.
   *
   * Nombre de colonnes selon le nombre de cartes :
   * - 8  cartes → 4 colonnes (grille 4×2)
   * - 10 cartes → 5 colonnes (grille 5×2)
   * - 12 cartes → 4 colonnes (grille 4×3)
   * - 16 cartes → 4 colonnes (grille 4×4)
   *
   * @param {Array}    images      - Tableau de cartes préparé par Game.prepareCards()
   * @param {Function} onCardClick - Fonction à appeler quand le joueur clique sur une carte
   */
  createCards(images, onCardClick) {
    // On vide le plateau avant de créer les nouvelles cartes
    this.gameBoard.innerHTML = '';

    // Calcul du nombre de colonnes selon le nombre total de cartes
    const total = images.length;
    let cols;
    if (total === 8)       cols = 4; // grille 4×2
    else if (total === 10) cols = 5; // grille 5×2
    else if (total === 12) cols = 4; // grille 4×3
    else if (total === 16) cols = 4; // grille 4×4
    else                   cols = Math.ceil(Math.sqrt(total)); // cas générique

    this.gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    images.forEach((cardData, index) => {
      // Conteneur principal de la carte
      const card = document.createElement('div');
      card.className = 'card';

      // imageId identifie la paire (même valeur pour les 2 cartes identiques)
      card.dataset.imageId  = String(cardData.id);
      // uniqueId distingue les deux cartes d'une même paire entre elles
      card.dataset.uniqueId = cardData.uniqueId;

      // Délai d'apparition progressif : chaque carte apparaît 40 ms après la précédente
      card.style.animationDelay = `${index * 40}ms`;

      // Couche intermédiaire qui effectue la rotation lors du flip
      const inner = document.createElement('div');
      inner.className = 'card-inner';

      // Face cachée : le dos de la carte (image mask)
      const front = document.createElement('div');
      front.className = 'card-front';
      const maskImg = document.createElement('img');
      maskImg.src = './assets/images/mask1.jpg';
      maskImg.alt = 'carte';
      front.appendChild(maskImg);

      // Face visible : l'image de la collection à trouver
      const back = document.createElement('div');
      back.className = 'card-back';
      const img = document.createElement('img');
      img.src  = cardData.url;
      img.alt  = cardData.name;
      back.appendChild(img);

      inner.append(front, back);
      card.appendChild(inner);

      // Au clic, on transmet la carte à Game.handleCardClick()
      card.addEventListener('click', () => onCardClick(card));
      this.gameBoard.appendChild(card);
    });
  }

  /**
   * Joue une animation de rebond sur les deux cartes d'une paire trouvée.
   *
   * On ajoute la classe 'match-flash' qui déclenche l'animation CSS.
   *
   * @param {HTMLElement} c1 - Première carte de la paire
   * @param {HTMLElement} c2 - Deuxième carte de la paire
   */
  playMatchAnimation(c1, c2) {
    [c1, c2].forEach(card => {
      card.classList.add('match-flash');
      // On retire la classe dès que l'animation CSS est terminée
      card.addEventListener('animationend', () => card.classList.remove('match-flash'), { once: true });
    });
  }
}
