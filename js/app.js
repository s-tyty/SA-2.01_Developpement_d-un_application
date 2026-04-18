import {DOMManager} from './DOMManager.js';
import {Game} from './Game.js';
import {ApiService} from './ApiService.js';

const domManager = new DOMManager();
const game = new Game(domManager);
console.log("Script loaded!");

// document.addEventListener('submit', async function (event) {
//   event.preventDefault();
//   const pseudo = document.querySelector('input-name').value.trim();
//   const difficulty = document.querySelector('input-difficulty').value;
//   const collection = document.querySelector('input-collection').value;
//   console.log('Form submitted:', pseudo, difficulty, collection);
// });



document.querySelector('.game-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  const pseudo = document.querySelector('#input-name').value.trim();
  const difficulty = document.querySelector('#input-difficulty').value;
  const collection = document.querySelector('#input-collection').value;
  console.log('Form submitted:', pseudo, difficulty, collection);

  if (!pseudo) {
    document.getElementById('input-name').focus();
    alert('Veuillez entrer votre pseudo avant de commencer.');
    return;
  }
  try {
    const data = await ApiService.createGame(pseudo, difficulty, collection);
    console.log('Success:', data, data.id);
    game.startGame(data.id, difficulty, collection, pseudo);
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Erreur lors de la création de la partie');
  }
});
