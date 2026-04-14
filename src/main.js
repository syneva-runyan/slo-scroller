import './base.css';
import { Game } from './game/Game.js';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('App root not found');
}

const game = new Game(app);
game.start();