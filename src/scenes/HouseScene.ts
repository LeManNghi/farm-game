import Phaser from 'phaser';
import { Player } from '../entities/Player.ts';
import { gameServices } from '../state/GameServices.ts';
import { HouseInteriorBuilder } from '../world/HouseInteriorBuilder.ts';

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
    const resize = (gameSize: Phaser.Structs.Size): void => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      this.cameras.main.centerOn(this.originX + roomW / 2, this.originY + roomH / 2);
    };
    this.scale.on('resize', resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', resize));

    // Giới hạn thế giới vật lý trong khu vực căn phòng
    this.physics.world.setBounds(
      this.originX - 16,
      this.originY - 16,
      roomW + 32,
      roomH + 32
    );

    this.wallColliders = new HouseInteriorBuilder(this, {
      originX: this.originX,
      originY: this.originY,
      columns: this.ROOM_COLS,
      rows: this.ROOM_ROWS,
      tileSize: this.TILE_SIZE,
    }).build();

    // 3. Tạo nhân vật người chơi ở vị trí lối vào chính giữa phòng (Cột 4, Hàng 4), quay mặt lên
    const spawnX = this.originX + 4 * this.TILE_SIZE + 8;
    const spawnY = this.originY + 4 * this.TILE_SIZE + 8;
    this.player = new Player(this, spawnX, spawnY);
    this.player.play('player-idle-up');
    this.player.currentDirection = 'up';

    // 4. Thiết lập va chạm vật lý cho tường và đồ đạc
    this.physics.add.collider(this.player, this.wallColliders);

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

      // Kiểm tra tương tác với Giường
      this.checkInteractions();
    }
  }

  /**
   * Tương tác nhấn E cạnh Giường ngủ
   */
  private checkInteractions(): void {
    if (this.isSleeping) {
      return;
    }

    const bedX = this.originX + 1 * this.TILE_SIZE + 8;
    const bedY = this.originY + 1.5 * this.TILE_SIZE;
    const distToBed = Phaser.Math.Distance.Between(this.player.x, this.player.y, bedX, bedY);

    if (distToBed < 24) {
      if (Phaser.Input.Keyboard.JustDown(this.actionKey)) {
        this.sleepInBed();
      }
    }
  }

  private sleepInBed(): void {
    if (this.isSleeping) return;
    this.isSleeping = true;
    gameServices.advanceDay();

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
}
