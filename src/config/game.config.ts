import Phaser from 'phaser';

export const GAME_SETTINGS = {
  TILE_SIZE: 16,
  MAP_COLS: 64,
  MAP_ROWS: 36,
  PLAYER_SPEED: 70,
};

export const createGameConfig = (
  scenes: (typeof Phaser.Scene | Phaser.Scene)[]
): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    parent: 'game-container',
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#9bd4c3',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: scenes,
  };
};
