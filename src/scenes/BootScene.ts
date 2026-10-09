import Phaser from 'phaser';
import { CROP_DEFINITIONS } from '../config/items.config.ts';
import { gameServices } from '../state/GameServices.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Tạo thanh tiến trình loading sinh động
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    progressBox.fillStyle(0x223322, 0.8);
    progressBox.fillRoundedRect(width / 2 - 110, height / 2 - 12, 220, 24, 6);

    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Đang tải nông trại...', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x71c837, 1);
      progressBar.fillRoundedRect(width / 2 - 106, height / 2 - 8, 212 * value, 16, 4);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load các tilesets
    this.load.image('grass', 'assets/tilesets/grass.png');
    this.load.image('tilled_dirt', 'assets/tilesets/tilled_dirt.png');
    this.load.image('fences', 'assets/tilesets/fences.png');
    this.load.image('hills', 'assets/tilesets/hills.png');
    this.load.image('water', 'assets/tilesets/water.png');
    this.load.image('wooden_house', 'assets/tilesets/wooden_house.png');
    this.load.image('farm_tile_dry_wet', 'assets/tilesets/farm_tile_dry_wet.png');
    this.load.spritesheet('farm_tile_states', 'assets/tilesets/farm_tile_dry_wet.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('wood_bridge', 'assets/objects/wood_bridge.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('paths', 'assets/objects/paths.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('stall', 'assets/objects/stall.png');
    this.load.spritesheet('biome_things', 'assets/plants/basic_grass_biome_things.png', {
      frameWidth: 16,
      frameHeight: 16,
    });

    Object.values(CROP_DEFINITIONS).forEach((crop) => {
      this.load.spritesheet(crop.textureKey, crop.assetPath, {
        frameWidth: crop.frameWidth,
        frameHeight: crop.frameHeight,
      });
    });

    // Load Spritesheet cấu trúc căn nhà và nội thất từ Sprout Lands
    this.load.spritesheet('wooden_house_sheet', 'assets/tilesets/wooden_house.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('house_walls', 'assets/tilesets/wooden_house_walls_tileset.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('doors', 'assets/tilesets/doors.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('furniture', 'assets/objects/basic_furniture.png', {
      frameWidth: 16,
      frameHeight: 16,
    });

    // Load Spritesheet nhân vật nông dân (192x192 px -> 4x4 frames kích thước 48x48)
    this.load.spritesheet('character', 'assets/characters/basic_character_spritesheet.png', {
      frameWidth: 48,
      frameHeight: 48,
    });

    // Load hình ảnh nhân vật đang ngủ nhắm mắt
    this.load.image('character_sleeping', 'assets/characters/character_sleeping.png');

    // Load các mảnh ghép Cổng hoa (Flower Gate)
    this.load.image('flower_gate_top_left', 'assets/objects/flower_gate_top_left.png');
    this.load.image('flower_gate_top_right', 'assets/objects/flower_gate_top_right.png');
    this.load.image('flower_bottom_top_left', 'assets/objects/flower_bottom_top_left.png');
    this.load.image('flower_bottom_top_right', 'assets/objects/flower_bottom_top_right.png');
  }

  public create(): void {
    gameServices.loadOnce();
    this.createPlayerAnimations();
    this.createDoorAnimations();
    this.scene.start('MainScene');
  }

  private createDoorAnimations(): void {
    this.anims.create({
      key: 'door-open',
      frames: this.anims.generateFrameNumbers('doors', { frames: [0, 1, 2, 3] }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'door-close',
      frames: this.anims.generateFrameNumbers('doors', { frames: [3, 2, 1, 0] }),
      frameRate: 8,
      repeat: 0,
    });
  }

  private createPlayerAnimations(): void {
    // 4 hướng: Down (hàng 0), Up (hàng 1), Left (hàng 2), Right (hàng 3)
    // Hướng nhìn xuống (Down)
    this.anims.create({
      key: 'player-idle-down',
      frames: this.anims.generateFrameNumbers('character', { frames: [0, 1] }),
      frameRate: 3,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-walk-down',
      frames: this.anims.generateFrameNumbers('character', { frames: [2, 0, 3, 0] }),
      frameRate: 8,
      repeat: -1,
    });

    // Hướng nhìn lên (Up)
    this.anims.create({
      key: 'player-idle-up',
      frames: this.anims.generateFrameNumbers('character', { frames: [4, 5] }),
      frameRate: 3,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-walk-up',
      frames: this.anims.generateFrameNumbers('character', { frames: [6, 4, 7, 4] }),
      frameRate: 8,
      repeat: -1,
    });

    // Hướng nhìn sang trái (Left)
    this.anims.create({
      key: 'player-idle-left',
      frames: this.anims.generateFrameNumbers('character', { frames: [8, 9] }),
      frameRate: 3,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-walk-left',
      frames: this.anims.generateFrameNumbers('character', { frames: [10, 8, 11, 8] }),
      frameRate: 8,
      repeat: -1,
    });

    // Hướng nhìn sang phải (Right)
    this.anims.create({
      key: 'player-idle-right',
      frames: this.anims.generateFrameNumbers('character', { frames: [12, 13] }),
      frameRate: 3,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-walk-right',
      frames: this.anims.generateFrameNumbers('character', { frames: [14, 12, 15, 12] }),
      frameRate: 8,
      repeat: -1,
    });
  }
}
