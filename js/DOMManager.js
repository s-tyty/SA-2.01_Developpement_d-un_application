export class DOMManager {


  /**
   * Ajoute toutes les images d'une collection sur le gameBoard
   * @param {Image[]} images
   */

  constructor() {
    this.setupForm = document.querySelector('.setup-form');
    this.gameArea = document.querySelector('.game-area');
    this.gameBoard = document.querySelector('.game-board');
    this.gameAreaHeader = document.querySelector('.game-area-header');
    this.timerEl = null;
    this.pairsEl = null;
  }

  hideSetupForm() {
    this.setupForm.classList.add('hidden');
  }

  showSetupForm() {
    this.setupForm.classList.remove('hidden');
  }

  showGameArea() {
    this.gameArea.classList.remove('hidden');
  }
  hideGameArea() {
    this.gameArea.classList.add('hidden');
  }

  createHeader(playerName, timeSeconds, totalPairs, onAbandon) {
    this.gameAreaHeader.innerHTML = '';

    const nameEl = document.createElement('span');
    nameEl.className = 'header-player';
    nameEl.textContent = `👤 ${playerName}`;
    nameEl.style.color = 'white';

    this.pairsEl = document.createElement('span');
    this.pairsEl.className = 'header-pairs';
    this.pairsEl.style.color = 'white';
    this.updatePairsInfo(totalPairs, totalPairs);

    this.timerEl = document.createElement('span');
    this.timerEl.className = 'game-timer';
    this.updateTimer(timeSeconds);

    const btn = document.createElement('button');
    btn.id = 'abandon';
    btn.textContent = '🏳️ Abandonner';
    btn.addEventListener('click', onAbandon);

    this.gameAreaHeader.append(nameEl, this.pairsEl, this.timerEl, btn);
  }

  updateTimer(timeSeconds) {
    if (!this.timerEl) return;
    const m = String(Math.floor(timeSeconds / 60)).padStart(2, '0');
    const s = String(timeSeconds % 60).padStart(2, '0');
    this.timerEl.textContent = `⏱ ${m}:${s}`;
    this.timerEl.classList.toggle('timer-warning', timeSeconds <= 30);
  }

  updatePairsInfo(remaining, total) {
    if (!this.pairsEl) return;
    this.pairsEl.textContent = `🃏 ${total - remaining} / ${total} paires`;
  }

  showEndMessage(message) {
    alert(message);
  }

  createCards(images, onCardClick) {
    const gameBoard = document.querySelector('.game-board');
    gameBoard.innerHTML = '';

    if (images.length > 20) {
        gameBoard.classList.add('cols-5'); 
    } else {
        gameBoard.classList.remove('cols-5');
    }

    images.forEach(cardData => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.imageId = String(cardData.id);
      card.dataset.uniqueId = cardData.uniqueId;
      console.log("card.dataset.imageId:", card.dataset.imageId, "cardData.id:", cardData.id);
      const inner = document.createElement('div');
      inner.className = 'card-inner';

      const front = document.createElement('div');
      front.className = 'card-front';
      const maskImg = document.createElement('img');
      maskImg.src = './assets/images/mask1.jpg';
      maskImg.alt = 'carte';
      maskImg.style.width = '100%';
      maskImg.style.height = '100%';
      maskImg.style.objectFit = 'cover';
      front.appendChild(maskImg);

      const back = document.createElement('div');
      back.className = 'card-back';
      const img = document.createElement('img');
      img.src = cardData.url;
      img.alt = cardData.name;
      back.appendChild(img);

      inner.append(front, back);
      card.appendChild(inner);
      card.addEventListener('click', () => onCardClick(card));
      this.gameBoard.appendChild(card);

    });
    /**
     * Voici un exemple de contenu de card permettant de contenir une partie masqué
     * et l'image qui doit être révélée.
     *
     <div class="card-inner">
     <div class="card-front">
     <img src="./assets/images/mask1.jpg" alt="Hidden card">
     </div>
     <div class="card-back hidden">
     <img src="${image.url}" alt="${image.name}">
     </div>
     </div>
     */

  }
}
