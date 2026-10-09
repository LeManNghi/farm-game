import Phaser from 'phaser';
import { GAME_SETTINGS } from '../config/game.config.ts';
import { FarmTile } from '../entities/FarmTile.ts';

export interface FarmWorld {
  readonly houseDoor: Phaser.GameObjects.Sprite;
  readonly houseDoorPosition: Phaser.Math.Vector2;
  readonly houseColliders: Phaser.Physics.Arcade.StaticGroup;
  readonly gateColliders: Phaser.Physics.Arcade.StaticGroup;
  readonly waterColliders: Phaser.Physics.Arcade.StaticGroup;
  readonly farmTiles: ReadonlyMap<string, FarmTile>;
}

interface IslandRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class FarmWorldBuilder {
  private readonly scene: Phaser.Scene;

  // 4 hòn đảo theo thiết kế bản đồ
  private readonly leftIsland: IslandRect = { x: 3, y: 14, width: 18, height: 18 };
  private readonly centerIsland: IslandRect = { x: 27, y: 14, width: 19, height: 18 };
  private readonly topIsland: IslandRect = { x: 22, y: 3, width: 12, height: 8 };
  private readonly rightIsland: IslandRect = { x: 50, y: 16, width: 11, height: 10 };

  // Ô đất trồng trọt ở góc dưới bên phải đảo trung tâm
  private readonly farmPlot: IslandRect = { x: 37, y: 22, width: 6, height: 5 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public build(): FarmWorld {
    const farmTiles = this.createGround();
    const gateColliders = this.scene.physics.add.staticGroup();
    const waterColliders = this.createWaterColliders();
    const house = this.createHouse();

    return {
      ...house,
      gateColliders,
      waterColliders,
      farmTiles,
    };
  }

  private createGround(): ReadonlyMap<string, FarmTile> {
    const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_SETTINGS;
    const map = this.scene.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: MAP_COLS,
      height: MAP_ROWS,
    });

    const waterTileset = map.addTilesetImage('water', 'water', 16, 16);
    const grassTileset = map.addTilesetImage('grass', 'grass', 16, 16);
    if (!waterTileset || !grassTileset) {
      throw new Error('Không thể tạo tileset cho bản đồ nông trại');
    }

    // 1. Lớp mặt nước bao quanh (Layer Water)
    const waterLayer = map.createBlankLayer('Water', waterTileset, 0, 0);
    if (!waterLayer) {
      throw new Error('Không thể tạo layer nước');
    }
    waterLayer.setDepth(0);
    waterLayer.fill(waterTileset.firstgid + 0, 0, 0, MAP_COLS, MAP_ROWS);

    // Điểm xuyết vài gợn sóng nước sinh động
    const rippleTiles = [1, 2, 3].map((f) => waterTileset.firstgid + f);
    for (let y = 0; y < MAP_ROWS; y += 1) {
      for (let x = 0; x < MAP_COLS; x += 1) {
        if (!this.isTileOnAnyIsland(x, y) && Math.random() < 0.05) {
          waterLayer.putTileAt(Phaser.Utils.Array.GetRandom(rippleTiles), x, y);
        }
      }
    }

    // 2. Lớp đất cỏ cho 4 hòn đảo (Layer Ground)
    const groundLayer = map.createBlankLayer('Ground', grassTileset, 0, 0);
    if (!groundLayer) {
      throw new Error('Không thể tạo layer đất cỏ');
    }
    groundLayer.setDepth(1);

    // Vẽ 4 hòn đảo tuân thủ đúng chú thích thiết kế từ ảnh grass.png:
    // Biên ngoài (8 ô bao quanh) & Phần bên trong (ô tâm giữa index 12)
    this.buildIsland(groundLayer, grassTileset.firstgid, this.leftIsland);
    this.buildIsland(groundLayer, grassTileset.firstgid, this.centerIsland);
    this.buildIsland(groundLayer, grassTileset.firstgid, this.topIsland);
    this.buildIsland(groundLayer, grassTileset.firstgid, this.rightIsland);

    // 3. Tạo các cây cầu gỗ nối các hòn đảo
    this.createBridges();

    // 4. Quầy hàng (stall) ở hòn đảo bên phải
    this.createStall();

    // 5. Đường đi, vườn hoa hướng dương và nấm trên đảo phía trên
    this.createTopIslandFeatures();

    // 6. Tạo các ô đất trồng trọt FarmTile
    const farmTiles = new Map<string, FarmTile>();
    for (let row = 0; row < this.farmPlot.height; row += 1) {
      for (let col = 0; col < this.farmPlot.width; col += 1) {
        const id = `${col}:${row}`;
        const tile = new FarmTile(
          this.scene,
          (this.farmPlot.x + col) * TILE_SIZE + TILE_SIZE / 2,
          (this.farmPlot.y + row) * TILE_SIZE + TILE_SIZE / 2,
        );
        tile.setDepth(2);
        farmTiles.set(id, tile);
      }
    }

    return farmTiles;
  }

  /**
   * Tạo hòn đảo cỏ theo ma trận 3x3 đã chú thích trong ảnh thiết kế:
   * ✓ Lấy làm biên ngoài (các góc bo tròn và các cạnh)
   * ◯ Lấy làm phần bên trong (tile cỏ đồng nhất ở giữa)
   */
  private buildIsland(
    layer: Phaser.Tilemaps.TilemapLayer,
    grassFirstGid: number,
    island: IslandRect,
  ): void {
    // 9 ô trong khối 3x3 ở góc trên bên trái của grass.png (chiều rộng 11 tiles)
    const TL = grassFirstGid + 0;   // Top-Left corner
    const T = grassFirstGid + 1;    // Top edge
    const TR = grassFirstGid + 2;   // Top-Right corner
    const L = grassFirstGid + 11;   // Left edge
    const INNER = grassFirstGid + 12; // Phần bên trong (vòng tròn đỏ chú thích)
    const R = grassFirstGid + 13;   // Right edge
    const BL = grassFirstGid + 22;  // Bottom-Left corner
    const B = grassFirstGid + 23;   // Bottom edge
    const BR = grassFirstGid + 24;  // Bottom-Right corner

    for (let r = 0; r < island.height; r += 1) {
      for (let c = 0; c < island.width; c += 1) {
        const x = island.x + c;
        const y = island.y + r;
        let tileId = INNER;

        if (r === 0 && c === 0) {
          tileId = TL;
        } else if (r === 0 && c === island.width - 1) {
          tileId = TR;
        } else if (r === 0) {
          tileId = T;
        } else if (r === island.height - 1 && c === 0) {
          tileId = BL;
        } else if (r === island.height - 1 && c === island.width - 1) {
          tileId = BR;
        } else if (r === island.height - 1) {
          tileId = B;
        } else if (c === 0) {
          tileId = L;
        } else if (c === island.width - 1) {
          tileId = R;
        } else {
          tileId = INNER;
        }

        layer.putTileAt(tileId, x, y);
      }
    }
  }

  private isTileOnAnyIsland(x: number, y: number): boolean {
    const islands = [this.leftIsland, this.centerIsland, this.topIsland, this.rightIsland];
    return islands.some(
      (island) =>
        x >= island.x &&
        x < island.x + island.width &&
        y >= island.y &&
        y < island.y + island.height,
    );
  }

  /**
   * Tạo 3 cây cầu gỗ kết nối 4 hòn đảo:
   * 1. Cầu ngang nối đảo Trái và đảo Trung tâm
   * 2. Cầu dọc nối đảo Trên và đảo Trung tâm
   * 3. Cầu ngang nối đảo Trung tâm và đảo Phải
   */
  private createBridges(): void {
    const { TILE_SIZE } = GAME_SETTINGS;

    // 1. Cầu nối Đảo Trái -> Đảo Giữa (hàng y = 22, từ cột 20 đến 27)
    const bridgeY1 = 22 * TILE_SIZE;
    this.scene.add.image(20 * TILE_SIZE, bridgeY1, 'wood_bridge', 2).setOrigin(0).setDepth(2);
    for (let col = 21; col <= 26; col += 1) {
      this.scene.add.image(col * TILE_SIZE, bridgeY1, 'wood_bridge', 3).setOrigin(0).setDepth(2);
    }
    this.scene.add.image(27 * TILE_SIZE, bridgeY1, 'wood_bridge', 4).setOrigin(0).setDepth(2);

    // 2. Cầu nối Đảo Trên -> Đảo Giữa (cột x = 28, từ hàng 10 đến 14)
    const bridgeX2 = 28 * TILE_SIZE;
    this.scene.add.image(bridgeX2, 10 * TILE_SIZE, 'wood_bridge', 0).setOrigin(0).setDepth(2);
    for (let row = 11; row <= 13; row += 1) {
      this.scene.add.image(bridgeX2, row * TILE_SIZE, 'wood_bridge', 5).setOrigin(0).setDepth(2);
    }
    this.scene.add.image(bridgeX2, 14 * TILE_SIZE, 'wood_bridge', 10).setOrigin(0).setDepth(2);

    // 3. Cầu nối Đảo Giữa -> Đảo Phải (hàng y = 21, từ cột 45 đến 50)
    const bridgeY3 = 21 * TILE_SIZE;
    this.scene.add.image(45 * TILE_SIZE, bridgeY3, 'wood_bridge', 2).setOrigin(0).setDepth(2);
    for (let col = 46; col <= 49; col += 1) {
      this.scene.add.image(col * TILE_SIZE, bridgeY3, 'wood_bridge', 3).setOrigin(0).setDepth(2);
    }
    this.scene.add.image(50 * TILE_SIZE, bridgeY3, 'wood_bridge', 4).setOrigin(0).setDepth(2);
  }

  /**
   * Tạo quầy hàng (stall) trên đảo bên phải
   */
  private createStall(): void {
    const { TILE_SIZE } = GAME_SETTINGS;
    const x = 52 * TILE_SIZE;
    const y = 17 * TILE_SIZE;
    this.scene.add.image(x, y, 'stall').setOrigin(0).setDepth(2);
  }

  /**
   * Tạo các chi tiết trên đảo phía trên:
   * 1. Con đường thẳng từ cầu đi lên nửa đảo (cột 28)
   * 2. Vườn hoa hướng dương bên trái đường (cột 23 đến 27)
   * 3. Xen kẽ nấm hồng và tím bên phải đường (cột 29 đến 32)
   */
  private createTopIslandFeatures(): void {
    const { TILE_SIZE } = GAME_SETTINGS;

    // 1. Con đường thẳng từ cầu (hàng 10) đi lên nửa đảo (hàng 7)
    this.scene.add.image(28 * TILE_SIZE, 7 * TILE_SIZE, 'paths', 0).setOrigin(0).setDepth(2);
    this.scene.add.image(28 * TILE_SIZE, 8 * TILE_SIZE, 'paths', 4).setOrigin(0).setDepth(2);
    this.scene.add.image(28 * TILE_SIZE, 9 * TILE_SIZE, 'paths', 4).setOrigin(0).setDepth(2);
    this.scene.add.image(28 * TILE_SIZE, 10 * TILE_SIZE, 'paths', 4).setOrigin(0).setDepth(2);

    // 2. Vườn đầy hoa hướng dương ở bên trái đường (cột 23 đến 27)
    // Mỗi hoa hướng dương cao 32px (2 ô: đầu frame 26, thân frame 35)
    const sunflowerRows = [4, 6, 8];
    const sunflowerCols = [23, 24, 25, 26, 27];

    sunflowerRows.forEach((row) => {
      sunflowerCols.forEach((col) => {
        const x = col * TILE_SIZE;
        const headY = row * TILE_SIZE;
        const stemY = (row + 1) * TILE_SIZE;
        const depth = stemY + 16;

        this.scene.add.image(x, headY, 'biome_things', 26).setOrigin(0).setDepth(depth);
        this.scene.add.image(x, stemY, 'biome_things', 35).setOrigin(0).setDepth(depth);
      });
    });

    // 3. Xen kẽ các cây nấm hồng và tím ở bên phải đường (cột 29 đến 32, hàng 4 đến 9)
    for (let row = 4; row <= 9; row += 1) {
      for (let col = 29; col <= 32; col += 1) {
        const isPink = (row + col) % 2 === 0;
        const variant = (row * 3 + col) % 2;
        // Nấm hồng: frame 5 (chùm) hoặc 6 (đơn)
        // Nấm tím: frame 8 (đôi) hoặc 7 (đơn)
        const frame = isPink ? (variant === 0 ? 5 : 6) : (variant === 0 ? 8 : 7);
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const depth = y + 16;

        this.scene.add.image(x, y, 'biome_things', frame).setOrigin(0).setDepth(depth);
      }
    }
  }

  /**
   * Tạo căn nhà gỗ ở góc trên của Đảo Trung tâm
   */
  private createHouse(): Omit<FarmWorld, 'gateColliders' | 'farmTiles' | 'waterColliders'> {
    const { TILE_SIZE } = GAME_SETTINGS;
    const x = 29 * TILE_SIZE;
    const y = 16 * TILE_SIZE;
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

    this.addObstacleBox(colliders, x, y, 80, 16);
    this.addObstacleBox(colliders, x, y + 16, 32, 16);
    this.addObstacleBox(colliders, x + 48, y + 16, 32, 16);

    return {
      houseDoor,
      houseDoorPosition: new Phaser.Math.Vector2(doorX + TILE_SIZE / 2, doorY + TILE_SIZE / 2),
      houseColliders: colliders,
    };
  }

  /**
   * Tạo vùng va chạm mặt nước bao quanh các đảo, cho phép đi lại qua 3 cây cầu
   */
  private createWaterColliders(): Phaser.Physics.Arcade.StaticGroup {
    const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_SETTINGS;
    const colliders = this.scene.physics.add.staticGroup();

    // 1. Vật cản cho Quầy hàng (stall)
    this.addObstacleBox(colliders, 52 * TILE_SIZE + 2, 17 * TILE_SIZE + 14, 28, 16);

    // 2. Vùng nước phía Tây (bên trái đảo Trái)
    this.addObstacleBox(colliders, 0, 0, 3 * TILE_SIZE, MAP_ROWS * TILE_SIZE);

    // 3. Vùng nước phía Nam (dưới tất cả các đảo)
    this.addObstacleBox(colliders, 0, 32 * TILE_SIZE, MAP_COLS * TILE_SIZE, 4 * TILE_SIZE);

    // 4. Vùng nước phía Đông (bên phải đảo Phải)
    this.addObstacleBox(colliders, 61 * TILE_SIZE, 0, 3 * TILE_SIZE, MAP_ROWS * TILE_SIZE);

    // 5. Vùng nước phía Bắc:
    // - Phía trên đảo Trái
    this.addObstacleBox(colliders, 3 * TILE_SIZE, 0, 19 * TILE_SIZE, 14 * TILE_SIZE);
    // - Phía trên đảo Trên
    this.addObstacleBox(colliders, 22 * TILE_SIZE, 0, 12 * TILE_SIZE, 3 * TILE_SIZE);
    // - Phía trên đảo Giữa & đảo Phải (bên phải đảo Trên)
    this.addObstacleBox(colliders, 34 * TILE_SIZE, 0, 27 * TILE_SIZE, 14 * TILE_SIZE);

    // 6. Nước giữa Đảo Trên và Đảo Giữa (2 bên cầu dọc x = 28)
    this.addObstacleBox(colliders, 22 * TILE_SIZE, 11 * TILE_SIZE, 6 * TILE_SIZE - 2, 3 * TILE_SIZE);
    this.addObstacleBox(colliders, 29 * TILE_SIZE + 2, 11 * TILE_SIZE, 5 * TILE_SIZE - 2, 3 * TILE_SIZE);

    // 7. Nước giữa Đảo Trái và Đảo Giữa (trên và dưới cầu ngang y = 22)
    this.addObstacleBox(colliders, 21 * TILE_SIZE, 14 * TILE_SIZE, 6 * TILE_SIZE, 8 * TILE_SIZE - 3);
    this.addObstacleBox(colliders, 21 * TILE_SIZE, 23 * TILE_SIZE + 3, 6 * TILE_SIZE, 9 * TILE_SIZE - 3);

    // 8. Nước giữa Đảo Giữa và Đảo Phải (trên và dưới cầu ngang y = 21)
    this.addObstacleBox(colliders, 46 * TILE_SIZE, 14 * TILE_SIZE, 4 * TILE_SIZE, 7 * TILE_SIZE - 3);
    this.addObstacleBox(colliders, 46 * TILE_SIZE, 22 * TILE_SIZE + 3, 4 * TILE_SIZE, 10 * TILE_SIZE - 3);

    // 9. Nước quanh đảo Phải:
    this.addObstacleBox(colliders, 50 * TILE_SIZE, 14 * TILE_SIZE, 11 * TILE_SIZE, 2 * TILE_SIZE);
    this.addObstacleBox(colliders, 50 * TILE_SIZE, 26 * TILE_SIZE, 11 * TILE_SIZE, 6 * TILE_SIZE);

    return colliders;
  }

  private addObstacleBox(
    group: Phaser.Physics.Arcade.StaticGroup,
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    if (width <= 0 || height <= 0) return;
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const obstacle = this.scene.add.zone(centerX, centerY, width, height);
    this.scene.physics.add.existing(obstacle, true);
    group.add(obstacle);
  }
}
