import { DOMManager }     from './DOMManager.js';
import { Game }           from './Game.js';
import { ApiService }     from './ApiService.js';
import { HistoryService } from './HistoryService.js';

const domManager = new DOMManager();
const game       = new Game(domManager);

// Affiche l'historique dès le chargement de la page (fonctionnalité 4)
domManager.renderHistory(HistoryService.load());

console.log('Memory game chargé !');

document.querySelector('.game-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  const pseudo     = document.querySelector('#input-name').value.trim();
  const difficulty = document.querySelector('#input-difficulty').value;
  const collection = document.querySelector('#input-collection').value;

  if (!pseudo) {
    document.getElementById('input-name').focus();
    alert('Veuillez entrer votre pseudo avant de commencer.');
    return;
  }

  try {
    const data = await ApiService.createGame(pseudo, difficulty);
    console.log('Partie créée :', data, 'id =', data.id);
    game.startGame(data.id, difficulty, collection, pseudo);
  } catch (error) {
    console.error('Erreur :', error);
    alert(error.message || 'Erreur lors de la création de la partie');
  }
});

// ── Gestion du thème clair / sombre ──
const btnTheme = document.getElementById('btn-theme');
const THEME_KEY = 'memory-theme';

function applyTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  btnTheme.textContent = theme === 'light' ? 'Mode Sombre🌙' : 'Mode Clair☀️';
}

// Charger la préférence sauvegardée (ou suivre le système)
const saved = localStorage.getItem(THEME_KEY)
    ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

applyTheme(saved);

btnTheme.addEventListener('click', () => {
  const next = document.body.classList.contains('light-mode') ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});
