import Phaser from 'phaser';
import { Player } from '../entities/Player.ts';

export class HouseScene extends Phaser.Scene {
  private player!: Player;
  private wallColliders!: Phaser.Physics.Arcade.StaticGroup;
  private isTransitioning: boolean = false;
  private isSleeping: boolean = false;
  private canWakeUp: boolean = false;
  private sleepZzzText?: Phaser.GameObjects.Text;
  private sleepZzzTween?: Phaser.Tweens.Tween;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private promptText!: Phaser.GameObjects.Text;
  private promptContainer!: Phaser.GameObjects.Container;

  // Kích thước phòng 9x6 ô (16x16 px) rộng rãi
  private readonly ROOM_COLS = 9;
  private readonly ROOM_ROWS = 6;
  private readonly TILE_SIZE = 16;
  private originX = 0;
  private originY = 0;

  constructor() {
    super({ key: 'HouseScene' });
  }

  public create(): void {
    this.isTransitioning = false;
    this.isSleeping = false;

    const screenW = this.cameras.main.width;
    const screenH = this.cameras.main.height;

    // Tính toán vị trí căn giữa phòng trên màn hình
    const roomW = this.ROOM_COLS * this.TILE_SIZE;
    const roomH = this.ROOM_ROWS * this.TILE_SIZE;
    this.originX = Math.floor((screenW - roomW) / 2);
    this.originY = Math.floor((screenH - roomH) / 2);

    // Camera setup - zoom 2.4 bao quát toàn bộ căn phòng 9x6 rộng rãi & sắc nét
    this.cameras.main.setBackgroundColor('#141013');
    this.cameras.main.setZoom(2.4);
    this.cameras.main.centerOn(this.originX + roomW / 2, this.originY + roomH / 2);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Tự động căn giữa phòng khi cửa sổ trình duyệt thay đổi kích thước
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      const roomW = this.ROOM_COLS * this.TILE_SIZE;
      const roomH = this.ROOM_ROWS * this.TILE_SIZE;
      this.cameras.main.centerOn(this.originX + roomW / 2, this.originY + roomH / 2);
    });

    // Giới hạn thế giới vật lý trong khu vực căn phòng
    this.physics.world.setBounds(
      this.originX - 16,
      this.originY - 16,
      roomW + 32,
      roomH + 32
    );

    this.wallColliders = this.physics.add.staticGroup();

    // 1. Dựng nền và tường phòng 9x6 ô: thêm nhiều ô gạch ở giữa cho phòng rộng rãi
    this.buildHouseInterior();

    // 2. Thêm đồ nội thất: Giường ngủ, tranh treo tường, đèn bàn, thảm và bàn trà
    this.buildFurniture();

    // 3. Tạo nhân vật người chơi ở vị trí lối vào chính giữa phòng (Cột 4, Hàng 4), quay mặt lên
    const spawnX = this.originX + 4 * this.TILE_SIZE + 8;
    const spawnY = this.originY + 4 * this.TILE_SIZE + 8;
    this.player = new Player(this, spawnX, spawnY);
    this.player.play('player-idle-up');
    this.player.currentDirection = 'up';

    // 4. Thiết lập va chạm vật lý cho tường và đồ đạc
    this.setupCollisions();

    // 5. Thiết lập phím tương tác E và các phím WASD
    if (this.input.keyboard) {
      this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
      };
    }

    // 6. Tạo UI chỉ dẫn & thông báo tương tác
    this.createInteriorUI();
  }

  public update(): void {
    if (this.isTransitioning) return;

    // Khi đang ngủ trên giường: kiểm tra phím bấm để thức dậy
    if (this.isSleeping) {
      this.checkWakeUp();
      return;
    }

    if (this.player) {
      this.player.update();

      // Kiểm tra khi người chơi bước vào cửa thoát ở đáy phòng (Cột 4, Hàng 5)
      const doorZoneX = this.originX + 4 * this.TILE_SIZE;
      const doorZoneY = this.originY + 5 * this.TILE_SIZE;

      if (
        this.player.x >= doorZoneX + 2 &&
        this.player.x <= doorZoneX + 14 &&
        this.player.y >= doorZoneY + 6
      ) {
        this.exitHouse();
        return;
      }

      // Kiểm tra tương tác với Giường và Tranh
      this.checkInteractions();
    }
  }

  /**
   * Ghép các mảnh tường và sàn nhà 9x6 từ tilesets/Wooden_House_Walls_Tilset.png và Doors.png
   */
  private buildHouseInterior(): void {
    // Sơ đồ frame ID 9 cột x 6 hàng:
    // Hàng 0: Tường trên (gỗ ngang phẳng #1)
    // Hàng 1-4: Tường 2 bên và 7 ô sàn gạch #6 ở giữa cho phòng rộng rãi
    // Hàng 5: Chân tường dưới (mỗi bên 1 cửa sổ ở giữa #13, 2 ô còn lại là #11), cửa mở ở Cột 4
    const roomLayout: number[][] = [
      [0, 1, 1, 1, 1, 1, 1, 1, 2],             // Hàng 0: Tường trên
      [5, 6, 6, 6, 6, 6, 6, 6, 7],             // Hàng 1: Sàn rộng rãi
      [5, 6, 6, 6, 6, 6, 6, 6, 7],             // Hàng 2: Sàn rộng rãi
      [5, 6, 6, 6, 6, 6, 6, 6, 7],             // Hàng 3: Sàn rộng rãi
      [5, 6, 6, 6, 6, 6, 6, 6, 7],             // Hàng 4: Sàn rộng rãi (hàng gạch cuối)
      [10, 11, 13, 11, -1, 11, 13, 11, 12],    // Hàng 5: Tường dưới (mỗi bên 1 cửa sổ ở giữa #13, 2 ô còn lại là #11)
    ];

    // Tạo bóng mờ nền bên dưới căn phòng
    const shadowBg = this.add.graphics();
    shadowBg.fillStyle(0x0e0a0d, 0.95);
    shadowBg.fillRoundedRect(
      this.originX - 10,
      this.originY - 10,
      this.ROOM_COLS * this.TILE_SIZE + 20,
      this.ROOM_ROWS * this.TILE_SIZE + 20,
      8
    );
    shadowBg.setDepth(0);

    for (let row = 0; row < this.ROOM_ROWS; row++) {
      for (let col = 0; col < this.ROOM_COLS; col++) {
        const posX = this.originX + col * this.TILE_SIZE;
        const posY = this.originY + row * this.TILE_SIZE;
        const frameId = roomLayout[row][col];

        if (frameId === -1) {
          // Ô cửa ra vào: Lót sàn trước
          const floorTile = this.add.image(posX, posY, 'house_walls', 6);
          floorTile.setOrigin(0, 0);
          floorTile.setDepth(1);

          // Cửa mở: (0,3) #3 từ Doors.png
          const doorTile = this.add.image(posX, posY, 'doors', 3);
          doorTile.setOrigin(0, 0);
          doorTile.setDepth(2);

          // Bậc thềm / thảm đón lối vào
          const mat = this.add.graphics();
          mat.fillStyle(0x5a3d28, 0.8);
          mat.fillRoundedRect(posX + 2, posY + 10, 12, 4, 1);
          mat.setDepth(3);
        } else {
          const tile = this.add.image(posX, posY, 'house_walls', frameId);
          tile.setOrigin(0, 0);
          // Hàng chân tường dưới (Row 5): depth = 12 để che tự nhiên chân nhân vật theo góc nhìn 2.5D khi đứng ở hàng gạch cuối
          if (row === this.ROOM_ROWS - 1) {
            tile.setDepth(12);
          } else {
            tile.setDepth(1);
          }
        }
      }
    }
  }

  /**
   * Thêm đồ nội thất theo sơ đồ trong căn phòng 9x6 rộng rãi
   */
  private buildFurniture(): void {
    // 1. Tranh (picture): Frame (0,0) #0 từ objects/Basic_Furniture.png treo chính giữa tường trên
    const picX = this.originX + 4 * this.TILE_SIZE;
    const picY = this.originY + 0 * this.TILE_SIZE;
    const picture = this.add.image(picX, picY, 'furniture', 0);
    picture.setOrigin(0, 0);
    picture.setDepth(3);

    // 2. Giường (bed):
    // Đặt ở góc phòng phía trên bên trái:
    // Đầu giường: frame (2,1) #11 từ objects/Basic_Furniture.png (Hàng 1, Cột 1)
    // Thân giường: frame (2,2) #20 từ objects/Basic_Furniture.png (Hàng 2, Cột 1)
    const bedX = this.originX + 1 * this.TILE_SIZE;
    const bedTopY = this.originY + 1 * this.TILE_SIZE;
    const bedBotY = this.originY + 2 * this.TILE_SIZE;

    const bedTop = this.add.image(bedX, bedTopY, 'furniture', 11);
    bedTop.setOrigin(0, 0);
    bedTop.setDepth(4);

    const bedBot = this.add.image(bedX, bedBotY, 'furniture', 20);
    bedBot.setOrigin(0, 0);
    bedBot.setDepth(15); // Depth cao hơn để che chân khi nằm

    // Đèn ngủ nhỏ cạnh giường
    const lamp = this.add.image(this.originX + 2 * this.TILE_SIZE + 2, this.originY + 1 * this.TILE_SIZE, 'furniture', 4);
    lamp.setOrigin(0, 0);
    lamp.setDepth(4);

    // 3. Thảm trải sàn ấm cúng ở khu vực giữa phòng (Hàng 3, Cột 3-5)
    const rugLeft = this.add.image(this.originX + 3 * this.TILE_SIZE, this.originY + 3 * this.TILE_SIZE, 'furniture', 48);
    rugLeft.setOrigin(0, 0);
    rugLeft.setDepth(2);

    const rugRight = this.add.image(this.originX + 4 * this.TILE_SIZE, this.originY + 3 * this.TILE_SIZE, 'furniture', 49);
    rugRight.setOrigin(0, 0);
    rugRight.setDepth(2);

    // 4. Bàn nhỏ và ghế ở góc phải phòng
    const table = this.add.image(this.originX + 7 * this.TILE_SIZE, this.originY + 2 * this.TILE_SIZE, 'furniture', 21);
    table.setOrigin(0, 0);
    table.setDepth(14);

    // Rương chứa đồ ở góc trên bên phải
    const chest = this.add.image(this.originX + 7 * this.TILE_SIZE, this.originY + 1 * this.TILE_SIZE, 'furniture', 25);
    chest.setOrigin(0, 0);
    chest.setDepth(4);

    // Ánh sáng vàng ấm nhẹ nhàng phát ra trong phòng
    const ambientLight = this.add.graphics();
    ambientLight.fillStyle(0xffd59e, 0.08);
    ambientLight.fillCircle(this.originX + (this.ROOM_COLS * this.TILE_SIZE) / 2, this.originY + (this.ROOM_ROWS * this.TILE_SIZE) / 2, 70);
    ambientLight.setDepth(20);
  }

  /**
   * Tạo các khối va chạm vật lý cho tường và đồ đạc trong phòng 9x6
   */
  private setupCollisions(): void {
    const roomW = this.ROOM_COLS * this.TILE_SIZE;
    const roomH = this.ROOM_ROWS * this.TILE_SIZE;

    // 1. Tường trên (Hàng 0): toàn bộ chiều ngang
    // Chiều cao collider = 24px để chặn hitbox bàn chân ở originY + 24, giữ nhân vật đứng trên sàn Hàng 1
    // không bị đi xuyên/lên tường trên (Hàng 0)
    this.createStaticObstacle(this.originX, this.originY, roomW, 24);

    // 2. Tường trái (Cột 0): chiều dọc
    this.createStaticObstacle(this.originX, this.originY, 16, roomH + 16);

    // 3. Tường phải (Cột 8): chiều dọc
    this.createStaticObstacle(this.originX + 8 * this.TILE_SIZE, this.originY, 16, roomH + 16);

    // 4. Tường dưới bên trái cửa (Cột 1-3, Hàng 5):
    // Đặt ở vị trí y = originY + 5 * 16 + 10, height = 12 để người chơi đi xuống đứng thoải mái trên hàng gạch cuối (Hàng 4)
    this.createStaticObstacle(this.originX + 1 * this.TILE_SIZE, this.originY + 5 * this.TILE_SIZE + 10, 3 * this.TILE_SIZE, 12);

    // 5. Tường dưới bên phải cửa (Cột 5-7, Hàng 5):
    this.createStaticObstacle(this.originX + 5 * this.TILE_SIZE, this.originY + 5 * this.TILE_SIZE + 10, 3 * this.TILE_SIZE, 12);

    // 6. Va chạm với Giường ngủ (Cột 1, Hàng 1 và 2)
    this.createStaticObstacle(this.originX + 1 * this.TILE_SIZE, this.originY + 1 * this.TILE_SIZE, 16, 32);

    // 7. Va chạm với bàn góc phải
    this.createStaticObstacle(this.originX + 7 * this.TILE_SIZE, this.originY + 2 * this.TILE_SIZE, 16, 16);

    // Áp dụng collider giữa player và toàn bộ tường/vật cản
    this.physics.add.collider(this.player, this.wallColliders);
  }

  private createStaticObstacle(x: number, y: number, width: number, height: number): void {
    const obstacle = this.add.zone(x + width / 2, y + height / 2, width, height);
    this.physics.add.existing(obstacle, true);
    const body = obstacle.body as Phaser.Physics.Arcade.StaticBody;
    if (body) {
      body.setSize(width, height);
      body.updateFromGameObject();
    }
    this.wallColliders.add(obstacle);
  }

  /**
   * Tương tác nhấn E cạnh Giường ngủ hoặc Tranh
   */
  private checkInteractions(): void {
    if (this.isSleeping) {
      this.hidePrompt();
      return;
    }

    const bedX = this.originX + 1 * this.TILE_SIZE + 8;
    const bedY = this.originY + 1.5 * this.TILE_SIZE;
    const distToBed = Phaser.Math.Distance.Between(this.player.x, this.player.y, bedX, bedY);

    const picX = this.originX + 4 * this.TILE_SIZE + 8;
    const picY = this.originY + 8;
    const distToPic = Phaser.Math.Distance.Between(this.player.x, this.player.y, picX, picY);

    if (distToBed < 24) {
      this.showPrompt(this.player.x, this.player.y - 20, 'Nhấn [E]: Nghỉ ngơi');
      if (Phaser.Input.Keyboard.JustDown(this.actionKey)) {
        this.sleepInBed();
      }
    } else if (distToPic < 22) {
      this.showPrompt(this.player.x, this.player.y - 20, 'Bức tranh phong cảnh');
    } else {
      this.hidePrompt();
    }
  }

  private sleepInBed(): void {
    if (this.isSleeping) return;
    this.isSleeping = true;

    // Ẩn bảng chữ nhắc "Nhấn [E]: Nghỉ ngơi"
    this.hidePrompt();

    // Ngừng di chuyển nhân vật
    (this.player.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);

    // Đè hình character_sleeping lên thân giường (Hàng 2, Cột 1)
    const bedCenterX = this.originX + 1 * this.TILE_SIZE + 8;
    const bedCenterY = this.originY + 2 * this.TILE_SIZE + 3;

    this.player.setPosition(bedCenterX, bedCenterY);
    this.player.anims.stop();
    this.player.setTexture('character_sleeping');
    this.player.setDepth(20); // Đè lên thân giường (thân giường depth 15)

    // Khóa phím thức dậy trong 400ms đầu để không bị phím nhấn lúc ngủ bấm nhầm hủy ngay
    this.canWakeUp = false;
    this.time.delayedCall(400, () => {
      this.canWakeUp = true;
    });

    // Hiệu ứng chữ Zzz lơ lửng trên đầu nhân vật kiểu cũ
    if (!this.sleepZzzText) {
      this.sleepZzzText = this.add.text(bedCenterX, bedCenterY - 14, '💤 Zzz...', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        color: '#ffea78',
        fontStyle: 'bold',
      });
      this.sleepZzzText.setOrigin(0.5, 0.5);
      this.sleepZzzText.setDepth(30);
    } else {
      this.sleepZzzText.setPosition(bedCenterX, bedCenterY - 14);
      this.sleepZzzText.setAlpha(1);
      this.sleepZzzText.setVisible(true);
    }

    if (this.sleepZzzTween) this.sleepZzzTween.stop();
    this.sleepZzzTween = this.tweens.add({
      targets: this.sleepZzzText,
      y: bedCenterY - 20,
      alpha: { from: 1, to: 0.35 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Kiểm tra phím bấm để đánh thức nhân vật dậy
   */
  private checkWakeUp(): void {
    if (!this.isSleeping || !this.canWakeUp) return;

    const ePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
    const wasdPressed =
      Phaser.Input.Keyboard.JustDown(this.wasdKeys?.W) ||
      Phaser.Input.Keyboard.JustDown(this.wasdKeys?.A) ||
      Phaser.Input.Keyboard.JustDown(this.wasdKeys?.S) ||
      Phaser.Input.Keyboard.JustDown(this.wasdKeys?.D);

    const cursors = this.input.keyboard?.createCursorKeys();
    const arrowPressed =
      (cursors && (
        Phaser.Input.Keyboard.JustDown(cursors.up) ||
        Phaser.Input.Keyboard.JustDown(cursors.down) ||
        Phaser.Input.Keyboard.JustDown(cursors.left) ||
        Phaser.Input.Keyboard.JustDown(cursors.right)
      ));

    if (ePressed || wasdPressed || arrowPressed) {
      this.wakeUp();
    }
  }

  /**
   * Đánh thức nhân vật, bước xuống khỏi giường
   */
  private wakeUp(): void {
    this.isSleeping = false;
    this.canWakeUp = false;

    // Tắt chữ Zzz kiểu cũ
    if (this.sleepZzzTween) {
      this.sleepZzzTween.stop();
    }
    if (this.sleepZzzText) {
      this.sleepZzzText.setVisible(false);
    }

    // Nhân vật bước xuống đứng cạnh giường và hoàn trả lại sprite bình thường
    const bedX = this.originX + 1 * this.TILE_SIZE;
    const bedBotY = this.originY + 2 * this.TILE_SIZE;
    this.player.setPosition(bedX + 22, bedBotY + 8);
    this.player.setTexture('character');
    this.player.play('player-idle-down');
    this.player.currentDirection = 'down';
    this.player.setDepth(10);
  }

  private exitHouse(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Ngừng di chuyển nhân vật
    (this.player.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);

    // Hiệu ứng mờ dần chuyển cảnh mượt mà
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MainScene', { fromHouse: true });
    });
  }

  private createInteriorUI(): void {
    // Popup gợi ý tương tác lơ lửng khi lại gần giường hoặc tranh
    this.promptContainer = this.add.container(0, 0);
    this.promptContainer.setDepth(90);
    this.promptContainer.setVisible(false);

    const promptBg = this.add.graphics();
    promptBg.fillStyle(0x101018, 0.88);
    promptBg.fillRoundedRect(-55, -9, 110, 18, 4);
    promptBg.lineStyle(1, 0xffd27d, 0.9);
    promptBg.strokeRoundedRect(-55, -9, 110, 18, 4);

    this.promptText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '8px',
      color: '#ffffff',
    });
    this.promptText.setOrigin(0.5, 0.5);

    this.promptContainer.add([promptBg, this.promptText]);
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
