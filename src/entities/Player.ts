import Phaser from 'phaser';
import { GAME_SETTINGS } from '../config/game.config.ts';

export type Direction = 'down' | 'up' | 'left' | 'right';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public speed: number = GAME_SETTINGS.PLAYER_SPEED;
  public currentDirection: Direction = 'down';
  public isMoving: boolean = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'character', 0);

    // Thêm sprite vào Scene & Arcade Physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Thiết lập độ sâu hiển thị (depth sorting theo chân nhân vật)
    this.setDepth(10);

    // Thiết lập hitbox vật lý nhỏ gọn ở bàn chân của nhân vật (kích thước sprite là 48x48)
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(12, 10);
      body.setOffset(18, 32);
      body.setCollideWorldBounds(true);
    }

    // Đăng ký bàn phím điều khiển (Mũi tên và WASD)
    this.setupInput();

    // Khởi đầu với animation đứng yên hướng xuống
    this.play('player-idle-down');
  }

  private setupInput(): void {
    if (!this.scene.input.keyboard) return;

    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasdKeys = this.scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }) as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
      SHIFT: Phaser.Input.Keyboard.Key;
    };
  }

  public update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    let vx = 0;
    let vy = 0;

    // Kiểm tra input phím Trái / Phải
    const leftPressed = this.cursors?.left?.isDown || this.wasdKeys?.A?.isDown;
    const rightPressed = this.cursors?.right?.isDown || this.wasdKeys?.D?.isDown;
    const upPressed = this.cursors?.up?.isDown || this.wasdKeys?.W?.isDown;
    const downPressed = this.cursors?.down?.isDown || this.wasdKeys?.S?.isDown;

    if (leftPressed) {
      vx -= 1;
    }
    if (rightPressed) {
      vx += 1;
    }
    if (upPressed) {
      vy -= 1;
    }
    if (downPressed) {
      vy += 1;
    }

    // Kiểm tra chạy nhanh (Shift)
    const isRunning = this.wasdKeys?.SHIFT?.isDown || this.cursors?.shift?.isDown;
    const currentSpeed = isRunning ? this.speed * 1.5 : this.speed;

    // Chuẩn hóa vector di chuyển để không bị tăng tốc khi đi chéo
    if (vx !== 0 && vy !== 0) {
      const invSqrt2 = 0.70710678;
      vx *= invSqrt2;
      vy *= invSqrt2;
    }

    body.setVelocity(vx * currentSpeed, vy * currentSpeed);

    // Cập nhật hướng quay và animation
    this.isMoving = vx !== 0 || vy !== 0;

    if (this.isMoving) {
      // Ưu tiên hướng đang di chuyển
      if (Math.abs(vy) > Math.abs(vx)) {
        this.currentDirection = vy < 0 ? 'up' : 'down';
      } else {
        this.currentDirection = vx < 0 ? 'left' : 'right';
      }

      this.play(`player-walk-${this.currentDirection}`, true);
    } else {
      this.play(`player-idle-${this.currentDirection}`, true);
    }

    // Tự động sắp xếp z-index / depth theo vị trí chân của nhân vật (Y-sorting)
    this.setDepth(this.y);
  }
}
