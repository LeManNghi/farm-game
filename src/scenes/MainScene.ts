import Phaser from 'phaser';
import { GAME_SETTINGS } from '../config/game.config.ts';
import { Player } from '../entities/Player.ts';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private farmLayer!: Phaser.Tilemaps.TilemapLayer;
  private map!: Phaser.Tilemaps.Tilemap;

  private houseDoorSprite!: Phaser.GameObjects.Sprite;
  private houseDoorPos = { x: 0, y: 0 };
  private isTransitioning: boolean = false;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private houseColliders!: Phaser.Physics.Arcade.StaticGroup;
  private gateColliders!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'MainScene' });
  }

  public create(data?: { fromHouse?: boolean }): void {
    this.isTransitioning = false;
    const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_SETTINGS;
    const worldWidth = MAP_COLS * TILE_SIZE;
    const worldHeight = MAP_ROWS * TILE_SIZE;

    // Giới hạn thế giới vật lý
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 1. Tạo Tilemap tĩnh với nền cỏ, bãi đất trồng và cây nông sản
    this.createFarmMap();

    // 2. Tạo cổng hoa trang trí ngay sau bãi đất trồng
    this.createFlowerGate();

    // 3. Tạo căn nhà gỗ ngoại cảnh trên nông trại
    this.createHouseExterior();

    // 4. Tạo nhân vật nông dân: Xuất hiện trước bãi đất trồng (hoặc trước cửa nhà nếu vừa đi ra)
    let spawnX = 32 * TILE_SIZE;
    let spawnY = 25 * TILE_SIZE;

    if (data?.fromHouse) {
      spawnX = this.houseDoorPos.x;
      spawnY = this.houseDoorPos.y + 14;
    }

    this.player = new Player(this, spawnX, spawnY);

    if (data?.fromHouse) {
      this.player.play('player-idle-down');
      this.player.currentDirection = 'down';
    }

    // Thiết lập va chạm giữa nông dân và căn nhà
    if (this.houseColliders) {
      this.physics.add.collider(this.player, this.houseColliders);
    }

    // Thiết lập va chạm với 2 chân cột của cổng hoa
    if (this.gateColliders) {
      this.physics.add.collider(this.player, this.gateColliders);
    }

    // 5. Cấu hình Camera bám theo nông dân: Tầm nhìn rộng mở, zoom 2.0 chuẩn pixel art tự nhiên (không bị phóng to quá mức)
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(2.0);

    // Tự động điều chỉnh khung nhìn camera khi thay đổi kích thước cửa sổ trình duyệt
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    });

    if (data?.fromHouse) {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    // 6. Thiết lập phím tương tác E
    if (this.input.keyboard) {
      this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  public update(): void {
    if (this.isTransitioning) return;

    if (this.player) {
      this.player.update();
      this.checkHouseInteraction();
    }
  }

  /**
   * Tạo bản đồ nông trại gồm nền cỏ và bãi đất trồng hoa màu
   */
  private createFarmMap(): void {
    const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_SETTINGS;

    this.map = this.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: MAP_COLS,
      height: MAP_ROWS,
    });

    const grassTileset = this.map.addTilesetImage('grass', 'grass', 16, 16);
    const farmTileset = this.map.addTilesetImage('farm_tile_dry_wet', 'farm_tile_dry_wet', 16, 16, 8, 16);

    if (!grassTileset || !farmTileset) {
      console.error('Không thể tải tileset cho bản đồ');
      return;
    }

    // Layer 1: Nền cỏ (Ground Layer)
    const groundLayer = this.map.createBlankLayer('Ground', grassTileset, 0, 0);
    if (!groundLayer) return;
    this.groundLayer = groundLayer;
    this.groundLayer.setDepth(0);

    // Trong Sprout Lands Grass tileset (11x7 tiles):
    // Ô cỏ xanh cơ bản thường là index 12 (col 1, row 1)
    const baseGrassTile = grassTileset.firstgid + 12;

    // Rải đều toàn bộ map bằng cỏ xanh
    this.groundLayer.fill(baseGrassTile, 0, 0, MAP_COLS, MAP_ROWS);

    // Rải ngẫu nhiên một số khóm hoa/cỏ nhỏ cho sinh động
    const flowerIndices = [
      grassTileset.firstgid + 4,
      grassTileset.firstgid + 5,
      grassTileset.firstgid + 6,
      grassTileset.firstgid + 13,
      grassTileset.firstgid + 14,
    ];

    // Vị trí và kích thước bãi đất trồng (gọn gàng 6x5 ô ở giữa bản đồ rộng mở)
    const plotStartX = 29;
    const plotStartY = 19;
    const plotWidth = 6;
    const plotHeight = 5;

    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        // Tránh khu vực nhà (cột 18-22, hàng 12-13), bãi đất trồng và cổng hoa
        const inHouseZone = x >= 17 && x <= 23 && y >= 11 && y <= 15;
        const inPlotZone = x >= plotStartX && x < plotStartX + plotWidth && y >= plotStartY && y < plotStartY + plotHeight;
        const inGateZone = (x === 31 || x === 32) && (y === 17 || y === 18);

        if (!inHouseZone && !inPlotZone && !inGateZone && Math.random() < 0.12) {
          const randTile = flowerIndices[Math.floor(Math.random() * flowerIndices.length)];
          this.groundLayer.putTileAt(randTile, x, y);
        }
      }
    }

    // Layer 2: Bãi đất xới trồng trọt (Farm Plot Layer)
    const farmLayer = this.map.createBlankLayer('FarmPlot', farmTileset, 0, 0);
    if (!farmLayer) return;
    this.farmLayer = farmLayer;
    this.farmLayer.setDepth(1);

    // Sử dụng ô đất đầu tiên (dry) trong farm_tile_dry_wet.png
    const dryTileIndex = farmTileset.firstgid;

    for (let row = 0; row < plotHeight; row++) {
      for (let col = 0; col < plotWidth; col++) {
        const tx = plotStartX + col;
        const ty = plotStartY + row;
        this.farmLayer.putTileAt(dryTileIndex, tx, ty);
      }
    }
  }

  /**
   * Tạo cổng hoa tuyệt đẹp phía sau bãi đất trồng ở giữa bản đồ
   */
  private createFlowerGate(): void {
    const { TILE_SIZE } = GAME_SETTINGS;
    const gateCol = 31;
    const gateRow = 17;
    const gX = gateCol * TILE_SIZE;
    const gY = gateRow * TILE_SIZE;

    // 1. Vòm hoa tầng trên (Top Arch):
    // Đặt depth cao = 1000 để nhân vật luôn NẰM DƯỚI phần TOP của cổng hoa khi đi qua
    const archLeft = this.add.image(gX, gY, 'flower_gate_top_left').setOrigin(0, 0);
    const archRight = this.add.image(gX + TILE_SIZE, gY, 'flower_gate_top_right').setOrigin(0, 0);
    archLeft.setDepth(1000);
    archRight.setDepth(1000);

    // 2. Chân cột hoa tầng dưới (Bottom Posts):
    // Đặt depth = 5 để nhân vật luôn NẰM TRÊN phần BOTTOM của cổng hoa
    const postLeft = this.add.image(gX, gY + TILE_SIZE, 'flower_bottom_top_left').setOrigin(0, 0);
    const postRight = this.add.image(gX + TILE_SIZE, gY + TILE_SIZE, 'flower_bottom_top_right').setOrigin(0, 0);
    postLeft.setDepth(5);
    postRight.setDepth(5);

    // 3. Vật lý va chạm: Chặn 2 chân cột gỗ, chừa lối đi giữa rộng rãi (~20px) cho nông dân đi qua
    this.gateColliders = this.physics.add.staticGroup();

    // Chân cột trái
    const leftPostObstacle = this.add.zone(gX + 4, gY + TILE_SIZE + 6, 6, 12);
    this.physics.add.existing(leftPostObstacle, true);
    this.gateColliders.add(leftPostObstacle);

    // Chân cột phải
    const rightPostObstacle = this.add.zone(gX + TILE_SIZE * 2 - 4, gY + TILE_SIZE + 6, 6, 12);
    this.physics.add.existing(rightPostObstacle, true);
    this.gateColliders.add(rightPostObstacle);
  }



  /**
   * Tạo căn nhà gỗ ngoại cảnh trên nông trại theo đúng Blueprint Case A
   */
  private createHouseExterior(): void {
    const { TILE_SIZE } = GAME_SETTINGS;
    const houseCol = 18;
    const houseRow = 12;
    const hX = houseCol * TILE_SIZE;
    const hY = houseRow * TILE_SIZE;

    this.houseColliders = this.physics.add.staticGroup();

    // 0. Lót ô gạch (1,2) #15 từ wooden_house_sheet bên dưới cửa sổ và cửa chính để không thấy nền cỏ
    [1, 2, 3].forEach((c) => {
      const bgTile = this.add.image(hX + c * TILE_SIZE, hY + 1 * TILE_SIZE, 'wooden_house_sheet', 15);
      bgTile.setOrigin(0, 0);
      bgTile.setDepth(2);
    });

    const houseBottomY = hY + 2 * TILE_SIZE; // 80px (chân tường căn nhà tiếp đất)

    // 1. Hàng tường (Wall row at y = 16):
    this.add.image(hX + 0 * TILE_SIZE, hY + 1 * TILE_SIZE, 'house_walls', 10).setOrigin(0, 0).setDepth(houseBottomY);
    this.add.image(hX + 1 * TILE_SIZE, hY + 1 * TILE_SIZE, 'house_walls', 13).setOrigin(0, 0).setDepth(houseBottomY);
    this.add.image(hX + 3 * TILE_SIZE, hY + 1 * TILE_SIZE, 'house_walls', 13).setOrigin(0, 0).setDepth(houseBottomY);
    this.add.image(hX + 4 * TILE_SIZE, hY + 1 * TILE_SIZE, 'house_walls', 12).setOrigin(0, 0).setDepth(houseBottomY);

    // Cửa ra vào tại Cột 2:
    const doorTileX = hX + 2 * TILE_SIZE;
    const doorTileY = hY + 1 * TILE_SIZE;

    this.houseDoorSprite = this.add.sprite(doorTileX, doorTileY, 'doors', 3);
    this.houseDoorSprite.setOrigin(0, 0);
    this.houseDoorSprite.setDepth(houseBottomY);

    this.houseDoorPos = {
      x: doorTileX + TILE_SIZE / 2,
      y: doorTileY + TILE_SIZE / 2,
    };

    // 2. Mái nhà tầng trên (Roof top row at y = 0):
    // (4,3) #25, (5,3) #26, (5,3) #26, (5,3) #26, (6,3) #27
    const roofTopFrames = [25, 26, 26, 26, 27];
    roofTopFrames.forEach((frame, c) => {
      const img = this.add.image(hX + c * TILE_SIZE, hY + 0 * TILE_SIZE, 'wooden_house_sheet', frame);
      img.setOrigin(0, 0);
      img.setDepth(houseBottomY + 5);
    });

    // 3. Ống khói (0,4) #28 đè lên ô (5,3) tại Cột 1
    const chimney = this.add.image(hX + 1 * TILE_SIZE, hY - 2, 'wooden_house_sheet', 28);
    chimney.setOrigin(0, 0);
    chimney.setDepth(houseBottomY + 6);

    // 4. Mái nhà tầng dưới (Roof eaves row at y = 16) đè lên hàng tường:
    // (4,4) #32, (5,4) #33, (5,4) #33, (5,4) #33, (6,4) #34
    const roofEavesFrames = [32, 33, 33, 33, 34];
    roofEavesFrames.forEach((frame, c) => {
      const img = this.add.image(hX + c * TILE_SIZE, hY + 1 * TILE_SIZE, 'wooden_house_sheet', frame);
      img.setOrigin(0, 0);
      img.setDepth(houseBottomY + 5);
    });

    // 5. Thiết lập va chạm vật lý để người chơi không đi xuyên qua tường nhà
    // Phần mái nhà tầng trên
    const topObstacle = this.add.zone(hX + 40, hY + 8, 80, 16);
    this.physics.add.existing(topObstacle, true);
    this.houseColliders.add(topObstacle);

    // Chân tường trái (Cột 0 và 1)
    const leftObstacle = this.add.zone(hX + 16, hY + 24, 32, 16);
    this.physics.add.existing(leftObstacle, true);
    this.houseColliders.add(leftObstacle);

    // Chân tường phải (Cột 3 và 4)
    const rightObstacle = this.add.zone(hX + 64, hY + 24, 32, 16);
    this.physics.add.existing(rightObstacle, true);
    this.houseColliders.add(rightObstacle);
  }

  /**
   * Kiểm tra khi nhân vật đứng gần hoặc chạm vào cửa nhà
   */
  private checkHouseInteraction(): void {
    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.houseDoorPos.x,
      this.houseDoorPos.y
    );

    if (dist < 20) {
      const enterPressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
      const isSteppingOnDoor = dist < 12;

      if (enterPressed || isSteppingOnDoor) {
        this.enterHouse();
      }
    }
  }

  /**
   * Kích hoạt chuyển cảnh vào bên trong ngôi nhà (HouseScene)
   */
  private enterHouse(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Mở cửa nhà
    this.houseDoorSprite.play('door-open');

    // Dừng nhân vật
    (this.player.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);

    // Hiệu ứng mờ dần chuyển cảnh
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('HouseScene');
    });
  }
}
