import Phaser from 'phaser';

export interface HouseInteriorOptions {
  readonly originX: number;
  readonly originY: number;
  readonly columns: number;
  readonly rows: number;
  readonly tileSize: number;
}

export class HouseInteriorBuilder {
  private readonly scene: Phaser.Scene;
  private readonly options: HouseInteriorOptions;

  constructor(scene: Phaser.Scene, options: HouseInteriorOptions) {
    this.scene = scene;
    this.options = options;
  }

  public build(): Phaser.Physics.Arcade.StaticGroup {
    this.buildRoom();
    this.buildFurniture();
    return this.buildColliders();
  }

  private buildRoom(): void {
    const { originX, originY, columns, rows, tileSize } = this.options;
    const layout = [
      [0, 1, 1, 1, 1, 1, 1, 1, 2],
      [5, 6, 6, 6, 6, 6, 6, 6, 7],
      [5, 6, 6, 6, 6, 6, 6, 6, 7],
      [5, 6, 6, 6, 6, 6, 6, 6, 7],
      [5, 6, 6, 6, 6, 6, 6, 6, 7],
      [10, 11, 13, 11, -1, 11, 13, 11, 12],
    ];

    this.scene.add.graphics()
      .fillStyle(0x0e0a0d, 0.95)
      .fillRoundedRect(
        originX - 10,
        originY - 10,
        columns * tileSize + 20,
        rows * tileSize + 20,
        8,
      )
      .setDepth(0);

    layout.forEach((rowFrames, row) => {
      rowFrames.forEach((frame, col) => {
        const x = originX + col * tileSize;
        const y = originY + row * tileSize;
        if (frame !== -1) {
          this.scene.add.image(x, y, 'house_walls', frame)
            .setOrigin(0)
            .setDepth(row === rows - 1 ? 12 : 1);
          return;
        }

        this.scene.add.image(x, y, 'house_walls', 6).setOrigin(0).setDepth(1);
        this.scene.add.image(x, y, 'doors', 3).setOrigin(0).setDepth(2);
        this.scene.add.graphics()
          .fillStyle(0x5a3d28, 0.8)
          .fillRoundedRect(x + 2, y + 10, 12, 4, 1)
          .setDepth(3);
      });
    });
  }

  private buildFurniture(): void {
    const { originX: x, originY: y, columns, rows, tileSize: size } = this.options;
    this.scene.add.image(x + 4 * size, y, 'furniture', 0).setOrigin(0).setDepth(3);
    this.scene.add.image(x + size, y + size, 'furniture', 11).setOrigin(0).setDepth(4);
    this.scene.add.image(x + size, y + 2 * size, 'furniture', 20).setOrigin(0).setDepth(15);
    this.scene.add.image(x + 2 * size + 2, y + size, 'furniture', 4).setOrigin(0).setDepth(4);
    this.scene.add.image(x + 3 * size, y + 3 * size, 'furniture', 48).setOrigin(0).setDepth(2);
    this.scene.add.image(x + 4 * size, y + 3 * size, 'furniture', 49).setOrigin(0).setDepth(2);
    this.scene.add.image(x + 7 * size, y + 2 * size, 'furniture', 21).setOrigin(0).setDepth(14);
    this.scene.add.image(x + 7 * size, y + size, 'furniture', 25).setOrigin(0).setDepth(4);
    this.scene.add.graphics()
      .fillStyle(0xffd59e, 0.08)
      .fillCircle(x + columns * size / 2, y + rows * size / 2, 70)
      .setDepth(20);
  }

  private buildColliders(): Phaser.Physics.Arcade.StaticGroup {
    const { originX: x, originY: y, columns, rows, tileSize: size } = this.options;
    const group = this.scene.physics.add.staticGroup();
    this.addObstacle(group, x, y, columns * size, 24);
    this.addObstacle(group, x, y, size, rows * size + size);
    this.addObstacle(group, x + (columns - 1) * size, y, size, rows * size + size);
    this.addObstacle(group, x + size, y + 5 * size + 10, 3 * size, 12);
    this.addObstacle(group, x + 5 * size, y + 5 * size + 10, 3 * size, 12);
    this.addObstacle(group, x + size, y + size, size, 2 * size);
    this.addObstacle(group, x + 7 * size, y + 2 * size, size, size);
    return group;
  }

  private addObstacle(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const obstacle = this.scene.add.zone(x + width / 2, y + height / 2, width, height);
    this.scene.physics.add.existing(obstacle, true);
    const body = obstacle.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(width, height);
    body.updateFromGameObject();
    group.add(obstacle);
  }
}
