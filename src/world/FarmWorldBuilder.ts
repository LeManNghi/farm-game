import Phaser from 'phaser';
import { GAME_SETTINGS } from '../config/game.config.ts';
import { FarmTile } from '../entities/FarmTile.ts';

export interface FarmWorld {
  readonly houseDoor: Phaser.GameObjects.Sprite;
  readonly houseDoorPosition: Phaser.Math.Vector2;
  readonly houseColliders: Phaser.Physics.Arcade.StaticGroup;
  readonly gateColliders: Phaser.Physics.Arcade.StaticGroup;
  readonly farmTiles: ReadonlyMap<string, FarmTile>;
}

export class FarmWorldBuilder {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public build(): FarmWorld {
    const farmTiles = this.createGround();
    const gateColliders = this.createFlowerGate();
    const house = this.createHouse();

    return { ...house, gateColliders, farmTiles };
  }

  private createGround(): ReadonlyMap<string, FarmTile> {
    const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_SETTINGS;
    const map = this.scene.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: MAP_COLS,
      height: MAP_ROWS,
    });
    const grassTileset = map.addTilesetImage('grass', 'grass', 16, 16);
    if (!grassTileset) {
      throw new Error('Không thể tạo tileset cho bản đồ nông trại');
    }

    const groundLayer = map.createBlankLayer('Ground', grassTileset, 0, 0);
    if (!groundLayer) {
      throw new Error('Không thể tạo layer cho bản đồ nông trại');
    }

    groundLayer.setDepth(0);
    groundLayer.fill(grassTileset.firstgid + 12, 0, 0, MAP_COLS, MAP_ROWS);

    const plot = { x: 29, y: 19, width: 6, height: 5 };
    const flowers = [4, 5, 6, 13, 14].map((frame) => grassTileset.firstgid + frame);

    for (let y = 0; y < MAP_ROWS; y += 1) {
      for (let x = 0; x < MAP_COLS; x += 1) {
        const inHouse = x >= 17 && x <= 23 && y >= 11 && y <= 15;
        const inPlot =
          x >= plot.x && x < plot.x + plot.width &&
          y >= plot.y && y < plot.y + plot.height;
        const inGate = (x === 31 || x === 32) && (y === 17 || y === 18);

        if (!inHouse && !inPlot && !inGate && Math.random() < 0.12) {
          groundLayer.putTileAt(Phaser.Utils.Array.GetRandom(flowers), x, y);
        }
      }
    }

    const farmTiles = new Map<string, FarmTile>();
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const id = `${col}:${row}`;
        farmTiles.set(id, new FarmTile(
          this.scene,
          plot.x * TILE_SIZE + col * 32 + 16,
          plot.y * TILE_SIZE + row * 32 + 16,
        ));
      }
    }
    return farmTiles;
  }

  private createFlowerGate(): Phaser.Physics.Arcade.StaticGroup {
    const { TILE_SIZE } = GAME_SETTINGS;
    const x = 31 * TILE_SIZE;
    const y = 17 * TILE_SIZE;

    this.scene.add.image(x, y, 'flower_gate_top_left').setOrigin(0).setDepth(1000);
    this.scene.add.image(x + TILE_SIZE, y, 'flower_gate_top_right').setOrigin(0).setDepth(1000);
    this.scene.add.image(x, y + TILE_SIZE, 'flower_bottom_top_left').setOrigin(0).setDepth(5);
    this.scene.add.image(x + TILE_SIZE, y + TILE_SIZE, 'flower_bottom_top_right').setOrigin(0).setDepth(5);

    const colliders = this.scene.physics.add.staticGroup();
    this.addObstacle(colliders, x + 4, y + TILE_SIZE + 6, 6, 12);
    this.addObstacle(colliders, x + TILE_SIZE * 2 - 4, y + TILE_SIZE + 6, 6, 12);
    return colliders;
  }

  private createHouse(): Omit<FarmWorld, 'gateColliders' | 'farmTiles'> {
    const { TILE_SIZE } = GAME_SETTINGS;
    const x = 18 * TILE_SIZE;
    const y = 12 * TILE_SIZE;
    const bottomY = y + 2 * TILE_SIZE;
    const colliders = this.scene.physics.add.staticGroup();

    [1, 2, 3].forEach((col) => {
      this.scene.add.image(x + col * TILE_SIZE, y + TILE_SIZE, 'wooden_house_sheet', 15)
        .setOrigin(0).setDepth(2);
    });
    [[0, 10], [1, 13], [3, 13], [4, 12]].forEach(([col, frame]) => {
      this.scene.add.image(x + col * TILE_SIZE, y + TILE_SIZE, 'house_walls', frame)
        .setOrigin(0).setDepth(bottomY);
    });

    const doorX = x + 2 * TILE_SIZE;
    const doorY = y + TILE_SIZE;
    const houseDoor = this.scene.add.sprite(doorX, doorY, 'doors', 3)
      .setOrigin(0).setDepth(bottomY);

    [25, 26, 26, 26, 27].forEach((frame, col) => {
      this.scene.add.image(x + col * TILE_SIZE, y, 'wooden_house_sheet', frame)
        .setOrigin(0).setDepth(bottomY + 5);
    });
    this.scene.add.image(x + TILE_SIZE, y - 2, 'wooden_house_sheet', 28)
      .setOrigin(0).setDepth(bottomY + 6);
    [32, 33, 33, 33, 34].forEach((frame, col) => {
      this.scene.add.image(x + col * TILE_SIZE, y + TILE_SIZE, 'wooden_house_sheet', frame)
        .setOrigin(0).setDepth(bottomY + 5);
    });

    this.addObstacle(colliders, x + 40, y + 8, 80, 16);
    this.addObstacle(colliders, x + 16, y + 24, 32, 16);
    this.addObstacle(colliders, x + 64, y + 24, 32, 16);

    return {
      houseDoor,
      houseDoorPosition: new Phaser.Math.Vector2(doorX + TILE_SIZE / 2, doorY + TILE_SIZE / 2),
      houseColliders: colliders,
    };
  }

  private addObstacle(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const obstacle = this.scene.add.zone(x, y, width, height);
    this.scene.physics.add.existing(obstacle, true);
    group.add(obstacle);
  }
}
