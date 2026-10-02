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
  private promptContainer!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private houseColliders!: Phaser.Physics.Arcade.StaticGroup;

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

    // 1. Tạo Tilemap tĩnh với 2 tileset: Grass và Tilled Dirt
    this.createFarmMap();

    // 2. Tạo căn nhà gỗ ngoại cảnh trên nông trại
    this.createHouseExterior();

    // 3. Tạo nhân vật nông dân: Nếu vừa từ trong nhà ra thì xuất hiện ngay trước cửa
    let spawnX = Math.floor(MAP_COLS / 2) * TILE_SIZE + 8;
    let spawnY = Math.floor(MAP_ROWS / 2) * TILE_SIZE + 8;

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

    // 4. Cấu hình Camera bám theo nông dân
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2.2);

    if (data?.fromHouse) {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    // 5. Thiết lập phím tương tác E
    if (this.input.keyboard) {
      this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    // 6. Tạo hiệu ứng chào đón & bảng chỉ dẫn mượt mà
    this.createControlsUI();
  }

  public update(): void {
    if (this.isTransitioning) return;

    if (this.player) {
      this.player.update();
      this.checkHouseInteraction();
    }
  }

  /**
   * Tạo bản đồ nông trại gồm nền cỏ và bãi đất mẫu 10x10 ô
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
    const dirtTileset = this.map.addTilesetImage('tilled_dirt', 'tilled_dirt', 16, 16);

    if (!grassTileset || !dirtTileset) {
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

    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        // Tránh khu vực trung tâm làm bãi đất
        const inPlotZone = x >= 10 && x < 20 && y >= 6 && y < 16;
        if (!inPlotZone && Math.random() < 0.12) {
          const randTile = flowerIndices[Math.floor(Math.random() * flowerIndices.length)];
          this.groundLayer.putTileAt(randTile, x, y);
        }
      }
    }

    // Layer 2: Bãi đất xới mẫu 10x10 ô (Farm Plot Layer)
    const farmLayer = this.map.createBlankLayer('FarmPlot', dirtTileset, 0, 0);
    if (!farmLayer) return;
    this.farmLayer = farmLayer;
    this.farmLayer.setDepth(1);

    // Tilled Dirt trong Sprout Lands (8x8 tiles 16x16):
    // Layout 3x3 autotile chuẩn:
    // [0] Top-Left      [1] Top        [2] Top-Right
    // [8] Middle-Left   [9] Center     [10] Middle-Right
    // [16] Bottom-Left  [17] Bottom    [18] Bottom-Right
    const dBase = dirtTileset.firstgid;
    const TL = dBase + 0;
    const T = dBase + 1;
    const TR = dBase + 2;
    const ML = dBase + 8;
    const C = dBase + 9;
    const MR = dBase + 10;
    const BL = dBase + 16;
    const B = dBase + 17;
    const BR = dBase + 18;

    const startX = 10;
    const startY = 6;
    const plotWidth = 10;
    const plotHeight = 10;

    for (let row = 0; row < plotHeight; row++) {
      for (let col = 0; col < plotWidth; col++) {
        const tx = startX + col;
        const ty = startY + row;

        let tileIndex = C;

        if (row === 0 && col === 0) tileIndex = TL;
        else if (row === 0 && col === plotWidth - 1) tileIndex = TR;
        else if (row === plotHeight - 1 && col === 0) tileIndex = BL;
        else if (row === plotHeight - 1 && col === plotWidth - 1) tileIndex = BR;
        else if (row === 0) tileIndex = T;
        else if (row === plotHeight - 1) tileIndex = B;
        else if (col === 0) tileIndex = ML;
        else if (col === plotWidth - 1) tileIndex = MR;

        this.farmLayer.putTileAt(tileIndex, tx, ty);
      }
    }
  }

  private createControlsUI(): void {
    // Nhãn hướng dẫn hiển thị cố định trên góc màn hình theo camera (UI layer)
    const hudContainer = this.add.container(10, 10);
    hudContainer.setScrollFactor(0);
    hudContainer.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x111e14, 0.75);
    bg.fillRoundedRect(0, 0, 155, 52, 6);
    bg.lineStyle(1, 0x82b450, 0.8);
    bg.strokeRoundedRect(0, 0, 155, 52, 6);

    const titleText = this.add.text(8, 6, '🌾 NÔNG TRẠI VUI VẺ', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#e2f7b8',
    });

    const infoText = this.add.text(8, 22, 'WASD: Di chuyển | Shift: Chạy\n[E] hoặc Đi tới cửa: Vào nhà', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '8.5px',
      color: '#d0dfce',
      lineSpacing: 2,
    });

    hudContainer.add([bg, titleText, infoText]);

    // Popup gợi ý tương tác lơ lửng
    this.promptContainer = this.add.container(0, 0);
    this.promptContainer.setDepth(90);
    this.promptContainer.setVisible(false);

    const promptBg = this.add.graphics();
    promptBg.fillStyle(0x101018, 0.88);
    promptBg.fillRoundedRect(-50, -9, 100, 18, 4);
    promptBg.lineStyle(1, 0xa4d852, 0.9);
    promptBg.strokeRoundedRect(-50, -9, 100, 18, 4);

    this.promptText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '8px',
      color: '#ffffff',
    });
    this.promptText.setOrigin(0.5, 0.5);

    this.promptContainer.add([promptBg, this.promptText]);
  }

  /**
   * Tạo căn nhà gỗ ngoại cảnh trên nông trại theo đúng Blueprint Case A
   */
  private createHouseExterior(): void {
    const { TILE_SIZE } = GAME_SETTINGS;
    const houseCol = 4;
    const houseRow = 3;
    const hX = houseCol * TILE_SIZE;
    const hY = houseRow * TILE_SIZE;

    this.houseColliders = this.physics.add.staticGroup();

    // 0. Lót ô gạch (1,2) #15 từ wooden_house_sheet bên dưới cửa sổ và cửa chính để không thấy nền cỏ
    [1, 2, 3].forEach((c) => {
      const bgTile = this.add.image(hX + c * TILE_SIZE, hY + 1 * TILE_SIZE, 'wooden_house_sheet', 15);
      bgTile.setOrigin(0, 0);
      bgTile.setDepth(2);
    });

    // 1. Hàng tường (Wall row at y = 16):
    // Col 0: (0,2) #10 từ house_walls
    // Col 1: (3,2) #13 từ house_walls
    // Col 2: (0,3) #3 từ doors (cửa ra vào)
    // Col 3: (3,2) #13 từ house_walls
    // Col 4: (2,2) #12 từ house_walls
    this.add.image(hX + 0 * TILE_SIZE, hY + 1 * TILE_SIZE, 'house_walls', 10).setOrigin(0, 0).setDepth(5);
    this.add.image(hX + 1 * TILE_SIZE, hY + 1 * TILE_SIZE, 'house_walls', 13).setOrigin(0, 0).setDepth(5);
    this.add.image(hX + 3 * TILE_SIZE, hY + 1 * TILE_SIZE, 'house_walls', 13).setOrigin(0, 0).setDepth(5);
    this.add.image(hX + 4 * TILE_SIZE, hY + 1 * TILE_SIZE, 'house_walls', 12).setOrigin(0, 0).setDepth(5);

    // Cửa ra vào tại Cột 2:
    const doorTileX = hX + 2 * TILE_SIZE;
    const doorTileY = hY + 1 * TILE_SIZE;

    this.houseDoorSprite = this.add.sprite(doorTileX, doorTileY, 'doors', 3);
    this.houseDoorSprite.setOrigin(0, 0);
    this.houseDoorSprite.setDepth(5);

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
      img.setDepth(15);
    });

    // 3. Ống khói (0,4) #28 đè lên ô (5,3) tại Cột 1
    const chimney = this.add.image(hX + 1 * TILE_SIZE, hY - 2, 'wooden_house_sheet', 28);
    chimney.setOrigin(0, 0);
    chimney.setDepth(16);

    // 4. Mái nhà tầng dưới (Roof eaves row at y = 16) đè lên hàng tường:
    // (4,4) #32, (5,4) #33, (5,4) #33, (5,4) #33, (6,4) #34
    const roofEavesFrames = [32, 33, 33, 33, 34];
    roofEavesFrames.forEach((frame, c) => {
      const img = this.add.image(hX + c * TILE_SIZE, hY + 1 * TILE_SIZE, 'wooden_house_sheet', frame);
      img.setOrigin(0, 0);
      img.setDepth(15);
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
      this.showPrompt(this.houseDoorPos.x, this.houseDoorPos.y - 18, '[E] Vào nhà');

      const enterPressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
      const isSteppingOnDoor = dist < 10;

      if (enterPressed || isSteppingOnDoor) {
        this.enterHouse();
      }
    } else {
      this.hidePrompt();
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

  private showPrompt(x: number, y: number, message: string): void {
    this.promptContainer.setPosition(x, y);
    this.promptText.setText(message);
    this.promptContainer.setVisible(true);
  }

  private hidePrompt(): void {
    if (this.promptContainer) {
      this.promptContainer.setVisible(false);
    }
  }
}
