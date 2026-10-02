import Phaser from 'phaser';

export const GAME_SETTINGS = {
  TILE_SIZE: 16,
  MAP_COLS: 30,
  MAP_ROWS: 22,
  PLAYER_SPEED: 100,
};

export const createGameConfig = (
  scenes: (typeof Phaser.Scene | Phaser.Scene)[]
): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 480,
    height: 320,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#3e6f43',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  };
};
