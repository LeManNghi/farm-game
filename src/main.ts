import './styles/index.scss';
import Phaser from 'phaser';
import { createGameConfig } from './config/game.config.ts';
import { BootScene } from './scenes/BootScene.ts';
import { MainScene } from './scenes/MainScene.ts';
import { HouseScene } from './scenes/HouseScene.ts';

import { InstructionsModal } from './ui/InstructionsModal.ts';

// Khởi tạo Game Phaser với BootScene, MainScene và HouseScene
const config = createGameConfig([BootScene, MainScene, HouseScene]);

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
  new InstructionsModal();
});
